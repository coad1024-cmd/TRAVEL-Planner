"""
YouTube Sourcer for TRAVEL-Planner.
Extracts knowledge from YouTube video transcripts and descriptions.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any

from youtube_transcript_api import YouTubeTranscriptApi
from .ingest import ingest_file

def extract_video_id(url: str) -> str | None:
    """Extract video ID from various YouTube URL formats."""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/|v\/|youtu.be\/)([0-9A-Za-z_-]{11})'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def source_youtube(url: str, collection: str = "local_knowledge", region: str = "india") -> None:
    """
    Get transcript for a YouTube video and ingest it.
    """
    video_id = extract_video_id(url)
    if not video_id:
        print(f"[ERROR] Could not extract video ID from {url}")
        return

    print(f"[YouTube] Fetching transcript for {video_id}...")
    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        full_text = " ".join([t['text'] for t in transcript_list])
        
        # Save to temporary file
        temp_dir = Path("temp_scrapes")
        temp_dir.mkdir(exist_ok=True)
        file_path = temp_dir / f"youtube_{video_id}.txt"
        file_path.write_text(full_text, encoding="utf-8")
        
        print(f"[YouTube] Transcript saved to {file_path}")
        
        # Ingest
        review_log: list[dict[str, Any]] = []
        ingest_file(
            file_path,
            collection,
            {
                "region": region,
                "document_type": "vlog_transcript",
                "source_url": url,
                "video_id": video_id
            },
            review_log
        )
        
    except Exception as e:
        print(f"[ERROR] YouTube sourcing failed: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Source travel knowledge from YouTube")
    parser.add_argument("--url", type=str, required=True, help="YouTube video URL")
    parser.add_argument("--collection", type=str, default="local_knowledge", help="Target collection")
    parser.add_argument("--region", type=str, default="india", help="Region metadata")
    
    args = parser.parse_args()
    source_youtube(args.url, args.collection, args.region)
