import asyncio
import json
import os
from typing import Optional, List, Dict, Any, Tuple

from fastapi import FastAPI
from pydantic import BaseModel, Field

# --- Crawl4AI Imports ---
from crawl4ai import (
    AsyncWebCrawler,
    CrawlerRunConfig,
    SeedingConfig,
    LLMConfig,
    GeolocationConfig,
    RegexExtractionStrategy,
    JsonCssExtractionStrategy,
    LLMExtractionStrategy,
    MemoryAdaptiveDispatcher,
    RateLimiter,
)
from crawl4ai.async_url_seeder import AsyncUrlSeeder

# --- Pydantic Models ---

class ProcessLinksRequest(BaseModel):
    links: List[str]
    geographical_area: Optional[str] = None
    query: str

class ContentSummary(BaseModel):
    summary: str = Field(description="A concise summary of the key information contained in the provided text.")

# NEW: Pydantic model for detailed contact extraction. This is more robust for the LLM.
class DetailedContact(BaseModel):
    name: Optional[str] = Field(description="Person or Company Name")
    designation: Optional[str] = Field(description="Job Title or Role (e.g., Sales Manager, CEO)")
    email: Optional[str] = Field(description="The person's email address")
    phone: Optional[str] = Field(description="The person's phone number")

class ContactList(BaseModel):
    contacts: List[DetailedContact]

# --- Geolocation Helper ---

def get_geo_settings(area: Optional[str]) -> dict:
    """Returns a dictionary with geolocation, locale, and timezone settings."""
    if not area:
        return {}
    
    # This correctly maps a simple area string to the required configuration objects.
    geo_map = {
        "new_york": {"geolocation": GeolocationConfig(latitude=40.7128, longitude=-74.0060), "locale": "en-US", "timezone_id": "America/New_York"},
        "paris": {"geolocation": GeolocationConfig(latitude=48.8566, longitude=2.3522), "locale": "fr-FR", "timezone_id": "Europe/Paris"},
        "india": {"geolocation": GeolocationConfig(latitude=19.0760, longitude=72.8777), "locale": "en-IN", "timezone_id": "Asia/Kolkata"},
    }
    return geo_map.get(area.lower().replace(" ", "_"), {})

# --- Core Logic Functions ---

async def discover_urls(seeder: AsyncUrlSeeder, domain: str, query: str) -> Tuple[List[str], List[str]]:
    """Discovers and scores URLs using the user's query for better targeting."""
    contact_query = f"{query} contact support team staff directory"
    about_query = f"{query} about mission story company profile"
    
    # Use different SeedingConfigs to find 'contact' and 'about' pages.
    # The BM25 scorer helps rank them by relevance to the query.
    contact_config = SeedingConfig(source="sitemap+cc", query=contact_query, scoring_method="bm25", score_threshold=0.2, max_urls=20)
    about_config = SeedingConfig(source="sitemap+cc", extract_head=True, query=about_query, scoring_method="bm25", score_threshold=0.3, max_urls=10)
    
    contact_results, about_results = await asyncio.gather(
        seeder.urls(domain, contact_config), 
        seeder.urls(domain, about_config)
    )

    contact_urls = [r['url'] for r in contact_results] if contact_results else []
    
    # Sort about_urls by relevance score to summarize the most important pages first.
    about_urls = sorted(about_results, key=lambda x: x.get('relevance_score', 0), reverse=True) if about_results else []
    about_urls = [r['url'] for r in about_urls]

    print(f"[{domain}] Discovered {len(contact_urls)} potential contact pages and {len(about_urls)} summary pages.")
    return contact_urls, about_urls

# REVISED: This function is completely rewritten to implement your strategy.
async def extract_detailed_contacts(crawler: AsyncWebCrawler, urls: List[str], geo_settings: dict, llm_config: LLMConfig, dispatcher: MemoryAdaptiveDispatcher) -> List[Dict[str, Any]]:
    """
    Extracts detailed contact information using a robust and efficient LLM-based approach.
    """
    if not urls:
        return []

    # Step 1: Find pages that actually contain contact info using fast regex.
    regex_strategy = RegexExtractionStrategy(pattern=(RegexExtractionStrategy.Email | RegexExtractionStrategy.PhoneUS | RegexExtractionStrategy.PhoneIntl))
    regex_config = CrawlerRunConfig(extraction_strategy=regex_strategy, **geo_settings)
    url_results = await crawler.arun_many(urls, regex_config, dispatcher=dispatcher)
    
    urls_with_contacts = [r.url for r in url_results if r.success and r.extracted_content and json.loads(r.extracted_content)]
    
    if not urls_with_contacts:
        return []
    print(f"Found {len(urls_with_contacts)} pages with potential contact info. Isolating relevant sections...")

    # Step 2: Isolate the contact sections from those pages to reduce context for the LLM.
    # This uses css_selector to grab common contact sections, making the LLM call cheaper and more focused.
    selector_config = CrawlerRunConfig(
        css_selector=['.contact', '#contact', 'footer', '[class*="contact"]', '[id*="contact"]'],
        **geo_settings
    )
    snippet_results = await crawler.arun_many(urls_with_contacts, selector_config, dispatcher=dispatcher)
    
    combined_snippets = ""
    for i, result in enumerate(snippet_results):
        if result.success and result.cleaned_html:
            combined_snippets += f"--- Page {i+1} from {result.url} ---\n{result.cleaned_html}\n\n"

    if not combined_snippets:
        return []
    print("Relevant sections isolated. Extracting details with LLM...")

    # Step 3: Use the LLM to perform the final extraction on the combined, smaller snippets.
    # This is more robust than schema generation if page structures vary.
    llm_strategy = LLMExtractionStrategy(
        llm_config=llm_config,
        schema=ContactList.model_json_schema(),
        instruction="From the provided HTML snippets, extract a list of all contacts with their name, designation, email, and phone number. Consolidate information for the same person if found across multiple pages.",
        apply_chunking=True, # Handles cases where combined snippets are large
        input_format="html" # Use HTML to preserve context for the LLM
    )
    extract_config = CrawlerRunConfig(extraction_strategy=llm_strategy)
    
    final_result = await crawler.arun(f"raw://{combined_snippets}", config=extract_config)
    
    if final_result.success and final_result.extracted_content:
        try:
            data = json.loads(final_result.extracted_content)
            contacts = data.get('contacts', [])
            # Deduplicate results
            unique_contacts = list({json.dumps(d, sort_keys=True): d for d in contacts if d.get('email') or d.get('phone')}.values())
            print(f"Found {len(unique_contacts)} unique detailed contacts.")
            return unique_contacts
        except (json.JSONDecodeError, AttributeError):
            return []
            
    return []

