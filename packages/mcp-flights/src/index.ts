import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SearchFlightsInputSchema, GetFlightDetailsInputSchema, GetFareRulesInputSchema } from '@travel/shared';
import type { FlightOffer } from '@travel/shared';
import { AmadeusClient } from './amadeus.js';
import { DuffelClient } from './duffel.js';

const amadeus = new AmadeusClient();
const duffel = new DuffelClient();

const CABIN_CLASS_MAP: Record<string, string> = {
  economy: 'ECONOMY',
  premium_economy: 'PREMIUM_ECONOMY',
  business: 'BUSINESS',
  first: 'FIRST',
};

/** Deduplicate offers by carrier + flight_number + departure date */
function deduplicate(offers: FlightOffer[]): FlightOffer[] {
  const seen = new Set<string>();
  return offers.filter(o => {
    const key = `${o.carrier}|${o.flight_number}|${o.departure.slice(0, 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const server = new McpServer({
  name: 'mcp-flights',
  version: '1.0.0',
});

server.tool(
  'search_flights',
  'Search for available flights between two airports.',
  SearchFlightsInputSchema.shape,
  async (input) => {
    const parsed = SearchFlightsInputSchema.parse(input);

    let offers: FlightOffer[] = [];
    let amadeusError: string | null = null;

    // Try Amadeus first
    try {
      offers = await amadeus.searchFlights({
        origin: parsed.origin,
        destination: parsed.destination,
        departureDate: parsed.departure_date,
        returnDate: parsed.return_date,
        adults: parsed.passengers,
        travelClass: CABIN_CLASS_MAP[parsed.cabin_class] ?? 'ECONOMY',
        max: parsed.max_results,
      });
    } catch (err) {
      amadeusError = err instanceof Error ? err.message : String(err);
    }

    // Fallback to Duffel if fewer than 3 results
    if (offers.length < 3 && process.env.DUFFEL_API_KEY) {
      try {
        const duffelOffers = await duffel.searchFlights({
          origin: parsed.origin,
          destination: parsed.destination,
          departureDate: parsed.departure_date,
          returnDate: parsed.return_date,
          adults: parsed.passengers,
          cabinClass: parsed.cabin_class,
          max: parsed.max_results,
        });
        offers = deduplicate([...offers, ...duffelOffers]);
      } catch (err) {
        // Duffel is a fallback; log but don't fail
        const duffelError = err instanceof Error ? err.message : String(err);
        if (amadeusError && offers.length === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: true,
                message: `Both providers failed. Amadeus: ${amadeusError}. Duffel: ${duffelError}`,
              }),
            }],
            isError: true,
          };
        }
      }
    } else if (amadeusError && offers.length === 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: true, message: amadeusError }),
        }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ offers: offers.slice(0, parsed.max_results) }),
      }],
    };
  }
);

server.tool(
  'get_flight_details',
  'Get detailed fare information for a specific flight offer.',
  GetFlightDetailsInputSchema.shape,
  async (input) => {
    const { offer_id } = GetFlightDetailsInputSchema.parse(input);
    const details = await amadeus.getFlightDetails(offer_id);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          offer_id,
          baggage: 'Check-in: 23kg, Cabin: 7kg',
          cancellation_policy: 'Non-refundable. Changes: INR 3,500 fee before departure.',
          details,
        }),
      }],
    };
  }
);

server.tool(
  'get_fare_rules',
  'Get the fare rules and restrictions for a specific flight offer.',
  GetFareRulesInputSchema.shape,
  async (input) => {
    const { offer_id } = GetFareRulesInputSchema.parse(input);
    const rules = await amadeus.getFareRules(offer_id);
    return {
      content: [{ type: 'text', text: JSON.stringify({ offer_id, rules }) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-flights] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-flights] Fatal error:', err);
  process.exit(1);
});
