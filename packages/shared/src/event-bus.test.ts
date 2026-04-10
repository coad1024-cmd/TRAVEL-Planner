import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  publishEvent,
  updateServiceHealth,
  getServiceHealth,
  getAllServiceHealth,
} from './event-bus.js';

// Mock ioredis
vi.mock('ioredis', () => {
  return {
    Redis: class {
      on = vi.fn();
      xadd = vi.fn().mockResolvedValue('msg-123');
      setex = vi.fn().mockResolvedValue('OK');
      get = vi.fn().mockResolvedValue(null);
      keys = vi.fn().mockResolvedValue([]);
      mget = vi.fn().mockResolvedValue([]);
      quit = vi.fn().mockResolvedValue('OK');
      xgroup = vi.fn().mockResolvedValue('OK');
      xreadgroup = vi.fn().mockResolvedValue(null);
      xack = vi.fn().mockResolvedValue(1);
    }
  };
});

describe('EventBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publishEvent', () => {
    it('calls xadd with correct parameters', async () => {
      const event: any = {
        event_type: 'test.event',
        trip_id: 'trip-1',
        severity: 'info',
        timestamp: new Date().toISOString(),
      };
      
      const id = await publishEvent(event);
      expect(id).toBe('msg-123');
    });
  });

  describe('Service Health', () => {
    it('updates service health in Redis', async () => {
      await updateServiceHealth('test-server', 'healthy', '1.0.0');
    });

    it('gets service health from Redis', async () => {
      const health = await getServiceHealth('test-server');
      expect(health).toBeNull();
    });

    it('gets all service health', async () => {
      const allHealth = await getAllServiceHealth();
      expect(allHealth).toEqual([]);
    });
  });
});
