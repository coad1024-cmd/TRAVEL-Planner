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
