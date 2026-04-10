"""
Comment Sourcer for TRAVEL-Planner.
Uses Firecrawl to scrape travel-related comments and reviews from various platforms.
"""
from __future__ import annotations

import argparse
from .firecrawl_scraper import scrape_url, crawl_url

# Example high-value sources for travel knowledge
SOURCES = {
    "reddit_kashmir": "https://www.reddit.com/r/Kashmir/comments/18zxyz/traveling_to_pahalgam_tips/",
    "tripadvisor_pahalgam": "https://www.tripadvisor.com/ShowForum-g635747-i11311-Pahalgam_Anantnag_District_Kashmir_Jammu_and_Kashmir.html",
    "indiamike_kashmir": "https://www.indiamike.com/india/jammu-and-kashmir-f30/",
}

def source_comments(region: str) -> None:
    """
    Auto-source comments for a specific region.
    """
    print(f"[Source] Sourcing comments for region: {region}")
    
    # In a real scenario, we might use a search API to find relevant threads first.
    # For now, we use our curated list or ask the user for a URL.
    
    if region.lower() == "pahalgam" or region.lower() == "kashmir":
        urls = [
            "https://www.reddit.com/r/Kashmir/",
            "https://www.reddit.com/r/travel/search/?q=pahalgam&restrict_sr=1"
        ]
        for url in urls:
            # We crawl reddit search results or subreddits
            crawl_url(url, collection="local_knowledge", region=region, limit=5)
    else:
        print(f"[WARN] No predefined sources for {region}. Please provide a URL.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Source travel comments for RAG")
    parser.add_argument("--region", type=str, default="pahalgam", help="Region to source for")
    parser.add_argument("--url", type=str, help="Specific URL to source from")
    parser.add_argument("--collection", type=str, default="local_knowledge", help="Target collection")
    
    args = parser.parse_args()
    
    if args.url:
        scrape_url(args.url, args.collection, args.region)
    else:
        source_comments(args.region)
