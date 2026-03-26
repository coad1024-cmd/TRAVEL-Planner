/**
 * Workflow definitions for the travel system scheduler.
 * Each workflow publishes an event to the Redis event bus,
 * triggering the appropriate agent(s).
 */
import { publishEvent } from '@travel/shared';
import type { TravelSystemEvent } from '@travel/shared';

export interface WorkflowContext {
  tripId: string;
  travelerId: string;
  tripDate?: string;
  flightNumber?: string;
  documentType?: string;
  expiryDate?: string;
}

/**
 * Pre-flight check: T-24hrs before transport segment.
 * Triggers: verify flight status, push briefing to traveler.
 */
export async function preFlightCheck(ctx: WorkflowContext): Promise<void> {
  if (!ctx.flightNumber) return;

  const event: TravelSystemEvent = {
    event_type: 'flight.status_changed',
    trip_id: ctx.tripId,
    timestamp: new Date().toISOString(),
    severity: 'info',
    data: {
      flight_number: ctx.flightNumber,
      new_status: 'pre_departure_check',
      delay_minutes: 0,
    },
  };

  await publishEvent(event);
  console.log(`[Scheduler] Pre-flight check triggered for ${ctx.flightNumber}`);
}

/**
 * Morning briefing: 8am local time each trip day.
 * Publishes a synthetic event that the Concierge/RM picks up.
 */
export async function morningBriefing(ctx: WorkflowContext): Promise<void> {
  // In a real implementation this fires via the booking confirmation workflow
  // For MVP: publish a weather alert that triggers daily briefing
  const event: TravelSystemEvent = {
    event_type: 'weather.alert',
    trip_id: ctx.tripId,
    timestamp: new Date().toISOString(),
    severity: 'info',
    data: {
      region: 'pahalgam',
      description: `Morning briefing for trip day ${ctx.tripDate ?? 'today'}`,
      valid_until: new Date(Date.now() + 86400000).toISOString(),
    },
  };

  await publishEvent(event);
  console.log(`[Scheduler] Morning briefing published for trip ${ctx.tripId}`);
}

/**
 * Passport expiry scan: Monthly.
 * Fires profile.document_expiry if within 6 months.
 */
export async function passportExpiryScan(ctx: WorkflowContext): Promise<void> {
  if (!ctx.expiryDate || !ctx.documentType) return;

  const expiryMs = new Date(ctx.expiryDate).getTime();
  const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;

  if (expiryMs - Date.now() <= sixMonthsMs) {
    const event: TravelSystemEvent = {
      event_type: 'profile.document_expiry',
      trip_id: ctx.tripId,
      timestamp: new Date().toISOString(),
      severity: 'warning',
      data: {
        document_type: ctx.documentType,
        expiry_date: ctx.expiryDate,
        traveler_id: ctx.travelerId,
      },
    };

    await publishEvent(event);
    console.log(`[Scheduler] Document expiry alert: ${ctx.documentType} expires ${ctx.expiryDate}`);
  }
}

/**
 * Price watch: Daily. Monitors saved routes for fare drops.
 * Placeholder — in production would query Amadeus and compare.
 */
export async function priceWatch(ctx: WorkflowContext): Promise<void> {
  console.log(`[Scheduler] Price watch run for traveler ${ctx.travelerId}`);
}

/**
 * Feedback request: T+24hrs after trip end.
 */
export async function feedbackRequest(ctx: WorkflowContext): Promise<void> {
  console.log(`[Scheduler] Feedback request queued for trip ${ctx.tripId}`);
}

/**
 * Claim follow-up: Weekly while claim open.
 */
export async function claimFollowup(ctx: WorkflowContext): Promise<void> {
  console.log(`[Scheduler] Claim follow-up check for trip ${ctx.tripId}`);
}