async def generate_content_summary(crawler: AsyncWebCrawler, urls: List[str], geo_settings: dict, dispatcher: MemoryAdaptiveDispatcher) -> str:
    """Generates a summary from a list of relevant pages."""
    if not urls:
        return ""

    combined_text = ""
    text_config = CrawlerRunConfig(word_count_threshold=50, **geo_settings)
    results = await crawler.arun_many(urls, text_config, dispatcher=dispatcher)
    for result in results:
        if result.success and result.markdown:
            # `fit_markdown` provides cleaner text for the LLM.
            combined_text += result.markdown.fit_markdown + "\n\n"

    if not combined_text.strip():
        return ""

    llm_config = LLMConfig(provider="gemini/gemini-2.0-flash", api_token="env:GEMINI_API_KEY", temperature=0.2)
    
    # FIXED: Added `apply_chunking=True` to handle large combined text gracefully.
    summary_strategy = LLMExtractionStrategy(
        llm_config=llm_config,
        schema=ContentSummary.model_json_schema(),
        instruction="Analyze the following content and provide a concise summary of the organization's purpose, products, or services.",
        apply_chunking=True,
        chunk_token_threshold=4000
    )
    summary_config = CrawlerRunConfig(extraction_strategy=summary_strategy)

    summary_result = await crawler.arun(f"raw://{combined_text}", config=summary_config)

    if summary_result.success and summary_result.extracted_content:
        summary_data = json.loads(summary_result.extracted_content)
        print("Content summary generated successfully.")
        return summary_data.get('summary', '')

    return ""


# --- FastAPI Application ---

app = FastAPI(title="B2B Discovery Service Backend")

@app.post("/process-query/")
async def process_query(request: ProcessLinksRequest):
    """
    Main API endpoint. 
    FIXED: Processes multiple domains in parallel for high throughput and
    reuses crawler instances for better performance.
    """
    # Create instances once to be reused across all domain processing.
    # This is more efficient than creating them inside a loop.
    async with AsyncUrlSeeder() as seeder, AsyncWebCrawler() as crawler:
        dispatcher = MemoryAdaptiveDispatcher(
            memory_threshold_percent=80.0, 
            rate_limiter=RateLimiter(base_delay=(0.5, 1.5))
        )
        geo_settings = get_geo_settings(request.geographical_area)
        llm_config = LLMConfig(provider="gemini/gemini-2.0-flash", api_token="env:GEMINI_API_KEY")

        # Define a processing function for a single domain
        async def process_single_domain(link: str) -> Tuple[str, Dict[str, Any]]:
            try:
                domain = link.split('//')[-1].split('/')[0]
                print(f"--- Processing domain: {domain} for query: '{request.query}' ---")

                contact_urls, about_urls = await discover_urls(seeder, domain, request.query)
                contacts = await extract_detailed_contacts(crawler, contact_urls, geo_settings, llm_config, dispatcher)
                summary = await generate_content_summary(crawler, about_urls, geo_settings, dispatcher)

                return domain, {
                    "summary": summary,
                    "contacts": contacts,
                    "geo_applied": request.geographical_area or "None",
                    "status": "success",
                }
            except Exception as e:
                print(f"Failed to process {link}: {e}")
                return link, {"status": "error", "message": str(e)}

        # FIXED: Run processing for all links concurrently instead of in a loop.
        tasks = [process_single_domain(link) for link in request.links]
        results = await asyncio.gather(*tasks)
        
        # Convert list of tuples to the final dictionary format
        all_results = {domain: result_data for domain, result_data in results}
        return all_results


if __name__ == "__main__":
    import uvicorn
    # Corrected the main module name for uvicorn to run.
    main_module_name = os.path.basename(__file__).replace(".py", "")
    print("Starting FastAPI server...")
    print("POST to http://127.0.0.1:8000/process-query/ with a JSON body like:")
    print('{"links": ["https://www.anthropic.com"], "geographical_area": "new_york", "query": "AI safety and research"}')
    uvicorn.run(f"{main_module_name}:app", host="0.0.0.0", port=8000, reload=True)