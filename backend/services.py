import re
import os
import json
from typing import List, Dict
from urllib.parse import urlparse, urljoin, urlunparse

import litellm
from crawl4ai import (
    AsyncWebCrawler,
    CrawlerRunConfig,
)
from googleapiclient.discovery import build


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
        except (ValueError, TypeError):
            return False
    @classmethod
    def is_social_media(cls, url: str) -> bool:
        try:
            domain = urlparse(url).netloc.lower()
            return any(social_domain in domain for social_domain in cls.SOCIAL_MEDIA_DOMAINS)
        except (ValueError, TypeError):
            return False
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


crawler = AsyncWebCrawler()


async def _get_important_internal_links(base_urls: List[str]) -> (Dict[str, List[str]], Dict[str, List[str]], Dict[str, str]):
    primary_config = CrawlerRunConfig(
        css_selector="footer, #footer, .footer, [role='contentinfo']",
        stream=True
    )
    
    important_links_map: Dict[str, List[str]] = {}
    social_links_map: Dict[str, List[str]] = {}
    errors: Dict[str, str] = {}
    urls_needing_fallback: List[str] = []

    async for result in await crawler.arun_many(base_urls, config=primary_config):
        if result.success:
            internal_links = [urljoin(result.url, link.get('href', '')) for link in result.links.get("internal", [])]
            external_links = [link.get('href', '') for link in result.links.get("external", [])]
            
            if internal_links:
                important_links_map[result.url] = LinkProcessor.process_important_links(internal_links)
            social_links = []
            for href in external_links:
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
                urls_needing_fallback.append(result.url)
        else:
            errors[result.url] = f"Failed to get footer links on first pass: {result.error_message}"

    if urls_needing_fallback:
        fallback_config = CrawlerRunConfig(stream=True)
        
        async for result in await crawler.arun_many(urls_needing_fallback, config=fallback_config):
            if result.success:
                all_internal_links = [urljoin(result.url, link.get('href', '')) for link in result.links.get("internal", [])]
                all_external_links = [link.get('href', '') for link in result.links.get("external", [])]
                footer_proxy_links = all_internal_links[-40:]
                
                important_links_map[result.url] = LinkProcessor.process_important_links(footer_proxy_links)
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


async def _get_website_summaries(base_urls: List[str], important_links_map: Dict[str, List[str]]) -> Dict[str, str]:
    website_summaries: Dict[str, str] = {}
    
    for base_url in base_urls:
        try:
            important_pages = important_links_map.get(base_url, [])
            info_pages = LinkProcessor.process_info_links(important_pages)
            all_pages_to_crawl = [base_url] + info_pages
            all_pages_to_crawl = list(dict.fromkeys(all_pages_to_crawl))
            if not all_pages_to_crawl:
                continue
            
            markdown_config = CrawlerRunConfig(
                stream=True,
                extraction_strategy=None
            )
            
            combined_markdown: List[str] = []
            page_titles: List[str] = []
            
            async for result in await crawler.arun_many(all_pages_to_crawl, config=markdown_config):
                if result.success and result.markdown:
                    page_title = "Homepage"
                    try:
                        if hasattr(result, 'html') and result.html:
                            title_match = re.search(r'<title[^>]*>(.*?)</title>', result.html, re.IGNORECASE | re.DOTALL)
                            if title_match:
                                page_title = title_match.group(1).strip()
                            else:
                                page_title = urlparse(result.url).path.strip('/') or "Homepage"
                        else:
                            page_title = urlparse(result.url).path.strip('/') or "Homepage"
                    except Exception:
                        page_title = urlparse(result.url).path.strip('/') or "Homepage"
                    
                    page_titles.append(page_title)
                    combined_markdown.append(f"{page_title} {result.markdown}")
            
            if not combined_markdown:
                continue
            
            full_content = " ".join(combined_markdown)
            if len(full_content) > 50000:
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
                website_summaries[base_url] = f"Summary generation failed: {str(e)}"
        except Exception as e:
            website_summaries[base_url] = f"Error processing website: {str(e)}"
    
    return website_summaries



async def generate_search_queries(user_query: str) -> List[str]:
    """
    Use Gemini to create exactly 5 diversified Google search queries for the input text.
    Returns a list of up to 5 strings. On parsing issues, attempts fallbacks.
    """
    instruction = f"""You are a precise search query generator. Given a user's intent, create exactly 5 distinct Google search queries that a savvy researcher would use to find the official website of a company or organization.
    The goal is to bypass review sites, aggregators, and article lists (e.g., "10 best...") and return results directly from the source entity itself. Incorporate search operators and precise terminology to filter out unwanted results and prioritize primary sources.
    avoid duplications. Return ONLY a strict JSON array of 5 strings."""
    try:
        response = await litellm.acompletion(
            model="gemini/gemini-2.0-flash",
            messages=[
                {"role": "system", "content": instruction},
                {"role": "user", "content": user_query},
            ],
            api_key=os.getenv("GEMINI_API_KEY"),
        )
        content = response.choices[0].message.content.strip()
        print(content)
        queries: List[str]
        # First try: direct JSON parse
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            # Fallback: extract bracketed JSON array substring
            start = content.find("[")
            end = content.rfind("]")
            parsed = None
            if start != -1 and end != -1 and end > start:
                try:
                    parsed = json.loads(content[start:end+1])
                except Exception:
                    parsed = None
        if isinstance(parsed, list):
            queries = [str(item).strip() for item in parsed if isinstance(item, (str, int, float))]
            return queries[:5]
        # Last resort: split lines or delimiters
        lines = [line.strip("- ").strip() for line in content.splitlines() if line.strip()]
        if len(lines) >= 5:
            return lines[:5]
        parts = [p.strip() for p in re.split(r"[\n,;]+", content) if p.strip()]
        return parts[:5]
    except Exception as e:
        # Propagate for the API layer to handle
        raise e


def get_top_n_links(query: str, num_links: int = 2) -> List[str]:
    """
    Uses Google Custom Search API to return the first 'num_links' result links.
    Requires env vars: GOOGLE_API_KEY and GOOGLE_CSE_ID.
    """
    api_key = os.getenv("Search_API")
    cse_id = os.getenv("CX")
    if not api_key or not cse_id:
        print("Missing GOOGLE_API_KEY or GOOGLE_CSE_ID environment variables")
        return []
    links: List[str] = []
    try:
        service = build("customsearch", "v1", developerKey=api_key)
        result = service.cse().list(q=query, cx=cse_id, num=num_links).execute()
        if isinstance(result, dict) and 'items' in result:
            for item in result['items']:
                href = item.get('link')
                if href:
                    links.append(href)
    except Exception as e:
        print(f"Google CSE error: {e}")
    print(links)
    return links


def normalize_to_homepage(url: str) -> str:
    """
    Reduce any URL to its homepage: scheme + netloc with trailing slash.
    Example: https://www.aorn.org/article/x -> https://www.aorn.org/
    """
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return url
        return urlunparse((parsed.scheme, parsed.netloc, '/', '', '', ''))
    except Exception:
        return url

