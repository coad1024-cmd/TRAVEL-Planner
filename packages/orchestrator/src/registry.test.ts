import { describe, it, expect, vi } from 'vitest';
import { AgentRegistry } from './registry.js';

// Mock AgentRuntime and characters
vi.mock('./agent-runtime.js', () => ({
  ClaudeAgentRuntime: class {
    character: any;
    isRunning: boolean = false;
    constructor(character: any) {
      this.character = character;
    }
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
  },
}));

describe('AgentRegistry', () => {
  it('should initialize with all characters', () => {
    const registry = new AgentRegistry();
    const agents = registry.getAll();
    expect(agents.length).toBeGreaterThan(10);
  });

  it('should get a specific agent by ID', () => {
    const registry = new AgentRegistry();
    const agent = registry.get('relationship-manager');
    expect(agent.character.agent_id).toBe('relationship-manager');
  });

  it('should throw error for unknown agent ID', () => {
    const registry = new AgentRegistry();
    expect(() => registry.get('non-existent' as any)).toThrow('Unknown agent: non-existent');
  });

  it('should list agents with basic info', () => {
    const registry = new AgentRegistry();
    const list = registry.listAgents();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('id');
    expect(list[0]).toHaveProperty('name');
    expect(list[0]).toHaveProperty('description');
    expect(list[0]).toHaveProperty('mcp_servers');
  });

  it('should start and stop all agents', async () => {
    const registry = new AgentRegistry();
    await registry.startAll();
    const agents = registry.getAll();
    for (const agent of agents) {
      expect(agent.start).toHaveBeenCalled();
    }

    await registry.stopAll();
    for (const agent of agents) {
      expect(agent.stop).toHaveBeenCalled();
    }
  });
});
