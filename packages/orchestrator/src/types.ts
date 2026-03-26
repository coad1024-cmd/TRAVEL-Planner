import type { AgentId, RagCollection } from '@travel/shared';

export interface AgentCharacter {
  agent_id: AgentId;
  name: string;
  description: string;
  system_prompt: string;
  mcp_servers: string[];
  rag_collections?: RagCollection[];
  connects_to?: AgentId[];
  event_subscriptions?: string[];
  capabilities: string[];
}

export interface AgentRuntime {
  character: AgentCharacter;
  isRunning: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  handleMessage(message: string, context?: Record<string, unknown>): Promise<string>;
}
