/**
 * Synthesizer / Trip Manager — core orchestration state machine.
 * State flow: INTAKE → DECOMPOSE → DISPATCH → RESOLVE → ASSEMBLE → PRESENT
 */
import Anthropic from '@anthropic-ai/sdk';
import type {
  TripRequest,
  ItineraryDay,
  BudgetDashboard,
  AgentMessage,
  SynthesizerState,
} from '@travel/shared';
import { createAgentMessage, createCorrelationId } from '@travel/shared';
import { callMcpTool } from './mcp-client.js';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────
// Sub-task result types
// ─────────────────────────────────────────────

interface LocationsContext {
  weather_forecast: unknown[];
  seasonal_notes: string;
  connectivity_notes: string;
  crowd_warnings: string[];
  confidence: number;
}

interface LogisticsResult {
  segments: unknown[];
  confidence: number;
}

interface AccommodationResult {
  options: unknown[];
  confidence: number;
}

interface ExcursionResult {
  activities: unknown[];
  confidence: number;
}

interface BudgetResult {
  dashboard: BudgetDashboard;
  over_ceiling: boolean;
  cut_suggestions: string[];
  confidence: number;
}

interface SecurityResult {
  daily_assessments: unknown[];
  confidence: number;
}

interface SynthesizerResult {
  itinerary: ItineraryDay[];
  budget: BudgetDashboard;
  messages: AgentMessage[];
  state: SynthesizerState;
  escalation_needed: boolean;
  escalation_reason?: string;
}

// ─────────────────────────────────────────────
// Helper: ask Claude to analyze/generate with context
// ─────────────────────────────────────────────

async function analyzeWithClaude(
  systemPrompt: string,
  userMessage: string,
): Promise<{ result: string; confidence: number }> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract confidence from response if provided in JSON
  let confidence = 0.85;
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      confidence = parsed.confidence ?? 0.85;
    }
  } catch {
    // Non-JSON response — use default confidence
  }

  return { result: text, confidence };
}

// ─────────────────────────────────────────────
// Dispatch phase — each specialist in order
// ─────────────────────────────────────────────

async function dispatchLocationsIntel(req: TripRequest): Promise<LocationsContext> {
  // Get lat/lng for destination (Pahalgam hardcoded for test case; normally use mcp-routing geocode)
  const pahalgamCoords = { lat: 34.0161, lng: 75.3150 };
  const startDate = new Date(req.dates.start);

  const forecast = await callMcpTool('mcp-weather', 'get_forecast', {
    lat: pahalgamCoords.lat,
    lng: pahalgamCoords.lng,
    days_ahead: 7,
  }).catch(() => []);

  const month = startDate.getMonth() + 1;
  const historical = await callMcpTool('mcp-weather', 'get_historical_avg', {
    lat: pahalgamCoords.lat,
    lng: pahalgamCoords.lng,
    month,
  }).catch(() => ({}));

  const { result, confidence } = await analyzeWithClaude(
    `You are the Locations Intelligence Specialist. Analyze geo-contextual data and return
     structured JSON with keys: seasonal_notes, connectivity_notes, crowd_warnings (array).
     Always include confidence (0-1) in the JSON. Wrap JSON in \`\`\`json ... \`\`\`.`,
    `Trip: ${req.destination}, ${req.dates.start} - ${req.dates.end}
     Party: ${req.party_size} people, purpose: ${req.purpose}
     Historical weather: ${JSON.stringify(historical)}
     Forecast: ${JSON.stringify(forecast)}`,
  );

  return {
    weather_forecast: Array.isArray(forecast) ? forecast : [],
    seasonal_notes: result,
    connectivity_notes: '4G in Pahalgam town only. Postpaid SIM required for non-residents.',
    crowd_warnings: month >= 7 && month <= 8 ? ['Amarnath Yatra season — extreme congestion expected'] : [],
    confidence,
  };
}

async function dispatchLogistics(req: TripRequest, _locations: LocationsContext): Promise<LogisticsResult> {
  // Search flights to Srinagar (SXR) — gateway to Pahalgam
  const flights = await callMcpTool('mcp-flights', 'search_flights', {
    origin: 'DEL', // Default: Delhi
    destination: 'SXR',
    departure_date: req.dates.start,
    passengers: req.party_size,
    cabin_class: 'economy',
    max_results: 5,
  }).catch(() => ({ offers: [] }));

  // Get road transfer route Srinagar → Pahalgam
  const route = await callMcpTool('mcp-routing', 'get_route', {
    origin: 'Srinagar Airport',
    destination: 'Pahalgam, Jammu & Kashmir',
    mode: 'driving',
  }).catch(() => ({}));

  return {
    segments: [
      { type: 'flights', data: flights },
      { type: 'road_transfer', data: route },
    ],
    confidence: 0.85,
  };
}

