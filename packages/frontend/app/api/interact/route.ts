import { NextRequest, NextResponse } from 'next/server';
import { handleManagerMessage } from '@travel/orchestrator/manager-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message: string = body.message || '';
    const travelerId: string = body.travelerId || 'default-traveler';
    const paymentMethod: string | undefined = body.payment_method;

    console.log('[Interact API] Message:', message.slice(0, 80), '| Traveler:', travelerId);

    const result = await handleManagerMessage(message, travelerId, {
      payment_method: paymentMethod,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Interact API] Error:', err);
    return NextResponse.json({
      voice_text: "I'm having a bit of trouble right now. Could you try again in a moment?",
      visual_state: {
        step: 'REQUIREMENT_GATHERING',
        transcript: [],
        structured_inputs: {},
        missing_fields: [],
        itinerary: null,
        budget_dashboard: null,
        payment_status: 'idle',
        payment_method: null,
        booking_confirmation: null,
      },
      intent: 'GENERAL',
      correlation_id: 'error',
    }, { status: 500 });
  }
}
