"""
Comment Sourcer for TRAVEL-Planner.
Uses Firecrawl to scrape travel-related comments and reviews from various platforms.
"""
from __future__ import annotations

import argparse
from .firecrawl_scraper import scrape_url, crawl_url

# Example high-value sources for travel knowledge
SOURCES = {
    "reddit_kashmir": "https://www.reddit.com/r/Kashmir/",
    "tripadvisor_pahalgam": "https://www.tripadvisor.com/ShowForum-g635747-i11311-Pahalgam_Anantnag_District_Kashmir_Jammu_and_Kashmir.html",
    "indiamike_kashmir": "https://www.indiamike.com/india/jammu-and-kashmir-f30/",
    "lonely_planet_india": "https://www.lonelyplanet.com/india/jammu-and-kashmir",
    "travel_blog_kashmir": "https://www.travelshoebum.com/category/india/kashmir/",
}

def source_comprehensive(region: str, limit: int = 5) -> None:
    """
    Source from multiple platforms for a specific region.
    """
    print(f"[Source] Starting comprehensive sourcing for: {region}")
    
    # 1. Forums (Reddit, TripAdvisor, IndiaMike)
    forum_urls = [
        f"https://www.reddit.com/r/travel/search/?q={region}&restrict_sr=1",
        f"https://www.tripadvisor.com/Search?q={region}",
    ]
    for url in forum_urls:
        print(f"[Source] Forum search: {url}")
        crawl_url(url, collection="local_knowledge", region=region, limit=limit)

    # 2. Blogs and Travel Pages
    blog_urls = [
        f"https://www.google.com/search?q=best+travel+blogs+{region}",
    ]
    # In practice, we'd extract actual blog URLs from the search result.
    # For the MVP, we assume some key blogs or use direct crawl on known travel sites.
    
    # 3. Direct Platform Crawling
    if region.lower() in ["pahalgam", "kashmir"]:
        # Specific high-value targets
        targets = [
            "https://www.reddit.com/r/Kashmir/",
            "https://www.indiamike.com/india/jammu-and-kashmir-f30/",
        ]
        for url in targets:
            crawl_url(url, collection="local_knowledge", region=region, limit=limit)

def source_comments(region: str) -> None:
    # Legacy wrapper
    source_comprehensive(region)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Source travel comments for RAG")
    parser.add_argument("--region", type=str, default="pahalgam", help="Region to source for")
    parser.add_argument("--url", type=str, help="Specific URL to source from")
    parser.add_argument("--collection", type=str, default="local_knowledge", help="Target collection")
    parser.add_argument("--limit", type=int, default=5, help="Crawl limit per source")
    parser.add_argument("--mode", type=str, choices=["quick", "comprehensive"], default="quick", help="Sourcing depth")
    
    args = parser.parse_args()
    
    if args.url:
        scrape_url(args.url, args.collection, args.region)
    elif args.mode == "comprehensive":
        source_comprehensive(args.region, args.limit)
    else:
        source_comments(args.region)
