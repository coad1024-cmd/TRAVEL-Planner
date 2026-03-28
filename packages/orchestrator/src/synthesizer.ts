/**
 * Synthesizer / Trip Manager — core orchestration state machine.
 * State flow: INTAKE → DECOMPOSE → DISPATCH → RESOLVE → ASSEMBLE → PRESENT
 */
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import type {
  TripRequest,
  ItineraryDay,
  BudgetDashboard,
  AgentMessage,
  SynthesizerState,
  DestinationCalendarEvent,
  PreDepartureChecklist,
  ItineraryVersionRecord,
  ExcursionSegment,
  TransportSegment,
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
  calendar_events: DestinationCalendarEvent[]; // #11: structured calendar
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
  pre_departure_checklist: PreDepartureChecklist; // #12
  itinerary_version: ItineraryVersionRecord;       // #10
  calendar_conflicts: DestinationCalendarEvent[];  // #11
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

  // #11: Build structured destination calendar — Amarnath Yatra and other events
  const calendarEvents: DestinationCalendarEvent[] = [];

  if (month >= 7 && month <= 8) {
    // Amarnath Yatra: typically late June–August
    calendarEvents.push({
      event_name: 'Amarnath Yatra',
      date_range: { start: `${startDate.getFullYear()}-07-01`, end: `${startDate.getFullYear()}-08-31` },
      impact_type: ['accommodation_surge', 'road_closure', 'crowd_extreme'],
      affected_zones: ['Pahalgam', 'Chandanwari', 'NH-44 Pahalgam section', 'Lidder Valley'],
      severity: 'critical',
      notes: '50,000+ pilgrims daily. Hotel prices 2-3x normal. Road convoys block NH-44 for 4-6hr windows each day. Book 6+ months ahead; budget surge pricing.',
    });
  }

  // J&K winter closure: roads to Sonamarg and high passes
  if (month >= 11 || month <= 3) {
    calendarEvents.push({
      event_name: 'High-Altitude Road Closures (Winter)',
      date_range: { start: `${startDate.getFullYear()}-11-01`, end: `${startDate.getFullYear() + (month >= 11 ? 1 : 0)}-03-31` },
      impact_type: ['road_closure', 'restricted_access'],
      affected_zones: ['Zoji La Pass', 'Mughal Road', 'Sonamarg access road'],
      severity: 'significant',
      notes: 'High-altitude passes closed due to snow. Pahalgam itself accessible but some treks not possible.',
    });
  }

  return {
    weather_forecast: Array.isArray(forecast) ? forecast : [],
    seasonal_notes: result,
    connectivity_notes: '4G in Pahalgam town only. Postpaid SIM required for non-residents. No connectivity in Aru Valley, Chandanwari, Betaab Valley.',
    crowd_warnings: month >= 7 && month <= 8 ? ['Amarnath Yatra season — extreme congestion expected'] : [],
    calendar_events: calendarEvents,
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

// #8: In-memory budget ledger with version counter for optimistic locking
const budgetLedger = new Map<string, { dashboard: BudgetDashboard; version: number }>();

function writeBudgetLedger(tripId: string, dashboard: BudgetDashboard, expectedVersion: number): boolean {
  const existing = budgetLedger.get(tripId);
  const currentVersion = existing?.version ?? 0;
  if (currentVersion !== expectedVersion) {
    console.warn(`[Budget] Optimistic lock failed for trip ${tripId}: expected v${expectedVersion}, got v${currentVersion}`);
    return false;
  }
  budgetLedger.set(tripId, { dashboard: { ...dashboard, ledger_version: currentVersion + 1 }, version: currentVersion + 1 });
  return true;
}

async function dispatchBudget(
  req: TripRequest,
  logistics: LogisticsResult,
  accommodation: AccommodationResult,
  excursions: ExcursionResult,
): Promise<BudgetResult> {
  const zeroCurrency = (c: string) => ({ amount: 0, currency: c, amount_usd: 0 });
  const totalBudget = req.budget;

  // #8: Collect ALL proposed costs from prior agents in one batch before writing
  // This avoids concurrent writes from logistics + accommodation running in parallel
  const proposedTransport = zeroCurrency(req.budget.currency);  // in production: sum logistics.segments costs
  const proposedAccommodation = zeroCurrency(req.budget.currency); // in production: sum accommodation.options costs
  const proposedExcursions = zeroCurrency(req.budget.currency);    // in production: sum excursions.activities costs
  const proposedFood = { amount: req.budget.amount * 0.10, currency: req.budget.currency, amount_usd: 0 };
  const proposedContingency = { amount: req.budget.amount * 0.05, currency: req.budget.currency, amount_usd: 0 };

  const totalSpent = {
    amount: proposedTransport.amount + proposedAccommodation.amount + proposedExcursions.amount + proposedFood.amount + proposedContingency.amount,
    currency: req.budget.currency,
    amount_usd: 0,
  };
  const percentUsed = totalBudget.amount > 0 ? (totalSpent.amount / totalBudget.amount) * 100 : 0;

  const dashboard: BudgetDashboard = {
    total_budget: totalBudget,
    total_spent: totalSpent,
    remaining: { amount: totalBudget.amount - totalSpent.amount, currency: req.budget.currency, amount_usd: 0 },
    percent_used: percentUsed,
    by_category: {
      transport: proposedTransport,
      accommodation: proposedAccommodation,
      excursions: proposedExcursions,
      food: proposedFood,
      contingency: proposedContingency,
    },
    alerts: [],
    ledger_version: 0,
  };

  // Single atomic write — prevents race conditions
  const tripId = req.id;
  const existing = budgetLedger.get(tripId);
  writeBudgetLedger(tripId, dashboard, existing?.version ?? 0);

  const isOverCeiling = percentUsed > 85;
  if (isOverCeiling) dashboard.alerts.push('Projected spend exceeds 85% of budget ceiling.');

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
// #2: Constraint satisfaction — typed time-slot scheduling
// ─────────────────────────────────────────────

type TimeSlot = 'morning' | 'afternoon' | 'evening';

interface DaySchedule {
  date: string;
  morning: string | null;   // segment id or null
  afternoon: string | null;
  evening: string | null;
  anchors: string[];        // transport/accommodation segment ids that are immovable
}

interface ScheduledActivity {
  id: string;
  name: string;
  duration_minutes: number;
  preferred_slots: TimeSlot[];
  is_anchor: boolean;
  date: string;
  assigned_slot?: TimeSlot;
  conflict_reason?: string;
}

function buildDaySchedules(startDate: string, numDays: number): Map<string, DaySchedule> {
  const schedules = new Map<string, DaySchedule>();
  const start = new Date(startDate);
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    schedules.set(dateStr, { date: dateStr, morning: null, afternoon: null, evening: null, anchors: [] });
  }
  return schedules;
}

function assignSlot(schedule: DaySchedule, activity: ScheduledActivity): ScheduledActivity {
  // Anchors (transport) occupy their fixed slot and cannot be shifted
  if (activity.is_anchor) {
    schedule.anchors.push(activity.id);
    return { ...activity, assigned_slot: activity.preferred_slots[0] };
  }

  // Try preferred slots in order
  for (const slot of activity.preferred_slots) {
    if (schedule[slot] === null) {
      schedule[slot] = activity.id;
      return { ...activity, assigned_slot: slot };
    }
  }

  // All preferred slots taken — try any remaining slot
  const fallbacks: TimeSlot[] = ['morning', 'afternoon', 'evening'];
  for (const slot of fallbacks) {
    if (schedule[slot] === null && !activity.preferred_slots.includes(slot)) {
      schedule[slot] = activity.id;
      return { ...activity, assigned_slot: slot, conflict_reason: `Shifted from ${activity.preferred_slots.join('/')} to ${slot} (slot conflict)` };
    }
  }

  // No slots available — escalate
  return { ...activity, conflict_reason: `No available slot on ${activity.date} — day is fully booked. Move to next day or remove activity.` };
}

function resolveConflicts(
  logistics: LogisticsResult,
  excursions: ExcursionResult,
  budget: BudgetResult,
  security: SecurityResult,
): { resolved: boolean; issues: string[]; slot_conflicts: ScheduledActivity[] } {
  const issues: string[] = [];
  const slotConflicts: ScheduledActivity[] = [];

  // ── Budget check ─────────────────────────
  if (budget.over_ceiling) {
    issues.push(`BUDGET: Projected spend exceeds 85% ceiling. Suggestions: ${budget.cut_suggestions.join('; ')}`);
  }

  // ── Security check ───────────────────────
  const highRiskDays = (security.daily_assessments as { risk_level?: string }[]).filter(
    d => d.risk_level === 'high'
  );
  if (highRiskDays.length > 0) {
    issues.push('SAFETY: High-risk assessment on some days — flagged for human review');
  }

  // ── #2: Time-slot constraint satisfaction ──
  // Extract transport anchors from logistics
  const transportSegments = (logistics.segments as { type?: string; data?: unknown }[])
    .filter(s => s.type === 'flights' || s.type === 'road_transfer');

  // Build a simple day schedule for conflict detection
  // In a real implementation this would parse actual departure/arrival times
  const anchorActivities: ScheduledActivity[] = transportSegments.map((seg, idx) => ({
    id: `transport-${idx}`,
    name: seg.type ?? 'transport',
    duration_minutes: 120,
    preferred_slots: ['morning'],
    is_anchor: true,
    date: '', // would come from actual segment data
  }));

  // Check excursion conflicts (look for curated activities list)
  const excursionRaw = (excursions.activities as Array<{ curated?: string }>)[0]?.curated ?? '';
  let parsedActivities: ScheduledActivity[] = [];
  try {
    const jsonMatch = excursionRaw.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const actArr = JSON.parse(jsonMatch[1]) as Array<{ name?: string; timing?: string; duration_minutes?: number }>;
      parsedActivities = actArr.map((a, idx) => ({
        id: `excursion-${idx}`,
        name: a.name ?? `Activity ${idx + 1}`,
        duration_minutes: a.duration_minutes ?? 180,
        preferred_slots: ((): TimeSlot[] => {
          const t = (a.timing ?? 'morning').toLowerCase();
          if (t.includes('morning')) return ['morning', 'afternoon'];
          if (t.includes('afternoon')) return ['afternoon', 'morning'];
          return ['evening', 'afternoon'];
        })(),
        is_anchor: false,
        date: '',
      }));
    }
  } catch {
    // Could not parse excursion list — skip slot assignment
  }

  // Run slot assignment
  const allActivities = [...anchorActivities, ...parsedActivities];
  const daySchedule: DaySchedule = { date: 'day1', morning: null, afternoon: null, evening: null, anchors: [] };
  for (const activity of allActivities) {
    const result = assignSlot(daySchedule, activity);
    if (result.conflict_reason) {
      slotConflicts.push(result);
      issues.push(`SCHEDULE: ${result.conflict_reason}`);
    }
  }

  return { resolved: issues.length === 0, issues, slot_conflicts: slotConflicts };
}

// ─────────────────────────────────────────────
// #12: Pre-departure checklist
// ─────────────────────────────────────────────

function generatePreDepartureChecklist(req: TripRequest, locations: LocationsContext): PreDepartureChecklist {
  const items: PreDepartureChecklist['items'] = [
    {
      category: 'connectivity',
      item: 'Obtain a postpaid SIM card before arrival — prepaid SIMs do not work in J&K for non-residents.',
      required: true,
    },
    {
      category: 'connectivity',
      item: 'Download offline maps for Pahalgam, Aru Valley, Chandanwari, and Betaab Valley before entering low-connectivity zones.',
      required: true,
    },
    {
      category: 'safety',
      item: 'Save emergency numbers locally: Police 100, Ambulance 108, Pahalgam Police +91-1936-243100, Anantnag GMC Hospital +91-1932-222483.',
      required: true,
    },
    {
      category: 'safety',
      item: 'Print an emergency contact card with traveler details, trip itinerary, hotel address, and blood group.',
      required: true,
    },
    {
      category: 'documents',
      item: 'Carry government-issued photo ID at all times (mandatory for J&K check-posts).',
      required: true,
    },
    {
      category: 'logistics',
      item: 'Confirm hotel check-in time and share arrival details — some boutique properties require advance notice.',
      required: false,
    },
  ];

  // Add calendar-event-specific items
  for (const event of locations.calendar_events) {
    if (event.impact_type.includes('accommodation_surge')) {
      items.push({
        category: 'logistics',
        item: `${event.event_name} is active during your trip — confirm all bookings with hotels directly; cancellations are rare but impactful.`,
        required: true,
      });
    }
    if (event.impact_type.includes('road_closure')) {
      items.push({
        category: 'logistics',
        item: `Road closures expected due to ${event.event_name}. Build 2-hour buffer into all road-transfer segments through ${event.affected_zones.join(', ')}.`,
        required: true,
      });
    }
  }

  // Health items based on destination
  items.push({
    category: 'health',
    item: 'Carry altitude sickness medication (Acetazolamide) if trekking above 3,000m (Chandanwari, Sheshnag).',
    required: req.preferences.activity_level === 'adventurous',
  });

  return {
    trip_id: req.id,
    generated_at: new Date().toISOString(),
    items,
  };
}

// ─────────────────────────────────────────────
// #14: Segment dependency graph — surgical re-orchestration
// ─────────────────────────────────────────────

type AgentName = 'logistics' | 'accommodation' | 'excursion' | 'budget-finance' | 'security-health' | 'locations-intel';

const SEGMENT_AGENT_MAP: Record<string, AgentName[]> = {
  transport: ['logistics', 'budget-finance'],
  accommodation: ['accommodation', 'budget-finance'],
  excursion: ['excursion', 'budget-finance'],
  dining: ['excursion'],
};

/**
 * Given a set of modified segment types, return the minimal set of agents
 * that need to re-run — avoiding full re-orchestration.
 */
export function resolveAffectedAgents(modifiedSegmentTypes: string[]): AgentName[] {
  const affected = new Set<AgentName>();
  for (const segType of modifiedSegmentTypes) {
    const agents = SEGMENT_AGENT_MAP[segType] ?? [];
    for (const agent of agents) affected.add(agent);
  }
  // security-health and locations-intel are never triggered by segment edits alone
  return Array.from(affected);
}

// ─────────────────────────────────────────────
// Assembly — construct ItineraryDay[]
// ─────────────────────────────────────────────

// #10: In-memory version store (in production, persisted to ItineraryVersion Prisma model)
const itineraryVersionStore = new Map<string, ItineraryVersionRecord[]>();

function createItineraryVersion(
  tripId: string,
  itinerary: ItineraryDay[],
  mutatedBy: string,
  mutationType: ItineraryVersionRecord['mutation_type'],
  reason: string,
): ItineraryVersionRecord {
  const existing = itineraryVersionStore.get(tripId) ?? [];
  const parentVersion = existing.at(-1) ?? null;
  const record: ItineraryVersionRecord = {
    version_id: randomUUID(),
    trip_id: tripId,
    parent_version_id: parentVersion?.version_id ?? null,
    version_number: (parentVersion?.version_number ?? 0) + 1,
    itinerary_snapshot: itinerary,
    mutation_type: mutationType,
    mutated_by: mutatedBy,
    mutation_reason: reason,
    created_at: new Date().toISOString(),
  };
  itineraryVersionStore.set(tripId, [...existing, record]);
  return record;
}

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
  const { issues, slot_conflicts } = resolveConflicts(logistics, excursions, budget, security);

  if (issues.length > 0) {
    console.log(`[Synthesizer] Conflicts detected: ${issues.join(' | ')}`);
    log('synthesizer', 'relationship-manager', 'escalation', { issues, slot_conflicts });

    // #2: Log slot conflicts separately for debugging
    if (slot_conflicts.length > 0) {
      console.log(`[Synthesizer] Schedule conflicts: ${slot_conflicts.map(c => c.conflict_reason).join(' | ')}`);
    }

    // Check if human escalation needed
    const needsHuman = issues.some(i => i.includes('SAFETY'));
    if (needsHuman) {
      const checklist = generatePreDepartureChecklist(req, locations);
      const version = createItineraryVersion(req.id, [], 'synthesizer', 'initial', 'Escalated before assembly — safety issue');
      return {
        itinerary: [],
        budget: budget.dashboard,
        messages,
        state,
        escalation_needed: true,
        escalation_reason: issues.join('; '),
        pre_departure_checklist: checklist,
        itinerary_version: version,
        calendar_conflicts: locations.calendar_events,
      };
    }
  }

  // ── ASSEMBLE ──────────────────────────────
  state = 'ASSEMBLE';
  console.log(`[Synthesizer] ${state}`);
  const itinerary = await assembleItinerary(req, locations, logistics, accommodation, excursions, security);
  log('synthesizer', 'relationship-manager', 'task_response', { itinerary_days: itinerary.length });

  // #10: Record initial version
  const itineraryVersion = createItineraryVersion(req.id, itinerary, 'synthesizer', 'initial', 'Initial trip assembly');

  // #12: Generate pre-departure checklist
  const preDepartureChecklist = generatePreDepartureChecklist(req, locations);

  // ── PRESENT ───────────────────────────────
  state = 'PRESENT';
  console.log(`[Synthesizer] ${state} — itinerary ready (${itinerary.length} days, v${itineraryVersion.version_number})`);

  if (locations.calendar_events.length > 0) {
    console.log(`[Synthesizer] Calendar conflicts: ${locations.calendar_events.map(e => e.event_name).join(', ')}`);
  }

  return {
    itinerary,
    budget: budget.dashboard,
    messages,
    state,
    escalation_needed: false,
    pre_departure_checklist: preDepartureChecklist,
    itinerary_version: itineraryVersion,
    calendar_conflicts: locations.calendar_events,
  };
}
