import os
import json
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from crawl4ai import (
    AsyncWebCrawler,
    CrawlerRunConfig,
    BrowserConfig,
    LLMConfig,
    CacheMode,
    # Extraction Strategies
    LLMExtractionStrategy,
    RegexExtractionStrategy,
    # Markdown & Content Filtering
    DefaultMarkdownGenerator,
    PruningContentFilter,
    # Deep Crawling Components
    BestFirstCrawlingStrategy,
    KeywordRelevanceScorer,
    FilterChain,
    DomainFilter,
    URLPatternFilter,
    ContentTypeFilter,
)

# --- Load Environment Variables ---
load_dotenv()

# --- Pydantic Schemas ---
class UrlRequest(BaseModel):
    url: str

class OrgSummary(BaseModel):
    organization_name: str = Field(description="The name of the company or organization.")
    summary: str = Field(description="A concise, one-paragraph summary of the organization's purpose, products, or services based on all context provided.")
    key_services: list[str] = Field(description="A list of key services or products offered.")

class SummaryResponse(BaseModel):
    url: str
    data: OrgSummary

class ContactInfo(BaseModel):
    name: Optional[str] = Field(None, description="The full name of the individual or department.")
    title: Optional[str] = Field(None, description="The job title or role of the person.")
    email: Optional[str] = Field(None, description="The contact email address.")
    phone: Optional[str] = Field(None, description="The contact phone number.")

class ContactList(BaseModel):
    contacts: List[ContactInfo] = Field(description="A list of all contacts found on the page.")

class ContactResponse(BaseModel):
    url: str
    data: ContactList

# --- Centralized Production Configurations ---
CHEAP_LLM_CONFIG = LLMConfig(provider="gemini/gemini-2.0-flash", api_token="env:GEMINI_API_KEY", temperature=0.0)
POWERFUL_LLM_CONFIG = LLMConfig(provider="gemini/gemini-2.0-flash", api_token="env:GEMINI_API_KEY", temperature=0.2)

CONTACT_REGEX_STRATEGY = RegexExtractionStrategy(pattern=(RegexExtractionStrategy.Email | RegexExtractionStrategy.PhoneUS))

CONTACT_LLM_STRATEGY = LLMExtractionStrategy(
    llm_config=CHEAP_LLM_CONFIG,
    schema=ContactList.model_json_schema(),
    instruction="From the provided text from a company's website, extract a list of all contact details. Include name, job title, email, and phone number if available. Be accurate.",
    apply_chunking=True,
    chunk_token_threshold=2000
)

PER_PAGE_SUMMARY_STRATEGY = LLMExtractionStrategy(
    llm_config=CHEAP_LLM_CONFIG,
    schema={"type": "object", "properties": {"page_summary": {"type": "string", "description": "A concise, one-paragraph summary of this page's content."}}},
    instruction="Summarize the following text in a single, dense paragraph.",
    apply_chunking=False
)

FINAL_SUMMARY_STRATEGY = LLMExtractionStrategy(
    llm_config=POWERFUL_LLM_CONFIG,
    schema=OrgSummary.model_json_schema(),
    instruction="You are a B2B analyst. Based on the collection of summaries from a company's website, generate a comprehensive and accurate final organizational summary, including the organization's name and key services.",
    apply_chunking=True,
    chunk_token_threshold=3000
)

# --- Crawler Lifecycle Management ---
crawler_instance = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global crawler_instance
    print("Initializing Global Crawler...")
    browser_config = BrowserConfig(headless=True)
    crawler_instance = AsyncWebCrawler(config=browser_config)
    await crawler_instance.start()
    yield
    print("Closing Global Crawler...")
    await crawler_instance.close()

# --- FastAPI Application ---
app = FastAPI(
    title="B2B Intelligence API",
    description="API to extract summaries and contact details from websites using intelligent deep crawling.",
    lifespan=lifespan
)

