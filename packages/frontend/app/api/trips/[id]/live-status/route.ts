import { NextRequest, NextResponse } from 'next/server';
import type { LiveStatus } from '../../../../../lib/live-status';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const now = new Date().toISOString();

  // Simulated failure/empty state to test real UI error boundaries
  // Once the real backend streams updates, this will fetch from Redis/Trip Store
  
  const emptyStatus: LiveStatus = {
    trip_id: params.id,
    last_updated: now,
    flights: [],
    hotel_notifications: [],
    alerts: [],
    booking_hub: []
  };

  return NextResponse.json(emptyStatus);
}
