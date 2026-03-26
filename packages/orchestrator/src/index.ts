import { AgentRegistry } from './registry.js';

export { AgentRegistry } from './registry.js';
export { ClaudeAgentRuntime } from './agent-runtime.js';
export type { AgentCharacter, AgentRuntime } from './types.js';

export async function createRuntime(): Promise<AgentRegistry> {
  const registry = new AgentRegistry();
  await registry.startAll();
  return registry;
}