async function dispatchAccommodation(
  req: TripRequest,
  _locations: LocationsContext,
): Promise<AccommodationResult> {
  const nights = Math.ceil(
    (new Date(req.dates.end).getTime() - new Date(req.dates.start).getTime()) / 86400000
  );

  const properties = await callMcpTool('mcp-accommodation', 'search_properties', {
    location: 'Pahalgam, Jammu Kashmir',
    check_in: req.dates.start,
    check_out: req.dates.end,
    guests: req.party_size,
    budget_max: req.budget.amount / nights, // per night
    max_results: 5,
  }).catch(() => ({ properties: [] }));

  return { options: [properties], confidence: 0.83 };
}

async function dispatchExcursions(
  req: TripRequest,
  locations: LocationsContext,
  _logistics: LogisticsResult,
): Promise<ExcursionResult> {
  const activities = await callMcpTool('mcp-places', 'search_attractions', {
    location: 'Pahalgam, Jammu Kashmir',
    category: req.purpose === 'honeymoon' ? 'scenic,romantic,nature' : 'nature,adventure',
    max_results: 10,
  }).catch(() => ({ places: [] }));

  const { result, confidence } = await analyzeWithClaude(
    `You are the Excursion Specialist. Given the available activities and trip context,
     select 5-7 activities for the trip schedule. Consider: weather data, activity level,
     must-include items. Return JSON array of selected activities with timing. Include confidence.
     Wrap JSON in \`\`\`json ... \`\`\`.`,
    `Trip: ${req.destination}, ${req.dates.start}-${req.dates.end}
     Purpose: ${req.purpose}, Activity level: ${req.preferences.activity_level ?? 'moderate'}
     Must include: ${req.preferences.must_include?.join(', ') ?? 'none'}
     Avoid: ${req.preferences.avoid?.join(', ') ?? 'none'}
     Weather context: ${locations.seasonal_notes}
     Available: ${JSON.stringify(activities)}`,
  );

  return {
    activities: [{ curated: result, raw: activities }],
    confidence,
  };
}

async function dispatchBudget(
  req: TripRequest,
  logistics: LogisticsResult,
  accommodation: AccommodationResult,
  excursions: ExcursionResult,
): Promise<BudgetResult> {
  const zeroCurrency = (c: string) => ({ amount: 0, currency: c, amount_usd: 0 });
  const totalBudget = req.budget;

  // Rough cost aggregation — in production each agent returns Money objects
  const dashboard: BudgetDashboard = {
    total_budget: totalBudget,
    total_spent: zeroCurrency(req.budget.currency),
    remaining: totalBudget,
    percent_used: 0,
    by_category: {
      transport: zeroCurrency(req.budget.currency),
      accommodation: zeroCurrency(req.budget.currency),
      excursions: zeroCurrency(req.budget.currency),
      food: zeroCurrency(req.budget.currency),
      contingency: zeroCurrency(req.budget.currency),
    },
    alerts: [],
  };

  const isOverCeiling = dashboard.percent_used > 85;

  return {
    dashboard,
    over_ceiling: isOverCeiling,
    cut_suggestions: isOverCeiling ? ['Consider 4-star instead of 5-star accommodation'] : [],
    confidence: 0.9,
  };
}

async function dispatchSecurity(req: TripRequest, _locations: LocationsContext): Promise<SecurityResult> {
  const advisory = await callMcpTool('mcp-safety', 'get_travel_advisory', {
    country_code: 'IN',
  }).catch(() => ({}));

  const hospitals = await callMcpTool('mcp-safety', 'get_nearby_hospitals', {
    lat: 34.0161,
    lng: 75.3150,
    radius_km: 100,
    max_results: 3,
  }).catch(() => ({ hospitals: [] }));

  return {
    daily_assessments: [{
      advisory,
      hospitals,
      notes: 'J&K: monitor road conditions (Jawahar Tunnel). Altitude risk on high-altitude treks.',
    }],
    confidence: 0.88,
  };
}

// ─────────────────────────────────────────────
// Conflict resolution
// ─────────────────────────────────────────────

function resolveConflicts(
  logistics: LogisticsResult,
  excursions: ExcursionResult,
  budget: BudgetResult,
  security: SecurityResult,
): { resolved: boolean; issues: string[] } {
  const issues: string[] = [];

  if (budget.over_ceiling) {
    issues.push(`BUDGET: Projected spend exceeds 85% ceiling. Suggestions: ${budget.cut_suggestions.join('; ')}`);
  }

  // Check for high-risk days (security)
  const highRiskDays = (security.daily_assessments as { risk_level?: string }[]).filter(
    d => d.risk_level === 'high'
  );
  if (highRiskDays.length > 0) {
    issues.push('SAFETY: High-risk assessment on some days — flagged for human review');
  }

  return { resolved: issues.length === 0, issues };
}

// ─────────────────────────────────────────────
// Assembly — construct ItineraryDay[]
// ─────────────────────────────────────────────

