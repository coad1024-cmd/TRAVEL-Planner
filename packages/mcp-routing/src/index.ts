import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { RouteResult, PlaceResult } from '@travel/shared';
import { LRUCache } from './cache.js';
import { CircuitBreaker } from './circuit-breaker.js';

const routeCache = new LRUCache<unknown>(500, 5 * 60 * 1000);    // 5-min route cache
const geocodeCache = new LRUCache<unknown>(1000, 60 * 60 * 1000); // 1-hr geocode cache
const cb = new CircuitBreaker();

const MAPS_KEY = process.env.GOOGLE_MAPS_KEY;
if (!MAPS_KEY) {
  console.error('[mcp-routing] GOOGLE_MAPS_KEY not set — using mock data');
}

function isSrinagarPahalgamRoute(origin: string, destination: string): boolean {
  const normalise = (s: string) => s.toLowerCase();
  const o = normalise(origin);
  const d = normalise(destination);
  return (
    (o.includes('srinagar') && d.includes('pahalgam')) ||
    (o.includes('pahalgam') && d.includes('srinagar'))
  );
}

async function googleMapsDirections(
  origin: string, destination: string, mode: string, departureTime?: string
): Promise<RouteResult> {
  return await cb.execute(async () => {
    const params = new URLSearchParams({
      origin,
      destination,
      mode: mode === 'transit' ? 'transit' : mode === 'walking' ? 'walking' : 'driving',
      key: MAPS_KEY!,
    });
    if (departureTime) params.set('departure_time', departureTime);

    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
    if (!res.ok) throw new Error(`Google Maps error: ${res.status}`);

    const data = await res.json() as {
      status: string;
      routes?: Array<{
        legs?: Array<{
          duration?: { value: number };
          distance?: { value: number };
          departure_time?: { value: number };
          arrival_time?: { value: number };
          steps?: Array<{ html_instructions?: string }>;
        }>;
      }>;
    };

    if (data.status !== 'OK' || !data.routes?.length) {
      throw new Error(`No route found: ${data.status}`);
    }

    const route = data.routes[0];
    const leg = route.legs?.[0];
    const steps = (leg?.steps ?? []).map(s => s.html_instructions?.replace(/<[^>]+>/g, '') ?? '');

    const result: RouteResult = {
      origin,
      destination,
      mode,
      duration_minutes: Math.round((leg?.duration?.value ?? 0) / 60),
      distance_km: Math.round((leg?.distance?.value ?? 0) / 100) / 10,
      departure_time: departureTime,
      arrival_time: leg?.arrival_time ? new Date(leg.arrival_time.value * 1000).toISOString() : undefined,
      steps,
      tunnel_dependent: isSrinagarPahalgamRoute(origin, destination),
      map_url: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`,
    };
    return result;
  });
}

function mockRoute(origin: string, destination: string, mode: string): RouteResult {
  const isSP = isSrinagarPahalgamRoute(origin, destination);
  return {
    origin,
    destination,
    mode,
    duration_minutes: isSP ? 135 : 45,
    distance_km: isSP ? 96 : 12,
    steps: isSP
      ? [
          'Head south on Srinagar-Pahalgam Highway',
          'Pass through Bijbehara',
          'Enter Jawahar Tunnel approach road',
          'Continue through Anantnag',
          'Arrive Pahalgam',
        ]
      : [
          `Head towards ${destination}`,
          `Continue on main road`,
          `Arrive at ${destination}`,
        ],
    tunnel_dependent: isSP,
    map_url: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`,
  };
}

async function googlePlacesSearch(
  query: string, location: string, radius: number, type?: string
): Promise<PlaceResult[]> {
  return await cb.execute(async () => {
    // First geocode the location
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${MAPS_KEY}`
    );
    const geoData = await geoRes.json() as {
      status: string;
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
    };
    const latLng = geoData.results?.[0]?.geometry?.location;
    if (!latLng) throw new Error('Could not geocode location');

    const params = new URLSearchParams({
      query,
      location: `${latLng.lat},${latLng.lng}`,
      radius: String(radius),
      key: MAPS_KEY!,
    });
    if (type) params.set('type', type);

    const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);
    if (!res.ok) throw new Error(`Places API error: ${res.status}`);
    const data = await res.json() as {
      results?: Array<{
        place_id?: string;
        name?: string;
        geometry?: { location?: { lat: number; lng: number } };
        rating?: number;
        price_level?: number;
        formatted_address?: string;
        opening_hours?: { weekday_text?: string[] };
        formatted_phone_number?: string;
      }>;
    };

    return (data.results ?? []).map(p => ({
      place_id: p.place_id ?? '',
      name: p.name ?? '',
      location: {
        name: p.name ?? '',
        latitude: p.geometry?.location?.lat ?? 0,
        longitude: p.geometry?.location?.lng ?? 0,
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

async function googleGeocode(address: string): Promise<{ lat: number; lng: number; formatted_address: string }> {
  return await cb.execute(async () => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${MAPS_KEY}`
    );
    if (!res.ok) throw new Error(`Geocode API error: ${res.status}`);
    const data = await res.json() as {
      status: string;
      results?: Array<{
        geometry?: { location?: { lat: number; lng: number } };
        formatted_address?: string;
      }>;
    };
    if (data.status !== 'OK' || !data.results?.length) {
      throw new Error(`Geocode failed: ${data.status}`);
    }
    const r = data.results[0];
    return {
      lat: r.geometry?.location?.lat ?? 0,
      lng: r.geometry?.location?.lng ?? 0,
      formatted_address: r.formatted_address ?? address,
    };
  });
}

const server = new McpServer({ name: 'mcp-routing', version: '1.0.0' });

server.tool(
  'get_route',
  'Get directions between two locations.',
  {
    origin: z.string().describe('Origin address or place name'),
    destination: z.string().describe('Destination address or place name'),
    mode: z.enum(['driving', 'transit', 'walking']).describe('Travel mode'),
    departure_time: z.string().optional().describe('ISO datetime for departure'),
  },
  async (input) => {
    const cacheKey = `route:${input.origin}:${input.destination}:${input.mode}:${input.departure_time ?? ''}`;
    const cached = routeCache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ ...cached as object, cached: true }) }] };
    }

    try {
      const result = MAPS_KEY
        ? await googleMapsDirections(input.origin, input.destination, input.mode, input.departure_time)
        : mockRoute(input.origin, input.destination, input.mode);
      routeCache.set(cacheKey, result);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Fallback to mock on error
      const result = mockRoute(input.origin, input.destination, input.mode);
      return { content: [{ type: 'text', text: JSON.stringify({ ...result, warning: msg }) }] };
    }
  }
);

