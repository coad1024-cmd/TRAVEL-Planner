import { NextRequest, NextResponse } from 'next/server';
import { getTrip } from '@/lib/trip-store';
import type { LiveStatus, FlightStatus, TripAlert } from '../../../../../lib/live-status';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Try to get live status from the orchestrator store
  try {
    const { liveStatusStore } = await import('@travel/orchestrator');
    const status = liveStatusStore.getLiveStatus(params.id);
    return NextResponse.json(status);
  } catch {
    // Fallback: return empty status
    const emptyStatus: LiveStatus = {
      trip_id: params.id,
      last_updated: new Date().toISOString(),
      flights: [],
      hotel_notifications: [],
      alerts: [],
      booking_hub: []
    };
    return NextResponse.json(emptyStatus);
  }
}
