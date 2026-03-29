/**
 * Relationship Manager — intent classification, routing, conversation management.
 * The ONLY agent the traveler directly interacts with.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { TripRequest, IntentClassification, AgentId } from '@travel/shared';
import { createCorrelationId } from '@travel/shared';
import { AgentRegistry } from './registry.js';
import { orchestrateTrip } from './synthesizer.js';
import { callMcpTool } from './mcp-client.js';
import { randomUUID } from 'crypto';

let _claude: Anthropic | null = null;
function getClaude() {
  console.log("[RM] getClaude() called. ANTHROPIC_API_KEY in process.env:", !!process.env.ANTHROPIC_API_KEY);
  if (!_claude) {
    if (!process.env.ANTHROPIC_API_KEY) {
       console.warn('[RM] ANTHROPIC_API_KEY is not set in process.env');
    }
    _claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _claude;
}

const INTENT_CLASSIFICATION_PROMPT = `You are classifying a traveler's message intent.
Respond with ONLY one of these exact strings (no other text):
PLANNING - new trip request, trip modification, hotel/flight search
LIVE_HELP - on-trip question, "I'm here", "nearby", "right now", GPS-based
EMERGENCY - medical help, lost documents, danger, crisis, accident
COMPLAINT - refund, dispute, bad experience, rating, claim
GENERAL - chitchat, profile update, document upload, general question`;

const RM_SYSTEM_PROMPT = `You are the traveler's dedicated personal travel assistant. You are warm,
competent, and anticipatory — like a luxury hotel concierge who remembers your name and your coffee order.

CRITICAL: You are a voice-based assistant. Your responses will be spoken aloud to the traveler.
- Keep responses brief and conversational (1-3 sentences max).
- Avoid complex lists, tables, or markdown formatting.
- Use natural language and clear pronunciation.
- You speak in first person as their personal assistant.
- You never mention internal system agents or technical details.

When asked to plan a trip, respond warmly and confirm what you're going to do.
For emergencies, respond immediately with urgency and empathy.
For complaints, show empathy and immediately begin resolution process.
Always keep the traveler informed but never overwhelm with details.`;

const EXTRACTION_SYSTEM_PROMPT = `You are an expert travel data extractor. 
Your task is to extract structured trip details from a conversation between a traveler and their assistant.

Extract the following fields if present:
- destination (string)
- start_date (YYYY-MM-DD)
- end_date (YYYY-MM-DD)
- budget_amount (number)
- budget_currency (string, e.g., INR, USD, EUR)
- party_size (number)
- purpose (one of: honeymoon, business, family, adventure, solo, group)
- accommodation_style (string)
- activity_level (relaxed, moderate, adventurous)
- dietary_preferences (string)
- must_include (array of strings)
- avoid (array of strings)

Respond with ONLY a JSON object containing these fields. If a field is missing, omit it from the JSON.
Do not make up information. Use the ISO date format YYYY-MM-DD.`;

type RmState = 
  | 'IDLE'
  | 'GATHERING_REQUIREMENTS'
  | 'PLANNING_IN_PROGRESS'
  | 'PLAN_PRESENTED'
  | 'CONFIRMING_PAYMENT'
  | 'BOOKING_COMPLETE';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface RmSession {
  travelerId: string;
  history: ConversationTurn[];
  activeTripId?: string;
  lastIntent?: IntentClassification;
  state: RmState;
  pendingTripRequest?: Partial<TripRequest>;
}

// In-memory session store (Redis in production)
const sessions = new Map<string, RmSession>();

async function classifyIntent(message: string): Promise<IntentClassification> {
  // Fast keyword pre-check before LLM call
  const msg = message.toLowerCase();
  if (/emergency|help me|accident|injured|hospital|lost passport|stolen|crisis|danger/.test(msg)) {
    return 'EMERGENCY';
  }
  if (/refund|complaint|claim|dispute|terrible|awful|horrible|poor service/.test(msg)) {
    return 'COMPLAINT';
  }
  if (/nearby|right now|i'm at|find me|currently|on my trip|walking distance/.test(msg)) {
    return 'LIVE_HELP';
  }

  // Use Claude for ambiguous cases
  try {
    const response = await getClaude().messages.create({
      model: 'claude-haiku-4-5-20251001', // Fast model for classification
      max_tokens: 20,
      system: INTENT_CLASSIFICATION_PROMPT,
      messages: [{ role: 'user', content: message }],
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const validIntents: IntentClassification[] = ['PLANNING', 'LIVE_HELP', 'EMERGENCY', 'COMPLAINT', 'GENERAL'];
    if (validIntents.includes(raw as IntentClassification)) {
      return raw as IntentClassification;
    }
  } catch {
    // Fallback to keyword matching
  }

  // Check for trip planning keywords
  if (/plan|book|trip|travel|hotel|flight|itinerary|vacation|holiday|tour/.test(msg)) {
    return 'PLANNING';
  }

  return 'GENERAL';
}

async function extractStructuredTripData(history: ConversationTurn[]): Promise<Partial<TripRequest>> {
  const messages = history.slice(-5).map(h => ({
    role: h.role,
    content: h.content
  }));
  try {
    const response = await getClaude().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: messages as any,
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        destination: data.destination,
        dates: (data.start_date && data.end_date) ? { start: data.start_date, end: data.end_date } : undefined,
        budget: data.budget_amount ? { amount: data.budget_amount, currency: data.budget_currency || 'INR' } : undefined,
        party_size: data.party_size,
        purpose: data.purpose,
        preferences: {
          accommodation_style: data.accommodation_style,
          activity_level: data.activity_level,
          dietary: data.dietary_preferences,
          must_include: data.must_include,
          avoid: data.avoid,
        }
      };
    }
  } catch (err) {
    console.error('[RM] Extraction error:', err);
  }
  return {};
}

function mergeTripRequest(existing: Partial<TripRequest> = {}, newlyExtracted: Partial<TripRequest>): Partial<TripRequest> {
    return {
        ...existing,
        ...newlyExtracted,
        dates: newlyExtracted.dates || existing.dates,
        budget: newlyExtracted.budget || existing.budget,
        preferences: {
            ...existing.preferences,
            ...newlyExtracted.preferences
        }
    };
}

function getMissingFields(req: Partial<TripRequest>): string[] {
    const missing: string[] = [];
    if (!req.destination) missing.push('destination');
    if (!req.dates?.start || !req.dates?.end) missing.push('dates');
    if (!req.budget?.amount) missing.push('budget');
    if (!req.party_size) missing.push('party size');
    return missing;
}

// ─────────────────────────────────────────────
// Emergency routing — PRIORITY bypass
// ─────────────────────────────────────────────

async function handleEmergency(
  message: string,
  session: RmSession,
  registry: AgentRegistry,
): Promise<string> {
  console.log('[RM] EMERGENCY detected — routing to Emergency Agent (PRIORITY)');

  const emergencyAgent = registry.get('emergency');
  const response = await emergencyAgent.handleMessage(
    message,
    { priority: 'CRITICAL', trip_id: session.activeTripId },
  );

  // Emergency agent can also call mcp-notifications directly
  try {
    await callMcpTool('mcp-notifications', 'send_sms', {
      phone: '+91-9876543210', // Would be traveler's registered phone
      message: `TRAVEL ASSISTANT EMERGENCY ALERT: Help is being arranged. ${response.slice(0, 100)}...`,
    });
  } catch {
    // Notification failure shouldn't block emergency response
  }

  return response;
}

// ─────────────────────────────────────────────
// Main RM handler
// ─────────────────────────────────────────────

export async function handleTravelerMessage(
  message: string,
  travelerId: string,
  registry: AgentRegistry,
  options: { gps?: { lat: number; lng: number } } = {},
): Promise<{
  response: string;
  intent: IntentClassification;
  routed_to: AgentId;
  correlation_id: string;
}> {
  const correlationId = createCorrelationId();

  // Get or create session
  let session = sessions.get(travelerId);
  if (!session) {
    session = { travelerId, history: [], state: 'IDLE' };
    sessions.set(travelerId, session);
  }

  // Classify intent
  const intent = await classifyIntent(message);
  session.lastIntent = intent;

  console.log(`[RM] Intent: ${intent} | State: ${session.state} | Message: "${message.slice(0, 60)}..."`);

  let response: string = "";
  let routedTo: AgentId = 'relationship-manager';

  // ── EMERGENCY: bypass all routing, highest priority ──
  if (intent === 'EMERGENCY') {
    response = await handleEmergency(message, session, registry);
    routedTo = 'emergency';

  // ── PLANNING: route to Synthesizer ─────────────────
  } else if (intent === 'PLANNING' || session.state === 'GATHERING_REQUIREMENTS' || session.state === 'PLAN_PRESENTED' || session.state === 'CONFIRMING_PAYMENT') {
    routedTo = 'synthesizer';
    
    // Handle state transitions for planning/booking
    if (session.state === 'PLAN_PRESENTED' && (message.toLowerCase().includes('book') || message.toLowerCase().includes('confirm') || message.toLowerCase().includes('yes') || message.toLowerCase().includes('proceed'))) {
        session.state = 'CONFIRMING_PAYMENT';
        response = `Excellent. To proceed with booking your trip to ${session.pendingTripRequest?.destination}, I need your explicit voice confirmation. Do you authorize the payment of ₹${session.pendingTripRequest?.budget?.amount?.toLocaleString('en-IN')} for this itinerary via your saved payment method?`;
        session.history.push({ role: 'user', content: message });
        session.history.push({ role: 'assistant', content: response });
    } else if (session.state === 'CONFIRMING_PAYMENT' && (message.toLowerCase().includes('yes') || message.toLowerCase().includes('authorize') || message.toLowerCase().includes('confirm') || message.toLowerCase().includes('do it'))) {
        session.state = 'BOOKING_COMPLETE';
        session.history.push({ role: 'user', content: message });
        
        // Trigger notifications (simulated MCP calls)
        try {
            await callMcpTool('mcp-notifications', 'send_whatsapp', {
                phone: '+91-9876543210',
                template_id: 'trip_confirmation',
                params: [session.pendingTripRequest?.destination || 'your destination']
            });
            await callMcpTool('mcp-notifications', 'send_email', {
                to: 'traveler@example.com',
                subject: `Trip Confirmed: ${session.pendingTripRequest?.destination}`,
                html_body: `<h1>Your booking is complete!</h1><p>Trip ID: ${session.activeTripId}</p><p>Destination: ${session.pendingTripRequest?.destination}</p>`
            });
        } catch (e) {
            console.error('[RM] Notification error:', e);
        }

        response = "Thank you! Your booking is complete, and I've sent the confirmation to your WhatsApp and email. I'm so excited for your trip to " + session.pendingTripRequest?.destination + "!";
        session.history.push({ role: 'assistant', content: response });
    } else if (session.state === 'PLAN_PRESENTED' && (message.toLowerCase().includes('change') || message.toLowerCase().includes('instead') || message.toLowerCase().includes('modify') || message.toLowerCase().includes('different'))) {
        session.state = 'GATHERING_REQUIREMENTS';
        response = "Of course. I can certainly adjust that for you. What would you like to change about the itinerary?";
        session.history.push({ role: 'user', content: message });
        session.history.push({ role: 'assistant', content: response });
    } else {
        // Default requirement gathering/planning flow
        session.state = 'GATHERING_REQUIREMENTS';
        session.history.push({ role: 'user', content: message });

        // Extract what we have so far
        const newlyExtracted = await extractStructuredTripData(session.history);
        session.pendingTripRequest = mergeTripRequest(session.pendingTripRequest, newlyExtracted);

        const missing = getMissingFields(session.pendingTripRequest);

        if (missing.length > 0) {
            // Ask for missing details
            const prompt = `The traveler is planning a trip. We have: ${JSON.stringify(session.pendingTripRequest)}. 
            We are missing: ${missing.join(', ')}. 
            Last message: "${message}".
            Ask for the missing information in a warm, conversational, luxury concierge way. Keep it brief as it's for voice.`;

            const askResponse = await getClaude().messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 200,
                system: RM_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: prompt }],
            });
            response = askResponse.content[0].type === 'text' ? askResponse.content[0].text : '';
            session.history.push({ role: 'assistant', content: response });
        } else {
            // All details present, proceed to orchestration
            session.state = 'PLANNING_IN_PROGRESS';
            const tripReq = {
                ...session.pendingTripRequest,
                id: randomUUID(),
                traveler_id: travelerId,
            } as TripRequest;

            // Acknowledge and start planning
            const ackResponse = await getClaude().messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 200,
                system: RM_SYSTEM_PROMPT,
                messages: [{
                    role: 'user',
                    content: `We have all details for the trip to ${tripReq.destination}. Write a warm 1-2 sentence acknowledgment.`,
                }],
            });
            const ack = ackResponse.content[0].type === 'text' ? ackResponse.content[0].text : '';

            try {
                const result = await orchestrateTrip(tripReq);
                session.activeTripId = tripReq.id;
                session.state = 'PLAN_PRESENTED';

                if (result.escalation_needed) {
                    response = `${ack}\n\n⚠️ I've found some concerns: ${result.escalation_reason}. How should we proceed?`;
                } else {
                    response = `${ack}\n\nI've designed a perfect ${tripReq.destination} itinerary for you! It's within your ₹${tripReq.budget.amount.toLocaleString('en-IN')} budget. Shall I walk you through the highlights?`;
                }
                session.history.push({ role: 'assistant', content: response });
            } catch (err) {
                const error = err instanceof Error ? err.message : String(err);
                console.error('[RM] Orchestration error:', error);
                response = `${ack}\n\nI'm having a bit of trouble finalizing the plan right now. Let me try again in a moment.`;
                session.state = 'GATHERING_REQUIREMENTS'; // Fallback
            }
        }
    }

  // ── LIVE_HELP: route to Concierge ──────────────────
  } else if (intent === 'LIVE_HELP') {
    routedTo = 'concierge';
    const concierge = registry.get('concierge');
    const ctx: Record<string, unknown> = { trip_id: session.activeTripId };
    if (options.gps) {
      ctx.gps = options.gps;
      ctx.location = `${options.gps.lat},${options.gps.lng}`;
    }
    response = await concierge.handleMessage(message, ctx);

  // ── COMPLAINT: route to Feedback & Claims ──────────
  } else if (intent === 'COMPLAINT') {
    routedTo = 'feedback-claims';
    const fbAgent = registry.get('feedback-claims');
    response = await fbAgent.handleMessage(message, { trip_id: session.activeTripId });

  // ── GENERAL: handle in RM itself ───────────────────
  } else {
    routedTo = 'relationship-manager';
    session.history.push({ role: 'user', content: message });

    const historyMessages = session.history.slice(-10).map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    const resp = await getClaude().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: RM_SYSTEM_PROMPT,
      messages: historyMessages,
    });
    response = resp.content[0].type === 'text' ? resp.content[0].text : '';
    session.history.push({ role: 'assistant', content: response });
  }

  return { response, intent, routed_to: routedTo, correlation_id: correlationId };
}
