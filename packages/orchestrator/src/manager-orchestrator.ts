/**
 * Manager Agent Orchestrator — hybrid voice + visual travel planning.
 * Implements 8-step flow: INIT → REQUIREMENT_GATHERING → ORCHESTRATION →
 * PLAN_GENERATION → USER_DECISION_LOOP → CONFIRMATION → PAYMENT → POST_PAYMENT
 *
 * The Manager Agent is the SOLE user-facing entity. Voice is primary, visuals are supportive.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { TripRequest, IntentClassification, AgentId } from '@travel/shared';
import { createCorrelationId } from '@travel/shared';
import { AgentRegistry } from './registry.js';
import { orchestrateTrip } from './synthesizer.js';
import { callMcpTool } from './mcp-client.js';
import { randomUUID } from 'crypto';

// ─── Types ───────────────────────────────────────────────

export type ManagerStep =
  | 'INIT'
  | 'REQUIREMENT_GATHERING'
  | 'ORCHESTRATION'
  | 'PLAN_GENERATION'
  | 'USER_DECISION_LOOP'
  | 'CONFIRMATION'
  | 'PAYMENT'
  | 'POST_PAYMENT';

export interface VisualState {
  step: ManagerStep;
  transcript: ConversationTurn[];
  structured_inputs: Partial<TripRequest>;
  missing_fields: string[];
  itinerary: any | null;
  budget_dashboard: any | null;
  payment_status: 'idle' | 'pending' | 'processing' | 'success' | 'failed';
  payment_method: string | null;
  booking_confirmation: BookingConfirmation | null;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface BookingConfirmation {
  booking_id: string;
  trip_id: string;
  destination: string;
  total_amount: number;
  currency: string;
  payment_method: string;
  whatsapp_sent: boolean;
  email_sent: boolean;
}

export interface ManagerResponse {
  voice_text: string;          // Primary: spoken to user via TTS
  visual_state: VisualState;   // Secondary: synced to UI
  intent: IntentClassification;
  correlation_id: string;
}

// ─── Claude Client ───────────────────────────────────────

let _claude: Anthropic | null = null;
function getClaude() {
  if (!_claude) {
    _claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _claude;
}

// ─── System Prompts ──────────────────────────────────────

const MANAGER_SYSTEM_PROMPT = `You are the Manager Agent — the sole user-facing entity in a voice-first travel planning system.
Your responses will be spoken aloud via TTS. Keep them:
- Brief and conversational (1-3 sentences max)
- Warm, confident, and anticipatory — like a luxury concierge
- No markdown, no lists, no technical jargon
- Natural pauses with commas for TTS clarity

You orchestrate a team of specialist sub-agents (Flight, Hotel, Transport, Activity) behind the scenes.
The user never sees or interacts with sub-agents directly. You present their work as your own seamless service.

Your flow:
1. Greet and start collecting requirements via conversation
2. Once you have all details, acknowledge and begin planning
3. Present the plan with voice summary + visual dashboard
4. Accept feedback and iterate until the user approves
5. Get explicit confirmation before payment
6. Process payment and send confirmations`;

const INTENT_PROMPT = `You are classifying a traveler's message intent.
Respond with ONLY one of these exact strings:
PLANNING - new trip request, trip modification, hotel/flight search
LIVE_HELP - on-trip question, nearby, right now, GPS-based
EMERGENCY - medical help, lost documents, danger, crisis
COMPLAINT - refund, dispute, bad experience
GENERAL - chitchat, profile, general question
ACCEPT - user accepts/approves plan, says yes/looks good/perfect/book it
REJECT - user wants changes, says no/change/modify/different/instead
CONFIRM_PAYMENT - user confirms payment authorization explicitly
CANCEL - user wants to cancel or go back`;

const EXTRACTION_PROMPT = `Extract structured trip details from conversation. Return ONLY a JSON object.
Fields: destination, start_date (YYYY-MM-DD), end_date, budget_amount, budget_currency, party_size,
purpose (honeymoon/business/family/adventure/solo/group), accommodation_style, activity_level (relaxed/moderate/adventurous),
dietary_preferences, must_include (array), avoid (array), transport_preferences, hotel_preferences, activity_preferences, amenities.
Omit missing fields. Do not fabricate data.`;

// ─── Session Store ───────────────────────────────────────

interface ManagerSession {
  id: string;
  travelerId: string;
  step: ManagerStep;
  transcript: ConversationTurn[];
  structured_inputs: Partial<TripRequest>;
  itinerary: any | null;
  budget_dashboard: any | null;
  payment_status: 'idle' | 'pending' | 'processing' | 'success' | 'failed';
  payment_method: string | null;
  booking_confirmation: BookingConfirmation | null;
  registry: AgentRegistry | null;
}

const sessions = new Map<string, ManagerSession>();

function getOrCreateSession(travelerId: string): ManagerSession {
  let session = sessions.get(travelerId);
  if (!session) {
    session = {
      id: randomUUID(),
      travelerId,
      step: 'INIT',
      transcript: [],
      structured_inputs: {},
      itinerary: null,
      budget_dashboard: null,
      payment_status: 'idle',
      payment_method: null,
      booking_confirmation: null,
      registry: null,
    };
    sessions.set(travelerId, session);
  }
  return session;
}

function buildVisualState(session: ManagerSession): VisualState {
  return {
    step: session.step,
    transcript: session.transcript,
    structured_inputs: session.structured_inputs,
    missing_fields: getMissingFields(session.structured_inputs),
    itinerary: session.itinerary,
    budget_dashboard: session.budget_dashboard,
    payment_status: session.payment_status,
    payment_method: session.payment_method,
    booking_confirmation: session.booking_confirmation,
  };
}

// ─── Helpers ─────────────────────────────────────────────

function getMissingFields(req: Partial<TripRequest>): string[] {
  const missing: string[] = [];
  if (!req.destination) missing.push('destination');
  if (!req.dates?.start || !req.dates?.end) missing.push('travel_dates_or_duration');
  if (!req.budget?.amount) missing.push('budget_range');
  if (!req.party_size) missing.push('party_size');
  return missing;
}

function addTurn(session: ManagerSession, role: 'user' | 'assistant', content: string) {
  session.transcript.push({ role, content, timestamp: new Date().toISOString() });
}

async function classifyManagerIntent(message: string): Promise<string> {
  const msg = message.toLowerCase();

  // Fast keyword checks
  if (/emergency|help me|accident|injured|hospital|lost passport|stolen|crisis|danger/.test(msg)) return 'EMERGENCY';
  if (/refund|complaint|claim|dispute|terrible|awful|horrible/.test(msg)) return 'COMPLAINT';
  if (/nearby|right now|i'm at|find me|currently|walking distance/.test(msg)) return 'LIVE_HELP';
  if (/^(yes|yeah|yep|sure|confirm|authorize|do it|go ahead|approved|i confirm|proceed with payment)/.test(msg.trim())) return 'CONFIRM_PAYMENT';
  if (/looks good|perfect|love it|book it|let's go|i'm happy|approve|accept|great plan|sounds good|sounds great|that works/.test(msg)) return 'ACCEPT';
  if (/change|modify|different|instead|swap|replace|don't want|no not|actually|can you adjust|tweak/.test(msg)) return 'REJECT';
  if (/cancel|stop|never ?mind|forget it|go back|start over/.test(msg)) return 'CANCEL';

  try {
    const response = await getClaude().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      system: INTENT_PROMPT,
      messages: [{ role: 'user', content: message }],
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return raw || 'GENERAL';
  } catch {
    // Fallback
    if (/plan|book|trip|travel|hotel|flight|itinerary/.test(msg)) return 'PLANNING';
    return 'GENERAL';
  }
}

async function extractTripData(transcript: ConversationTurn[]): Promise<Partial<TripRequest>> {
  const messages = transcript.slice(-8).map(t => ({ role: t.role as 'user' | 'assistant', content: t.content }));
  try {
    const response = await getClaude().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: EXTRACTION_PROMPT,
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
        },
      };
    }
  } catch (err) {
    console.error('[Manager] Extraction error:', err);
  }
  return {};
}

function mergeTripData(existing: Partial<TripRequest>, incoming: Partial<TripRequest>): Partial<TripRequest> {
  return {
    ...existing,
    ...incoming,
    dates: incoming.dates || existing.dates,
    budget: incoming.budget || existing.budget,
    preferences: { ...existing.preferences, ...incoming.preferences },
  };
}

async function generateVoiceResponse(prompt: string, transcript: ConversationTurn[]): Promise<string> {
  const messages = transcript.slice(-6).map(t => ({ role: t.role as 'user' | 'assistant', content: t.content }));
  messages.push({ role: 'user', content: prompt });
  try {
    const response = await getClaude().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: MANAGER_SYSTEM_PROMPT,
      messages: messages as any,
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch {
    return "I'd be happy to help you plan your trip. Could you tell me where you'd like to go?";
  }
}

// ─── Main Handler ────────────────────────────────────────

export async function handleManagerMessage(
  message: string,
  travelerId: string,
  options: { gps?: { lat: number; lng: number }; payment_method?: string } = {},
): Promise<ManagerResponse> {
  const correlationId = createCorrelationId();
  const session = getOrCreateSession(travelerId);

  // Add user turn
  addTurn(session, 'user', message);

  const intent = await classifyManagerIntent(message);
  console.log(`[Manager] Step: ${session.step} | Intent: ${intent} | Msg: "${message.slice(0, 60)}"`);

  let voiceText = '';
  let mappedIntent: IntentClassification = 'GENERAL';

  // ── STEP 1: INIT ──
  if (session.step === 'INIT') {
    session.step = 'REQUIREMENT_GATHERING';
    voiceText = await generateVoiceResponse(
      `The traveler just started the interaction. Greet them warmly and ask where they'd like to travel. Be enthusiastic but brief.`,
      []
    );
    mappedIntent = 'PLANNING';
  }

  // ── EMERGENCY: always bypass ──
  else if (intent === 'EMERGENCY') {
    mappedIntent = 'EMERGENCY';
    if (!session.registry) {
      session.registry = new AgentRegistry();
      await session.registry.startAll();
    }
    const emergencyAgent = session.registry.get('emergency');
    voiceText = await emergencyAgent.handleMessage(message, { priority: 'CRITICAL' });
    try {
      await callMcpTool('mcp-notifications', 'send_sms', {
        phone: '+91-9876543210',
        message: `EMERGENCY ALERT: ${voiceText.slice(0, 100)}...`,
      });
    } catch {}
  }

  // ── COMPLAINT: route to feedback agent ──
  else if (intent === 'COMPLAINT') {
    mappedIntent = 'COMPLAINT';
    if (!session.registry) {
      session.registry = new AgentRegistry();
      await session.registry.startAll();
    }
    const fbAgent = session.registry.get('feedback-claims');
    voiceText = await fbAgent.handleMessage(message);
  }

  // ── CANCEL: reset session ──
  else if (intent === 'CANCEL') {
    mappedIntent = 'GENERAL';
    session.step = 'REQUIREMENT_GATHERING';
    session.structured_inputs = {};
    session.itinerary = null;
    session.budget_dashboard = null;
    session.payment_status = 'idle';
    session.payment_method = null;
    voiceText = "No problem at all. Let's start fresh. Where would you like to travel?";
  }

  // ── STEP 2: REQUIREMENT_GATHERING ──
  else if (session.step === 'REQUIREMENT_GATHERING') {
    mappedIntent = 'PLANNING';

    const extracted = await extractTripData(session.transcript);
    session.structured_inputs = mergeTripData(session.structured_inputs, extracted);
    const missing = getMissingFields(session.structured_inputs);

    if (missing.length > 0) {
      voiceText = await generateVoiceResponse(
        `We're collecting trip details. We have: ${JSON.stringify(session.structured_inputs)}. Still need: ${missing.join(', ')}. The traveler just said: "${message}". Ask for the missing info conversationally.`,
        session.transcript
      );
    } else {
      // All required fields collected — move to orchestration
      session.step = 'ORCHESTRATION';
      voiceText = await generateVoiceResponse(
        `We have all trip details for ${session.structured_inputs.destination}. Budget: ${session.structured_inputs.budget?.amount} ${session.structured_inputs.budget?.currency}. Party: ${session.structured_inputs.party_size}. Give a brief acknowledgment and tell them you're now crafting their perfect plan.`,
        session.transcript
      );

      // Start orchestration in background
      (async () => {
        try {
          const tripReq = {
            ...session.structured_inputs,
            id: randomUUID(),
            traveler_id: travelerId,
          } as TripRequest;

          const result = await orchestrateTrip(tripReq);
          session.itinerary = result.itinerary;
          session.budget_dashboard = result.budget;
          session.step = 'PLAN_GENERATION';
        } catch (err) {
          console.error('[Manager] Orchestration failed:', err);
          // Generate mock itinerary for demo
          session.itinerary = generateMockItinerary(session.structured_inputs);
          session.budget_dashboard = generateMockBudget(session.structured_inputs);
          session.step = 'PLAN_GENERATION';
        }
      })();
    }
  }

  // ── STEP 3-4: ORCHESTRATION / PLAN_GENERATION ──
  else if (session.step === 'ORCHESTRATION' || session.step === 'PLAN_GENERATION') {
    mappedIntent = 'PLANNING';

    if (session.itinerary) {
      session.step = 'USER_DECISION_LOOP';
      const days = Array.isArray(session.itinerary) ? session.itinerary.length : 0;
      voiceText = await generateVoiceResponse(
        `The plan is ready! It's a ${days}-day itinerary for ${session.structured_inputs.destination}. Budget: ${session.structured_inputs.budget?.amount} ${session.structured_inputs.budget?.currency}. Summarize the highlights in 2-3 sentences for voice. Tell them to check the visual dashboard for full details and ask if they'd like any changes.`,
        session.transcript
      );
    } else {
      voiceText = "I'm still putting together the perfect plan for you. Give me just a moment, I'm coordinating with our specialist agents.";
    }
  }

  // ── STEP 5: USER_DECISION_LOOP ──
  else if (session.step === 'USER_DECISION_LOOP') {
    mappedIntent = 'PLANNING';

    if (intent === 'ACCEPT') {
      session.step = 'CONFIRMATION';
      const amount = session.structured_inputs.budget?.amount?.toLocaleString('en-IN') || '0';
      const currency = session.structured_inputs.budget?.currency || 'INR';
      voiceText = `Wonderful! Before I proceed with booking, I need your explicit confirmation. The total comes to ${currency} ${amount} for your ${session.structured_inputs.destination} trip. Shall I go ahead and process the payment?`;
    } else if (intent === 'REJECT') {
      voiceText = await generateVoiceResponse(
        `The user wants to change the plan. They said: "${message}". Acknowledge their feedback warmly and ask what specifically they'd like changed. We'll re-orchestrate after getting their feedback.`,
        session.transcript
      );
      // Stay in USER_DECISION_LOOP; next iteration will re-gather and re-orchestrate
    } else {
      voiceText = await generateVoiceResponse(
        `The user is reviewing the plan and said: "${message}". They may have a question about the itinerary or want to know more. Answer helpfully and remind them they can approve or request changes.`,
        session.transcript
      );
    }
  }

  // ── STEP 6: CONFIRMATION ──
  else if (session.step === 'CONFIRMATION') {
    mappedIntent = 'PLANNING';

    if (intent === 'CONFIRM_PAYMENT' || intent === 'ACCEPT') {
      session.step = 'PAYMENT';
      session.payment_status = 'pending';
      voiceText = "Thank you for confirming. Please select your preferred payment method on screen — you can use UPI, credit card, debit card, or EMI. I'll guide you through it.";
    } else if (intent === 'REJECT' || intent === 'CANCEL') {
      session.step = 'USER_DECISION_LOOP';
      voiceText = "No worries at all. Let's go back to the plan. What would you like to adjust?";
    } else {
      voiceText = "I just need a clear yes or no to proceed with the booking. Would you like me to go ahead?";
    }
  }

  // ── STEP 7: PAYMENT ──
  else if (session.step === 'PAYMENT') {
    mappedIntent = 'PLANNING';

    if (options.payment_method) {
      session.payment_method = options.payment_method;
      session.payment_status = 'processing';

      // Process payment via MCP
      try {
        await callMcpTool('mcp-payments', 'process_payment', {
          amount: session.structured_inputs.budget?.amount || 0,
          currency: session.structured_inputs.budget?.currency || 'INR',
          method: options.payment_method,
          idempotency_key: `${session.id}:payment:1`,
          description: `Trip to ${session.structured_inputs.destination}`,
        });
        session.payment_status = 'success';
        session.step = 'POST_PAYMENT';

        // Send notifications
        const bookingId = `BK-${randomUUID().slice(0, 8).toUpperCase()}`;
        const confirmation: BookingConfirmation = {
          booking_id: bookingId,
          trip_id: session.id,
          destination: session.structured_inputs.destination || '',
          total_amount: session.structured_inputs.budget?.amount || 0,
          currency: session.structured_inputs.budget?.currency || 'INR',
          payment_method: options.payment_method,
          whatsapp_sent: false,
          email_sent: false,
        };

        // Send WhatsApp
        try {
          await callMcpTool('mcp-notifications', 'send_whatsapp', {
            phone: '+91-9876543210',
            template_id: 'trip_confirmation',
            params: [session.structured_inputs.destination, bookingId],
          });
          confirmation.whatsapp_sent = true;
        } catch {}

        // Send Email
        try {
          await callMcpTool('mcp-notifications', 'send_email', {
            to: 'traveler@example.com',
            subject: `Booking Confirmed: ${session.structured_inputs.destination} — ${bookingId}`,
            html_body: `<h1>Your Trip is Booked!</h1>
              <p>Booking ID: ${bookingId}</p>
              <p>Destination: ${session.structured_inputs.destination}</p>
              <p>Total: ${session.structured_inputs.budget?.currency} ${session.structured_inputs.budget?.amount?.toLocaleString('en-IN')}</p>
              <p>Payment: ${options.payment_method}</p>`,
          });
          confirmation.email_sent = true;
        } catch {}

        session.booking_confirmation = confirmation;
        voiceText = `Payment successful! Your booking ID is ${bookingId}. I've sent the full itinerary and confirmation to your WhatsApp and email. Have an amazing trip to ${session.structured_inputs.destination}!`;
      } catch (err) {
        session.payment_status = 'failed';
        voiceText = "I'm sorry, there was an issue processing your payment. Would you like to try again or use a different payment method?";
      }
    } else {
      voiceText = "Please select your payment method on screen. You can choose UPI, credit card, debit card, or EMI.";
    }
  }

  // ── STEP 8: POST_PAYMENT ──
  else if (session.step === 'POST_PAYMENT') {
    mappedIntent = 'GENERAL';
    voiceText = await generateVoiceResponse(
      `The booking is complete. Booking ID: ${session.booking_confirmation?.booking_id}. The user said: "${message}". They might have follow-up questions. Answer warmly and wish them well on their trip.`,
      session.transcript
    );
  }

  // Fallback
  else {
    voiceText = await generateVoiceResponse(
      `The user said: "${message}". Respond helpfully as the Manager Agent.`,
      session.transcript
    );
  }

  addTurn(session, 'assistant', voiceText);

  return {
    voice_text: voiceText,
    visual_state: buildVisualState(session),
    intent: mappedIntent,
    correlation_id: correlationId,
  };
}

// ─── Mock Data Generators (for demo without API keys) ────

function generateMockItinerary(inputs: Partial<TripRequest>): any[] {
  const dest = inputs.destination || 'Unknown';
  const start = inputs.dates?.start || '2026-07-10';
  const end = inputs.dates?.end || '2026-07-14';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return {
      day_number: i + 1,
      date: date.toISOString().split('T')[0],
      segments: [
        ...(i === 0 ? [{
          type: 'transport',
          mode: 'flight',
          origin: { name: 'Delhi', region: 'NCR' },
          destination: { name: dest, region: dest },
          departure: `${date.toISOString().split('T')[0]}T08:00:00`,
          arrival: `${date.toISOString().split('T')[0]}T10:30:00`,
          cost: { amount: Math.round((inputs.budget?.amount || 50000) * 0.15), currency: inputs.budget?.currency || 'INR' },
          carrier: 'Air India',
        }] : []),
        {
          type: 'accommodation',
          property_name: `${dest} Grand Resort`,
          location: { name: dest },
          check_in: `${date.toISOString().split('T')[0]}T14:00:00`,
          check_out: `${date.toISOString().split('T')[0]}T11:00:00`,
          nightly_rate: { amount: Math.round((inputs.budget?.amount || 50000) * 0.1), currency: inputs.budget?.currency || 'INR' },
          total_cost: { amount: Math.round((inputs.budget?.amount || 50000) * 0.1), currency: inputs.budget?.currency || 'INR' },
        },
        {
          type: 'excursion',
          activity_name: i === 0 ? `${dest} Heritage Walk` : i === 1 ? `${dest} Nature Trail` : `Local Cultural Experience`,
          location: { name: dest },
          start_time: `${date.toISOString().split('T')[0]}T10:00:00`,
          duration_minutes: 180,
          cost: { amount: Math.round((inputs.budget?.amount || 50000) * 0.05), currency: inputs.budget?.currency || 'INR' },
          difficulty: 'moderate',
        },
      ],
      risk_level: 'low',
      weather_summary: 'Pleasant, 22-28°C',
      nearest_hospital_km: 3.5,
    };
  });
}

function generateMockBudget(inputs: Partial<TripRequest>): any {
  const total = inputs.budget?.amount || 50000;
  const currency = inputs.budget?.currency || 'INR';
  return {
    total_budget: { amount: total, currency },
    total_spent: { amount: Math.round(total * 0.85), currency },
    remaining: { amount: Math.round(total * 0.15), currency },
    percent_used: 85,
    by_category: {
      transport: { amount: Math.round(total * 0.25), currency },
      accommodation: { amount: Math.round(total * 0.35), currency },
      excursions: { amount: Math.round(total * 0.15), currency },
      food: { amount: Math.round(total * 0.1), currency },
      contingency: { amount: Math.round(total * 0.15), currency },
    },
    alerts: [],
  };
}

// ─── Session management exports ──────────────────────────

export function getManagerSession(travelerId: string): ManagerSession | undefined {
  return sessions.get(travelerId);
}

export function resetManagerSession(travelerId: string): void {
  sessions.delete(travelerId);
}

// ─── Process payment from UI ─────────────────────────────

export async function processPaymentFromUI(
  travelerId: string,
  paymentMethod: string,
): Promise<ManagerResponse> {
  return handleManagerMessage('Process my payment', travelerId, { payment_method: paymentMethod });
}
