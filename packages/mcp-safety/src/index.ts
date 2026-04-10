import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { TravelAdvisory, HospitalInfo, LocationRef } from '@travel/shared';
import { LRUCache } from './cache.js';
import { CircuitBreaker } from './circuit-breaker.js';

const advisoryCache = new LRUCache<unknown>(100, 24 * 60 * 60 * 1000); // 24hr
const alertCache = new LRUCache<unknown>(200, 60 * 60 * 1000);          // 1hr
const cb = new CircuitBreaker();

const MAPS_KEY = process.env.GOOGLE_MAPS_KEY;
if (!MAPS_KEY) {
  console.error('[mcp-safety] GOOGLE_MAPS_KEY not set — hospitals will use mock data');
}

// Hardcoded advisory data for India/JK
const ADVISORIES: Record<string, TravelAdvisory> = {
  IN: {
    country_code: 'IN',
    level: 2,
    summary:
      'Exercise increased caution in India. Parts of Jammu & Kashmir have elevated advisory levels due to civil unrest and terrorism risk near the Line of Control. Tourist areas in Pahalgam, Gulmarg, and Srinagar are generally safe for visitors. Avoid areas near the LoC and Pulwama district. Monitor local news and heed government advisories.',
    last_updated: '2025-01-15',
    source_url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/india-travel-advisory.html',
  },
  JK: {
    country_code: 'JK',
    level: 2,
    summary:
      'Jammu & Kashmir: Exercise increased caution. The region is generally open to tourism. Pahalgam (Anantnag district) is a popular tourist destination with good security presence. Road closures due to weather or security situations can occur. Always carry ID, register with local police if required, and keep emergency contacts handy.',
    last_updated: '2025-01-15',
    source_url: 'https://www.gov.uk/foreign-travel-advice/india/kashmir',
  },
};

const REGIONAL_ALERTS: Array<{ lat: number; lng: number; radius_km: number; message: string }> = [
  {
    lat: 33.7782, lng: 75.3412, radius_km: 50,
    message: 'Security advisory: Avoid travel near Line of Control (LoC). Maintain minimum 50km distance.',
  },
  {
    lat: 34.0161, lng: 75.3147, radius_km: 100,
    message: 'Seasonal advisory: Jawahar Tunnel (NH-44) subject to closure during heavy snowfall Oct-Mar. Check NHIDCL for status.',
  },
  {
    lat: 34.0837, lng: 74.7973, radius_km: 30,
    message: 'Srinagar Dal Lake area: Exercise standard precautions. Houseboat operators should be registered with JK Tourism.',
  },
];

