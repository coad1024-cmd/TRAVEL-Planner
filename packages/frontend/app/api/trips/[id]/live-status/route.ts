import { NextRequest, NextResponse } from 'next/server';
import type { LiveStatus } from '../../../../../lib/live-status';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // In production: query FlightAware API, Booking.com API, Redis event stream
  // For now: return mock data that mirrors what the webhook-ingress would surface
  const now = new Date().toISOString();

  const liveStatus: LiveStatus = {
    trip_id: params.id,
    last_updated: now,

    flights: [
      {
        flight_number: '6E-2401',
        route: 'DEL → SXR',
        scheduled: '2026-04-10T06:30:00',
        estimated: '2026-04-10T06:30:00',
        status: 'on-time',
        delay_minutes: 0,
        gate: 'B14',
        terminal: 'T2',
        downstream_impact: null,
      },
      {
        flight_number: 'AI-824',
        route: 'SXR → DEL',
        scheduled: '2026-04-16T17:45:00',
        estimated: '2026-04-16T18:20:00',
        status: 'delayed',
        delay_minutes: 35,
        gate: 'A3',
        terminal: 'T1',
        downstream_impact: 'Transfer to hotel on return will need to be rescheduled by 35 min.',
      },
    ],

    hotel_notifications: [
      {
        property: 'The Pahalgam Hotel',
        type: 'check-in',
        message: 'Your room is ready for early check-in from 12:00 PM (standard 2 PM). Your mountain-view King room has been prepared.',
        action_required: false,
        scheduled_time: '2026-04-10T12:00:00',
      },
      {
        property: 'The Pahalgam Hotel',
        type: 'special-request',
        message: 'Bonfire arranged at the garden terrace for tonight at 8 PM. Please confirm by 5 PM.',
        action_required: true,
        scheduled_time: '2026-04-10T20:00:00',
      },
    ],

    alerts: [
      {
        id: 'alert-001',
        severity: 'warning',
        category: 'flight',
        title: 'Return flight AI-824 delayed 35 min',
        body: 'Air India AI-824 (SXR → DEL, Apr 16) is running 35 minutes late. New estimated departure: 18:20. Your ground transfer on return has been flagged for adjustment.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        resolved: false,
      },
      {
        id: 'alert-002',
        severity: 'info',
        category: 'weather',
        title: 'Light snow forecast at Gulmarg on Apr 13',
        body: 'Weather stations report light snowfall expected above 2800m on April 13. Gulmarg Gondola Phase 2 may operate on reduced hours. Carry warm layers and check gondola status morning of visit.',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        resolved: false,
      },
      {
        id: 'alert-003',
        severity: 'info',
        category: 'budget',
        title: 'Transport budget 80% consumed',
        body: 'You have spent ₹17,600 of your ₹22,000 transport budget. The Day 4 Pahalgam↔Gulmarg cab (₹7,000 round trip) will exceed this category. No action needed — contingency fund covers the overage.',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        resolved: false,
      },
    ],

    booking_hub: [
      {
        id: 'bk-001',
        type: 'flight',
        provider: 'IndiGo',
        booking_ref: 'INDBOM2401',
        description: 'DEL → SXR · 6E-2401 · Apr 10, 06:30',
        date: '2026-04-10',
        status: 'confirmed',
        document_url: null,
      },
      {
        id: 'bk-002',
        type: 'hotel',
        provider: 'The Pahalgam Hotel',
        booking_ref: 'PHG2026-88',
        description: 'King Mountain View · Apr 10–17 · 7 nights',
        date: '2026-04-10',
        status: 'confirmed',
        document_url: null,
      },
      {
        id: 'bk-003',
        type: 'excursion',
        provider: 'Gulmarg Gondola',
        booking_ref: 'GUL-APR13',
        description: 'Phase 1 + 2 · Apr 13 · 2 persons',
        date: '2026-04-13',
        status: 'pending',
        document_url: null,
      },
      {
        id: 'bk-004',
        type: 'transfer',
        provider: 'Private Cab — Kashmir Travels',
        booking_ref: 'KSH-CAB-001',
        description: 'SXR → Pahalgam · Apr 10 · 10:00 AM',
        date: '2026-04-10',
        status: 'confirmed',
        document_url: null,
      },
      {
        id: 'bk-005',
        type: 'flight',
        provider: 'Air India',
        booking_ref: 'SRIAI824',
        description: 'SXR → DEL · AI-824 · Apr 16, 17:45',
        date: '2026-04-16',
        status: 'confirmed',
        document_url: null,
      },
    ],
  };

  return NextResponse.json(liveStatus);
}