def get_base_domain(url: str) -> str:
    try:
        return ".".join(url.split('/')[2].split('.')[-2:])
    except:
        return url.split('/')[2] if '/' in url else url

# --- Summary Endpoint (Unchanged) ---
@app.post("/extract-summary", response_model=SummaryResponse)
async def extract_summary(request: UrlRequest):
    if not crawler_instance:
        raise HTTPException(status_code=503, detail="Crawler is not initialized.")

    print(f"--- Stage 1: Discovering and summarizing pages for {request.url} ---")
    
    base_domain = get_base_domain(request.url)
    relevance_scorer = KeywordRelevanceScorer(keywords=["about", "company", "mission", "services", "solutions", "products"], weight=1.0)
    filter_chain = FilterChain([
        DomainFilter(allowed_domains=[base_domain]),
        URLPatternFilter(patterns=["*/login/*", "*/admin/*", "*/cart/*"], reverse=True)
    ])

    deep_crawl_strategy = BestFirstCrawlingStrategy(
        max_depth=1, max_pages=5, url_scorer=relevance_scorer, filter_chain=filter_chain
    )
    
    discovery_config = CrawlerRunConfig(
        deep_crawl_strategy=deep_crawl_strategy,
        markdown_generator=DefaultMarkdownGenerator(content_filter=PruningContentFilter(threshold=0.5)),
        stream=True
    )

    intermediate_summaries = []
    summary_config = CrawlerRunConfig(extraction_strategy=PER_PAGE_SUMMARY_STRATEGY)

    try:
        async for result in await crawler_instance.arun(url=request.url, config=discovery_config):
            if result.success and result.markdown and result.markdown.fit_markdown:
                print(f"  -> Summarizing page: {result.url}")
                summary_result = await crawler_instance.arun(f"raw://{result.markdown.fit_markdown}", config=summary_config)
                if summary_result.success and summary_result.extracted_content:
                    summary_data = json.loads(summary_result.extracted_content)
                    if isinstance(summary_data, list):
                        summary_data = summary_data[0] if summary_data else {}
                    page_summary = summary_data.get('page_summary', '') if isinstance(summary_data, dict) else ''
                    if page_summary:
                        intermediate_summaries.append(page_summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deep crawl and per-page summarization failed: {str(e)}")

    if not intermediate_summaries:
        raise HTTPException(status_code=404, detail="No relevant pages found or summaries could be generated.")

    combined_summaries = "\n\n".join(filter(None, intermediate_summaries))
    print(f"--- Stage 2: Generating final summary from {len(intermediate_summaries)} page summaries ---")

    final_summary_config = CrawlerRunConfig(extraction_strategy=FINAL_SUMMARY_STRATEGY)
    try:
        final_result = await crawler_instance.arun(url=f"raw://{combined_summaries}", config=final_summary_config)
        if final_result.success and final_result.extracted_content:
            extracted_data = json.loads(final_result.extracted_content)
            if isinstance(extracted_data, list):
                extracted_data = extracted_data[0] if extracted_data else {}
            return SummaryResponse(url=request.url, data=OrgSummary(**extracted_data))
        else:
            raise HTTPException(status_code=422, detail=f"Failed to generate final summary. Error: {final_result.error_message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during final summarization: {str(e)}")

# --- MODIFIED Contact Extraction Endpoint (with Fallback Logic) ---
@app.post("/extract-contacts", response_model=ContactResponse)
async def extract_contacts(request: UrlRequest):
    if not crawler_instance:
        raise HTTPException(status_code=503, detail="Crawler is not initialized.")

    # === Stage 1: Discover Candidate Pages ===
    print(f"--- Stage 1: Discovering all potential contact pages on {request.url} ---")
    base_domain = get_base_domain(request.url)
    contact_scorer = KeywordRelevanceScorer(keywords=["contact", "team", "about", "directory", "support", "people"], weight=1.0)
    filter_chain = FilterChain([
        DomainFilter(allowed_domains=[base_domain]),
        URLPatternFilter(patterns=["*/login/*", "*/admin/*", "*/cart/*"], reverse=True),
        ContentTypeFilter(allowed_types=["text/html"])
    ])
    deep_crawl_strategy = BestFirstCrawlingStrategy(
        max_depth=2, max_pages=10, url_scorer=contact_scorer, filter_chain=filter_chain
    )
    discovery_config = CrawlerRunConfig(
        deep_crawl_strategy=deep_crawl_strategy,
        markdown_generator=DefaultMarkdownGenerator(content_filter=PruningContentFilter(threshold=0.4)),
        stream=False
    )

    try:
        candidate_results = await crawler_instance.arun(url=request.url, config=discovery_config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Contact discovery crawl failed: {str(e)}")

    if not candidate_results:
        raise HTTPException(status_code=404, detail="No pages with potential contact info found.")
    
    # === Stage 2: Attempt to Filter Candidates with Regex ===
    print(f"--- Stage 2: Found {len(candidate_results)} candidates. Attempting fast Regex filter. ---")
    pages_with_contacts_via_regex = []
    regex_config = CrawlerRunConfig(extraction_strategy=CONTACT_REGEX_STRATEGY)
    for result in candidate_results:
        if result.success and result.html:
            regex_result = await crawler_instance.arun(f"raw://{result.html}", config=regex_config)
            if regex_result.success and regex_result.extracted_content and json.loads(regex_result.extracted_content):
                print(f"  -> SUCCESS: Confirmed contact patterns on: {result.url}")
                pages_with_contacts_via_regex.append(result)

    # === Stage 3: Process Results based on Regex Filter Outcome ===
    final_content_for_llm = ""
    if pages_with_contacts_via_regex:
        print(f"--- Stage 3: Regex confirmed {len(pages_with_contacts_via_regex)} pages. Aggregating their content for LLM. ---")
        final_content_for_llm = "\n\n--- NEXT PAGE ---\n\n".join(
            f"Content from URL: {res.url}\n\n{res.markdown.fit_markdown}"
            for res in pages_with_contacts_via_regex if res.markdown and res.markdown.fit_markdown
        )
    else:
        # !!! FALLBACK LOGIC !!!
        # If regex found nothing, fall back to using the original candidate pages.
        print(f"--- Stage 3 (Fallback): Regex found no patterns. Aggregating content from all {len(candidate_results)} candidate pages for LLM. ---")
        final_content_for_llm = "\n\n--- NEXT PAGE ---\n\n".join(
            f"Content from URL: {res.url}\n\n{res.markdown.fit_markdown}"
            for res in candidate_results if res.success and res.markdown and res.markdown.fit_markdown
        )
    
    if not final_content_for_llm.strip():
        raise HTTPException(status_code=422, detail="Could not extract clean markdown from any of the discovered pages.")
    
    # === Stage 4: Final LLM Extraction ===
    print("--- Stage 4: Sending final aggregated content to LLM. ---")
    llm_config = CrawlerRunConfig(extraction_strategy=CONTACT_LLM_STRATEGY)
    try:
        final_result = await crawler_instance.arun(url=f"raw://{final_content_for_llm}", config=llm_config)
        if final_result.success and final_result.extracted_content:
            extracted_data = json.loads(final_result.extracted_content)
            if isinstance(extracted_data, list):
                extracted_data = extracted_data[0] if extracted_data else {}
            validated_contacts = ContactList(**extracted_data)
            
            # Final check if LLM also found nothing
            if not validated_contacts.contacts:
                 raise HTTPException(status_code=404, detail="The process completed, but no structured contact information was found on the website.")
            
            return ContactResponse(url=request.url, data=validated_contacts)
        else:
            raise HTTPException(status_code=422, detail=f"Failed to extract structured contacts with LLM. Error: {final_result.error_message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during final contact extraction: {str(e)}")