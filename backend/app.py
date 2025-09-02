import asyncio
import re
import os
from urllib.parse import urlparse, urljoin

from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import json
import litellm
# litellm._turn_on_debug()
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
    title="Contact Extractor & Website Summary API",
    description="An API to find and extract contact information from important internal pages and generate comprehensive website summaries using AI.",
    version="2.1.0",
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
    contacts_found: Dict[str, "PerSourceResult"]
    errors: Dict[str, str]

class PerSourceResult(BaseModel):
    socials: List[str]
    summary: str = Field(default="", description="Website summary for this source")
    contacts: List[ContactInfo]

# --- (LinkProcessor from previous step remains the same) ---
class LinkProcessor:
    IMPORTANT_KEYWORDS = {
        'contact', 'about', 'team', 'careers', 'jobs', 'support', 'help',
        'privacy', 'terms', 'legal', 'policy', 'faq', 'shipping', 'returns',
        'locations', 'investor', 'press', 'media', 'news', 'blog', 'partnership'
    }
    INFO_KEYWORDS = {
        'about', 'privacy', 'terms', 'legal', 'policy', 'faq',
        'shipping', 'returns', 'investor', 'news', 'blog'
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
    
    @classmethod
    def is_info_page(cls, url: str) -> bool:
        try:
            path_and_query = urlparse(url).path + urlparse(url).query
            return any(keyword in path_and_query.lower() for keyword in cls.INFO_KEYWORDS)
        except (ValueError, TypeError): 
            return False
    
    @classmethod
    def process_info_links(cls, internal_links: List[str]) -> List[str]:
        info_links = {link for link in internal_links if cls.is_info_page(link)}
        return list(info_links)

# --- Crawler Instance & Lifecycle ---
crawler = AsyncWebCrawler()

# --- Reusable Crawler Logic ---
async def _get_important_internal_links(base_urls: List[str]) -> (Dict[str, List[str]], Dict[str, List[str]]):
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
    social_links_map: Dict[str, List[str]] = {}
    errors = {}
    urls_needing_fallback = []

    # First pass
    async for result in await crawler.arun_many(base_urls, config=primary_config):
        if result.success:
            internal_links = [urljoin(result.url, link.get('href', '')) for link in result.links.get("internal", [])]
            external_links = [link.get('href', '') for link in result.links.get("external", [])]
            
            if internal_links:
                # Success! Found links with the specific selector.
                important_links_map[result.url] = LinkProcessor.process_important_links(internal_links)
            # Collect social links regardless of whether internal links were found
            social_links = []
            for href in external_links:
                try:
                    if href and LinkProcessor.is_social_media(href):
                        social_links.append(href)
                except Exception:
                    continue
            if social_links:
                # De-duplicate while preserving insertion order
                seen_hrefs = set()
                dedup_socials = []
                for href in social_links:
                    if href in seen_hrefs:
                        continue
                    seen_hrefs.add(href)
                    dedup_socials.append(href)
                social_links_map[result.url] = dedup_socials
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
                all_external_links = [link.get('href', '') for link in result.links.get("external", [])]
                footer_proxy_links = all_internal_links[-40:] # Take the last 40 links
                
                important_links_map[result.url] = LinkProcessor.process_important_links(footer_proxy_links)
                # Socials from fallback crawl
                social_links = []
                for href in all_external_links:
                    try:
                        if href and LinkProcessor.is_social_media(href):
                            social_links.append(href)
                    except Exception:
                        continue
                if social_links:
                    seen_hrefs = set()
                    dedup_socials = []
                    for href in social_links:
                        if href in seen_hrefs:
                            continue
                        seen_hrefs.add(href)
                        dedup_socials.append(href)
                    social_links_map[result.url] = dedup_socials
            else:
                 errors[result.url] = f"Failed to get footer links on fallback pass: {result.error_message}"

    return important_links_map, social_links_map, errors

# --- Website Summary Functionality ---
async def _get_website_summaries(base_urls: List[str], important_links_map: Dict[str, List[str]]) -> Dict[str, str]:
    """
    Scrapes informational pages from each website and generates a comprehensive summary
    using LLM analysis of the combined markdown content.
    """
    website_summaries = {}
    
    for base_url in base_urls:
        try:
            # Get all important pages for this base URL
            important_pages = important_links_map.get(base_url, [])
            
            # Filter to only informational pages using INFO_KEYWORDS
            info_pages = LinkProcessor.process_info_links(important_pages)
            
            # Always include the homepage for context
            all_pages_to_crawl = [base_url] + info_pages
            # Remove duplicates while preserving order
            all_pages_to_crawl = list(dict.fromkeys(all_pages_to_crawl))
            
            if not all_pages_to_crawl:
                continue
                
            # Configure crawler to extract markdown content
            markdown_config = CrawlerRunConfig(
                stream=True,
                # Use markdown extraction to get clean, structured content
                extraction_strategy=None  # We'll get the markdown from result.markdown
            )
            
            # Collect all markdown content from important pages
            combined_markdown = []
            page_titles = []
            
            async for result in await crawler.arun_many(all_pages_to_crawl, config=markdown_config):
                if result.success and result.markdown:
                    # Extract page title from HTML or use URL path
                    page_title = "Homepage"
                    try:
                        if hasattr(result, 'html') and result.html:
                            # Extract title from HTML
                            title_match = re.search(r'<title[^>]*>(.*?)</title>', result.html, re.IGNORECASE | re.DOTALL)
                            if title_match:
                                page_title = title_match.group(1).strip()
                            else:
                                # Fallback to URL path
                                page_title = urlparse(result.url).path.strip('/') or "Homepage"
                        else:
                            page_title = urlparse(result.url).path.strip('/') or "Homepage"
                    except Exception:
                        page_title = urlparse(result.url).path.strip('/') or "Homepage"
                    
                    page_titles.append(page_title)
                    combined_markdown.append(f"{page_title} {result.markdown}")
            
            if not combined_markdown:
                continue
                
            # Combine all markdown content
            full_content = " ".join(combined_markdown)
            
            # Truncate if too long (LLM context limits)
            if len(full_content) > 50000:  # Rough limit to stay within token limits
                full_content = full_content[:50000]
            
            summary_instruction = f"""
            Analyze the following website content and provide a comprehensive summary in plain text format. The content includes informational pages from: {', '.join(page_titles)}.
            
            Write a natural, flowing summary that covers:
            - Company/Organization Overview
            - Main Products/Services
            - Key Features or Offerings
            - Target Audience
            - Unique Value Propositions
            - Notable partnerships, certifications, or achievements
            - Business policies, terms, and important information
            
            IMPORTANT: Write in plain text only. Do not use any markdown formatting, bullet points, numbered lists, or special characters like ** or ## or \n or \. Do not include newlines (\n) or backslashes (\) in your response. Write as natural paragraphs that flow together as continuous text.
            
            Keep the summary concise but informative (2-3 paragraphs maximum).
            Focus on the most important and distinctive aspects of the business based on the informational content.
            """
            
            # Use litellm directly for summary generation
            try:
                response = await litellm.acompletion(
                    model="gemini/gemini-2.0-flash",
                    messages=[
                        {"role": "system", "content": summary_instruction},
                        {"role": "user", "content": full_content}
                    ],
                    api_key=os.getenv("GEMINI_API_KEY")
                )
                
                summary = response.choices[0].message.content.strip()
                website_summaries[base_url] = summary
                
            except Exception as e:
                print(f"Error generating summary for {base_url}: {str(e)}")
                website_summaries[base_url] = f"Summary generation failed: {str(e)}"
                
        except Exception as e:
            print(f"Error processing website summary for {base_url}: {str(e)}")
            website_summaries[base_url] = f"Error processing website: {str(e)}"
    
    return website_summaries

# --- New API Endpoint ---
@app.post("/extract", response_model=ContactExtractionResponse)
async def extract(request: URLRequest):
    """
    Crawls website footers, finds important internal links, and uses a
    Regex+LLM pipeline to extract structured contact information and generate
    comprehensive website summaries.
    
    Returns:
    - contacts_found: Social media links and contact information per website
    - website_summaries: AI-generated summaries of each website's content
    - errors: Any errors encountered during processing
    """
    # === STEP 1: Find all "important" internal links from the footers ===
    important_links_map, social_links_map, errors = await _get_important_internal_links(request.urls)
    all_important_urls = list(set(url for url_list in important_links_map.values() for url in url_list))
    
    # === STEP 1.5: Generate website summaries ===
    website_summaries = await _get_website_summaries(request.urls, important_links_map)

    if not all_important_urls:
        # Return just socials (if any) in the new structure
        contacts_found: Dict[str, PerSourceResult] = {}
        for base in request.urls:
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
        for base in request.urls:
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
            if contact.email == None and contact.phone == None:
                continue
            if key in seen:
                continue
            seen.add(key)
            unique_list.append(contact)
        final_contacts[base_url] = unique_list

    # Build final response with socials, summaries, and contacts
    contacts_found: Dict[str, PerSourceResult] = {}
    for base in request.urls:
        contacts_found[base] = PerSourceResult(
            socials=social_links_map.get(base, []),
            summary=website_summaries.get(base, ""),
            contacts=final_contacts.get(base, [])
        )
    # Remove entries that have neither socials, contacts, nor summaries
    contacts_found = {k: v for k, v in contacts_found.items() if (v.socials or v.contacts or v.summary)}

    return ContactExtractionResponse(contacts_found=contacts_found, errors=errors)