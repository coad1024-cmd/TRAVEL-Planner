"""
Collection-specific chunking strategies.
Each collection has its own strategy based on document type and retrieval pattern.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
import re

from .rag_specs import COLLECTION_SPECS


@dataclass
class Chunk:
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


def _split_by_tokens(text: str, max_tokens: int, overlap_tokens: int) -> list[str]:
    """Approximate token-based splitting (1 token ≈ 4 chars)."""
    max_chars = max_tokens * 4
    overlap_chars = overlap_tokens * 4
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        # Try to break on sentence boundary
        if end < len(text):
            boundary = text.rfind('. ', start, end)
            if boundary > start + max_chars // 2:
                end = boundary + 1
        chunks.append(text[start:end].strip())
        start = end - overlap_chars
    return [c for c in chunks if c]


def chunk_regulatory(text: str, base_metadata: dict[str, Any]) -> list[Chunk]:
    """Semantic by legal clause — each chunk self-contained (rule + conditions)."""
    spec = COLLECTION_SPECS["regulatory"]
    # Try to split on numbered clauses or section headers
    clause_pattern = re.compile(r'\n(?=(?:\d+\.|Section|Article|Rule|Clause)\s)', re.IGNORECASE)
    parts = clause_pattern.split(text)
    if len(parts) < 2:
        parts = _split_by_tokens(text, spec.chunk_size_max, spec.chunk_overlap)
    return [Chunk(content=p.strip(), metadata={**base_metadata, "chunk_strategy": "semantic_legal"})
            for p in parts if p.strip()]


def chunk_per_property(text: str, base_metadata: dict[str, Any]) -> list[Chunk]:
    """Per-property — one chunk = one property description."""
    spec = COLLECTION_SPECS["accommodation"]
    parts = _split_by_tokens(text, spec.chunk_size_max, spec.chunk_overlap)
    return [Chunk(content=p, metadata={**base_metadata, "chunk_strategy": "per_property"})
            for p in parts]


def chunk_per_activity(text: str, base_metadata: dict[str, Any]) -> list[Chunk]:
    """Per-activity — one chunk = one activity + all metadata."""
    spec = COLLECTION_SPECS["excursions"]
    parts = _split_by_tokens(text, spec.chunk_size_max, spec.chunk_overlap)
    return [Chunk(content=p, metadata={**base_metadata, "chunk_strategy": "per_activity"})
            for p in parts]


def chunk_temporal_spatial(text: str, base_metadata: dict[str, Any]) -> list[Chunk]:
    """Tagged by region + month/season + data_type."""
    spec = COLLECTION_SPECS["geo_context"]
    parts = _split_by_tokens(text, spec.chunk_size_max, spec.chunk_overlap)
    return [Chunk(content=p, metadata={**base_metadata, "chunk_strategy": "temporal_spatial"})
            for p in parts]


def chunk_per_facility(text: str, base_metadata: dict[str, Any]) -> list[Chunk]:
    """Per facility or protocol — each facility = one chunk with coords + specialties."""
    spec = COLLECTION_SPECS["health_safety"]
    parts = _split_by_tokens(text, spec.chunk_size_max, spec.chunk_overlap)
    return [Chunk(content=p, metadata={**base_metadata, "chunk_strategy": "per_facility_or_protocol"})
            for p in parts]


def chunk_per_review(text: str, base_metadata: dict[str, Any]) -> list[Chunk]:
    """Per-review — tagged by property_id/activity_id + rating + trip_date."""
    # Each review is typically short; treat whole text as one chunk
    return [Chunk(content=text.strip(), metadata={**base_metadata, "chunk_strategy": "per_review"})]


def chunk_per_vendor(text: str, base_metadata: dict[str, Any]) -> list[Chunk]:
    """Per-vendor-per-procedure."""
    spec = COLLECTION_SPECS["dispute_playbooks"]
    parts = _split_by_tokens(text, spec.chunk_size_max, spec.chunk_overlap)
    return [Chunk(content=p, metadata={**base_metadata, "chunk_strategy": "per_vendor_per_procedure"})
            for p in parts]


def chunk_per_country_scenario(text: str, base_metadata: dict[str, Any]) -> list[Chunk]:
    """Per-country-per-scenario."""
    spec = COLLECTION_SPECS["emergency_protocols"]
    parts = _split_by_tokens(text, spec.chunk_size_max, spec.chunk_overlap)
    return [Chunk(content=p, metadata={**base_metadata, "chunk_strategy": "per_country_per_scenario"})
            for p in parts]


def chunk_per_tip(text: str, base_metadata: dict[str, Any]) -> list[Chunk]:
    """Per-tip — tagged by region + category + recency."""
    # Tips are short; split by line breaks first
    tips = [line.strip() for line in text.split('\n') if line.strip()]
    spec = COLLECTION_SPECS["local_knowledge"]
    if not tips or max(len(t) for t in tips) < 50:
        # Merge into single chunk if tips are very short
        return [Chunk(content=text.strip(), metadata={**base_metadata, "chunk_strategy": "per_tip"})]
    return [Chunk(content=tip, metadata={**base_metadata, "chunk_strategy": "per_tip"}) for tip in tips]


CHUNKERS = {
    "regulatory": chunk_regulatory,
    "accommodation": chunk_per_property,
    "excursions": chunk_per_activity,
    "geo_context": chunk_temporal_spatial,
    "health_safety": chunk_per_facility,
    "traveler_reviews": chunk_per_review,
    "dispute_playbooks": chunk_per_vendor,
    "emergency_protocols": chunk_per_country_scenario,
    "local_knowledge": chunk_per_tip,
}


def chunk_document(text: str, collection: str, base_metadata: dict[str, Any]) -> list[Chunk]:
    chunker = CHUNKERS.get(collection)
    if not chunker:
        raise ValueError(f"No chunker for collection: {collection}")
    return chunker(text, base_metadata)
