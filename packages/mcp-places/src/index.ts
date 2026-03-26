import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { PlaceResult } from '@travel/shared';
import { LRUCache } from './cache.js';
import { CircuitBreaker } from './circuit-breaker.js';

const cache = new LRUCache<PlaceResult[]>(500, 15 * 60 * 1000); // 15-min
const cb = new CircuitBreaker();

const MAPS_KEY = process.env.GOOGLE_MAPS_KEY;
const FS_KEY = process.env.FOURSQUARE_KEY;

if (!MAPS_KEY) console.error('[mcp-places] GOOGLE_MAPS_KEY not set — using mock data');
if (!FS_KEY) console.error('[mcp-places] FOURSQUARE_KEY not set — using mock data');

// Mock data for Pahalgam
const MOCK_RESTAURANTS: PlaceResult[] = [
  {
    place_id: 'rest-001',
    name: 'Wazwan House Pahalgam',
    location: { name: 'Pahalgam Bazaar', latitude: 34.0161, longitude: 75.3147, region: 'J&K', country_code: 'IN' },
    rating: 4.5,
    price_level: 2,
    cuisine: 'Kashmiri',
    phone: '+91-1936-243025',
    hours: 'Mon-Sun 08:00-22:00',
    map_url: 'https://maps.google.com/?q=Wazwan+House+Pahalgam',
  },
  {
    place_id: 'rest-002',
    name: 'Lidder Restaurant',
    location: { name: 'Lidder River Bank', latitude: 34.0175, longitude: 75.3160, region: 'J&K', country_code: 'IN' },
    rating: 4.2,
    price_level: 2,
    cuisine: 'North Indian',
    phone: '+91-9419012345',
    hours: 'Mon-Sun 07:00-21:30',
    map_url: 'https://maps.google.com/?q=Lidder+Restaurant+Pahalgam',
  },
  {
    place_id: 'rest-003',
    name: 'Hotel Pahalgam Roof Café',
    location: { name: 'The Pahalgam Hotel', latitude: 34.0155, longitude: 75.3140, region: 'J&K', country_code: 'IN' },
    rating: 4.0,
    price_level: 3,
    cuisine: 'Multi-cuisine',
    phone: '+91-1936-243001',
    hours: 'Mon-Sun 07:30-22:30',
    map_url: 'https://maps.google.com/?q=Pahalgam+Hotel+Cafe',
  },
];

const MOCK_ATTRACTIONS: PlaceResult[] = [
  {
    place_id: 'attr-001',
    name: 'Baisaran Valley (Mini Switzerland)',
    location: { name: 'Baisaran', latitude: 34.0250, longitude: 75.3300, region: 'J&K', country_code: 'IN' },
    rating: 4.7,
    hours: 'Open all day (accessible by pony or trek)',
    map_url: 'https://maps.google.com/?q=Baisaran+Valley+Pahalgam',
  },
  {
    place_id: 'attr-002',
    name: 'Sheshnag Lake',
    location: { name: 'Sheshnag', latitude: 34.1200, longitude: 75.4000, region: 'J&K', country_code: 'IN' },
    rating: 4.8,
    hours: 'Jun-Sep (trekking season)',
    map_url: 'https://maps.google.com/?q=Sheshnag+Lake',
  },
  {
    place_id: 'attr-003',
    name: 'Amarnath Cave Temple',
    location: { name: 'Amarnath', latitude: 34.2144, longitude: 75.5005, region: 'J&K', country_code: 'IN' },
    rating: 4.9,
    hours: 'Jul-Aug (Yatra season)',
    map_url: 'https://maps.google.com/?q=Amarnath+Cave',
  },
  {
    place_id: 'attr-004',
    name: 'Betaab Valley',
    location: { name: 'Betaab Valley', latitude: 34.0420, longitude: 75.3440, region: 'J&K', country_code: 'IN' },
    rating: 4.6,
    hours: 'Open all day',
    map_url: 'https://maps.google.com/?q=Betaab+Valley+Pahalgam',
  },
];

