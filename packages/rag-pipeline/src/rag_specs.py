"""
ChromaDB collection definitions and setup.
All 9 RAG collections with metadata schema and embedding config.
"""
from __future__ import annotations

import os
from typing import NamedTuple

# Collection specifications from the master document
COLLECTIONS = [
    "regulatory",       # Visa/permit PDFs, border rules, ILP docs
    "accommodation",    # Hotel/lodge brochures, policy docs, amenity lists
    "excursions",       # Activity guides, trek routes, equipment lists
    "geo_context",      # Weather data, road reports, festival calendars
    "health_safety",    # Hospital directories, emergency protocols
    "traveler_reviews", # Past customer feedback per property/activity
    "dispute_playbooks",# Refund procedures, claim templates by vendor
    "emergency_protocols",  # Per-country crisis guides, evacuation procedures
    "local_knowledge",  # Crowdsourced tips from previous travelers
]

# Required metadata fields for every chunk across all collections
METADATA_FIELDS = [
    "region",
    "season",           # spring | summer | monsoon | autumn | winter
    "document_type",
    "source_url",
    "last_verified_date",
    "confidence_score", # float 0-1; chunks < 0.8 flagged for human review
]


class CollectionSpec(NamedTuple):
    name: str
    chunk_size_min: int
    chunk_size_max: int
    chunk_overlap: int
    chunk_strategy: str


COLLECTION_SPECS: dict[str, CollectionSpec] = {
    "regulatory": CollectionSpec(
        name="regulatory",
        chunk_size_min=500,
        chunk_size_max=800,
        chunk_overlap=100,
        chunk_strategy="semantic_legal",
    ),
    "accommodation": CollectionSpec(
        name="accommodation",
        chunk_size_min=300,
        chunk_size_max=600,
        chunk_overlap=50,
        chunk_strategy="per_property",
    ),
    "excursions": CollectionSpec(
        name="excursions",
        chunk_size_min=400,
        chunk_size_max=700,
        chunk_overlap=75,
        chunk_strategy="per_activity",
    ),
    "geo_context": CollectionSpec(
        name="geo_context",
        chunk_size_min=300,
        chunk_size_max=500,
        chunk_overlap=50,
        chunk_strategy="temporal_spatial",
    ),
    "health_safety": CollectionSpec(
        name="health_safety",
        chunk_size_min=200,
        chunk_size_max=400,
        chunk_overlap=25,
        chunk_strategy="per_facility_or_protocol",
    ),
    "traveler_reviews": CollectionSpec(
        name="traveler_reviews",
        chunk_size_min=200,
        chunk_size_max=400,
        chunk_overlap=25,
        chunk_strategy="per_review",
    ),
    "dispute_playbooks": CollectionSpec(
        name="dispute_playbooks",
        chunk_size_min=300,
        chunk_size_max=500,
        chunk_overlap=50,
        chunk_strategy="per_vendor_per_procedure",
    ),
    "emergency_protocols": CollectionSpec(
        name="emergency_protocols",
        chunk_size_min=400,
        chunk_size_max=600,
        chunk_overlap=75,
        chunk_strategy="per_country_per_scenario",
    ),
    "local_knowledge": CollectionSpec(
        name="local_knowledge",
        chunk_size_min=200,
        chunk_size_max=300,
        chunk_overlap=25,
        chunk_strategy="per_tip",
    ),
}
