/**
 * Concierge Agent — on-the-ground real-time assistance.
 * Prioritizes speed: responses target under 3 seconds.
 * Always includes map links for location-relevant responses.
 */
import Anthropic from '@anthropic-ai/sdk';
import { callMcpTool } from './mcp-client.js';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CONCIERGE_SYSTEM = `You are the on-the-ground travel concierge. The traveler is ACTIVELY on their trip.
PRIORITIZE SPEED — keep responses short, actionable, direct.
Always include a Google Maps link when location is relevant.
Format: 1-3 sentences max, then a bulleted list if needed.
Never say "I'll look into that" — always give the answer immediately.`;

interface ConciergeContext {
  gps?: { lat: number; lng: number };
  location?: string;
  trip_id?: string;
}

function mapsLink(query: string, lat?: number, lng?: number): string {
  if (lat && lng) {
    return `https://maps.google.com/?q=${lat},${lng}`;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
}

export async function handleConciergeQuery(
  message: string,
  context: ConciergeContext,
): Promise<string> {
  const { gps, location } = context;
  const fallbackLocation = location || 'the current destination';
  const locationStr = gps ? `${gps.lat},${gps.lng}` : fallbackLocation;

  // Run parallel MCP calls based on query type
  const msg = message.toLowerCase();
  const promises: Promise<unknown>[] = [];

  if (/restaurant|eat|food|hungry|vegetarian|dining/.test(msg)) {
    const cuisine = /vegetarian/.test(msg) ? 'vegetarian' : undefined;
    promises.push(
      callMcpTool('mcp-places', 'search_restaurants', {
        location: locationStr,
        cuisine,
        max_results: 5,
      }).catch(() => ({ places: [] }))
    );
  }

  if (/atm|cash|money|bank|pharmacy|medicine|police|petrol|gas/.test(msg)) {
    const serviceType = /atm|cash|bank/.test(msg) ? 'atm'
      : /pharmacy|medicine/.test(msg) ? 'pharmacy'
      : /police/.test(msg) ? 'police'
      : 'petrol';
    promises.push(
      callMcpTool('mcp-places', 'search_services', {
        location: locationStr,
        type: serviceType,
        max_results: 3,
      }).catch(() => ({ places: [] }))
    );
  }

  if (/trek|hike|safe|weather|rain|storm/.test(msg)) {
    if (gps) {
      promises.push(
        callMcpTool('mcp-weather', 'get_forecast', {
          lat: gps.lat,
          lng: gps.lng,
          days_ahead: 1,
        }).catch(() => [])
      );
    }
  }

  if (/route|direction|how to get|navigate|walk|drive/.test(msg)) {
    const dest = message.match(/(?:to|towards?)\s+([A-Za-z\s]+?)(?:\s+from|\s+via|$)/i)?.[1];
    if (dest && gps) {
      promises.push(
        callMcpTool('mcp-routing', 'get_route', {
          origin: locationStr,
          destination: dest.trim(),
          mode: /walk/.test(msg) ? 'walking' : 'driving',
        }).catch(() => ({}))
      );
    }
  }

  // Add RAG retrieval for local knowledge and tips
  promises.push(
    callMcpTool('mcp-rag', 'rag_retrieve', {
      collection: 'local_knowledge',
      query: message,
      top_k: 3,
      filters: { region: location?.toLowerCase() || 'india' }
    }).catch(() => ({ chunks: [] }))
  );

  const [data1 = null, data2 = null, ragData = null] = await Promise.all(promises);

  // Build context for Claude
  const locationContext = gps
    ? `Traveler GPS: ${gps.lat}, ${gps.lng} — ${mapsLink('location', gps.lat, gps.lng)}`
    : `Location: ${fallbackLocation}`;

  const dataContext = [data1, data2, ragData]
    .filter(Boolean)
    .map(d => JSON.stringify(d))
    .join('\n');

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001', // Fastest model for speed
    max_tokens: 400,
    system: CONCIERGE_SYSTEM,
    messages: [{
      role: 'user',
      content: `Query: "${message}"
${locationContext}
Data: ${dataContext || `No live data available — use ${fallbackLocation} local knowledge.`}`,
    }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I could not process that request.';
}