const MOCK_SERVICES: Record<string, PlaceResult[]> = {
  atm: [{
    place_id: 'svc-atm-001',
    name: 'J&K Bank ATM — Pahalgam',
    location: { name: 'Main Chowk Pahalgam', latitude: 34.0158, longitude: 75.3145, region: 'J&K', country_code: 'IN' },
    rating: 3.5,
    hours: '24 hours',
    map_url: 'https://maps.google.com/?q=JK+Bank+ATM+Pahalgam',
  }],
  pharmacy: [{
    place_id: 'svc-pharm-001',
    name: 'Pahalgam Medical Store',
    location: { name: 'Pahalgam Bazaar', latitude: 34.0162, longitude: 75.3148, region: 'J&K', country_code: 'IN' },
    rating: 4.0,
    phone: '+91-9419087654',
    hours: 'Mon-Sun 08:00-21:00',
    map_url: 'https://maps.google.com/?q=Pahalgam+Medical+Store',
  }],
  police: [{
    place_id: 'svc-police-001',
    name: 'Pahalgam Police Station',
    location: { name: 'Pahalgam', latitude: 34.0170, longitude: 75.3155, region: 'J&K', country_code: 'IN' },
    rating: 4.0,
    phone: '100 / +91-1936-243100',
    hours: '24 hours',
    map_url: 'https://maps.google.com/?q=Pahalgam+Police+Station',
  }],
  petrol: [{
    place_id: 'svc-petrol-001',
    name: 'IOCL Petrol Pump Pahalgam',
    location: { name: 'Pahalgam Entry Road', latitude: 34.0140, longitude: 75.3120, region: 'J&K', country_code: 'IN' },
    rating: 3.8,
    hours: 'Mon-Sun 06:00-20:00',
    map_url: 'https://maps.google.com/?q=IOCL+Petrol+Pump+Pahalgam',
  }],
};

async function foursquareSearch(
  query: string, location: string, maxResults: number
): Promise<PlaceResult[]> {
  return await cb.execute(async () => {
    // First geocode
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${MAPS_KEY}`
    );
    const geoData = await geoRes.json() as {
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
    };
    const latLng = geoData.results?.[0]?.geometry?.location;
    if (!latLng) throw new Error('Could not geocode location');

    const params = new URLSearchParams({
      query,
      ll: `${latLng.lat},${latLng.lng}`,
      limit: String(maxResults),
    });

    const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
      headers: {
        Authorization: FS_KEY!,
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Foursquare error: ${res.status}`);
    const data = await res.json() as {
      results?: Array<{
        fsq_id?: string;
        name?: string;
        geocodes?: { main?: { latitude: number; longitude: number } };
        rating?: number;
        price?: number;
        categories?: Array<{ name: string }>;
        tel?: string;
        hours?: { display?: string };
        location?: { formatted_address?: string };
      }>;
    };

    return (data.results ?? []).map(p => ({
      place_id: p.fsq_id ?? '',
      name: p.name ?? '',
      location: {
        name: p.location?.formatted_address ?? p.name ?? '',
        latitude: p.geocodes?.main?.latitude ?? latLng.lat,
        longitude: p.geocodes?.main?.longitude ?? latLng.lng,
        region: location,
        country_code: 'IN',
      },
      rating: p.rating ?? 0,
      price_level: (p.price as 1 | 2 | 3 | 4 | undefined),
      cuisine: p.categories?.[0]?.name,
      phone: p.tel,
      hours: p.hours?.display,
    })) satisfies PlaceResult[];
  });
}

async function googlePlacesNearby(
  location: string, type: string, maxResults: number, keyword?: string
): Promise<PlaceResult[]> {
  return await cb.execute(async () => {
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${MAPS_KEY}`
    );
    const geoData = await geoRes.json() as {
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
    };
    const latLng = geoData.results?.[0]?.geometry?.location;
    if (!latLng) throw new Error('Could not geocode location');

    const params = new URLSearchParams({
      location: `${latLng.lat},${latLng.lng}`,
      radius: '5000',
      type,
      key: MAPS_KEY!,
    });
    if (keyword) params.set('keyword', keyword);

    const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`);
    if (!res.ok) throw new Error(`Google Places error: ${res.status}`);
    const data = await res.json() as {
      results?: Array<{
        place_id?: string;
        name?: string;
        geometry?: { location?: { lat: number; lng: number } };
        rating?: number;
        price_level?: number;
        vicinity?: string;
        opening_hours?: { weekday_text?: string[] };
        formatted_phone_number?: string;
      }>;
    };

    return (data.results ?? []).slice(0, maxResults).map(p => ({
      place_id: p.place_id ?? '',
      name: p.name ?? '',
      location: {
        name: p.vicinity ?? p.name ?? '',
        latitude: p.geometry?.location?.lat ?? latLng.lat,
        longitude: p.geometry?.location?.lng ?? latLng.lng,
        region: location,
        country_code: 'IN',
      },
      rating: p.rating ?? 0,
      price_level: (p.price_level as 1 | 2 | 3 | 4 | undefined),
      phone: p.formatted_phone_number,
      hours: p.opening_hours?.weekday_text?.join('; '),
      map_url: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    })) satisfies PlaceResult[];
  });
}

