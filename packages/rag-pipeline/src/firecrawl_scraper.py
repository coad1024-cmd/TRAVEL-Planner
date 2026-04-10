"""
Firecrawl Scraper for RAG Pipeline.
Uses Firecrawl to turn websites into LLM-ready markdown.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from firecrawl import FirecrawlApp

load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")

from .ingest import ingest_file


def scrape_url(url: str, collection: str, region: str = "india") -> None:
    """
    Scrape a single URL using Firecrawl and ingest it.
    """
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        print("[ERROR] FIRECRAWL_API_KEY not set in .env")
        return

    app = FirecrawlApp(api_key=api_key)
    
    print(f"[Firecrawl] Scraping {url}...")
    try:
        # Scrape the URL
        scrape_result = app.scrape_url(url, params={'formats': ['markdown']})
        
        if not scrape_result or 'markdown' not in scrape_result:
            print(f"[ERROR] Failed to scrape {url}")
            return

        markdown_content = scrape_result['markdown']
        
        # Save to a temporary file for ingestion
        temp_dir = Path("temp_scrapes")
        temp_dir.mkdir(exist_ok=True)
        
        # Create a safe filename
        safe_name = url.replace("https://", "").replace("http://", "").replace("/", "_").replace(".", "_")[:50]
        file_path = temp_dir / f"{safe_name}.md"
        file_path.write_text(markdown_content, encoding="utf-8")
        
        print(f"[Firecrawl] Saved to {file_path}")
        
        # Ingest
        review_log: list[dict[str, Any]] = []
        ingest_file(
            file_path,
            collection,
            {"region": region, "document_type": "web_scrape", "source_url": url},
            review_log
        )
        
        # Cleanup
        # file_path.unlink()
        
    except Exception as e:
        print(f"[ERROR] Firecrawl scraping failed: {e}")


def crawl_url(url: str, collection: str, region: str = "india", limit: int = 10) -> None:
    """
    Crawl a website starting from URL and ingest discovered pages.
    """
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        print("[ERROR] FIRECRAWL_API_KEY not set in .env")
        return

    app = FirecrawlApp(api_key=api_key)
    
    print(f"[Firecrawl] Crawling {url} (limit: {limit})...")
    try:
        crawl_params = {
            'limit': limit,
            'scrapeOptions': {'formats': ['markdown']}
        }
        
        # This is a blocking call in the SDK
        crawl_result = app.crawl_url(url, params=crawl_params)
        
        if not crawl_result or 'data' not in crawl_result:
            print(f"[ERROR] Failed to crawl {url}")
            return

        temp_dir = Path("temp_scrapes")
        temp_dir.mkdir(exist_ok=True)
        
        review_log: list[dict[str, Any]] = []
        count = 0
        
        for item in crawl_result['data']:
            if 'markdown' not in item:
                continue
                
            page_url = item.get('url', 'unknown')
            markdown_content = item['markdown']
            
            # Save and ingest
            safe_name = page_url.replace("https://", "").replace("http://", "").replace("/", "_").replace(".", "_")[:50]
            file_path = temp_dir / f"{safe_name}.md"
            file_path.write_text(markdown_content, encoding="utf-8")
            
            ingest_file(
                file_path,
                collection,
                {"region": region, "document_type": "web_crawl", "source_url": page_url},
                review_log
            )
            count += 1
            
        print(f"[Firecrawl] Crawl complete. Ingested {count} pages.")
        
    except Exception as e:
        print(f"[ERROR] Firecrawl crawl failed: {e}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Firecrawl Scraper for RAG")
    parser.add_argument("--url", type=str, required=True, help="URL to scrape or crawl")
    parser.add_argument("--mode", type=str, choices=["scrape", "crawl"], default="scrape", help="Operation mode")
    parser.add_argument("--collection", type=str, required=True, help="Target ChromaDB collection")
    parser.add_argument("--region", type=str, default="india", help="Region metadata")
    parser.add_argument("--limit", type=int, default=5, help="Crawl limit")
    
    args = parser.parse_args()
    
    if args.mode == "scrape":
        scrape_url(args.url, args.collection, args.region)
    else:
        crawl_url(args.url, args.collection, args.region, args.limit)


if __name__ == "__main__":
    main()
