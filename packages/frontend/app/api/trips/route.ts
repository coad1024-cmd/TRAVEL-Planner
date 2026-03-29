import { NextRequest, NextResponse } from 'next/server';
import { orchestrateTrip } from '@travel/orchestrator';
import { saveTrip, getTrips } from '@/lib/trip-store';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const trips = await getTrips();
    return NextResponse.json(trips);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const tripId = randomUUID();
    const tripRequest = {
      id: tripId,
      traveler_id: randomUUID(),
      destination: body.destination,
      dates: body.dates,
      budget: body.budget,
      party_size: body.party_size,
      purpose: body.purpose,
      preferences: body.preferences || {},
    };

    console.log('[API] Starting orchestration for:', body.destination);
    
    // In a real app, this would be non-blocking with a status check
    const result = await orchestrateTrip(tripRequest);
    
    // Add the trip metadata to the result for display
    const finalData = {
        ...result,
        trip_id: tripId,
        metadata: tripRequest
    };
    
    await saveTrip(tripId, finalData);
    
    return NextResponse.json(
      { id: tripId, status: result.state },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[API] Orchestration failed:', err);
    return NextResponse.json({ error: err.message || 'Orchestration failed' }, { status: 500 });
  }
}