server.tool(
  'search_places',
  'Search for places near a location.',
  {
    query: z.string().describe('Search query e.g. "coffee shop"'),
    location: z.string().describe('Center location for search'),
    radius: z.number().describe('Search radius in meters'),
    type: z.string().optional().describe('Place type filter'),
  },
  async (input) => {
    const cacheKey = `places:${input.query}:${input.location}:${input.radius}:${input.type ?? ''}`;
    const cached = routeCache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ places: cached, cached: true }) }] };
    }

    try {
      const places = MAPS_KEY
        ? await googlePlacesSearch(input.query, input.location, input.radius, input.type)
        : [];
      routeCache.set(cacheKey, places);
      return { content: [{ type: 'text', text: JSON.stringify({ places }) }] };
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
  'geocode',
  'Convert an address to lat/lng coordinates.',
  { address: z.string().describe('Address or place name to geocode') },
  async (input) => {
    const cacheKey = `geocode:${input.address}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ ...cached as object, cached: true }) }] };
    }

    try {
      const result = MAPS_KEY
        ? await googleGeocode(input.address)
        : { lat: 34.0161, lng: 75.3147, formatted_address: input.address };
      geocodeCache.set(cacheKey, result);
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-routing] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-routing] Fatal error:', err);
  process.exit(1);
});
