/**
 * mcp-rag: MCP wrapper for the Python RAG retrieval service.
 * Exposes the `rag_retrieve` tool so all agents can call it via MCP protocol.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RagRetrieveInputSchema } from '@travel/shared';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL ?? 'http://localhost:8001';

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