const MOCK_HOSPITALS: HospitalInfo[] = [
  {
    name: 'Government Medical College & Hospital Anantnag',
    location: { name: 'Anantnag', latitude: 33.7323, longitude: 75.1476, region: 'J&K', country_code: 'IN' },
    distance_km: 28,
    phone: '+91-1932-222001',
    specialties: ['Emergency', 'Surgery', 'Medicine', 'Orthopaedics'],
    emergency_24h: true,
  },
  {
    name: 'Pahalgam Community Health Centre',
    location: { name: 'Pahalgam', latitude: 34.0161, longitude: 75.3147, region: 'J&K', country_code: 'IN' },
    distance_km: 1.5,
    phone: '+91-1936-243010',
    specialties: ['Emergency', 'General Medicine', 'First Aid'],
    emergency_24h: true,
  },
  {
    name: 'Shri Maharaja Hari Singh Hospital (SMHS)',
    location: { name: 'Srinagar', latitude: 34.0837, longitude: 74.7973, region: 'J&K', country_code: 'IN' },
    distance_km: 96,
    phone: '+91-194-2452800',
    specialties: ['Emergency', 'Trauma', 'ICU', 'Cardiology', 'Neurology', 'All specialties'],
    emergency_24h: true,
  },
  {
    name: 'Bone & Joint Hospital Barzulla',
    location: { name: 'Srinagar', latitude: 34.0900, longitude: 74.7750, region: 'J&K', country_code: 'IN' },
    distance_km: 98,
    phone: '+91-194-2452803',
    specialties: ['Orthopaedics', 'Trauma', 'Rheumatology'],
    emergency_24h: true,
  },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchNearbyHospitals(lat: number, lng: number, radiusKm: number, maxResults: number): Promise<HospitalInfo[]> {
  if (!MAPS_KEY) {
    return MOCK_HOSPITALS
      .map(h => ({ ...h, distance_km: haversineKm(lat, lng, h.location.latitude, h.location.longitude) }))
      .filter(h => h.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, maxResults);
  }

  return await cb.execute(async () => {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(radiusKm * 1000),
      type: 'hospital',
      key: MAPS_KEY!,
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`);
    if (!res.ok) throw new Error(`Places API error: ${res.status}`);

    const data = await res.json() as {
      results?: Array<{
        place_id?: string;
        name?: string;
        geometry?: { location?: { lat: number; lng: number } };
        rating?: number;
        vicinity?: string;
      }>;
    };

    const results = (data.results ?? []).slice(0, maxResults);
    return results.map((p): HospitalInfo => {
      const hLat = p.geometry?.location?.lat ?? lat;
      const hLng = p.geometry?.location?.lng ?? lng;
      return {
        name: p.name ?? 'Unknown Hospital',
        location: {
          name: p.vicinity ?? p.name ?? '',
          latitude: hLat,
          longitude: hLng,
          region: 'J&K',
          country_code: 'IN',
        } satisfies LocationRef,
        distance_km: Math.round(haversineKm(lat, lng, hLat, hLng) * 10) / 10,
        phone: 'See Google Maps for contact',
        specialties: ['Emergency'],
        emergency_24h: true,
      };
    });
  });
}

const server = new McpServer({ name: 'mcp-safety', version: '1.0.0' });

async function fetchTravelAdvisory(code: string): Promise<TravelAdvisory> {
  const cacheKey = `advisory:${code}`;
  const cached = advisoryCache.get(cacheKey) as TravelAdvisory | undefined;
  if (cached) return cached;

  // 1. High-fidelity Local Fallback (JK/IN) — prioritized for demo
  if (code === 'JK' || (code === 'IN' && !process.env.ENABLE_REAL_ADVISORY)) {
    return ADVISORIES[code] ?? ADVISORIES.IN;
  }

  return await cb.execute(async () => {
    try {
      const res = await fetch(`https://www.travel-advisory.info/api?country=${code}`);
      if (!res.ok) throw new Error(`Travel-Advisory API error: ${res.status}`);
      
      const data = await res.json() as { data?: Record<string, { advisory?: { score?: number; message?: string; updated?: string; sources_active?: number } }> };
      const country = data.data?.[code];
      
      if (!country || !country.advisory) {
        throw new Error(`No advisory data found for country: ${code}`);
      }

      const score = country.advisory.score ?? 0;
      // Map 0-5 score to 1-4 level
      const level = score >= 4.5 ? 4 : score >= 3.5 ? 3 : score >= 2.5 ? 2 : 1;

      const advisory: TravelAdvisory = {
        country_code: code,
        level,
        summary: country.advisory.message ?? 'Exercise normal precautions.',
        last_updated: country.advisory.updated?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        source_url: `https://www.travel-advisory.info/${code.toLowerCase()}`,
      };

      advisoryCache.set(cacheKey, advisory);
      return advisory;
    } catch (err) {
      // Final Fallback
      return ADVISORIES[code] ?? {
        country_code: code,
        level: 1,
        summary: 'No specific advisory. Exercise normal precautions.',
        last_updated: new Date().toISOString().slice(0, 10),
        source_url: 'https://travel.state.gov/',
      };
    }
  });
}

server.tool(
  'get_travel_advisory',
  'Get official travel advisory for a country.',
  { country_code: z.string().describe('ISO 3166-1 alpha-2 country code (e.g. IN, JK)') },
  async (input) => {
    const code = input.country_code.toUpperCase();
    const advisory = await fetchTravelAdvisory(code);
    return { content: [{ type: 'text', text: JSON.stringify(advisory) }] };
  }
);

server.tool(
  'get_regional_alerts',
  'Get active regional security or safety alerts near a location.',
  {
    lat: z.number().describe('Latitude'),
    lng: z.number().describe('Longitude'),
    radius_km: z.number().describe('Search radius in kilometers'),
  },
  async (input) => {
    const cacheKey = `alerts:${input.lat.toFixed(2)}:${input.lng.toFixed(2)}:${input.radius_km}`;
    const cached = alertCache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ alerts: cached, cached: true }) }] };
    }

    const alerts = REGIONAL_ALERTS
      .filter(a => haversineKm(input.lat, input.lng, a.lat, a.lng) <= Math.max(a.radius_km, input.radius_km))
      .map(a => a.message);

    alertCache.set(cacheKey, alerts);
    return { content: [{ type: 'text', text: JSON.stringify({ alerts }) }] };
  }
);

server.tool(
  'get_nearby_hospitals',
  'Find hospitals and medical facilities near a location.',
  {
    lat: z.number().describe('Latitude'),
    lng: z.number().describe('Longitude'),
    radius_km: z.number().describe('Search radius in kilometers'),
    max_results: z.number().int().min(1).max(20).default(5).describe('Max results'),
  },
  async (input) => {
    const cacheKey = `hospitals:${input.lat.toFixed(2)}:${input.lng.toFixed(2)}:${input.radius_km}:${input.max_results}`;
    const cached = alertCache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ hospitals: cached, cached: true }) }] };
    }

    try {
      const hospitals = await fetchNearbyHospitals(input.lat, input.lng, input.radius_km, input.max_results);
      alertCache.set(cacheKey, hospitals);
      return { content: [{ type: 'text', text: JSON.stringify({ hospitals }) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const fallback = MOCK_HOSPITALS
        .map(h => ({ ...h, distance_km: haversineKm(input.lat, input.lng, h.location.latitude, h.location.longitude) }))
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, input.max_results);
      return { content: [{ type: 'text', text: JSON.stringify({ hospitals: fallback, warning: msg }) }] };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-safety] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-safety] Fatal error:', err);
  process.exit(1);
});
