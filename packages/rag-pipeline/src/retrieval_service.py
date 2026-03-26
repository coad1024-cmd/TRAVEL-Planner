"""
FastAPI retrieval service for ChromaDB.
Exposes POST /retrieve for semantic search with metadata filtering.
Wrapped as MCP tool `rag_retrieve` via mcp-rag-bridge.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .chroma_client import get_chroma_client, get_or_create_collection, get_embedding_function
from .collections import COLLECTIONS

app = FastAPI(title="Travel RAG Retrieval Service", version="1.0.0")


class RetrieveFilters(BaseModel):
    region: Optional[str] = None
    season: Optional[str] = None
    document_type: Optional[str] = None


class RetrieveRequest(BaseModel):
    collection: str = Field(..., description="One of the 9 RAG collections")
    query: str = Field(..., min_length=1, description="Natural language query")
    filters: Optional[RetrieveFilters] = None
    top_k: int = Field(default=5, ge=1, le=20)


class RetrievedChunk(BaseModel):
    id: str
    content: str
    metadata: dict[str, Any]
    similarity_score: float


class RetrieveResponse(BaseModel):
    chunks: list[RetrievedChunk]
    collection: str
    query: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "rag-retrieval"}


@app.get("/collections")
def list_collections() -> dict[str, list[str]]:
    return {"collections": COLLECTIONS}


@app.post("/retrieve", response_model=RetrieveResponse)
def retrieve(request: RetrieveRequest) -> RetrieveResponse:
    if request.collection not in COLLECTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown collection '{request.collection}'. Valid: {COLLECTIONS}",
        )

    client = get_chroma_client()
    embedding_fn = get_embedding_function()

    try:
        collection = get_or_create_collection(client, request.collection, embedding_fn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to access collection: {e}")

    # Build metadata filter (ChromaDB $where syntax)
    where_clause: Optional[dict[str, Any]] = None
    if request.filters:
        conditions = []
        if request.filters.region:
            conditions.append({"region": {"$eq": request.filters.region}})
        if request.filters.season:
            conditions.append({"season_applicability": {"$contains": request.filters.season}})
        if request.filters.document_type:
            conditions.append({"document_type": {"$eq": request.filters.document_type}})

        if len(conditions) == 1:
            where_clause = conditions[0]
        elif len(conditions) > 1:
            where_clause = {"$and": conditions}

    try:
        results = collection.query(
            query_texts=[request.query],
            n_results=min(request.top_k, max(collection.count(), 1)),
            where=where_clause,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

    chunks: list[RetrievedChunk] = []
    ids = results.get("ids", [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for i, (doc_id, doc, meta, dist) in enumerate(zip(ids, documents, metadatas, distances)):
        # ChromaDB returns L2 distance; convert to cosine similarity approx
        similarity = max(0.0, 1.0 - float(dist))
        chunks.append(RetrievedChunk(
            id=doc_id,
            content=doc,
            metadata=meta or {},
            similarity_score=round(similarity, 4),
        ))

    return RetrieveResponse(
        chunks=chunks,
        collection=request.collection,
        query=request.query,
    )
