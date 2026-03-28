/**
 * MCP client for connecting agents to their MCP tool servers.
 * Manages stdio transport connections to each MCP server process.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, type ChildProcess } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { updateServiceHealth, getServiceHealth } from '@travel/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_ROOT = resolve(__dirname, '../../');

/** Map of MCP server name → path to its dist/index.js */
const MCP_SERVER_PATHS: Record<string, string> = {
  'mcp-flights': resolve(PACKAGES_ROOT, 'mcp-flights/dist/index.js'),
  'mcp-accommodation': resolve(PACKAGES_ROOT, 'mcp-accommodation/dist/index.js'),
  'mcp-routing': resolve(PACKAGES_ROOT, 'mcp-routing/dist/index.js'),
  'mcp-weather': resolve(PACKAGES_ROOT, 'mcp-weather/dist/index.js'),
  'mcp-currency': resolve(PACKAGES_ROOT, 'mcp-currency/dist/index.js'),
  'mcp-safety': resolve(PACKAGES_ROOT, 'mcp-safety/dist/index.js'),
  'mcp-places': resolve(PACKAGES_ROOT, 'mcp-places/dist/index.js'),
  'mcp-notifications': resolve(PACKAGES_ROOT, 'mcp-notifications/dist/index.js'),
  'mcp-flight-status': resolve(PACKAGES_ROOT, 'mcp-flight-status/dist/index.js'),
  'mcp-emergency': resolve(PACKAGES_ROOT, 'mcp-emergency/dist/index.js'),
  'mcp-payments': resolve(PACKAGES_ROOT, 'mcp-payments/dist/index.js'),
  'mcp-messaging': resolve(PACKAGES_ROOT, 'mcp-messaging/dist/index.js'),
  'mcp-profile': resolve(PACKAGES_ROOT, 'mcp-profile/dist/index.js'),
  'mcp-rag': resolve(PACKAGES_ROOT, 'mcp-rag/dist/index.js'),
};

interface McpConnection {
  client: Client;
  process: ChildProcess;
  serverName: string;
}

const activeConnections = new Map<string, McpConnection>();

export async function connectToMcpServer(serverName: string): Promise<Client> {
  const existing = activeConnections.get(serverName);
  if (existing) return existing.client;

  const serverPath = MCP_SERVER_PATHS[serverName];
  if (!serverPath) {
    throw new Error(`Unknown MCP server: ${serverName}`);
  }

  const proc = spawn('node', [serverPath], {
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: { ...process.env } as Record<string, string>,
  });

  const client = new Client({
    name: `orchestrator-client-${serverName}`,
    version: '1.0.0',
  });

  await client.connect(transport);

  activeConnections.set(serverName, { client, process: proc, serverName });
  console.log(`[MCP] Connected to ${serverName}`);

  // #6: Mark server as healthy on successful connection
  await updateServiceHealth(serverName, 'healthy').catch(() => {});

  return client;
}

/**
 * #6: Check health before dispatching — logs a warning if a server is degraded/down.
 * Does not block the call; callers decide whether to proceed or skip.
 */
export async function checkServerHealth(serverName: string): Promise<boolean> {
  const health = await getServiceHealth(serverName).catch(() => null);
  if (!health) {
    console.warn(`[MCP] No health record for ${serverName} — may not have registered yet`);
    return true; // Optimistic: allow first connection
  }
  if (health.status === 'down') {
    console.error(`[MCP] ${serverName} is DOWN (last heartbeat: ${health.last_heartbeat})`);
    return false;
  }
  if (health.status === 'degraded') {
    console.warn(`[MCP] ${serverName} is DEGRADED — proceeding with caution`);
  }
  return true;
}

export async function callMcpTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const client = await connectToMcpServer(serverName);
  const result = await client.callTool({ name: toolName, arguments: args });

  if (result.isError) {
    throw new Error(`MCP tool error [${serverName}/${toolName}]: ${JSON.stringify(result.content)}`);
  }

  // Parse JSON content from tool result
  const contentArr = result.content as Array<{ type: string; text?: string }> | undefined;
  const content = contentArr?.[0];
  if (content?.type === 'text' && content.text) {
    try {
      return JSON.parse(content.text);
    } catch {
      return content.text;
    }
  }
  return result.content;
}

export async function disconnectAll(): Promise<void> {
  for (const [name, conn] of activeConnections) {
    try {
      await conn.client.close();
      conn.process.kill();
    } catch {
      // Ignore disconnect errors
    }
    activeConnections.delete(name);
    console.log(`[MCP] Disconnected from ${name}`);
  }
}
