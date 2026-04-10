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
from .rag_specs import COLLECTIONS

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
    # Check if chromadb is alive optionally
    try:
        client = get_chroma_client()
        client.heartbeat()
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "ok", "service": "rag-retrieval", "chromadb": db_status}


@app.get("/metrics")
def metrics() -> dict[str, Any]:
    client = get_chroma_client()
    embedding_fn = get_embedding_function()
    stats = {}
    for c in COLLECTIONS:
        try:
            coll = get_or_create_collection(client, c, embedding_fn)
            stats[c] = coll.count()
        except Exception:
            stats[c] = -1
    return {"collections_count": stats}


@app.get("/collections")
def list_collections() -> dict[str, list[str]]:
    return {"collections": COLLECTIONS}


class DocumentUpdate(BaseModel):
    collection: str
    id: str
    content: str
    metadata: dict[str, Any]

@app.put("/document")
def update_document(update: DocumentUpdate):
    client = get_chroma_client()
    embedding_fn = get_embedding_function()
    collection = get_or_create_collection(client, update.collection, embedding_fn)
    try:
        collection.update(
            ids=[update.id],
            documents=[update.content],
            metadatas=[{k: str(v) for k, v in update.metadata.items()}],
        )
        return {"status": "success", "message": f"Updated document {update.id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update document: {e}")


@app.delete("/document")
def delete_document(collection_name: str, id: str):
    client = get_chroma_client()
    embedding_fn = get_embedding_function()
    try:
        collection = get_or_create_collection(client, collection_name, embedding_fn)
        collection.delete(ids=[id])
        return {"status": "success", "message": f"Deleted document {id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {e}")


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

    import time
    for attempt in range(3):
        try:
            results = collection.query(
                query_texts=[request.query],
                n_results=min(request.top_k, max(collection.count(), 1)),
                where=where_clause,
                include=["documents", "metadatas", "distances"],
            )
            break
        except Exception as e:
            if attempt == 2:
                raise HTTPException(status_code=500, detail=f"Query failed after retries: {e}")
            time.sleep(0.5)

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
