import { NextRequest, NextResponse } from 'next/server';
import { orchestrateTrip } from '@travel/orchestrator';
import { saveTrip } from '@/lib/trip-store';
import { randomUUID } from 'crypto';

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
    
    let finalData;
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('[API] ANTHROPIC_API_KEY missing, using mock orchestration');
      const mockResult = getMockOrchestration(body);
      finalData = {
        ...mockResult,
        trip_id: tripId,
        metadata: tripRequest
      };
    } else {
      // In a real app, this would be non-blocking with a status check
      const result = await orchestrateTrip(tripRequest);
      
      // Add the trip metadata to the result for display
      finalData = {
          ...result,
          trip_id: tripId,
          metadata: tripRequest
      };
    }
    
    await saveTrip(tripId, finalData);
    
    return NextResponse.json(
      { id: tripId, status: (finalData as any).state || 'PRESENT' },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[API] Orchestration failed:', err);
    return NextResponse.json({ error: err.message || 'Orchestration failed' }, { status: 500 });
  }
}

function getMockOrchestration(body: any) {
    const currency = body.budget?.currency || 'INR';
    const total_budget = body.budget?.amount || 50000;
    const total_spent = 20000;
    const remaining = total_budget - total_spent;

    return {
        state: 'PRESENT',
        destination: body.destination,
        itinerary: [
            {
                day_number: 1,
                date: body.dates?.start || '2026-05-01',
                segments: [
                    {
                        type: 'transport',
                        mode: 'flight',
                        carrier: 'Demo Airlines',
                        origin: { name: 'Home' },
                        destination: { name: body.destination },
                        departure: new Date().toISOString(),
                        arrival: new Date(Date.now() + 3600000 * 5).toISOString(),
                        cost: { amount: 12000, currency },
                        flight_number: 'DA-123'
                    },
                    {
                        type: 'accommodation',
                        property_name: 'Grand Mock Hotel',
                        location: { name: body.destination },
                        nightly_rate: { amount: 4000, currency },
                        total_cost: { amount: 8000, currency },
                        amenities: ['Wi-Fi', 'Pool', 'Breakfast'],
                        cancellation_policy: 'Free cancellation 48h before',
                        cost: { amount: 8000, currency }
                    }
                ],
                risk_level: 'low',
                weather_summary: 'Sunny with a light breeze',
                nearest_hospital_km: 2.5
            }
        ],
        budget: {
            total_budget: { amount: total_budget, currency },
            total_spent: { amount: total_spent, currency },
            remaining: { amount: remaining, currency },
            percent_used: (total_spent / total_budget) * 100,
            by_category: {
                transport: { amount: 12000 },
                accommodation: { amount: 8000 }
            },
            alerts: []
        },
        pre_departure_checklist: { items: [] },
        itinerary_version: { version_number: 1 },
        messages: []
    };
}
