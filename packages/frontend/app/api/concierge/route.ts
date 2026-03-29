import { NextRequest, NextResponse } from 'next/server';
import { handleTravelerMessage, AgentRegistry } from '@travel/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message: string = body.message || '';
    const travelerId: string = body.travelerId || 'default-traveler';
    const context: any = body.context || {};

    const registry = new AgentRegistry();
    await registry.startAll();

    console.log('[Concierge API] Routing message through Relationship Manager...');
    
    const result = await handleTravelerMessage(message, travelerId, registry, {
      gps: context.location ? parseGps(context.location) : undefined
    });

    await registry.stopAll();

    return NextResponse.json({
      response: result.response,
      source: 'ai',
      intent: result.intent,
      routed_to: result.routed_to,
      correlation_id: result.correlation_id
    });
  } catch (err: any) {
    console.error('[Concierge API] Error:', err);
    return NextResponse.json({
      response: "I'm having a bit of trouble connecting to my travel knowledge base. How else can I help you?",
      source: 'fallback',
    }, { status: 500 });
  }
}

function parseGps(location: string): { lat: number, lng: number } | undefined {
    try {
        const [lat, lng] = location.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    } catch {
        return undefined;
    }
}
