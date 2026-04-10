import { NextRequest, NextResponse } from 'next/server';
import { getTrip } from '@/lib/trip-store';
import type { LiveStatus, FlightStatus, TripAlert } from '../../../../../lib/live-status';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trip = await getTrip(params.id);
    const now = new Date().toISOString();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Extract some real data from the trip if available
    const itinerary = trip.itinerary || [];
    const metadata = trip.metadata || {};
    
    // Find first flight if any
    const firstDay = itinerary[0];
    const transport = firstDay?.segments?.find((s: any) => s.type === 'transport' && s.mode === 'flight');

    const flights: FlightStatus[] = [];
    const alerts: TripAlert[] = [];

    if (transport) {
      flights.push({
        flight_number: transport.flight_number || 'AI101',
        route: `${transport.origin.name} → ${transport.destination.name}`,
        scheduled: transport.departure,
        estimated: transport.departure, // initially on time
        status: 'on-time',
        delay_minutes: 0,
        gate: 'B12',
        terminal: '3',
        downstream_impact: null
      });

      // Simulation: if trip ID starts with 'a', add a mock delay
      if (params.id.startsWith('a')) {
        flights[0].status = 'delayed';
        flights[0].delay_minutes = 45;
        const est = new Date(transport.departure);
        est.setMinutes(est.getMinutes() + 45);
        flights[0].estimated = est.toISOString();
        flights[0].downstream_impact = 'Your check-in at the hotel may be delayed.';
        
        alerts.push({
          id: 'alert-1',
          severity: 'warning',
          category: 'flight',
          title: 'Flight Delayed',
          body: `${flights[0].flight_number} is delayed by 45 minutes. We have notified your hotel.`,
          timestamp: now,
          resolved: false
        });
      }
    }

    // Mock live status
    const status: LiveStatus = {
      trip_id: params.id,
      last_updated: now,
      flights,
      hotel_notifications: [
        {
          property: 'Grand Hyatt',
          type: 'check-in',
          message: 'Your room is being prepared and will be ready by 2:00 PM.',
          action_required: false,
          scheduled_time: now
        }
      ],
      alerts,
      booking_hub: (itinerary as any[]).flatMap(day => 
        (day.segments || []).map((seg: any, idx: number) => ({
          id: `bk-${day.day_number}-${idx}`,
          type: seg.type,
          provider: seg.property_name || seg.carrier || seg.activity_name || 'Service Provider',
          booking_ref: seg.booking_ref || `REF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          description: seg.type === 'accommodation' ? 'Hotel Stay' : seg.type === 'transport' ? `Transport via ${seg.mode}` : 'Activity',
          date: day.date,
          status: 'confirmed',
          document_url: null
        }))
      )
    };

    return NextResponse.json(status);
  } catch (err: any) {
    console.error('[Live Status API] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch live status' }, { status: 500 });
  }
}
