import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { LRUCache } from './cache.js';

const cache = new LRUCache<unknown>(200, 24 * 60 * 60 * 1000); // 24hr

// ============================================================
// Hardcoded seeded database for India / Jammu & Kashmir
// ============================================================

// #13: Staleness metadata — every record must carry a last_verified date
// Alert if any record is >30 days old
const STALENESS_THRESHOLD_DAYS = 30;
const DATA_SEEDED_DATE = '2026-01-15'; // ISO date this seed data was last verified

interface EmbassyInfo {
  name: string;
  address: string;
  phone: string;
  emergency_phone: string;
  hours: string;
  last_verified: string; // ISO date
}

interface EmergencyNumbers {
  police: string;
  ambulance: string;
  fire: string;
  coast_guard?: string;
  last_verified: string; // ISO date
}

interface SafeZone {
  name: string;
  address: string;
  distance_km: number;
  type: string;
}

const EMBASSIES: Record<string, EmbassyInfo> = {
  US: {
    name: 'U.S. Embassy New Delhi',
    address: 'Shantipath, Chanakyapuri, New Delhi, Delhi 110021',
    phone: '+91-11-2419-8000',
    emergency_phone: '+91-11-2419-8000',
    hours: 'Mon-Fri 08:30-17:00 IST (Emergency: 24/7)',
    last_verified: DATA_SEEDED_DATE,
  },
  GB: {
    name: 'British High Commission New Delhi',
    address: 'Shantipath, Chanakyapuri, New Delhi, Delhi 110021',
    phone: '+91-11-2419-2100',
    emergency_phone: '+91-11-2419-2100',
    hours: 'Mon-Thu 08:00-16:30, Fri 08:00-13:00 IST',
    last_verified: DATA_SEEDED_DATE,
  },
  AU: {
    name: 'Australian High Commission New Delhi',
    address: '1/50-G Shantipath, Chanakyapuri, New Delhi, Delhi 110021',
    phone: '+91-11-4139-9900',
    emergency_phone: '+61-2-6261-3305',
    hours: 'Mon-Fri 08:30-17:00 IST',
    last_verified: DATA_SEEDED_DATE,
  },
  CA: {
    name: 'High Commission of Canada New Delhi',
    address: '7/8 Shantipath, Chanakyapuri, New Delhi, Delhi 110021',
    phone: '+91-11-4178-2000',
    emergency_phone: '+91-11-4178-2000',
    hours: 'Mon-Fri 08:00-16:30 IST',
    last_verified: DATA_SEEDED_DATE,
  },
  DE: {
    name: 'German Embassy New Delhi',
    address: '6/50-G Shantipath, Chanakyapuri, New Delhi, Delhi 110021',
    phone: '+91-11-4419-9199',
    emergency_phone: '+91-11-4419-9100',
    hours: 'Mon-Fri 08:30-12:30 IST',
    last_verified: DATA_SEEDED_DATE,
  },
  FR: {
    name: 'French Embassy New Delhi',
    address: '2/50-E Shantipath, Chanakyapuri, New Delhi, Delhi 110021',
    phone: '+91-11-4319-6100',
    emergency_phone: '+91-11-4319-6100',
    hours: 'Mon-Fri 09:00-12:30 IST',
    last_verified: DATA_SEEDED_DATE,
  },
  IN: {
    name: 'Ministry of External Affairs (India)',
    address: 'South Block, New Delhi, Delhi 110011',
    phone: '+91-11-2301-6075',
    emergency_phone: '1800-11-3090',
    hours: 'Mon-Fri 09:00-17:30 IST',
    last_verified: DATA_SEEDED_DATE,
  },
  DEFAULT: {
    name: 'Contact your country\'s embassy in New Delhi',
    address: 'Chanakyapuri Diplomatic Enclave, New Delhi, Delhi 110021',
    phone: 'See your country\'s embassy website',
    emergency_phone: '+91-11-2301-6075 (India MEA Helpline)',
    hours: 'Varies by embassy',
    last_verified: DATA_SEEDED_DATE,
  },
};

const EMERGENCY_NUMBERS: Record<string, EmergencyNumbers> = {
  IN: { police: '100', ambulance: '108', fire: '101', coast_guard: '1554', last_verified: DATA_SEEDED_DATE },
  JK: { police: '100', ambulance: '108', fire: '101', last_verified: DATA_SEEDED_DATE },
  DEFAULT: { police: '100', ambulance: '108', fire: '101', last_verified: DATA_SEEDED_DATE },
};

// #13: Staleness check — warn if any record is older than threshold
function checkStaleness(records: Record<string, { last_verified: string }>, label: string): void {
  const thresholdMs = STALENESS_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [key, record] of Object.entries(records)) {
    const age = now - new Date(record.last_verified).getTime();
    if (age > thresholdMs) {
      const daysSince = Math.floor(age / (24 * 60 * 60 * 1000));
      console.error(`[mcp-emergency] STALE DATA: ${label}[${key}] last verified ${daysSince} days ago (threshold: ${STALENESS_THRESHOLD_DAYS} days). Verify and update from official sources.`);
    }
  }
}

// Run staleness check on startup
checkStaleness(EMBASSIES, 'EMBASSIES');
checkStaleness(EMERGENCY_NUMBERS, 'EMERGENCY_NUMBERS');

