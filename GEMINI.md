# TRAVEL-Planner Project Overview

Production-grade multi-agent AI travel & hospitality system. This project implements a complex architecture with 13 specialized AI agents and 14 Model Context Protocol (MCP) tool servers to handle end-to-end travel planning, booking, and real-time support.

## Architecture & Tech Stack

- **Frontend:** Next.js (TypeScript) with Tailwind CSS.
- **Orchestrator:** TypeScript-based multi-agent system using Anthropic Claude models.
- **MCP Servers:** 14 specialized servers (flights, accommodation, weather, etc.).
- **Data Store:** PostgreSQL (via Prisma ORM), Redis (for event bus and session persistence).
- **RAG Pipeline:** Python-based ingestion and retrieval using ChromaDB and OpenAI embeddings.
- **Inter-Agent Communication:** Redis Streams based event-bus.

## Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm (v10+)
- Docker (for PostgreSQL, Redis, ChromaDB)
- Python 3.10+ (for RAG pipeline)

### Setup & Build
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Database setup
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# RAG Pipeline setup
cd packages/rag-pipeline
pip install -r requirements.txt
python3 src/ingest.py --seed
```

### RAG Pipeline & Knowledge Sourcing
The system uses a Python-based RAG pipeline with ChromaDB and OpenAI embeddings. Knowledge can be sourced from documents or web crawls.

#### Setup RAG
```bash
# Install dependencies
cd packages/rag-pipeline
pip install -r requirements.txt

# Start RAG retrieval service
python3 -m src.retrieval_service
```

#### Sourcing Knowledge with Firecrawl
Turn websites and comments into LLM-ready knowledge:
```bash
# Scrape a specific URL
python3 -m src.firecrawl_scraper --url "https://example.com/tips" --collection "local_knowledge"

# Crawl a site for comments/reviews
python3 -m src.firecrawl_scraper --mode "crawl" --url "https://reddit.com/r/travel" --collection "traveler_reviews" --limit 10

# Auto-source comments for a region
python3 -m src.comment_sourcer --region "pahalgam"
```
*Note: Requires `FIRECRAWL_API_KEY` in `.env`.*

### Running the System
```bash
# Start Docker services (Postgres, Redis, ChromaDB)
pnpm docker:up

# Run CLI demo
pnpm cli

# Start Frontend
pnpm --filter @travel/frontend dev
```

## Development Conventions

- **Monorepo Management:** Uses `pnpm` workspaces.
- **Package Structure:** 
  - `packages/shared`: Common types and utilities.
  - `packages/orchestrator`: Core agent logic.
  - `packages/mcp-*`: Individual MCP tool servers.
- **Testing:** 
  - Vitest for unit tests.
  - Custom acceptance test suite in `packages/orchestrator/src/tests/acceptance.ts`.
- **Database:** Prisma schema located in `prisma/schema.prisma`.

## Key Commands
- `pnpm build`: Build all packages.
- `pnpm test`: Run all tests.
- `pnpm acceptance`: Run end-to-end acceptance tests.
- `pnpm cli`: Interactive CLI agent experience.
- `pnpm docker:up`: Start infrastructure.
