import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyFlightAwareSignature, checkRateLimit, resetRateLimits } from './index.js';
import crypto from 'crypto';

describe('Webhook Ingress', () => {
  describe('verifyFlightAwareSignature', () => {
    const secret = 'test-secret';
    const payload = JSON.stringify({ ident: 'AI101', status: 'delayed' });

    beforeEach(() => {
      process.env.FLIGHTAWARE_WEBHOOK_SECRET = secret;
    });

    afterEach(() => {
      delete process.env.FLIGHTAWARE_WEBHOOK_SECRET;
    });

    it('returns true for valid signature', () => {
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      expect(verifyFlightAwareSignature(payload, signature)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      expect(verifyFlightAwareSignature(payload, 'wrong-signature')).toBe(false);
    });

    it('skips verification if secret is not set', () => {
      delete process.env.FLIGHTAWARE_WEBHOOK_SECRET;
      expect(verifyFlightAwareSignature(payload, 'any')).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      resetRateLimits();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('allows requests within limit', () => {
      const ip = '1.2.3.4';
      for (let i = 0; i < 100; i++) {
        expect(checkRateLimit(ip)).toBe(true);
      }
    });

    it('blocks requests exceeding limit', () => {
      const ip = '1.2.3.4';
      for (let i = 0; i < 100; i++) {
        checkRateLimit(ip);
      }
      expect(checkRateLimit(ip)).toBe(false);
    });

    it('resets limit after window passes', () => {
      const ip = '1.2.3.4';
      for (let i = 0; i < 100; i++) {
        checkRateLimit(ip);
      }
      expect(checkRateLimit(ip)).toBe(false);

      vi.advanceTimersByTime(60_001); // 1 minute + 1ms
      expect(checkRateLimit(ip)).toBe(true);
    });
  });
});
