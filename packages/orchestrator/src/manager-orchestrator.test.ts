import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set REDIS_URL before importing the module
process.env.REDIS_URL = 'redis://mock';

// Mock Redis
const mockRedisData = new Map<string, string>();
vi.mock('ioredis', () => {
  return {
    Redis: class {
      get = vi.fn().mockImplementation(async (key) => mockRedisData.get(key) || null);
      set = vi.fn().mockImplementation(async (key, val) => {
        mockRedisData.set(key, val);
        return 'OK';
      });
      del = vi.fn().mockImplementation(async (key) => {
        mockRedisData.delete(key);
        return 1;
      });
    }
  };
});

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class {
      messages = {
        create: vi.fn().mockImplementation(async ({ system, messages }) => {
          const lastMsg = messages[messages.length - 1].content.toLowerCase();
          
          // Intent classification mock
          if (system.includes('classifying a traveler\'s message intent')) {
            if (lastMsg.includes('emergency')) return { content: [{ type: 'text', text: 'EMERGENCY' }] };
            if (lastMsg.includes('plan') || lastMsg.includes('go to')) return { content: [{ type: 'text', text: 'PLANNING' }] };
            return { content: [{ type: 'text', text: 'GENERAL' }] };
          }
          
          // Extraction mock
          if (system.includes('Extract structured trip details')) {
            if (lastMsg.includes('paris')) return { content: [{ type: 'text', text: JSON.stringify({ destination: 'Paris' }) }] };
            return { content: [{ type: 'text', text: '{}' }] };
          }

          // Voice response mock
          return { content: [{ type: 'text', text: 'Mocked voice response' }] };
        })
      };
    }
  };
});

// Mock AgentRegistry
vi.mock('./registry.js', () => ({
  AgentRegistry: class {
    startAll = vi.fn().mockResolvedValue(undefined);
    stopAll = vi.fn().mockResolvedValue(undefined);
    get = vi.fn().mockImplementation((id) => ({
      handleMessage: vi.fn().mockResolvedValue(`Mock response from ${id}`),
    }));
  },
}));

// Now import the module
const { handleManagerMessage, resetManagerSession } = await import('./manager-orchestrator.js');

describe('ManagerOrchestrator Acceptance Tests', () => {
  const travelerId = 'test-user';

  beforeEach(async () => {
    mockRedisData.clear();
    await resetManagerSession(travelerId);
  });

  it('Flow: INIT -> REQUIREMENT_GATHERING -> EMERGENCY', async () => {
    // 1. INIT
    let res = await handleManagerMessage('Hello', travelerId);
    expect(res.visual_state.step).toBe('REQUIREMENT_GATHERING');

    // 2. REQUIREMENT_GATHERING
    res = await handleManagerMessage('I want to go to Paris', travelerId);
    expect(res.visual_state.step).toBe('REQUIREMENT_GATHERING');
    expect(res.visual_state.structured_inputs.destination).toBe('Paris');

    // 3. EMERGENCY bypass
    res = await handleManagerMessage('HELP! EMERGENCY!', travelerId);
    expect(res.intent).toBe('EMERGENCY');
    expect(res.voice_text).toContain('Mock response from emergency');
  });

  it('CANCEL resets session', async () => {
    await handleManagerMessage('Hello', travelerId);
    await handleManagerMessage('I want to go to Paris', travelerId);
    const res = await handleManagerMessage('cancel', travelerId);
    expect(res.visual_state.step).toBe('REQUIREMENT_GATHERING');
    expect(res.visual_state.structured_inputs).toEqual({});
  });
});
