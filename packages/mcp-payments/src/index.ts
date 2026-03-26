import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { Money } from '@travel/shared';
import { LRUCache } from './cache.js';
import { CircuitBreaker } from './circuit-breaker.js';

const cache = new LRUCache<unknown>(200, 60 * 60 * 1000);
const stripeCB = new CircuitBreaker();
const mindeeCB = new CircuitBreaker();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const MINDEE_KEY = process.env.MINDEE_API_KEY;

if (!STRIPE_KEY) console.error('[mcp-payments] STRIPE_SECRET_KEY not set — using mock responses');
if (!MINDEE_KEY) console.error('[mcp-payments] MINDEE_API_KEY not set — using mock receipt scanning');

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// In-memory transaction store
const transactions = new Map<string, Array<{
  payment_id: string;
  amount: Money;
  description: string;
  created_at: string;
  trip_id: string;
  status: string;
}>>();

async function stripeCreatePayment(
  amount: number, currency: string, description: string
): Promise<{ payment_id: string; status: string; amount: Money }> {
  return await stripeCB.execute(async () => {
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(Math.round(amount * 100)),
        currency: currency.toLowerCase(),
        description,
        confirm: 'true',
        payment_method: 'pm_card_visa', // test payment method
      }).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Stripe error: ${res.status} ${err}`);
    }
    const pi = await res.json() as { id?: string; status?: string };
    return {
      payment_id: pi.id ?? generateId('pi'),
      status: pi.status ?? 'succeeded',
      amount: { amount, currency: currency.toUpperCase() },
    };
  });
}

async function stripeCreateRefund(
  paymentIntentId: string, amount: number
): Promise<{ refund_id: string; status: string }> {
  return await stripeCB.execute(async () => {
    const res = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        payment_intent: paymentIntentId,
        amount: String(Math.round(amount * 100)),
      }).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Stripe refund error: ${res.status} ${err}`);
    }
    const refund = await res.json() as { id?: string; status?: string };
    return {
      refund_id: refund.id ?? generateId('re'),
      status: refund.status ?? 'succeeded',
    };
  });
}

async function mindeeParseReceipt(imageBase64: string): Promise<{
  items: Array<{ name: string; amount: number }>;
  total: number;
  currency: string;
  vendor: string;
}> {
  return await mindeeCB.execute(async () => {
    // Convert base64 to blob
    const binary = Buffer.from(imageBase64, 'base64');
    const formData = new FormData();
    const blob = new Blob([binary], { type: 'image/jpeg' });
    formData.append('document', blob, 'receipt.jpg');

    const res = await fetch('https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict', {
      method: 'POST',
      headers: { Authorization: `Token ${MINDEE_KEY}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Mindee error: ${res.status} ${err}`);
    }

    const data = await res.json() as {
      document?: {
        inference?: {
          prediction?: {
            total_amount?: { value?: number };
            currency?: { value?: string };
            supplier_name?: { value?: string };
            line_items?: Array<{ description?: { value?: string }; total_amount?: { value?: number } }>;
          };
        };
      };
    };

    const pred = data.document?.inference?.prediction;
    const lineItems = (pred?.line_items ?? []).map(item => ({
      name: item.description?.value ?? 'Item',
      amount: item.total_amount?.value ?? 0,
    }));
    return {
      items: lineItems,
      total: pred?.total_amount?.value ?? 0,
      currency: pred?.currency?.value ?? 'INR',
      vendor: pred?.supplier_name?.value ?? 'Unknown Vendor',
    };
  });
}

const server = new McpServer({ name: 'mcp-payments', version: '1.0.0' });

server.tool(
  'process_payment',
  'Process a payment via Stripe.',
  {
    amount: z.number().positive().describe('Amount to charge'),
    currency: z.string().length(3).describe('Currency code (ISO 4217)'),
    method: z.string().describe('Payment method (e.g. card, upi, bank_transfer)'),
    description: z.string().describe('Payment description'),
  },
  async (input) => {
    if (!STRIPE_KEY) {
      const paymentId = generateId('pi');
      const result = {
        payment_id: paymentId,
        status: 'succeeded',
        amount: { amount: input.amount, currency: input.currency.toUpperCase() } as Money,
        mock: true,
      };
      // Store mock transaction
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }

    try {
      const result = await stripeCreatePayment(input.amount, input.currency, input.description);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
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
  'initiate_refund',
  'Initiate a refund for a previous payment.',
  {
    original_payment_id: z.string().describe('Payment ID to refund'),
    amount: z.number().positive().describe('Amount to refund'),
    reason: z.string().describe('Reason for refund'),
  },
  async (input) => {
    if (!STRIPE_KEY) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            refund_id: generateId('re'),
            status: 'succeeded',
            original_payment_id: input.original_payment_id,
            amount: input.amount,
            reason: input.reason,
            mock: true,
          }),
        }],
      };
    }

    try {
      const result = await stripeCreateRefund(input.original_payment_id, input.amount);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
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
  'scan_receipt',
  'Scan and parse a receipt image using AI (Mindee).',
  {
    image_base64: z.string().describe('Base64-encoded receipt image'),
    trip_id: z.string().describe('Trip ID to associate this receipt with'),
  },
  async (input) => {
    if (!MINDEE_KEY) {
      // Return mock receipt data
      const mockResult = {
        items: [
          { name: 'Wazwan Platter', amount: 850 },
          { name: 'Kehwa Tea (2)', amount: 120 },
          { name: 'Mineral Water', amount: 40 },
        ],
        total: 1010,
        currency: 'INR',
        vendor: 'Wazwan House Pahalgam',
        trip_id: input.trip_id,
        scanned_at: new Date().toISOString(),
        mock: true,
      };
      return { content: [{ type: 'text', text: JSON.stringify(mockResult) }] };
    }

    try {
      const result = await mindeeParseReceipt(input.image_base64);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ ...result, trip_id: input.trip_id, scanned_at: new Date().toISOString() }),
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

server.tool(
  'get_transactions',
  'Get transaction history for a trip.',
  { trip_id: z.string().describe('Trip ID to get transactions for') },
  async (input) => {
    const tripTxns = transactions.get(input.trip_id) ?? [];

    if (tripTxns.length === 0) {
      // Return mock transactions for dev
      const mockTxns = [
        {
          payment_id: generateId('pi'),
          amount: { amount: 8200, currency: 'INR', amount_usd: 98 } as Money,
          description: 'Heevan Resort — 1 night',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          payment_id: generateId('pi'),
          amount: { amount: 1010, currency: 'INR', amount_usd: 12 } as Money,
          description: 'Wazwan House Pahalgam — Dinner',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          payment_id: generateId('pi'),
          amount: { amount: 2500, currency: 'INR', amount_usd: 30 } as Money,
          description: 'Betaab Valley pony trek',
          created_at: new Date().toISOString(),
        },
      ];
      return { content: [{ type: 'text', text: JSON.stringify({ transactions: mockTxns, trip_id: input.trip_id }) }] };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ transactions: tripTxns, trip_id: input.trip_id }),
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-payments] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-payments] Fatal error:', err);
  process.exit(1);
});
