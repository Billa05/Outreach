import asyncio
import re
import os
from urllib.parse import urlparse, urljoin

from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import json

# Import necessary components from crawl4ai
from crawl4ai import (
    AsyncWebCrawler,
    CrawlerRunConfig,
    LLMConfig,
    LLMExtractionStrategy,
    RegexExtractionStrategy,
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
    title="Contact Extractor API",
    description="An API to find and extract contact information from important internal pages.",
    version="2.0.0",
    lifespan=lifespan
)

# --- Pydantic Models ---
class URLRequest(BaseModel):
    urls: List[str] = Field(..., example=["https://crawl4ai.com", "https://python.org"])

# Pydantic model for the final contact info structure
class ContactInfo(BaseModel):
    name: Optional[str] = Field(None, description="The full name of the contact person.")
    designation: Optional[str] = Field(None, description="The job title or designation.")
    email: Optional[str] = Field(None, description="The contact's email address.")
    phone: Optional[str] = Field(None, description="The contact's phone number.")

class ContactExtractionResponse(BaseModel):
    contacts_found: Dict[str, List[ContactInfo]]
    errors: Dict[str, str]

# --- (LinkProcessor from previous step remains the same) ---
class LinkProcessor:
    IMPORTANT_KEYWORDS = {
        'contact', 'about', 'team', 'careers', 'jobs', 'support', 'help',
        'privacy', 'terms', 'legal', 'policy', 'faq', 'shipping', 'returns',
        'locations', 'investor', 'press', 'media', 'news', 'blog', 'partnership'
    }
    SOCIAL_MEDIA_DOMAINS = {
        'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
        'youtube.com', 'tiktok.com', 'pinterest.com', 'reddit.com', 'github.com',
        'medium.com', 'discord.com', 't.me'
    }
    @classmethod
    def is_important_internal(cls, url: str) -> bool:
        try:
            path_and_query = urlparse(url).path + urlparse(url).query
            return any(keyword in path_and_query.lower() for keyword in cls.IMPORTANT_KEYWORDS)
        except (ValueError, TypeError): return False
    @classmethod
    def is_social_media(cls, url: str) -> bool:
        try:
            domain = urlparse(url).netloc.lower()
            return any(social_domain in domain for social_domain in cls.SOCIAL_MEDIA_DOMAINS)
        except (ValueError, TypeError): return False
    @classmethod
    def process_important_links(cls, internal_links: List[str]) -> List[str]:
        important = {link for link in internal_links if cls.is_important_internal(link)}
        return list(important)

# --- Crawler Instance & Lifecycle ---
crawler = AsyncWebCrawler()

# --- Reusable Crawler Logic ---
async def _get_important_internal_links(base_urls: List[str]) -> Dict[str, List[str]]:
    """
    Crawls the given URLs to find important internal links from the footer area.
    
    Uses a two-step fallback process for robust footer detection:
    1. Tries a comprehensive CSS selector for common footer patterns.
    2. If no links are found, it re-crawls the full page and takes the last 40 links
       as a proxy for the "bottom of the page".
    """
    # === Step 1: Attempt crawl with a comprehensive footer selector ===
    # This selector covers the HTML5 <footer_element>, id="footer", class="footer",
    # and the common accessibility role="contentinfo".
    primary_config = CrawlerRunConfig(
        css_selector="footer, #footer, .footer, [role='contentinfo']",
        stream=True
    )
    
    important_links_map: Dict[str, List[str]] = {}
    errors = {}
    urls_needing_fallback = []

    # First pass
    async for result in await crawler.arun_many(base_urls, config=primary_config):
        if result.success:
            internal_links = [urljoin(result.url, link.get('href', '')) for link in result.links.get("internal", [])]
            
            if internal_links:
                # Success! Found links with the specific selector.
                important_links_map[result.url] = LinkProcessor.process_important_links(internal_links)
            else:
                # The crawl succeeded but found no links, suggesting the selector failed.
                # Add this URL to the list for a fallback attempt.
                urls_needing_fallback.append(result.url)
        else:
            errors[result.url] = f"Failed to get footer links on first pass: {result.error_message}"

    # === Step 2: Perform fallback crawl for URLs where the footer selector failed ===
    if urls_needing_fallback:
        print(f"Performing fallback crawl for {len(urls_needing_fallback)} URLs.")
        # This time, crawl the entire page without a CSS selector.
        fallback_config = CrawlerRunConfig(stream=True)
        
        async for result in await crawler.arun_many(urls_needing_fallback, config=fallback_config):
            if result.success:
                # Heuristic: Assume the last 40 internal links are in the footer/bottom of the page.
                all_internal_links = [urljoin(result.url, link.get('href', '')) for link in result.links.get("internal", [])]
                footer_proxy_links = all_internal_links[-40:] # Take the last 40 links
                
                important_links_map[result.url] = LinkProcessor.process_important_links(footer_proxy_links)
            else:
                 errors[result.url] = f"Failed to get footer links on fallback pass: {result.error_message}"

    return important_links_map, errors

# --- New API Endpoint ---
@app.post("/extract-contact-info", response_model=ContactExtractionResponse)
async def extract_contact_info(request: URLRequest):
    """
    Crawls website footers, finds important internal links, and uses a
    Regex+LLM pipeline to extract structured contact information.
    """
    # === STEP 1: Find all "important" internal links from the footers ===
    important_links_map, errors = await _get_important_internal_links(request.urls)
    all_important_urls = list(set(url for url_list in important_links_map.values() for url in url_list))

    if not all_important_urls:
        return ContactExtractionResponse(contacts_found={}, errors=errors)

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
        return ContactExtractionResponse(contacts_found={}, errors=errors)
        
    # === STEP 3: Structured Extraction with LLM ===
    llm_provider_config = LLMConfig(
        provider="gemini/gemini-2.0-flash",
        api_token="env:GEMINI_API_KEY",
    )
    
    llm_strategy = LLMExtractionStrategy(
        llm_config=llm_provider_config,
        schema=ContactInfo.model_json_schema(),
        instruction="Extract all contact information details from the text. For each person, provide their name, designation, email, and phone number.",
        input_format="fit_markdown"
    )
    
    llm_crawl_config = CrawlerRunConfig(
        extraction_strategy=llm_strategy,
        stream=True # FIXED: Enable streaming here as well
    )
    
    final_contacts: Dict[str, List[ContactInfo]] = {url: [] for url in request.urls}
    
    async for result in await crawler.arun_many(list(urls_with_contacts), config=llm_crawl_config):
        if result.success and result.extracted_content:
            try:
                base_url = next(b for b in request.urls if urlparse(b).netloc in result.url)
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
            if key in seen:
                continue
            seen.add(key)
            unique_list.append(contact)
        final_contacts[base_url] = unique_list

    return ContactExtractionResponse(contacts_found=final_contacts, errors=errors)