import os
from typing import List, Dict
from urllib.parse import urlparse, urljoin, urlunparse
from dotenv import load_dotenv
from exa_py import Exa
from crawl4ai import (
    AsyncWebCrawler,
    CrawlerRunConfig,
)

load_dotenv()

class LinkProcessor:
    IMPORTANT_KEYWORDS = {
        'contact', 'team', 'support', 'help', 'about', 'locations', 'careers', 'partnership'
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
    def process_important_links(cls, links: List[str]) -> List[str]:
        return [link for link in links if cls.is_important_internal(link)]


crawler = AsyncWebCrawler()
    
exa = Exa(api_key=os.getenv("EXA_API_KEY"))


async def search_with_exa(user_query: str) -> tuple[List[str], Dict[str, str]]:
    result = exa.search_and_contents(
        user_query + ", find only the official company websites, avoiding aggregator sites",
        type="auto",
        category = "company",
        user_location="IN",
        num_results=5,
        summary=True
    )
    print(result)
    base_urls = []
    summaries = {}
    seen = set()
    for item in result.results:
        url = item.url
        homepage = normalize_to_homepage(url)
        if homepage not in seen:
            seen.add(homepage)
            base_urls.append(homepage)
            summaries[homepage] = item.summary or ''
    return base_urls, summaries


async def get_important_internal_links(base_urls: List[str]) -> tuple[Dict[str, List[str]], Dict[str, List[str]], Dict[str, str]]:
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

