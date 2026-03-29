# Multi-Agent Travel & Hospitality System

A production-grade multi-agent AI system that plans, books, manages, and supports complex travel itineraries — from initial planning through active trip support to post-trip maintenance.

## Architecture

- **13 Specialized AI Agents** (Relationship Manager, Synthesizer, Logistics, Accommodation, Excursion, Budget, Security, Locations Intel, Concierge, Live Re-Routing, Emergency, Feedback/Claims, Profile)
- **14 MCP Tool Servers** (flights, accommodation, routing, weather, currency, safety, places, notifications, flight-status, emergency, payments, messaging, profile, RAG)
- **RAG Knowledge Base** (ChromaDB, 9 collections, OpenAI embeddings, Pahalgam domain knowledge pre-seeded)
- **Redis Streams** event bus for real-time inter-agent communication
- **PostgreSQL** state store (Prisma ORM)
- **Next.js** frontend with trip planner, agent activity feed, itinerary view

## Quick Start

### 1. Copy environment file & Start Docker Services
```bash
cp .env.example .env
# Fill in API keys (system works without them in mock mode)
# Required for full functionality: ANTHROPIC_API_KEY
```

If you prefer to run PostgreSQL, Redis, and ChromaDB inside Docker containers instead of locally, start them now:
```bash
pnpm docker:up
# You can tear them down later with: pnpm docker:down
```

### 2. Set up PostgreSQL Database
The system requires a PostgreSQL database for state storage (trips, segments, expenses, etc.).
Ensure you have PostgreSQL running locally or remotely, then:
\`\`\`bash
# 1. Update DATABASE_URL in your .env file
# 2. Run initial Prisma migration:
pnpm db:migrate
# 3. Generate the Prisma client:
pnpm db:generate
# 4. Seed demo data:
pnpm db:seed
\`\`\`

### 3. Install dependencies
\`\`\`bash
pnpm install
\`\`\`

### 3. Build all packages
```bash
pnpm build
```

### 4. Seed RAG knowledge base (Python)
```bash
cd packages/rag-pipeline
pip install -r requirements.txt
python3 src/ingest.py --seed
```

### 5. Run the CLI demo
```bash
pnpm cli
# Then type: "Plan a honeymoon trip to Pahalgam, Kashmir for 2 people, June 15-22, INR 150,000 budget"
```

### 6. Run acceptance tests
```bash
pnpm acceptance
# Requires ANTHROPIC_API_KEY for LLM-dependent tests
```

### 7. Start the frontend
```bash
pnpm --filter @travel/frontend dev
# Visit http://localhost:3000
```

## Package Structure

```
packages/
  shared/              — TypeScript types, schemas, event bus, utilities
  orchestrator/        — 13 agent characters, Synthesizer, RM, CLI
  mcp-flights/         — Flight search (Amadeus + Duffel)
  mcp-accommodation/   — Hotel search (Booking.com + Google Hotels)
  mcp-routing/         — Directions + places (Google Maps)
  mcp-weather/         — Forecasts (OpenWeatherMap + Visual Crossing)
  mcp-currency/        — FX rates (Open Exchange Rates + Wise)
  mcp-safety/          — Travel advisories + hospitals
  mcp-places/          — Restaurants + attractions (Google + Foursquare)
  mcp-notifications/   — Push + SMS + email + WhatsApp (Twilio, SendGrid)
  mcp-flight-status/   — Real-time flight tracking (FlightAware)
  mcp-emergency/       — Crisis response (embassies, emergency numbers)
  mcp-payments/        — Payments + receipt scanning (Stripe, Mindee)
  mcp-messaging/       — WhatsApp + Telegram ingress
  mcp-profile/         — Traveler profile CRUD
  mcp-rag/             — RAG retrieval MCP bridge
  rag-pipeline/        — Python: ChromaDB setup, ingestion, FastAPI retrieval
  scheduler/           — node-cron workflows (pre-flight, briefing, scans)
  webhook-ingress/     — Express webhook receiver (FlightAware, Stripe, etc.)
  frontend/            — Next.js trip planner + active trip dashboard
```

## Test Case

The system is validated against this acceptance scenario:

```json
{
  "destination": "Pahalgam, Jammu & Kashmir, India",
  "dates": { "start": "2026-06-15", "end": "2026-06-22" },
  "budget": { "amount": 150000, "currency": "INR" },
  "party_size": 2,
  "purpose": "honeymoon",
  "preferences": {
    "accommodation_style": "boutique",
    "activity_level": "moderate",
    "dietary": "vegetarian",
    "must_include": ["Betaab Valley", "shikara ride"],
    "avoid": ["overcrowded spots"]
  }
}
```

### Extended test scenarios (all validated in `pnpm acceptance`):
1. T-24hr flight delay injection → re-routing fires ✅
2. Day 2 morning briefing trigger → daily push ✅
3. Concierge "find vegetarian restaurant nearby" with GPS ✅
4. Medical emergency at Chandanwari → hospital route + contacts ✅
5. Post-trip feedback collection → RAG ingestion ✅
6. Passport expiry scan → alert if within 6 months ✅

## API Cost Estimate (test phase)

| API | Est. Monthly Cost |
|-----|------------------|
| Amadeus + Duffel | $0 (free tier) |
| Google Maps Platform | $0-50 |
| OpenWeatherMap | $0 |
| OpenAI Embeddings | $5-15 |
| Twilio SMS | $1-5 |
| FlightAware | $0-20 |
| **TOTAL** | **$6-90/month** |
