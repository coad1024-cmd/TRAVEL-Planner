"""
ChromaDB client setup with OpenAI embedding function.
Creates and manages all 9 collections with persistent storage.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import chromadb
from chromadb import Collection
from chromadb.utils import embedding_functions

from .rag_specs import COLLECTIONS


def get_persist_path() -> str:
    path = os.environ.get("CHROMA_PERSIST_PATH", "./data/chroma")
    Path(path).mkdir(parents=True, exist_ok=True)
    return path


def get_embedding_function() -> embedding_functions.OpenAIEmbeddingFunction:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[WARN] OPENAI_API_KEY not set — using default embedding function (cosine similarity only)")
        return embedding_functions.DefaultEmbeddingFunction()  # type: ignore[return-value]
    return embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name="text-embedding-3-small",
    )


def get_chroma_client() -> chromadb.PersistentClient:
    persist_path = get_persist_path()
    return chromadb.PersistentClient(path=persist_path)


def get_or_create_collection(
    client: chromadb.PersistentClient,
    name: str,
    embedding_fn: Optional[embedding_functions.EmbeddingFunction] = None,
) -> Collection:
    if embedding_fn is None:
        embedding_fn = get_embedding_function()
    return client.get_or_create_collection(
        name=name,
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"},
    )


def setup_all_collections() -> dict[str, Collection]:
    """
    Initialize ChromaDB with all 9 collections.
    Returns a mapping of collection_name → Collection.
    """
    client = get_chroma_client()
    embedding_fn = get_embedding_function()

    collections: dict[str, Collection] = {}
    for name in COLLECTIONS:
        col = get_or_create_collection(client, name, embedding_fn)
        collections[name] = col
        print(f"[ChromaDB] Collection ready: {name} ({col.count()} documents)")

    return collections
