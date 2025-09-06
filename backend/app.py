from urllib.parse import urlparse, urljoin

from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from typing import List, Dict
import json
from crawl4ai import (
    CrawlerRunConfig,
    LLMConfig,
    LLMExtractionStrategy,
    RegexExtractionStrategy,
)
from schemas import (
    QueryRequest,
    ContactInfo,
    ContactExtractionResponse,
    PerSourceResult,
)
from services import (
    crawler,
    _get_important_internal_links,
    _get_website_summaries,
    generate_search_queries,
    get_top_n_links,
    normalize_to_homepage,
)

# --- FastAPI App Setup ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    await crawler.start()
    try:
        yield
    finally:
        await crawler.close()

app = FastAPI(
    title="Contact Extractor & Website Summary API",
    description="An API to find and extract contact information from important internal pages and generate comprehensive website summaries using AI.",
    version="2.1.0",
    lifespan=lifespan
)

@app.get("/")
async def root():
    return {"message": "Hello World"}
# --- API Endpoint ---
@app.post("/extract", response_model=ContactExtractionResponse)
async def extract(request: QueryRequest):
    """
    Accepts a text query. Generates 5 search queries with Gemini, fetches top 10 links
    per query via Google, de-duplicates, and runs the extraction pipeline on the
    discovered links.
    """
    errors: Dict[str, str] = {}
    user_query = request.query
    try:
        queries = await generate_search_queries(user_query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate search queries: {str(e)}")
    collected_links: List[str] = []
    for q in queries:
        collected_links.extend(get_top_n_links(q, num_links=2))
    # Normalize to homepage and dedupe 
    seen: set = set()
    base_inputs: List[str] = []
    for link in collected_links:
        homepage = normalize_to_homepage(link)
        if homepage in seen:
            continue
        seen.add(homepage)
        base_inputs.append(homepage)
    if not base_inputs:
        raise HTTPException(status_code=404, detail="No search results found to process")

    # === STEP 1: Find all "important" internal links from the footers ===
    important_links_map, social_links_map, link_errors = await _get_important_internal_links(base_inputs)
    errors.update(link_errors)
    all_important_urls = list(set(url for url_list in important_links_map.values() for url in url_list))
    
    # === STEP 1.5: Generate website summaries ===
    website_summaries = await _get_website_summaries(base_inputs, important_links_map)

    if not all_important_urls:
        # Return just socials (if any) in the new structure
        contacts_found: Dict[str, PerSourceResult] = {}
        for base in base_inputs:
            contacts_found[base] = PerSourceResult(
                socials=social_links_map.get(base, []),
                summary=website_summaries.get(base, ""),
                contacts=[]
            )
        # Trim empty sources
        contacts_found = {k: v for k, v in contacts_found.items() if (v.socials or v.contacts or v.summary)}
        return ContactExtractionResponse(contacts_found=contacts_found, errors=errors)

    # === STEP 2: Pre-filtering with Regex ===
    regex_config = CrawlerRunConfig(
        extraction_strategy=RegexExtractionStrategy(
            pattern=RegexExtractionStrategy.Email | RegexExtractionStrategy.PhoneUS
        ),
        stream=True  # FIXED: Enable streaming to use with "async for"
    )
    urls_with_contacts = set()
    async for result in await crawler.arun_many(all_important_urls, config=regex_config):
        if result.success and result.extracted_content and json.loads(result.extracted_content):
            urls_with_contacts.add(result.url)

    if not urls_with_contacts:
        errors["summary"] = "Found important pages, but none contained email or phone patterns."
        # Return summaries even if no contacts found
        contacts_found: Dict[str, PerSourceResult] = {}
        for base in base_inputs:
            contacts_found[base] = PerSourceResult(
                socials=social_links_map.get(base, []),
                summary=website_summaries.get(base, ""),
                contacts=[]
            )
        contacts_found = {k: v for k, v in contacts_found.items() if (v.socials or v.contacts or v.summary)}
        return ContactExtractionResponse(contacts_found=contacts_found, errors=errors)
        
    # === STEP 3: Structured Extraction with LLM ===
    llm_provider_config = LLMConfig(
        provider="gemini/gemini-2.0-flash",
        api_token="env:GEMINI_API_KEY",
    )
    
    llm_strategy = LLMExtractionStrategy(
        llm_config=llm_provider_config,
        schema=ContactInfo.model_json_schema(),
        instruction="Extract all contact information details from the text. For each person, provide their name, designation, email, and phone number. Do not include duplicate contacts. If two records share the same email or phone number, keep only the one that contains more information (name or designation) and discard the less informative one. Ensure the final output has only unique and most complete records.",
        input_format="fit_markdown"
    )
    
    llm_crawl_config = CrawlerRunConfig(
        extraction_strategy=llm_strategy,
        stream=True # FIXED: Enable streaming here as well
    )
    
    final_contacts: Dict[str, List[ContactInfo]] = {url: [] for url in base_inputs}
    
    async for result in await crawler.arun_many(list(urls_with_contacts), config=llm_crawl_config):
        if result.success and result.extracted_content:
            try:
                base_url = next(b for b in base_inputs if urlparse(b).netloc in result.url)
                extracted_data = json.loads(result.extracted_content)
                
                if isinstance(extracted_data, list):
                    for item in extracted_data:
                        final_contacts[base_url].append(ContactInfo(**item))
                elif isinstance(extracted_data, dict):
                    final_contacts[base_url].append(ContactInfo(**extracted_data))

            except (json.JSONDecodeError, StopIteration, TypeError) as e:
                errors[result.url] = f"LLM result parsing error: {str(e)}"

    final_contacts = {k: v for k, v in final_contacts.items() if v}
    
    # === STEP 4: Dedupe contacts per base URL (case-insensitive for emails) ===
    def _contact_key(c: ContactInfo):
        name_key = (c.name or '').strip()
        designation_key = (c.designation or '').strip()
        email_key = (c.email or '').strip().lower()
        phone_key = (c.phone or '').strip()
        return (name_key, designation_key, email_key, phone_key)

    for base_url, contacts in list(final_contacts.items()):
        seen = set()
        unique_list: List[ContactInfo] = []
        for contact in contacts:
            key = _contact_key(contact)
            if contact.email == None and contact.phone == None:
                continue
            if key in seen:
                continue
            seen.add(key)
            unique_list.append(contact)
        final_contacts[base_url] = unique_list

    # Build final response with socials, summaries, and contacts
    contacts_found: Dict[str, PerSourceResult] = {}
    for base in base_inputs:
        contacts_found[base] = PerSourceResult(
            socials=social_links_map.get(base, []),
            summary=website_summaries.get(base, ""),
            contacts=final_contacts.get(base, [])
        )
    # Remove entries that have neither socials, contacts, nor summaries
    contacts_found = {k: v for k, v in contacts_found.items() if (v.socials or v.contacts or v.summary)}

    return ContactExtractionResponse(contacts_found=contacts_found, errors=errors)