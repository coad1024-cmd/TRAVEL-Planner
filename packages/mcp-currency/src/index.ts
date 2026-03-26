import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { Money } from '@travel/shared';
import { LRUCache } from './cache.js';
import { CircuitBreaker } from './circuit-breaker.js';

const rateCache = new LRUCache<Record<string, number>>(50, 60 * 60 * 1000); // 1-hr
const cb = new CircuitBreaker();

const OXR_KEY = process.env.OPEN_EXCHANGE_RATES_KEY;
if (!OXR_KEY) {
  console.error('[mcp-currency] OPEN_EXCHANGE_RATES_KEY not set — using mock rates');
}

// Realistic mock rates (USD base)
const MOCK_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
  SGD: 1.35,
  JPY: 149.5,
  CNY: 7.24,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.90,
  HKD: 7.82,
  NZD: 1.63,
  MYR: 4.70,
  THB: 35.2,
  PKR: 278.0,
  BDT: 110.0,
  NPR: 133.5,
  LKR: 310.0,
};

const PROVIDER_FEES: Record<string, { rate: number; min: number; name: string }> = {
  wise: { rate: 0.006, min: 3, name: 'Wise' },
  paypal: { rate: 0.035, min: 5, name: 'PayPal' },
  bank: { rate: 0.025, min: 10, name: 'International Bank Wire' },
  western_union: { rate: 0.015, min: 4, name: 'Western Union' },
};

async function fetchRates(base: string): Promise<Record<string, number>> {
  const cacheKey = `rates:${base}`;
  const cached = rateCache.get(cacheKey);
  if (cached) return cached;

  if (!OXR_KEY) {
    // Convert MOCK_RATES to given base
    const baseRate = MOCK_RATES[base.toUpperCase()];
    if (!baseRate) throw new Error(`Unknown currency: ${base}`);
    const converted: Record<string, number> = {};
    for (const [code, rate] of Object.entries(MOCK_RATES)) {
      converted[code] = Math.round((rate / baseRate) * 100000) / 100000;
    }
    rateCache.set(cacheKey, converted);
    return converted;
  }

  return await cb.execute(async () => {
    const res = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${OXR_KEY}&base=${base}`
    );
    if (!res.ok) throw new Error(`OXR API error: ${res.status}`);
    const data = await res.json() as { rates?: Record<string, number> };
    const rates = data.rates ?? {};
    rateCache.set(cacheKey, rates);
    return rates;
  });
}

const server = new McpServer({ name: 'mcp-currency', version: '1.0.0' });

server.tool(
  'convert',
  'Convert an amount from one currency to another.',
  {
    amount: z.number().positive().describe('Amount to convert'),
    from: z.string().length(3).describe('Source currency code (ISO 4217)'),
    to: z.string().length(3).describe('Target currency code (ISO 4217)'),
  },
  async (input) => {
    try {
      const rates = await fetchRates(input.from.toUpperCase());
      const rate = rates[input.to.toUpperCase()];
      if (!rate) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: true, message: `Unknown target currency: ${input.to}` }) }],
          isError: true,
        };
      }
      const converted = Math.round(input.amount * rate * 100) / 100;
      const result: Money = { amount: converted, currency: input.to.toUpperCase() };
      return {
        content: [{ type: 'text', text: JSON.stringify({ result, rate, from: input.from.toUpperCase(), to: input.to.toUpperCase() }) }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: true, message: msg }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  'get_rates',
  'Get all exchange rates for a base currency.',
  { base_currency: z.string().length(3).describe('Base currency code (ISO 4217)') },
  async (input) => {
    try {
      const rates = await fetchRates(input.base_currency.toUpperCase());
      return { content: [{ type: 'text', text: JSON.stringify({ base: input.base_currency.toUpperCase(), rates }) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: true, message: msg }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  'transfer_cost_estimate',
  'Estimate the cost of an international money transfer including fees.',
  {
    amount: z.number().positive().describe('Amount to send'),
    from: z.string().length(3).describe('Source currency'),
    to: z.string().length(3).describe('Target currency'),
  },
  async (input) => {
    try {
      const rates = await fetchRates(input.from.toUpperCase());
      const rate = rates[input.to.toUpperCase()];
      if (!rate) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: true, message: `Unknown currency: ${input.to}` }) }],
          isError: true,
        };
      }

      // Use Wise as best provider
      const provider = PROVIDER_FEES.wise;
      const feeAmount = Math.max(provider.min, input.amount * provider.rate);
      const netAmount = input.amount - feeAmount;
      const received = Math.round(netAmount * rate * 100) / 100;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            amount_received: { amount: received, currency: input.to.toUpperCase() } as Money,
            fees: { amount: Math.round(feeAmount * 100) / 100, currency: input.from.toUpperCase() } as Money,
            provider: provider.name,
            rate,
            estimated_delivery: '1-2 business days',
          }),
        }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: true, message: msg }) }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-currency] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-currency] Fatal error:', err);
  process.exit(1);
});
