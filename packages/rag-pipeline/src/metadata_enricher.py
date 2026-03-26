"""
GPT-4o-mini metadata enrichment for RAG chunks.
Generates: region, season_applicability, document_type, confidence_score.
Chunks with confidence_score < 0.8 are flagged for human review.
"""
from __future__ import annotations

import json
import os
from typing import Any

ENRICHMENT_PROMPT = """You are a metadata extraction assistant for a travel knowledge base.

Given the following document chunk, extract structured metadata as JSON with these fields:
- region: the specific geographic region (e.g., "pahalgam", "kashmir", "jammu", "india", "global")
- season_applicability: comma-separated applicable seasons (spring, summer, monsoon, autumn, winter, all)
- document_type: one of (regulatory, accommodation_info, activity_guide, weather_report, road_report, festival_calendar, food_guide, hospital_directory, emergency_protocol, traveler_review, dispute_procedure, local_tip)
- confidence_score: float 0.0-1.0 indicating how well-structured and accurate this chunk appears

Return ONLY valid JSON, no markdown.

Chunk:
{chunk}"""


def enrich_chunk_metadata(chunk_text: str, base_metadata: dict[str, Any]) -> dict[str, Any]:
    """
    Call GPT-4o-mini to generate metadata tags for a chunk.
    Falls back to heuristic metadata if OpenAI API unavailable.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _heuristic_metadata(chunk_text, base_metadata)

    try:
        import openai
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": ENRICHMENT_PROMPT.format(chunk=chunk_text[:1500])}
            ],
            max_tokens=200,
            temperature=0,
        )
        raw = response.choices[0].message.content or "{}"
        enriched = json.loads(raw)
        return {**base_metadata, **enriched}
    except Exception as e:
        print(f"[MetadataEnricher] OpenAI call failed: {e}. Using heuristic fallback.")
        return _heuristic_metadata(chunk_text, base_metadata)


def _heuristic_metadata(chunk_text: str, base_metadata: dict[str, Any]) -> dict[str, Any]:
    """Simple keyword-based metadata extraction as fallback."""
    text_lower = chunk_text.lower()

    # Region detection
    region = "india"
    for keyword, r in [
        ("pahalgam", "pahalgam"),
        ("kashmir", "kashmir"),
        ("srinagar", "srinagar"),
        ("jammu", "jammu"),
        ("aru valley", "aru_valley"),
        ("betaab", "betaab_valley"),
        ("chandanwari", "chandanwari"),
    ]:
        if keyword in text_lower:
            region = r
            break

    # Season detection
    seasons = []
    if any(w in text_lower for w in ["winter", "snow", "december", "january", "february"]):
        seasons.append("winter")
    if any(w in text_lower for w in ["spring", "march", "april", "may"]):
        seasons.append("spring")
    if any(w in text_lower for w in ["summer", "june", "july"]):
        seasons.append("summer")
    if any(w in text_lower for w in ["monsoon", "rain", "flood", "august", "september"]):
        seasons.append("monsoon")
    if any(w in text_lower for w in ["autumn", "october", "november"]):
        seasons.append("autumn")
    if not seasons:
        seasons = ["all"]

    # Document type
    doc_type = base_metadata.get("document_type", "local_tip")
    if any(w in text_lower for w in ["visa", "permit", "regulation", "ilp", "inner line"]):
        doc_type = "regulatory"
    elif any(w in text_lower for w in ["hotel", "lodge", "houseboat", "check-in", "amenities"]):
        doc_type = "accommodation_info"
    elif any(w in text_lower for w in ["trek", "hike", "valley", "glacier", "activity", "excursion"]):
        doc_type = "activity_guide"
    elif any(w in text_lower for w in ["hospital", "clinic", "doctor", "medical", "emergency"]):
        doc_type = "hospital_directory"
    elif any(w in text_lower for w in ["weather", "temperature", "forecast", "rainfall"]):
        doc_type = "weather_report"

    return {
        **base_metadata,
        "region": region,
        "season_applicability": ",".join(seasons),
        "document_type": doc_type,
        "confidence_score": 0.75,  # Conservative for heuristic
    }


def needs_human_review(metadata: dict[str, Any]) -> bool:
    score = float(metadata.get("confidence_score", 0))
    return score < 0.8
