"""
Document ingestion pipeline.
Layer 1: Extract via unstructured.io
Layer 2: Enrich metadata via GPT-4o-mini
Layer 3: Validate confidence_score, flag low-confidence chunks
Layer 4: Embed and store in ChromaDB
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")

from .chroma_client import setup_all_collections, get_or_create_collection, get_chroma_client, get_embedding_function
from .chunker import chunk_document
from .collections import COLLECTIONS
from .metadata_enricher import enrich_chunk_metadata, needs_human_review


def extract_text(file_path: Path) -> str:
    """
    Layer 1: Extract text from document.
    Uses unstructured.io for PDFs, plain text fallback for .txt files.
    """
    suffix = file_path.suffix.lower()
    if suffix == ".txt" or suffix == ".md":
        return file_path.read_text(encoding="utf-8")

    if suffix == ".pdf":
        try:
            from unstructured.partition.pdf import partition_pdf
            elements = partition_pdf(
                filename=str(file_path),
                strategy="hi_res",
            )
            return "\n\n".join(str(e) for e in elements)
        except ImportError:
            print("[WARN] unstructured not installed. Using PyPDF fallback.")
        except Exception as e:
            print(f"[WARN] unstructured failed for {file_path}: {e}. Trying PyPDF.")

        try:
            import pypdf
            reader = pypdf.PdfReader(str(file_path))
            return "\n\n".join(page.extract_text() for page in reader.pages)
        except ImportError:
            print("[ERROR] Neither unstructured nor pypdf available. Cannot parse PDF.")
            return ""

    # JSON files (structured data like property listings)
    if suffix == ".json":
        data = json.loads(file_path.read_text(encoding="utf-8"))
        return json.dumps(data, indent=2)

    # Generic fallback
    return file_path.read_text(encoding="utf-8", errors="replace")


def chunk_id(file_path: Path, chunk_index: int, content: str) -> str:
    """Deterministic chunk ID for deduplication."""
    h = hashlib.md5(f"{file_path}:{chunk_index}:{content[:100]}".encode()).hexdigest()[:12]
    return f"{file_path.stem}_{chunk_index}_{h}"


def ingest_file(
    file_path: Path,
    collection_name: str,
    base_metadata: dict[str, Any],
    review_log: list[dict[str, Any]],
) -> int:
    """Ingest a single file into the given collection. Returns number of chunks added."""
    print(f"[Ingest] Processing {file_path.name} → {collection_name}")

    # Layer 1: Extract
    text = extract_text(file_path)
    if not text.strip():
        print(f"  [SKIP] Empty text extracted from {file_path}")
        return 0

    # Chunk
    chunks = chunk_document(text, collection_name, {
        **base_metadata,
        "source_url": str(file_path),
        "last_verified_date": "2026-01-01",
    })

    client = get_chroma_client()
    embedding_fn = get_embedding_function()
    collection = get_or_create_collection(client, collection_name, embedding_fn)

    added = 0
    for i, chunk in enumerate(chunks):
        if not chunk.content.strip():
            continue

        # Layer 2: Enrich metadata
        enriched_meta = enrich_chunk_metadata(chunk.content, chunk.metadata)

        # Layer 3: Flag low-confidence chunks
        if needs_human_review(enriched_meta):
            review_log.append({
                "file": str(file_path),
                "chunk_index": i,
                "confidence_score": enriched_meta.get("confidence_score"),
                "preview": chunk.content[:200],
            })

        cid = chunk_id(file_path, i, chunk.content)

        # Layer 4: Store
        collection.upsert(
            ids=[cid],
            documents=[chunk.content],
            metadatas=[{k: str(v) for k, v in enriched_meta.items()}],
        )
        added += 1

    print(f"  Added {added} chunks ({len([r for r in review_log if r['file'] == str(file_path)])} flagged for review)")
    return added


def ingest_directory(
    base_dir: Path,
    collection: str,
    base_metadata: dict[str, Any],
) -> None:
    """
    Ingest all documents in a directory into a collection.
    Expected structure: docs/{collection_name}/*.{pdf,txt,json,md}
    """
    review_log: list[dict[str, Any]] = []
    total = 0

    for file_path in sorted(base_dir.rglob("*")):
        if file_path.is_file() and file_path.suffix.lower() in {".pdf", ".txt", ".json", ".md"}:
            total += ingest_file(file_path, collection, base_metadata, review_log)

    print(f"\n[Ingest] Done: {total} total chunks in '{collection}'")
    if review_log:
        review_path = base_dir / "review_flagged.json"
        review_path.write_text(json.dumps(review_log, indent=2))
        print(f"  {len(review_log)} chunks flagged for human review → {review_path}")


def seed_pahalgam_knowledge() -> None:
    """
    Seed the RAG collections with hardcoded Pahalgam domain knowledge
    from Section 9 of the master document. This enables the system to function
    without uploading actual PDFs.
    """
    print("\n[Seed] Seeding Pahalgam domain knowledge...")

    seeds = {
        "geo_context": [
            {
                "content": "Pahalgam transport: Srinagar Airport (SXR) is 90km from Pahalgam. Drive takes 2.5-4 hours depending on season and tunnel status. Helicopter service is available seasonally (May-October). There is no direct rail connection to Pahalgam.",
                "metadata": {"region": "pahalgam", "season": "all", "document_type": "road_report", "confidence_score": "0.95"},
            },
            {
                "content": "Pahalgam connectivity: 4G mobile network available in Pahalgam town only. Signal is spotty or absent in Aru Valley, Chandanwari, and higher altitude treks. Postpaid SIM cards only — prepaid SIMs do not work in Jammu & Kashmir for non-residents.",
                "metadata": {"region": "pahalgam", "season": "all", "document_type": "local_tip", "confidence_score": "0.95"},
            },
            {
                "content": "Pahalgam seasonal calendar: Peak tourist season May-September. Amarnath Yatra pilgrimages (July-August) cause extreme congestion on all roads and in town — prices double and accommodation books out. Winter (Dec-Feb): snow activities possible but many services closed, road closures likely. October-November: cold nights but less crowded.",
                "metadata": {"region": "pahalgam", "season": "all", "document_type": "festival_calendar", "confidence_score": "0.95"},
            },
            {
                "content": "Pahalgam accommodation zones: Town center (budget to mid-range). East Lidder riverbank (mid to luxury). Aru Road corridor (boutique and glamping). Betaab Valley periphery (luxury resorts with valley views).",
                "metadata": {"region": "pahalgam", "season": "all", "document_type": "accommodation_info", "confidence_score": "0.92"},
            },
        ],
        "excursions": [
            {
                "content": "Betaab Valley: 8km from Pahalgam town. Named after Bollywood film. Easy difficulty, suitable for all fitness levels, no trekking required. Drive 20 min. Best in morning before crowds. Entry fee applicable. Stunning meadow with Lidder river views. Ideal for honeymoon photography.",
                "metadata": {"region": "betaab_valley", "season": "summer,spring,autumn", "document_type": "activity_guide", "confidence_score": "0.93"},
            },
            {
                "content": "Aru Valley: 12km from Pahalgam. 1.5 hour drive from town. Optional 2-hour moderate trek available from Aru village. Altitude ~2400m. Spectacular meadows and mountains. Base camp for Kolahoi Glacier and Tarsar Marsar Lake treks. Excellent for horse riding. Moderate fitness required for trek.",
                "metadata": {"region": "aru_valley", "season": "summer,spring,autumn", "document_type": "activity_guide", "confidence_score": "0.93"},
            },
            {
                "content": "Chandanwari Glacier: 16km from Pahalgam, 1 hour drive. Altitude 2895m. Moderate fitness required. Snow sledding available (even in summer). Starting point for Amarnath Yatra pilgrimage. Allow half day. Weather dependent — check forecast before going. Risk of altitude sickness above 2500m — acclimatize first.",
                "metadata": {"region": "chandanwari", "season": "summer,spring", "document_type": "activity_guide", "confidence_score": "0.93"},
            },
            {
                "content": "Baisaran Meadow (Mini Switzerland): 5km from Pahalgam, accessible by horse (1 hour ride) or short trek (2 hours). Altitude ~2440m. No road access — horses or trekking only. Dense pine forests and open meadows. Moderate fitness. Half-day excursion.",
                "metadata": {"region": "pahalgam", "season": "summer,spring,autumn", "document_type": "activity_guide", "confidence_score": "0.91"},
            },
            {
                "content": "Shikara rides: Available on Dal Lake and Nagin Lake in Srinagar (not Pahalgam). If trip includes Srinagar overnight, shikara rides are highly recommended. Duration 1-2 hours. Sunset rides most scenic. Cost: INR 500-1500 per hour. No fitness requirement.",
                "metadata": {"region": "srinagar", "season": "summer,spring,autumn", "document_type": "activity_guide", "confidence_score": "0.94"},
            },
            {
                "content": "Tulian Lake: Full-day trek from Pahalgam (7-8 hours round trip). Altitude 3353m — significant altitude risk, acclimatization required. Hard difficulty. Guide mandatory. Stunning high-altitude lake. Not recommended for first-time trekkers or anyone with heart/respiratory conditions.",
                "metadata": {"region": "pahalgam", "season": "summer", "document_type": "activity_guide", "confidence_score": "0.92"},
            },
        ],
        "health_safety": [
            {
                "content": "SKIMS Srinagar (Shri Maharaja Hari Singh Hospital): Major referral hospital. Address: Soura, Srinagar. Distance from Pahalgam: ~90km (2.5 hrs). 24-hour emergency. Specialties: cardiology, orthopedics, general surgery, neurology. Emergency: +91-194-2401013.",
                "metadata": {"region": "srinagar", "season": "all", "document_type": "hospital_directory", "confidence_score": "0.95"},
            },
            {
                "content": "Primary Health Centre Pahalgam: Basic medical facility in Pahalgam town. Handles minor injuries, altitude sickness (basic), general illness. Distance: 0km (in town). Hours: 9am-5pm. For emergencies after hours: Anantnag District Hospital (30km). Not equipped for major trauma.",
                "metadata": {"region": "pahalgam", "season": "all", "document_type": "hospital_directory", "confidence_score": "0.92"},
            },
            {
                "content": "Altitude sickness in Pahalgam region: Chandanwari (2895m) and Tulian Lake (3353m) have altitude risk. Symptoms: headache, nausea, fatigue, shortness of breath. Prevention: acclimatize 24hrs at Pahalgam before high-altitude excursions, stay hydrated, avoid alcohol. Treatment: descend immediately if symptoms worsen. Diamox (acetazolamide) for prevention — consult doctor before trip.",
                "metadata": {"region": "pahalgam", "season": "all", "document_type": "emergency_protocol", "confidence_score": "0.94"},
            },
        ],
        "regulatory": [
            {
                "content": "Inner Line Permit (ILP): Required for certain restricted areas near Line of Control in J&K. NOT required for Pahalgam, Gulmarg, Sonmarg, or standard tourist circuits. Required for Gurez Valley, Lolab Valley. Apply at DC Office Srinagar or online at jktourism.org. Processing: 1-2 days. Free of cost.",
                "metadata": {"region": "kashmir", "season": "all", "document_type": "regulatory", "confidence_score": "0.90"},
            },
        ],
        "emergency_protocols": [
            {
                "content": "Kashmir emergency contacts: Police: 100 or 01932-245247 (Anantnag district). Ambulance: 108 (EMRI). Fire: 101. Tourist Police Srinagar: +91-194-2477840. Army helpline: 1800-180-1900 (toll free). Embassy of India emergency is not applicable — these are for foreign nationals in India to contact their home embassy.",
                "metadata": {"region": "kashmir", "season": "all", "document_type": "emergency_protocol", "confidence_score": "0.95"},
            },
            {
                "content": "Lost passport procedure in India: 1) File FIR at nearest police station (get copy). 2) Contact your country's embassy/consulate in New Delhi or Chennai. 3) Apply for Emergency Travel Certificate (ETC) with photos + FIR + proof of nationality. 4) ETC valid for single journey home. Processing 3-5 business days. Contact FRRO (Foreigners Regional Registration Office) in Srinagar if visa-related.",
                "metadata": {"region": "india", "season": "all", "document_type": "emergency_protocol", "confidence_score": "0.93"},
            },
        ],
        "local_knowledge": [
            {
                "content": "Best vegetarian restaurants Pahalgam: Nathu's Restaurant (town center, multi-cuisine), Hotel Mountainview Restaurant (good Kashmiri wazwan veg options), Café de Paris (bakery + light meals). Most dhabas offer aloo dum, rajma, kadhi — safe for strict vegetarians.",
                "metadata": {"region": "pahalgam", "season": "all", "document_type": "food_guide", "confidence_score": "0.82"},
            },
            {
                "content": "Money and ATMs in Pahalgam: 1-2 ATMs in main market (J&K Bank, SBI) — often have queues and may run out of cash during peak season. Carry sufficient cash from Srinagar. Most hotels accept cards but connection is unreliable. UPI works in town where 4G available.",
                "metadata": {"region": "pahalgam", "season": "all", "document_type": "local_tip", "confidence_score": "0.88"},
            },
            {
                "content": "Honeymoon tips Pahalgam: Book accommodation on Lidder riverbank for romantic setting. Request valley-view or river-view room. Avoid July-August (Amarnath Yatra overcrowding). Best months: June and September. Many properties offer honeymoon packages (flower decoration, dinner). Pack warm layers even in June — evenings below 10°C.",
                "metadata": {"region": "pahalgam", "season": "summer,spring,autumn", "document_type": "local_tip", "confidence_score": "0.90"},
            },
        ],
    }

    client = get_chroma_client()
    embedding_fn = get_embedding_function()

    for collection_name, items in seeds.items():
        collection = get_or_create_collection(client, collection_name, embedding_fn)
        ids = [f"seed_{collection_name}_{i}" for i in range(len(items))]
        documents = [item["content"] for item in items]
        metadatas = [item["metadata"] for item in items]

        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
        print(f"  Seeded {len(items)} items into '{collection_name}'")

    print("[Seed] Complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Travel RAG ingestion pipeline")
    parser.add_argument("--seed", action="store_true", help="Seed Pahalgam domain knowledge")
    parser.add_argument("--dir", type=str, help="Directory to ingest documents from")
    parser.add_argument("--collection", type=str, choices=COLLECTIONS, help="Target collection")
    parser.add_argument("--region", type=str, default="india", help="Default region metadata")
    args = parser.parse_args()

    # Initialize all collections
    setup_all_collections()

    if args.seed:
        seed_pahalgam_knowledge()

    if args.dir and args.collection:
        ingest_directory(
            Path(args.dir),
            args.collection,
            {"region": args.region, "document_type": "unknown"},
        )


if __name__ == "__main__":
    main()
