import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { PropertyListing, Money, LocationRef } from '@travel/shared';
import { LRUCache } from './cache.js';
import { CircuitBreaker } from './circuit-breaker.js';

const cache = new LRUCache<unknown>(200, 15 * 60 * 1000); // 15-min TTL
const bookingCB = new CircuitBreaker();

const BOOKING_KEY = process.env.BOOKING_RAPIDAPI_KEY;
if (!BOOKING_KEY) {
  console.error('[mcp-accommodation] BOOKING_RAPIDAPI_KEY not set — using mock data');
}

const PAHALGAM_LOCATION: LocationRef = {
  name: 'Pahalgam',
  latitude: 34.0161,
  longitude: 75.3147,
  region: 'Jammu & Kashmir',
  country_code: 'IN',
  connectivity: '4G',
};

function mockProperties(location: string, guests: number, budgetMax?: number): PropertyListing[] {
  const props: PropertyListing[] = [
    {
      property_id: 'pahalgam-001',
      property_name: 'The Pahalgam Hotel',
      location: PAHALGAM_LOCATION,
      star_rating: 4,
      nightly_rate: { amount: 4500, currency: 'INR', amount_usd: 54 },
      total_cost: { amount: 4500, currency: 'INR', amount_usd: 54 },
      amenities: ['WiFi', 'Restaurant', 'Room Service', 'Hot Water', 'Mountain View'],
      cancellation_policy: 'Free cancellation up to 48 hours before check-in',
      suitability_score: 0.88,
      booking_deeplink: 'https://thepahalgamhotel.com',
      distance_to_next_activity_km: 1.2,
    },
    {
      property_id: 'pahalgam-002',
      property_name: 'Heevan Resort Pahalgam',
      location: { ...PAHALGAM_LOCATION, name: 'Heevan Resort' },
      star_rating: 5,
      nightly_rate: { amount: 8200, currency: 'INR', amount_usd: 98 },
      total_cost: { amount: 8200, currency: 'INR', amount_usd: 98 },
      amenities: ['WiFi', 'Spa', 'Pool', 'Restaurant', 'Bar', 'Gym', 'River View'],
      cancellation_policy: 'Non-refundable within 72 hours',
      suitability_score: 0.95,
      booking_deeplink: 'https://heevanresort.com',
      distance_to_next_activity_km: 0.8,
    },
    {
      property_id: 'pahalgam-003',
      property_name: 'Pine View Guest House',
      location: { ...PAHALGAM_LOCATION, name: 'Pine View Guest House' },
      star_rating: 2,
      nightly_rate: { amount: 1800, currency: 'INR', amount_usd: 22 },
      total_cost: { amount: 1800, currency: 'INR', amount_usd: 22 },
      amenities: ['WiFi', 'Hot Water', 'Garden'],
      cancellation_policy: 'Free cancellation up to 24 hours',
      suitability_score: 0.70,
      booking_deeplink: 'https://pineviewpahalgam.com',
      distance_to_next_activity_km: 2.1,
    },
    {
      property_id: 'pahalgam-004',
      property_name: 'Lidder Valley Resort',
      location: { ...PAHALGAM_LOCATION, name: 'Lidder Valley Resort', latitude: 34.0220, longitude: 75.3200 },
      star_rating: 3,
      nightly_rate: { amount: 3200, currency: 'INR', amount_usd: 38 },
      total_cost: { amount: 3200, currency: 'INR', amount_usd: 38 },
      amenities: ['WiFi', 'Restaurant', 'Bonfire Area', 'River Facing', 'Trekking Guides'],
      cancellation_policy: 'Free cancellation up to 48 hours',
      suitability_score: 0.82,
      booking_deeplink: 'https://liddervalleyresort.com',
      distance_to_next_activity_km: 1.5,
    },
  ];

  let filtered = props;
  if (budgetMax) {
    filtered = filtered.filter(p => p.nightly_rate.amount <= budgetMax);
  }
  if (guests > 4) {
    filtered = filtered.filter(p => p.star_rating >= 3);
  }
  return filtered;
}

