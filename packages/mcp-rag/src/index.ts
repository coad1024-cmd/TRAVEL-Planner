/**
 * mcp-rag: MCP wrapper for the Python RAG retrieval service.
 * Exposes the `rag_retrieve` tool so all agents can call it via MCP protocol.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RagRetrieveInputSchema } from '@travel/shared';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL ?? 'http://localhost:8001';

// #5: PII redaction patterns — applied before traveler_reviews are returned to agents
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b[A-Z]{1,2}[0-9]{7}\b/g, replacement: '[PASSPORT_NUMBER]' },           // Passport numbers (J1234567)
  { pattern: /\b[0-9]{10}\b/g, replacement: '[PHONE_NUMBER]' },                          // 10-digit phone numbers
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { pattern: /\b[0-9]{12}\b/g, replacement: '[AADHAAR_NUMBER]' },                        // Aadhaar
  { pattern: /\bcard[:\s]+[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/gi, replacement: 'card: [CARD_NUMBER]' },
];

function redactPii(text: string): string {
  let redacted = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}

// Critical collections requiring cross-validation before return
const CRITICAL_COLLECTIONS = new Set(['regulatory', 'emergency_protocols', 'health_safety']);

interface RagChunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity_score: number;
}

interface RagResponse {
  chunks: RagChunk[];
  collection: string;
  query: string;
}

async function callRagService(
  collection: string,
  query: string,
  filters: { region?: string; season?: string; document_type?: string } | undefined,
  top_k: number,
): Promise<RagResponse> {
  const body = { collection, query, filters, top_k };

  const res = await fetch(`${RAG_SERVICE_URL}/retrieve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RAG service error ${res.status}: ${text}`);
  }

  return res.json() as Promise<RagResponse>;
}

const server = new McpServer({
  name: 'mcp-rag',
  version: '1.0.0',
});

server.tool(
  'rag_retrieve',
  'Retrieve relevant knowledge chunks from the travel RAG knowledge base using semantic search.',
  RagRetrieveInputSchema.shape,
  async (input) => {
    const parsed = RagRetrieveInputSchema.parse(input);

    try {
      const result = await callRagService(
        parsed.collection,
        parsed.query,
        parsed.filters,
        parsed.top_k,
      );

      // #5: PII redaction for traveler_reviews collection
      if (parsed.collection === 'traveler_reviews') {
        result.chunks = result.chunks.map(chunk => ({
          ...chunk,
          content: redactPii(chunk.content),
        }));
      }

      // #7: Flag low-confidence chunks from critical collections for human review
      if (CRITICAL_COLLECTIONS.has(parsed.collection)) {
        const CONFIDENCE_THRESHOLD = 0.75;
        result.chunks = result.chunks.map(chunk => {
          const metaConfidence = (chunk.metadata?.confidence_score as number | undefined) ?? 1.0;
          if (metaConfidence < CONFIDENCE_THRESHOLD) {
            return {
              ...chunk,
              metadata: {
                ...chunk.metadata,
                requires_human_review: true,
                review_reason: `Confidence ${metaConfidence.toFixed(2)} below threshold ${CONFIDENCE_THRESHOLD} for critical collection '${parsed.collection}'`,
              },
            };
          }
          // Cross-validate: if similarity_score is below 0.5, this chunk may not be relevant — flag it
          if (chunk.similarity_score < 0.5) {
            return {
              ...chunk,
              metadata: {
                ...chunk.metadata,
                requires_human_review: true,
                review_reason: `Low similarity score ${chunk.similarity_score.toFixed(2)} for critical collection — verify accuracy before acting`,
              },
            };
          }
          return chunk;
        });
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result),
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // If RAG service is down, return a structured degraded response
      if (message.includes('fetch') || message.includes('ECONNREFUSED')) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: true,
              message: 'RAG service unavailable. Proceeding without knowledge base context.',
              chunks: [],
              collection: parsed.collection,
              query: parsed.query,
            }),
          }],
          isError: false, // Degraded but not fatal — agents should handle gracefully
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: true, message }),
        }],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[mcp-rag] Server started. RAG service: ${RAG_SERVICE_URL}`);
}

main().catch(err => {
  console.error('[mcp-rag] Fatal error:', err);
  process.exit(1);
});