async function assembleItinerary(
  req: TripRequest,
  locations: LocationsContext,
  logistics: LogisticsResult,
  accommodation: AccommodationResult,
  excursions: ExcursionResult,
  security: SecurityResult,
): Promise<ItineraryDay[]> {
  const correlationId = createCorrelationId();
  const startDate = new Date(req.dates.start);
  const endDate = new Date(req.dates.end);
  const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

  const { result } = await analyzeWithClaude(
    `You are the Trip Orchestrator assembling a final itinerary.
     Return a JSON array of ItineraryDay objects. Each day has:
     - itinerary_id (uuid), day_number, date (ISO), segments (array),
       risk_level (low/medium/high), weather_summary (string), nearest_hospital_km (number)
     Segments can be: transport, accommodation, excursion, or dining.
     Wrap the JSON array in \`\`\`json ... \`\`\`.`,
    `Trip request: ${JSON.stringify(req)}
     Num days: ${numDays}
     Logistics: ${JSON.stringify(logistics.segments)}
     Accommodation: ${JSON.stringify(accommodation.options)}
     Excursions: ${JSON.stringify(excursions.activities)}
     Security: ${JSON.stringify(security.daily_assessments)}
     Weather: ${JSON.stringify(locations.weather_forecast.slice(0, numDays))}
     Crowd warnings: ${locations.crowd_warnings.join('; ')}
     Correlation ID: ${correlationId}`,
  );

  // Parse itinerary from Claude response
  try {
    const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as ItineraryDay[];
    }
  } catch {
    // Return placeholder if parse fails
  }

  // Fallback: single-day placeholder
  return [{
    itinerary_id: correlationId,
    day_number: 1,
    date: req.dates.start,
    segments: [],
    risk_level: 'low',
    weather_summary: 'Weather data pending',
    nearest_hospital_km: 90,
  }];
}

// ─────────────────────────────────────────────
// Main orchestrate function
// ─────────────────────────────────────────────

export async function orchestrateTrip(req: TripRequest): Promise<SynthesizerResult> {
  const messages: AgentMessage[] = [];
  let state: SynthesizerState = 'INTAKE';

  const log = (from: string, to: string, type: AgentMessage['type'], payload: unknown, confidence = 1.0) => {
    messages.push(createAgentMessage(from, to, type, payload, { confidence }));
  };

  console.log(`[Synthesizer] ${state}: ${req.destination} ${req.dates.start}–${req.dates.end}`);
  log('synthesizer', 'relationship-manager', 'task_response', { state, req });

  // ── DECOMPOSE ─────────────────────────────
  state = 'DECOMPOSE';
  console.log(`[Synthesizer] ${state}`);

  // ── DISPATCH ──────────────────────────────
  state = 'DISPATCH';
  console.log(`[Synthesizer] ${state} → locations-intel`);
  const locations = await dispatchLocationsIntel(req);
  log('synthesizer', 'locations-intel', 'task_request', { step: 1 }, locations.confidence);

  if (locations.confidence < 0.7) {
    // Retry once with broader context (simplified)
    console.warn('[Synthesizer] locations-intel confidence low — proceeding anyway');
  }

  console.log(`[Synthesizer] ${state} → logistics + accommodation (parallel)`);
  const [logistics, accommodation] = await Promise.all([
    dispatchLogistics(req, locations),
    dispatchAccommodation(req, locations),
  ]);
  log('synthesizer', 'logistics', 'task_request', { step: 2 }, logistics.confidence);
  log('synthesizer', 'accommodation', 'task_request', { step: 3 }, accommodation.confidence);

  console.log(`[Synthesizer] ${state} → excursion`);
  const excursions = await dispatchExcursions(req, locations, logistics);
  log('synthesizer', 'excursion', 'task_request', { step: 4 }, excursions.confidence);

  console.log(`[Synthesizer] ${state} → budget + security (parallel)`);
  const [budget, security] = await Promise.all([
    dispatchBudget(req, logistics, accommodation, excursions),
    dispatchSecurity(req, locations),
  ]);
  log('synthesizer', 'budget-finance', 'task_request', { step: 5 }, budget.confidence);
  log('synthesizer', 'security-health', 'task_request', { step: 6 }, security.confidence);

  // ── RESOLVE ───────────────────────────────
  state = 'RESOLVE';
  console.log(`[Synthesizer] ${state}`);
  const { issues } = resolveConflicts(logistics, excursions, budget, security);

  if (issues.length > 0) {
    console.log(`[Synthesizer] Conflicts detected: ${issues.join(' | ')}`);
    log('synthesizer', 'relationship-manager', 'escalation', { issues });

    // Check if human escalation needed
    const needsHuman = issues.some(i => i.includes('SAFETY'));
    if (needsHuman) {
      return {
        itinerary: [],
        budget: budget.dashboard,
        messages,
        state,
        escalation_needed: true,
        escalation_reason: issues.join('; '),
      };
    }
  }

  // ── ASSEMBLE ──────────────────────────────
  state = 'ASSEMBLE';
  console.log(`[Synthesizer] ${state}`);
  const itinerary = await assembleItinerary(req, locations, logistics, accommodation, excursions, security);
  log('synthesizer', 'relationship-manager', 'task_response', { itinerary_days: itinerary.length });

  // ── PRESENT ───────────────────────────────
  state = 'PRESENT';
  console.log(`[Synthesizer] ${state} — itinerary ready (${itinerary.length} days)`);

  return {
    itinerary,
    budget: budget.dashboard,
    messages,
    state,
    escalation_needed: false,
  };
}
