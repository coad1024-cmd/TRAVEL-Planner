import sys
import os
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.chunker import chunk_document, _split_by_tokens
from src.metadata_enricher import _heuristic_metadata, needs_human_review

def test_split_by_tokens():
    text = "This is a simple test. " * 20
    chunks = _split_by_tokens(text, max_tokens=10, overlap_tokens=2)
    assert len(chunks) > 1

def test_chunk_document_regulatory():
    text = "\nRule 1. Don't do this.\nClause 2. Do this instead."
    chunks = chunk_document(text, "regulatory", {"source": "test"})
    assert len(chunks) == 2
    assert chunks[0].metadata["chunk_strategy"] == "semantic_legal"

def test_chunk_document_unknown():
    with pytest.raises(ValueError):
        chunk_document("text", "unknown_collection", {})

def test_heuristic_metadata():
    text = "We went to Srinagar in the winter and stayed at a nice hotel."
    meta = _heuristic_metadata(text, {"base": "meta"})
    assert meta["region"] == "srinagar"
    assert "winter" in meta["season_applicability"]
    assert meta["document_type"] == "accommodation_info"

def test_needs_human_review():
    assert needs_human_review({"confidence_score": 0.5}) is True
    assert needs_human_review({"confidence_score": 0.9}) is False
