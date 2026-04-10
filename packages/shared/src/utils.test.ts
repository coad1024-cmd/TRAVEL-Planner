import { describe, it, expect, vi } from 'vitest';
import {
  createCorrelationId,
  createAgentMessage,
  addMoney,
  zeroCurrency,
  formatMoney,
  parseLatLng,
  parseISODate,
  daysBetween,
  withRetry,
} from './utils.js';

describe('Shared Utils', () => {
  describe('createCorrelationId', () => {
    it('generates a valid UUID string', () => {
      const id = createCorrelationId();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('generates unique IDs', () => {
      const id1 = createCorrelationId();
      const id2 = createCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('createAgentMessage', () => {
    it('creates a properly structured message', () => {
      const msg = createAgentMessage('agent-a', 'agent-b', 'task_request', { foo: 'bar' });
      expect(msg.from).toBe('agent-a');
      expect(msg.to).toBe('agent-b');
      expect(msg.type).toBe('task_request');
      expect(msg.payload).toEqual({ foo: 'bar' });
      expect(msg.correlation_id).toBeDefined();
      expect(msg.timestamp).toBeDefined();
      expect(msg.confidence).toBe(1.0);
      expect(msg.requires_human_confirmation).toBe(false);
      expect(msg.errors).toEqual([]);
    });

    it('respects optional overrides', () => {
      const msg = createAgentMessage('a', 'b', 'error', {}, {
        confidence: 0.5,
        requires_human_confirmation: true,
        errors: ['fail'],
      });
      expect(msg.confidence).toBe(0.5);
      expect(msg.requires_human_confirmation).toBe(true);
      expect(msg.errors).toEqual(['fail']);
    });
  });

  describe('addMoney', () => {
    it('adds two money objects with same currency', () => {
      const m1 = { amount: 100, currency: 'USD', amount_usd: 100 };
      const m2 = { amount: 50, currency: 'USD', amount_usd: 50 };
      const result = addMoney(m1, m2);
      expect(result.amount).toBe(150);
      expect(result.currency).toBe('USD');
      expect(result.amount_usd).toBe(150);
    });

    it('throws error on currency mismatch', () => {
      const m1 = { amount: 100, currency: 'USD' };
      const m2 = { amount: 50, currency: 'EUR' };
      expect(() => addMoney(m1, m2)).toThrow(/Currency mismatch/);
    });

    it('handles undefined amount_usd', () => {
      const m1 = { amount: 100, currency: 'USD' };
      const m2 = { amount: 50, currency: 'USD', amount_usd: 50 };
      const result = addMoney(m1, m2);
      expect(result.amount_usd).toBeUndefined();
    });
  });

  describe('zeroCurrency', () => {
    it('returns a zeroed money object', () => {
      const z = zeroCurrency('INR');
      expect(z).toEqual({ amount: 0, currency: 'INR', amount_usd: 0 });
    });
  });

  describe('formatMoney', () => {
    it('formats money string correctly', () => {
      expect(formatMoney({ amount: 1000, currency: 'INR' })).toBe('INR 1,000');
    });
  });

  describe('parseLatLng', () => {
    it('parses valid lat,lng string', () => {
      expect(parseLatLng('34.1,75.2')).toEqual({ lat: 34.1, lng: 75.2 });
    });

    it('throws on invalid input', () => {
      expect(() => parseLatLng('invalid')).toThrow();
      expect(() => parseLatLng('34.1,abc')).toThrow();
    });
  });

  describe('parseISODate', () => {
    it('parses YYYY-MM-DD to UTC Date', () => {
      const date = parseISODate('2026-07-10');
      expect(date.toISOString()).toBe('2026-07-10T00:00:00.000Z');
    });
  });

  describe('daysBetween', () => {
    it('calculates days correctly', () => {
      expect(daysBetween('2026-07-10', '2026-07-15')).toBe(5);
      expect(daysBetween('2026-07-10', '2026-07-10')).toBe(0);
    });
  });

  describe('withRetry', () => {
    it('returns result on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and eventually succeeds', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const result = await withRetry(fn, 3, 0); // 0 delay for fast tests
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws after max attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('total fail'));
      await expect(withRetry(fn, 2, 0)).rejects.toThrow('total fail');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
