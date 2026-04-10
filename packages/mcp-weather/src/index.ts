import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { WeatherForecast } from '@travel/shared';
import { LRUCache } from './cache.js';
import { CircuitBreaker } from './circuit-breaker.js';

const forecastCache = new LRUCache<unknown>(200, 60 * 60 * 1000);      // 1-hr
const historicalCache = new LRUCache<unknown>(200, 30 * 24 * 60 * 60 * 1000); // 30-day
const cb = new CircuitBreaker();

const OWM_KEY = process.env.OPENWEATHERMAP_KEY;
if (!OWM_KEY) {
  console.error('[mcp-weather] OPENWEATHERMAP_KEY not set — using mock data');
}

const PAHALGAM_MONTHLY: Record<number, { avg_high: number; avg_low: number; avg_rain_mm: number; description: string }> = {
  1: { avg_high: 2, avg_low: -7, avg_rain_mm: 80, description: 'Heavy snowfall, roads may close. Very cold.' },
  2: { avg_high: 4, avg_low: -5, avg_rain_mm: 75, description: 'Snow and frost. Ski season at Gulmarg nearby.' },
  3: { avg_high: 10, avg_low: 0, avg_rain_mm: 90, description: 'Spring beginning, snowmelt, occasional showers.' },
  4: { avg_high: 16, avg_low: 5, avg_rain_mm: 70, description: 'Pleasant spring, blooming meadows, good trekking.' },
  5: { avg_high: 21, avg_low: 9, avg_rain_mm: 55, description: 'Excellent weather, peak tourist season begins.' },
  6: { avg_high: 25, avg_low: 13, avg_rain_mm: 40, description: 'Warm and sunny, ideal for outdoor activities.' },
  7: { avg_high: 27, avg_low: 15, avg_rain_mm: 50, description: 'Peak summer, occasional afternoon showers.' },
  8: { avg_high: 26, avg_low: 14, avg_rain_mm: 55, description: 'Warm with some rain, lush green valleys.' },
  9: { avg_high: 22, avg_low: 10, avg_rain_mm: 45, description: 'Autumn colours, cooling temperatures, great trekking.' },
  10: { avg_high: 15, avg_low: 3, avg_rain_mm: 35, description: 'Cool autumn, clear skies, some frost at night.' },
  11: { avg_high: 8, avg_low: -2, avg_rain_mm: 45, description: 'Cold, first snowfall possible at higher elevations.' },
  12: { avg_high: 3, avg_low: -6, avg_rain_mm: 65, description: 'Winter sets in, heavy snowfall, limited access.' },
};

export function mockForecast(lat: number, lng: number, daysAhead: number): WeatherForecast[] {
  const base = new Date();
  const isPahalgam = Math.abs(lat - 34.0161) < 1 && Math.abs(lng - 75.3147) < 1;
  return Array.from({ length: Math.min(daysAhead, 7) }, (_, i) => {
    const date = new Date(base);
    date.setDate(base.getDate() + i);
    const month = date.getMonth() + 1;
    const hist = PAHALGAM_MONTHLY[month] ?? PAHALGAM_MONTHLY[6];
    const variation = (Math.random() - 0.5) * 4;
    return {
      date: date.toISOString().slice(0, 10),
      high_celsius: Math.round(hist.avg_high + variation),
      low_celsius: Math.round(hist.avg_low + variation),
      description: isPahalgam ? hist.description : 'Partly cloudy with light breeze',
      precipitation_mm: Math.round(hist.avg_rain_mm / 30 + Math.random() * 5),
      wind_kph: Math.round(10 + Math.random() * 20),
      uv_index: Math.round(3 + Math.random() * 5),
      suitable_for_trekking: hist.avg_high > 8 && hist.avg_rain_mm < 70,
    };
  });
}

export async function fetchForecast(lat: number, lng: number, daysAhead: number): Promise<WeatherForecast[]> {
  if (!OWM_KEY) return mockForecast(lat, lng, daysAhead);

  return await cb.execute(async () => {
    const res = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&exclude=minutely,hourly,alerts&appid=${OWM_KEY}&units=metric`
    );
    if (!res.ok) throw new Error(`OpenWeatherMap error: ${res.status}`);

    const data = await res.json() as {
      daily?: Array<{
        dt: number;
        temp?: { max: number; min: number };
        weather?: Array<{ description: string }>;
        rain?: number;
        wind_speed?: number;
        uvi?: number;
      }>;
    };

    const days = (data.daily ?? []).slice(0, daysAhead);
    return days.map((d): WeatherForecast => {
      const high = d.temp?.max ?? 20;
      const low = d.temp?.min ?? 10;
      const rain = d.rain ?? 0;
      return {
        date: new Date(d.dt * 1000).toISOString().slice(0, 10),
        high_celsius: Math.round(high),
        low_celsius: Math.round(low),
        description: d.weather?.[0]?.description ?? 'Clear',
        precipitation_mm: Math.round(rain * 10) / 10,
        wind_kph: Math.round((d.wind_speed ?? 0) * 3.6),
        uv_index: Math.round(d.uvi ?? 0),
        suitable_for_trekking: high > 8 && rain < 10,
      };
    });
  });
}

const server = new McpServer({ name: 'mcp-weather', version: '1.0.0' });

server.tool(
  'get_forecast',
  'Get weather forecast for a location.',
  {
    lat: z.number().describe('Latitude'),
    lng: z.number().describe('Longitude'),
    days_ahead: z.number().int().min(1).max(7).describe('Number of days ahead (max 7)'),
  },
  async (input) => {
    const cacheKey = `forecast:${input.lat.toFixed(2)}:${input.lng.toFixed(2)}:${input.days_ahead}`;
    const cached = forecastCache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ forecasts: cached, cached: true }) }] };
    }

    try {
      const forecasts = await fetchForecast(input.lat, input.lng, input.days_ahead);
      forecastCache.set(cacheKey, forecasts);
      return { content: [{ type: 'text', text: JSON.stringify({ forecasts }) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const forecasts = mockForecast(input.lat, input.lng, input.days_ahead);
      return { content: [{ type: 'text', text: JSON.stringify({ forecasts, warning: msg }) }] };
    }
  }
);

server.tool(
  'get_historical_avg',
  'Get historical monthly climate averages for a location.',
  {
    lat: z.number().describe('Latitude'),
    lng: z.number().describe('Longitude'),
    month: z.number().int().min(1).max(12).describe('Month number (1-12)'),
  },
  async (input) => {
    const cacheKey = `historical:${input.lat.toFixed(2)}:${input.lng.toFixed(2)}:${input.month}`;
    const cached = historicalCache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: JSON.stringify({ ...cached as object, cached: true }) }] };
    }

    // Use Pahalgam data if close enough, otherwise generic
    const isPahalgam = Math.abs(input.lat - 34.0161) < 2 && Math.abs(input.lng - 75.3147) < 2;
    const result = isPahalgam
      ? PAHALGAM_MONTHLY[input.month]
      : { avg_high: 25, avg_low: 15, avg_rain_mm: 50, description: 'Typical seasonal weather' };

    historicalCache.set(cacheKey, result);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-weather] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-weather] Fatal error:', err);
  process.exit(1);
});