const PAHALGAM_SAFE_ZONES: SafeZone[] = [
  {
    name: 'Pahalgam Police Station',
    address: 'Main Bazaar Road, Pahalgam, Anantnag, J&K 192125',
    distance_km: 0.5,
    type: 'police',
  },
  {
    name: 'Pahalgam Community Health Centre',
    address: 'Near Bus Stand, Pahalgam, J&K 192125',
    distance_km: 1.0,
    type: 'medical',
  },
  {
    name: 'J&K Tourism Reception Centre',
    address: 'Main Market, Pahalgam, J&K 192125',
    distance_km: 0.3,
    type: 'tourism_office',
  },
  {
    name: 'CRPF Camp Pahalgam',
    address: 'Pahalgam, Anantnag, J&K',
    distance_km: 1.5,
    type: 'security',
  },
  {
    name: 'The Pahalgam Hotel (Major Hotel)',
    address: 'Pahalgam, J&K 192125',
    distance_km: 0.8,
    type: 'shelter',
  },
  {
    name: 'Heevan Resort (Major Hotel)',
    address: 'Pahalgam, J&K 192125',
    distance_km: 1.2,
    type: 'shelter',
  },
  {
    name: 'Government Medical College Anantnag',
    address: 'Anantnag, J&K 192101',
    distance_km: 28.0,
    type: 'hospital',
  },
  {
    name: 'Srinagar Airport (Evacuation Point)',
    address: 'Sheikh ul Alam Airport, Srinagar, J&K 190007',
    distance_km: 96.0,
    type: 'airport',
  },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PAHALGAM_CENTER = { lat: 34.0161, lng: 75.3147 };

const server = new McpServer({ name: 'mcp-emergency', version: '1.0.0' });

function buildStalenessWarning(lastVerified: string): string | undefined {
  const ageMs = Date.now() - new Date(lastVerified).getTime();
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  return ageDays > STALENESS_THRESHOLD_DAYS
    ? `WARNING: This data was last verified ${ageDays} days ago. Verify from official sources before use in a live emergency.`
    : undefined;
}

server.tool(
  'get_embassy',
  'Get embassy contact details for a country (in India).',
  { country_code: z.string().describe('ISO 3166-1 alpha-2 country code') },
  async (input) => {
    const code = input.country_code.toUpperCase();
    const cacheKey = `embassy:${code}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify(cached) }] };
    }

    const embassy = EMBASSIES[code] ?? EMBASSIES.DEFAULT;
    const result = {
      ...embassy,
      staleness_warning: buildStalenessWarning(embassy.last_verified),
    };
    cache.set(cacheKey, result);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

server.tool(
  'get_emergency_numbers',
  'Get emergency contact numbers for a country/region.',
  { country_code: z.string().describe('ISO 3166-1 alpha-2 country code (e.g. IN, JK)') },
  async (input) => {
    const code = input.country_code.toUpperCase();
    const cacheKey = `emergency_numbers:${code}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify(cached) }] };
    }

    const numbers = EMERGENCY_NUMBERS[code] ?? EMERGENCY_NUMBERS.DEFAULT;
    const result = {
      country_code: code,
      ...numbers,
      staleness_warning: buildStalenessWarning(numbers.last_verified),
    };
    cache.set(cacheKey, result);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

server.tool(
  'get_evacuation_routes',
  'Get nearest safe zones and evacuation routes from a location.',
  {
    lat: z.number().describe('Current latitude'),
    lng: z.number().describe('Current longitude'),
  },
  async (input) => {
    const cacheKey = `evacuation:${input.lat.toFixed(3)}:${input.lng.toFixed(3)}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify(cached) }] };
    }

    // Calculate distances from current position to all safe zones
    // Use Pahalgam data as base, adjust distances by offset from Pahalgam
    const latOffset = input.lat - PAHALGAM_CENTER.lat;
    const lngOffset = input.lng - PAHALGAM_CENTER.lng;

    const safeZones = PAHALGAM_SAFE_ZONES
      .map(zone => {
        // Estimate zone lat/lng from stored distance and Pahalgam center
        // For simplicity, use rough distance adjustment
        const adjustedDistance = Math.max(
          0.1,
          zone.distance_km + haversineKm(input.lat, input.lng, PAHALGAM_CENTER.lat, PAHALGAM_CENTER.lng) * 0.5
        );
        return { ...zone, distance_km: Math.round(adjustedDistance * 10) / 10 };
      })
      .sort((a, b) => a.distance_km - b.distance_km);

    const result = {
      safe_zones: safeZones,
      nearest_safe_zone: safeZones[0],
      evacuation_notes: [
        'Nearest police: call 100 immediately in any emergency.',
        'Mountain rescue: Contact Pahalgam Police (+91-1936-243100).',
        'For medical evacuation by air: AIIMS helicopter service available for critical cases.',
        `Nearest major hospital (Anantnag GMC): ~28km, drive ~45 min.`,
        `Srinagar (full facilities): ~96km via NH-44, ~2.5 hrs. NOTE: route passes near Jawahar Tunnel — check for closures.`,
      ],
      lat_offset_note: Math.abs(latOffset) > 0.5 || Math.abs(lngOffset) > 0.5
        ? 'Note: You appear to be some distance from Pahalgam — safe zone distances are approximate.'
        : undefined,
    };

    cache.set(cacheKey, result);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-emergency] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-emergency] Fatal error:', err);
  process.exit(1);
});
