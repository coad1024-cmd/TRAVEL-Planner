import { NextRequest, NextResponse } from 'next/server';
import { getTrip } from '@/lib/trip-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trip = await getTrip(params.id);
    
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    
    return NextResponse.json(trip);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch trip' }, { status: 500 });
  }
}
