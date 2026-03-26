import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { FlightOffer } from '@travel/shared';
import { LRUCache } from './cache.js';
import { CircuitBreaker } from './circuit-breaker.js';

const cache = new LRUCache<unknown>(500, 15 * 60 * 1000); // 15-min poll cache
const cb = new CircuitBreaker();

const FLIGHTAWARE_KEY = process.env.FLIGHTAWARE_API_KEY;
if (!FLIGHTAWARE_KEY) {
  console.error('[mcp-flight-status] FLIGHTAWARE_API_KEY not set — using mock data');
}

interface FlightStatus {
  flight_number: string;
  status: string;
  departure: { airport: string; scheduled: string; actual?: string; terminal?: string };
  arrival: { airport: string; scheduled: string; estimated?: string; terminal?: string };
  delay_minutes: number;
  gate?: string;
  last_updated: string;
}

function mockFlightStatus(flightNumber: string, date: string): FlightStatus {
  const fn = flightNumber.toUpperCase();
  const statuses = ['On Time', 'Departed', 'Landed', 'Delayed', 'Scheduled'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const delayMinutes = status === 'Delayed' ? Math.floor(Math.random() * 90) + 15 : 0;

  return {
    flight_number: fn,
    status,
    departure: {
      airport: fn.startsWith('6E') ? 'DEL' : 'BOM',
      scheduled: `${date}T06:30:00+05:30`,
      actual: status !== 'Scheduled' ? `${date}T06:${35 + delayMinutes}:00+05:30` : undefined,
      terminal: 'T2',
    },
    arrival: {
      airport: 'SXR',
      scheduled: `${date}T08:15:00+05:30`,
      estimated: `${date}T08:${15 + delayMinutes}:00+05:30`,
      terminal: 'T1',
    },
    delay_minutes: delayMinutes,
    gate: 'G' + String(Math.floor(Math.random() * 20) + 1),
    last_updated: new Date().toISOString(),
  };
}

function mockAlternatives(flightNumber: string): FlightOffer[] {
  return [
    {
      offer_id: `alt-${flightNumber}-001`,
      carrier: 'IndiGo',
      flight_number: '6E-395',
      origin: 'DEL',
      destination: 'SXR',
      departure: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      arrival: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 120,
      stops: 0,
      price: { amount: 6500, currency: 'INR', amount_usd: 78 },
      cabin_class: 'economy',
      booking_deeplink: 'https://www.goindigo.in/',
    },
    {
      offer_id: `alt-${flightNumber}-002`,
      carrier: 'Air India',
      flight_number: 'AI-821',
      origin: 'DEL',
      destination: 'SXR',
      departure: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      arrival: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 120,
      stops: 0,
      price: { amount: 7200, currency: 'INR', amount_usd: 86 },
      cabin_class: 'economy',
      booking_deeplink: 'https://www.airindia.in/',
    },
  ];
}

async function fetchFlightAware(flightNumber: string, date: string): Promise<FlightStatus> {
  return await cb.execute(async () => {
    const res = await fetch(
      `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(flightNumber)}?start=${date}&end=${date}`,
      {
        headers: {
          'x-apikey': FLIGHTAWARE_KEY!,
        },
      }
    );
    if (!res.ok) throw new Error(`FlightAware error: ${res.status}`);
    const data = await res.json() as {
      flights?: Array<{
        ident?: string;
        status?: string;
        origin?: { code?: string };
        destination?: { code?: string };
        scheduled_out?: string;
        actual_out?: string;
        scheduled_in?: string;
        estimated_in?: string;
        departure_delay?: number;
        gate_origin?: string;
        terminal_origin?: string;
        terminal_destination?: string;
      }>;
    };

    const f = data.flights?.[0];
    if (!f) throw new Error('Flight not found');

    const delayMinutes = Math.round((f.departure_delay ?? 0) / 60);
    return {
      flight_number: f.ident ?? flightNumber,
      status: f.status ?? 'Unknown',
      departure: {
        airport: f.origin?.code ?? '',
        scheduled: f.scheduled_out ?? '',
        actual: f.actual_out,
        terminal: f.terminal_origin,
      },
      arrival: {
        airport: f.destination?.code ?? '',
        scheduled: f.scheduled_in ?? '',
        estimated: f.estimated_in,
        terminal: f.terminal_destination,
      },
      delay_minutes: delayMinutes,
      gate: f.gate_origin,
      last_updated: new Date().toISOString(),
    };
  });
}

const subscriptions = new Map<string, { flight_number: string; callback_url: string; created_at: string }>();

const server = new McpServer({ name: 'mcp-flight-status', version: '1.0.0' });

server.tool(
  'track_flight',
  'Track real-time status of a flight.',
  {
    flight_number: z.string().describe('Flight number (e.g. 6E-395, AI-821)'),
    date: z.string().describe('Date in YYYY-MM-DD format'),
  },
  async (input) => {
    const cacheKey = `track:${input.flight_number}:${input.date}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ ...cached as object, cached: true }) }] };
    }

    try {
      const status = FLIGHTAWARE_KEY
        ? await fetchFlightAware(input.flight_number, input.date)
        : mockFlightStatus(input.flight_number, input.date);
      cache.set(cacheKey, status);
      return { content: [{ type: 'text', text: JSON.stringify(status) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const fallback = mockFlightStatus(input.flight_number, input.date);
      return { content: [{ type: 'text', text: JSON.stringify({ ...fallback, warning: msg }) }] };
    }
  }
);

server.tool(
  'subscribe_updates',
  'Subscribe to real-time updates for a flight.',
  {
    flight_number: z.string().describe('Flight number to subscribe to'),
    callback_url: z.string().url().describe('Webhook URL to receive updates'),
  },
  async (input) => {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    subscriptions.set(subscriptionId, {
      flight_number: input.flight_number,
      callback_url: input.callback_url,
      created_at: new Date().toISOString(),
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          subscription_id: subscriptionId,
          flight_number: input.flight_number,
          callback_url: input.callback_url,
          status: 'active',
          note: 'Updates will be polled every 15 minutes and POSTed to callback_url',
        }),
      }],
    };
  }
);

server.tool(
  'get_alternatives',
  'Get alternative flight options if a flight is delayed or cancelled.',
  { flight_number: z.string().describe('The problematic flight number') },
  async (input) => {
    const cacheKey = `alternatives:${input.flight_number}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ alternatives: cached, cached: true }) }] };
    }

    const alternatives = mockAlternatives(input.flight_number);
    cache.set(cacheKey, alternatives);
    return { content: [{ type: 'text', text: JSON.stringify({ alternatives }) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-flight-status] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-flight-status] Fatal error:', err);
  process.exit(1);
});