const server = new McpServer({ name: 'mcp-places', version: '1.0.0' });

server.tool(
  'search_restaurants',
  'Search for restaurants and dining options near a location.',
  {
    location: z.string().describe('Location name or address'),
    cuisine: z.string().optional().describe('Cuisine type filter (e.g. Kashmiri, Indian)'),
    budget_level: z.string().optional().describe('Budget level: budget, mid, premium'),
    max_results: z.number().int().min(1).max(20).default(10).describe('Max results'),
  },
  async (input) => {
    const cacheKey = `restaurants:${input.location}:${input.cuisine ?? ''}:${input.budget_level ?? ''}:${input.max_results}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ restaurants: cached, cached: true }) }] };
    }

    try {
      let results: PlaceResult[] = [];
      const query = input.cuisine ? `${input.cuisine} restaurant` : 'restaurant';

      if (FS_KEY && MAPS_KEY) {
        results = await foursquareSearch(query, input.location, input.max_results);
      } else if (MAPS_KEY) {
        results = await googlePlacesNearby(input.location, 'restaurant', input.max_results, input.cuisine);
      } else {
        results = MOCK_RESTAURANTS
          .filter(r => !input.cuisine || r.cuisine?.toLowerCase().includes(input.cuisine.toLowerCase()))
          .slice(0, input.max_results);
      }

      cache.set(cacheKey, results);
      return { content: [{ type: 'text', text: JSON.stringify({ restaurants: results }) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: JSON.stringify({ restaurants: MOCK_RESTAURANTS, warning: msg }) }] };
    }
  }
);

server.tool(
  'search_attractions',
  'Search for tourist attractions and activities near a location.',
  {
    location: z.string().describe('Location name or address'),
    category: z.string().optional().describe('Category filter (e.g. nature, temple, trekking)'),
    max_results: z.number().int().min(1).max(20).default(10).describe('Max results'),
  },
  async (input) => {
    const cacheKey = `attractions:${input.location}:${input.category ?? ''}:${input.max_results}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ attractions: cached, cached: true }) }] };
    }

    try {
      let results: PlaceResult[] = [];
      const query = input.category ? `${input.category} attraction` : 'tourist attraction';

      if (MAPS_KEY) {
        results = await googlePlacesNearby(input.location, 'tourist_attraction', input.max_results, input.category);
      } else if (FS_KEY && MAPS_KEY) {
        results = await foursquareSearch(query, input.location, input.max_results);
      } else {
        results = MOCK_ATTRACTIONS.slice(0, input.max_results);
      }

      cache.set(cacheKey, results);
      return { content: [{ type: 'text', text: JSON.stringify({ attractions: results }) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: JSON.stringify({ attractions: MOCK_ATTRACTIONS, warning: msg }) }] };
    }
  }
);

server.tool(
  'search_services',
  'Search for essential services near a location (ATM, pharmacy, police, petrol).',
  {
    location: z.string().describe('Location name or address'),
    type: z.enum(['atm', 'pharmacy', 'police', 'petrol']).describe('Service type'),
    max_results: z.number().int().min(1).max(20).default(5).describe('Max results'),
  },
  async (input) => {
    const cacheKey = `services:${input.location}:${input.type}:${input.max_results}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ services: cached, cached: true }) }] };
    }

    const googleTypeMap: Record<string, string> = {
      atm: 'atm',
      pharmacy: 'pharmacy',
      police: 'police',
      petrol: 'gas_station',
    };

    try {
      let results: PlaceResult[] = [];

      if (MAPS_KEY) {
        results = await googlePlacesNearby(input.location, googleTypeMap[input.type], input.max_results);
      } else {
        results = (MOCK_SERVICES[input.type] ?? []).slice(0, input.max_results);
      }

      cache.set(cacheKey, results);
      return { content: [{ type: 'text', text: JSON.stringify({ services: results }) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const fallback = (MOCK_SERVICES[input.type] ?? []).slice(0, input.max_results);
      return { content: [{ type: 'text', text: JSON.stringify({ services: fallback, warning: msg }) }] };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-places] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-places] Fatal error:', err);
  process.exit(1);
});
