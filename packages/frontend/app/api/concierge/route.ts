import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI travel concierge embedded in a travel planning app.

LANGUAGE: Detect the language of the user's message and respond in the SAME language. If the message is in Hindi, reply in Hindi. If in English, reply in English. Mix scripts naturally (e.g. Hindi in Devanagari if the user uses it).

PERSONA: Expert on Pahalgam and Kashmir travel. Fast, direct, practical. Always include actionable next steps.

RESPONSE FORMAT:
- Keep responses under 150 words
- Use bold for key names/numbers
- Use bullet points for lists of 3+ items
- Include a Google Maps link when the user asks about a location: https://maps.google.com/?q=<location>

CAPABILITIES:
1. Real-time recommendations: restaurants, activities, safety, weather, routes, pharmacies, ATMs
2. Itinerary modification: If the user wants to change their trip (e.g. "can we skip Gulmarg", "add a day in Srinagar"), respond with:
   [MODIFICATION_REQUEST] followed by a summary of the requested change, then your recommendation
3. Proactive suggestions: When appropriate, suggest nearby hidden gems or time-saving tips unprompted
4. Emergency guidance: If the user mentions an emergency (medical, safety, natural disaster), lead with the emergency number and nearest facility

CONTEXT:
- Current trip: Pahalgam, Kashmir | April 10-16, 2026
- Party: 2 travellers (honeymoon)
- Hotel: The Pahalgam Hotel (check-in Apr 10, check-out Apr 17)
- Nearest hospital: District Hospital Pahalgam — 01936-243220
- Emergency: 112 (national), 101 (fire), 100 (police)`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message: string = body.message || '';
    const language: string = body.language || 'auto';
    const context: { location?: string; day?: number } = body.context || {};

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { response: getFallbackResponse(message), source: 'fallback' },
        { status: 200 }
      );
    }

    const userContent = [
      message,
      context.location ? `Current location: ${context.location}` : '',
      context.day ? `Current day of trip: Day ${context.day}` : '',
      language !== 'auto' ? `Respond in: ${language}` : '',
    ].filter(Boolean).join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Detect if this is a modification request
    const isModification = text.startsWith('[MODIFICATION_REQUEST]');
    const cleanText = isModification ? text.replace('[MODIFICATION_REQUEST]', '').trim() : text;

    return NextResponse.json({
      response: cleanText,
      source: 'ai',
      is_modification_request: isModification,
    });
  } catch (err) {
    console.error('[Concierge API] Error:', err);
    return NextResponse.json({
      response: getFallbackResponse(''),
      source: 'fallback',
    });
  }
}

function getFallbackResponse(message: string): string {
  const msg = message.toLowerCase();
  if (/restaurant|eat|food|vegetarian/.test(msg)) {
    return "Near you: **Wangnoo Dhaba** (0.3 km, vegetarian-friendly Kashmiri), **Lidder View Restaurant** (0.5 km, Wazwan with river views), **Mama's Kitchen** (0.8 km, cozy home-style). All accept cash.";
  }
  if (/weather|rain|cold|temperature/.test(msg)) {
    return "Today: partly cloudy, **15°C**. Showers expected after 3 PM — carry a rain jacket. Betaab Valley is accessible; Chandanwari snow point may be slippery. Tomorrow looks clearer.";
  }
  if (/hospital|emergency|medical|sick|hurt/.test(msg)) {
    return "🚨 **Emergency: 112** | District Hospital Pahalgam — **4.5 km away**, call 01936-243220. Pharmacy at main market open until 9 PM. For altitude sickness above 3000m, ask for Diamox.";
  }
  if (/gulmarg|gondola/.test(msg)) {
    return "Gulmarg Gondola: **Phase 1** ₹800/person (to Kongdoori), **Phase 2** ₹1000/person (to Apharwat Peak, 3980m). Book online at jammukashmirtourism.com or at counter — arrive by 9 AM to avoid queues.";
  }
  if (/jeep|betaab|taxi|cab/.test(msg)) {
    return "Betaab Valley: shared jeep from Pahalgam bus stand ₹100-150/person, private jeep ₹400-500 return. Journey ~20 min. For Baisaran, ponies are the only option — ₹800-1200 for the ride up.";
  }
  return "I'm your Pahalgam concierge. Ask me about restaurants, weather, activities, routes, medical help, or anything about your Kashmir trip!";
}
