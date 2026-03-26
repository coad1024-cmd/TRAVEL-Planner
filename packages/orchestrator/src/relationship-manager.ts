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

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INTENT_CLASSIFICATION_PROMPT = `You are classifying a traveler's message intent.
Respond with ONLY one of these exact strings (no other text):
PLANNING - new trip request, trip modification, hotel/flight search
LIVE_HELP - on-trip question, "I'm here", "nearby", "right now", GPS-based
EMERGENCY - medical help, lost documents, danger, crisis, accident
COMPLAINT - refund, dispute, bad experience, rating, claim
GENERAL - chitchat, profile update, document upload, general question`;

const RM_SYSTEM_PROMPT = `You are the traveler's dedicated personal travel assistant. You are warm,
competent, and anticipatory — like a luxury hotel concierge who remembers your name and your coffee order.

You maintain continuity across all their trips. You speak in first person as their personal assistant.
You never mention internal system agents or technical details.

When asked to plan a trip, respond warmly and confirm what you're going to do.
For emergencies, respond immediately with urgency and empathy.
For complaints, show empathy and immediately begin resolution process.
Always keep the traveler informed but never overwhelm with details.`;

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface RmSession {
  travelerId: string;
  history: ConversationTurn[];
  activeTripId?: string;
  lastIntent?: IntentClassification;
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
    const response = await claude.messages.create({
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

function extractTripRequest(message: string, travelerId: string): TripRequest | null {
  // Basic extraction — in production use Claude to parse structured trip data
  const destinationMatch = message.match(/(?:to|for|in|visit)\s+([A-Z][a-zA-Z\s,]+?)(?:\s+(?:from|on|for|in|,)|$)/i);
  if (!destinationMatch) return null;

  return {
    id: randomUUID(),
    traveler_id: travelerId,
    destination: destinationMatch[1].trim(),
    dates: { start: '2026-06-15', end: '2026-06-22' }, // Default; parsed from message in production
    budget: { amount: 150000, currency: 'INR' },
    party_size: 2,
    purpose: /honeymoon|romantic/.test(message.toLowerCase()) ? 'honeymoon' : 'leisure' as TripRequest['purpose'],
    preferences: {
      activity_level: 'moderate',
      dietary: 'vegetarian',
    },
  };
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
    session = { travelerId, history: [] };
    sessions.set(travelerId, session);
  }

  // Classify intent
  const intent = await classifyIntent(message);
  session.lastIntent = intent;

  console.log(`[RM] Intent: ${intent} | Message: "${message.slice(0, 60)}..."`);

  let response: string;
  let routedTo: AgentId = 'relationship-manager';

  // ── EMERGENCY: bypass all routing, highest priority ──
  if (intent === 'EMERGENCY') {
    response = await handleEmergency(message, session, registry);
    routedTo = 'emergency';

  // ── PLANNING: route to Synthesizer ─────────────────
  } else if (intent === 'PLANNING') {
    routedTo = 'synthesizer';

    const tripReq = extractTripRequest(message, travelerId);
    if (tripReq) {
      // Acknowledge immediately, then orchestrate
      const ackResponse = await claude.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: RM_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `The traveler wants to plan: "${message}". Write a warm 1-2 sentence acknowledgment that you're starting to plan their trip to ${tripReq.destination}. Don't mention internal agents.`,
        }],
      });
      const ack = ackResponse.content[0].type === 'text' ? ackResponse.content[0].text : '';

      // Run orchestration (non-blocking in production; blocking here for simplicity)
      try {
        const result = await orchestrateTrip(tripReq);
        session.activeTripId = tripReq.id;

        if (result.escalation_needed) {
          response = `${ack}\n\n⚠️ I've found some concerns with your trip that need your attention: ${result.escalation_reason}. Could you confirm how you'd like to proceed?`;
        } else {
          response = `${ack}\n\nI've put together a complete itinerary for your ${tripReq.destination} trip! It covers ${result.itinerary.length} days with transport, accommodation, and activities — all within your ₹${tripReq.budget.amount.toLocaleString('en-IN')} budget. Would you like me to walk you through it day by day?`;
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error('[RM] Orchestration error:', error);
        response = `${ack}\n\nI'm working on your itinerary. There was a small hiccup — let me retry. (${error.slice(0, 80)})`;
      }
    } else {
      // Ask for more details
      const rm = registry.get('relationship-manager');
      response = await rm.handleMessage(message, { intent, context: 'needs_trip_details' });
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

    const historyMessages = session.history.map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    const resp = await claude.messages.create({
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
