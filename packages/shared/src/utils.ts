import { randomUUID } from 'crypto';
import type { AgentMessage, Money } from './types.js';

export function createCorrelationId(): string {
  return randomUUID();
}

export function createAgentMessage(
  from: string,
  to: string,
  type: AgentMessage['type'],
  payload: unknown,
  options: Partial<Pick<AgentMessage, 'confidence' | 'requires_human_confirmation' | 'errors'>> = {}
): AgentMessage {
  return {
    from,
    to,
    type,
    correlation_id: createCorrelationId(),
    timestamp: new Date().toISOString(),
    payload,
    confidence: options.confidence ?? 1.0,
    requires_human_confirmation: options.requires_human_confirmation ?? false,
    errors: options.errors ?? [],
  };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
  return {
    amount: a.amount + b.amount,
    currency: a.currency,
    amount_usd: a.amount_usd !== undefined && b.amount_usd !== undefined
      ? a.amount_usd + b.amount_usd
      : undefined,
  };
}

export function zeroCurrency(currency: string): Money {
  return { amount: 0, currency, amount_usd: 0 };
}

export function formatMoney(money: Money): string {
  return `${money.currency} ${money.amount.toLocaleString('en-IN')}`;
}

/** Parse "lat,lng" string into {lat, lng} */
export function parseLatLng(str: string): { lat: number; lng: number } {
  const [lat, lng] = str.split(',').map(Number);
  if (isNaN(lat) || isNaN(lng)) throw new Error(`Invalid lat,lng: ${str}`);
  return { lat, lng };
}

/** ISO date (YYYY-MM-DD) → Date object (UTC midnight) */
export function parseISODate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

/** Days between two ISO dates */
export function daysBetween(start: string, end: string): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Sleep for ms milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Exponential backoff retry */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 500
): Promise<T> {
  let lastError: Error = new Error('No attempts made');
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts - 1) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
      }
    }
  }
  throw lastError;
}