async function fetchBookingProperties(
  location: string, checkIn: string, checkOut: string,
  guests: number, budgetMax?: number, maxResults = 10
): Promise<PropertyListing[]> {
  if (!BOOKING_KEY) return mockProperties(location, guests, budgetMax);

  return await bookingCB.execute(async () => {
    const params = new URLSearchParams({
      location,
      checkin_date: checkIn,
      checkout_date: checkOut,
      adults_number: String(guests),
      units: 'metric',
      order_by: 'popularity',
      filter_by_currency: 'INR',
      room_number: '1',
      locale: 'en-gb',
    });
    if (budgetMax) params.set('price_filter_currencycode', 'INR');

    const res = await fetch(`https://booking-com.p.rapidapi.com/v1/hotels/search?${params}`, {
      headers: {
        'X-RapidAPI-Key': BOOKING_KEY,
        'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
      },
    });

    if (!res.ok) {
      throw new Error(`Booking.com API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as { result?: unknown[] };
    const results = (data.result ?? []) as Array<Record<string, unknown>>;

    return results.slice(0, maxResults).map((h): PropertyListing => ({
      property_id: String(h['hotel_id'] ?? h['id'] ?? 'unknown'),
      property_name: String(h['hotel_name'] ?? h['name'] ?? 'Unknown Hotel'),
      location: {
        name: String(h['city'] ?? location),
        latitude: Number(h['latitude'] ?? 34.0161),
        longitude: Number(h['longitude'] ?? 75.3147),
        region: String(h['countrycode'] ?? 'IN'),
        country_code: String(h['countrycode'] ?? 'IN'),
      },
      star_rating: Number(h['stars'] ?? h['class'] ?? 3),
      nightly_rate: { amount: Number(h['min_total_price'] ?? 3000), currency: 'INR' },
      total_cost: { amount: Number(h['min_total_price'] ?? 3000), currency: 'INR' },
      amenities: (h['facilities_block'] as string[] | undefined) ?? [],
      cancellation_policy: String(h['is_free_cancellable'] ? 'Free cancellation available' : 'Non-refundable'),
      suitability_score: Math.min(1, Number(h['review_score'] ?? 7) / 10),
      booking_deeplink: String(h['url'] ?? ''),
    }));
  });
}

const server = new McpServer({ name: 'mcp-accommodation', version: '1.0.0' });

server.tool(
  'search_properties',
  'Search for accommodation properties in a location.',
  {
    location: z.string().describe('City or area name'),
    check_in: z.string().describe('Check-in date (YYYY-MM-DD)'),
    check_out: z.string().describe('Check-out date (YYYY-MM-DD)'),
    guests: z.number().int().min(1).describe('Number of guests'),
    budget_max: z.number().optional().describe('Max nightly budget in INR'),
    amenities_filter: z.array(z.string()).optional().describe('Required amenities'),
    max_results: z.number().int().min(1).max(50).default(10).describe('Max results to return'),
  },
  async (input) => {
    const cacheKey = `search:${input.location}:${input.check_in}:${input.check_out}:${input.guests}:${input.budget_max ?? ''}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ properties: cached, cached: true }) }] };
    }

    try {
      let props = await fetchBookingProperties(
        input.location, input.check_in, input.check_out,
        input.guests, input.budget_max, input.max_results
      );
      if (input.amenities_filter && input.amenities_filter.length > 0) {
        props = props.filter(p =>
          input.amenities_filter!.every(a =>
            p.amenities.some(pa => pa.toLowerCase().includes(a.toLowerCase()))
          )
        );
      }
      cache.set(cacheKey, props);
      return { content: [{ type: 'text', text: JSON.stringify({ properties: props }) }] };
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
  'get_property_details',
  'Get full details for a specific property by ID.',
  { property_id: z.string().describe('Property ID from search results') },
  async (input) => {
    const cacheKey = `details:${input.property_id}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify(cached) }] };
    }

    // For mock IDs, return enriched mock detail
    const mocks = mockProperties('Pahalgam', 2);
    const found = mocks.find(p => p.property_id === input.property_id);
    if (found) {
      cache.set(cacheKey, found);
      return { content: [{ type: 'text', text: JSON.stringify(found) }] };
    }

    if (!BOOKING_KEY) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: true, message: `Property ${input.property_id} not found in mock data` }),
        }],
        isError: true,
      };
    }

    try {
      const res = await fetch(
        `https://booking-com.p.rapidapi.com/v1/hotels/data?hotel_id=${input.property_id}&locale=en-gb`,
        {
          headers: {
            'X-RapidAPI-Key': BOOKING_KEY,
            'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
          },
        }
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const h = await res.json() as Record<string, unknown>;
      const prop: PropertyListing = {
        property_id: String(h['hotel_id'] ?? input.property_id),
        property_name: String(h['name'] ?? 'Unknown'),
        location: {
          name: String(h['city'] ?? ''),
          latitude: Number((h['location'] as Record<string, unknown> | undefined)?.['latitude'] ?? 0),
          longitude: Number((h['location'] as Record<string, unknown> | undefined)?.['longitude'] ?? 0),
          region: String(h['country'] ?? ''),
          country_code: String(h['countrycode'] ?? 'IN'),
        },
        star_rating: Number(h['stars'] ?? 3),
        nightly_rate: { amount: 0, currency: 'INR' },
        total_cost: { amount: 0, currency: 'INR' },
        amenities: [],
        cancellation_policy: 'See booking page',
        suitability_score: 0.8,
        booking_deeplink: String(h['url'] ?? ''),
      };
      cache.set(cacheKey, prop);
      return { content: [{ type: 'text', text: JSON.stringify(prop) }] };
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
  'check_availability',
  'Check if a property is available for given dates and get pricing.',
  {
    property_id: z.string(),
    check_in: z.string().describe('Check-in date (YYYY-MM-DD)'),
    check_out: z.string().describe('Check-out date (YYYY-MM-DD)'),
  },
  async (input) => {
    const cacheKey = `avail:${input.property_id}:${input.check_in}:${input.check_out}`;
    const cached = cache.get(cacheKey) as { available: boolean; price: Money } | undefined;
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ ...cached, cached: true }) }] };
    }

    // Mock availability
    const mocks = mockProperties('Pahalgam', 2);
    const found = mocks.find(p => p.property_id === input.property_id);
    const result: { available: boolean; price: Money } = {
      available: Math.random() > 0.15,
      price: found?.nightly_rate ?? { amount: 3500, currency: 'INR', amount_usd: 42 },
    };
    cache.set(cacheKey, result);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-accommodation] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-accommodation] Fatal error:', err);
  process.exit(1);
});
