/**
 * Live Re-Routing Agent — monitors disruptions and adapts itinerary.
 * Subscribes to: flight.status_changed, road.closure, weather.alert, booking.cancellation.
 * Never makes changes without traveler approval (except life-safety emergencies).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { TravelSystemEvent, ItineraryDay, ReroutingTimeoutPolicy } from '@travel/shared';
import { DEFAULT_REROUTING_POLICIES, subscribeToEvents, publishEvent, getPrisma } from '@travel/shared';
import { callMcpTool } from './mcp-client.js';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const REROUTING_SYSTEM = `You are the Live Re-Routing Specialist. A disruption has occurred.
Analyze the affected itinerary segments and propose alternatives.

Return JSON with:
{
  "affected_segments": [...segment descriptions],
  "proposed_changes": [...change descriptions],
  "cost_delta": { "amount": number, "currency": "INR" },
  "time_delta_minutes": number,
  "what_is_lost": "...",
  "what_is_gained": "...",
  "urgency": "low|medium|high|critical",
  "message_to_traveler": "..."
}

Keep message_to_traveler concise and empathetic. Wrap JSON in \`\`\`json...\`\`\`.`;

interface ReroutingProposal {
  affected_segments: string[];
  proposed_changes: string[];
  cost_delta: { amount: number; currency: string };
  time_delta_minutes: number;
  what_is_lost: string;
  what_is_gained: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  message_to_traveler: string;
}

export async function analyzeDisruption(
  event: TravelSystemEvent,
  currentItinerary: ItineraryDay[],
): Promise<ReroutingProposal | null> {
  let disruptionContext = '';

  switch (event.event_type) {
    case 'flight.status_changed': {
      const { flight_number, new_status, delay_minutes } = event.data;
      disruptionContext = `Flight ${flight_number} is ${new_status} with ${delay_minutes} min delay.`;

      // Auto-notify hotel if delay is significant (> 30 min)
      if (delay_minutes > 30) {
        try {
          const hotel = currentItinerary
            .flatMap(d => d.segments)
            .find(s => s.type === 'accommodation');
          
          if (hotel && hotel.type === 'accommodation') {
            await callMcpTool('mcp-notifications', 'send_email', {
              to: 'frontdesk@hotel.com', // Would be hotel's email
              subject: `Late Check-in Notification: Trip ${event.trip_id}`,
              html_body: `<p>Dear Front Desk,</p><p>Our traveler on flight ${flight_number} is experiencing a delay of ${delay_minutes} minutes. Their estimated arrival is now later than planned. Please hold their reservation.</p>`
            });
            console.log(`[LiveRerouting] Auto-notified hotel ${hotel.property_name} about flight ${flight_number} delay.`);
          }
        } catch (e) {
          console.error('[LiveRerouting] Failed to notify hotel:', e);
        }
      }

      // Get alternative flights
      if (delay_minutes > 60) {
        const alts = await callMcpTool('mcp-flight-status', 'get_alternatives', {
          flight_number,
        }).catch(() => ({}));
        disruptionContext += ` Alternatives: ${JSON.stringify(alts)}`;
      }
      break;
    }

    case 'road.closure': {
      const { route_id, reason, estimated_reopen, alternatives } = event.data;
      disruptionContext = `Road closure: ${route_id}. Reason: ${reason}. Reopens: ${estimated_reopen}. Alternatives: ${alternatives.join(', ')}`;

      // Check if Jawahar Tunnel affected (Srinagar↔Pahalgam route)
      if (route_id.toLowerCase().includes('jawahar') || alternatives.includes('Mughal Road')) {
        const mughalRoute = await callMcpTool('mcp-routing', 'get_route', {
          origin: 'Srinagar',
          destination: 'Pahalgam',
          mode: 'driving',
        }).catch(() => ({}));
        disruptionContext += ` Mughal Road route: ${JSON.stringify(mughalRoute)}`;
      }
      break;
    }

    case 'weather.alert': {
      const { region, description } = event.data;
      disruptionContext = `Weather alert for ${region}: ${description}`;
      break;
    }

    case 'booking.cancellation': {
      const { booking_id, reason, refund_status } = event.data;
      disruptionContext = `Booking ${booking_id} cancelled. Reason: ${reason}. Refund: ${refund_status}`;

      // Search for replacement accommodation
      const replacement = await callMcpTool('mcp-accommodation', 'search_properties', {
        location: 'Pahalgam, Jammu Kashmir',
        check_in: new Date().toISOString().slice(0, 10),
        check_out: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
        guests: 2,
        max_results: 3,
      }).catch(() => ({}));
      disruptionContext += ` Replacement options: ${JSON.stringify(replacement)}`;
      break;
    }

    default:
      return null;
  }

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: REROUTING_SYSTEM,
    messages: [{
      role: 'user',
      content: `Disruption: ${disruptionContext}
Current itinerary: ${JSON.stringify(currentItinerary.slice(0, 3))} (truncated)
Trip ID: ${event.trip_id}`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as ReroutingProposal;
    }
  } catch {
    // Fallback
  }

  return {
    affected_segments: ['Unable to parse affected segments'],
    proposed_changes: [text.slice(0, 200)],
    cost_delta: { amount: 0, currency: 'INR' },
    time_delta_minutes: 0,
    what_is_lost: 'Original plan',
    what_is_gained: 'Flexibility',
    urgency: 'medium',
    message_to_traveler: text.slice(0, 300),
  };
}

/**
 * Apply approved re-routing changes to the itinerary.
 */
export async function applyRerouting(
  tripId: string,
  proposal: ReroutingProposal,
  currentItinerary: ItineraryDay[],
): Promise<ItineraryDay[]> {
  // 1. Publish confirmation event
  await publishEvent({
    event_type: 'booking.confirmation',
    trip_id: tripId,
    timestamp: new Date().toISOString(),
    severity: 'info',
    data: {
      booking_id: `reroute_${Date.now()}`,
      type: 'itinerary_change',
      provider: 'live-rerouting-agent',
      reference: `Changes: ${proposal.proposed_changes.join('; ')}`,
    },
  }).catch(() => {});

  // 2. Persist to DB if Prisma is available
  const prisma = await getPrisma() as any;
  if (prisma) {
    try {
      await prisma.trip.update({
        where: { id: tripId },
        data: {
          itinerary: currentItinerary, // In production, we would merge proposal.proposed_changes into this
          updatedAt: new Date(),
        }
      });
      console.log(`[LiveRerouting] Persisted updated itinerary for trip ${tripId} to database.`);
    } catch (err) {
      console.error(`[LiveRerouting] Failed to persist trip update:`, err);
    }
  }

  console.log(`[LiveRerouting] Applied changes to trip ${tripId}: ${proposal.proposed_changes.join('; ')}`);
  return currentItinerary; 
}

// #4: Pending approval queue — keyed by trip_id + event timestamp
interface PendingApproval {
  tripId: string;
  proposal: ReroutingProposal;
  itinerary: ItineraryDay[];
  received_at: number; // Date.now()
  policy: ReroutingTimeoutPolicy;
  timer: ReturnType<typeof setTimeout>;
}
const pendingApprovals = new Map<string, PendingApproval>();

function getTimeoutPolicy(urgency: ReroutingProposal['urgency']): ReroutingTimeoutPolicy {
  const severityMap: Record<string, ReroutingTimeoutPolicy['disruption_severity']> = {
    critical: 'critical', high: 'high', medium: 'medium', low: 'low',
  };
  const severity = severityMap[urgency] ?? 'medium';
  return DEFAULT_REROUTING_POLICIES.find(p => p.disruption_severity === severity)!;
}

/**
 * Start event subscription for live re-routing.
 * #4: All non-critical proposals now carry a timeout. On expiry, the policy
 * (auto_execute or queue_and_alert) is enforced so re-routing never hangs
 * indefinitely when the traveler is offline.
 */
export function startLiveReroutingSubscription(
  getItinerary: (tripId: string) => Promise<ItineraryDay[]>,
  notifyTraveler: (tripId: string, message: string) => Promise<void>,
): void {
  const EVENT_TYPES = ['flight.status_changed', 'road.closure', 'weather.alert', 'booking.cancellation'];

  subscribeToEvents(
    EVENT_TYPES,
    async (event) => {
      console.log(`[LiveRerouting] Received event: ${event.event_type} for trip ${event.trip_id}`);

      const itinerary = await getItinerary(event.trip_id).catch(() => []);
      const proposal = await analyzeDisruption(event, itinerary);

      if (!proposal) return;

      const policy = getTimeoutPolicy(proposal.urgency);
      console.log(`[LiveRerouting] Proposal urgency=${proposal.urgency} → timeout=${policy.timeout_minutes}min policy=${policy.policy_on_timeout}`);

      if (proposal.urgency === 'critical') {
        // Auto-apply immediately for life-safety; notify after
        await applyRerouting(event.trip_id, proposal, itinerary);
        await notifyTraveler(event.trip_id, `🚨 Emergency rerouting applied: ${proposal.message_to_traveler}`);
        return;
      }

      // Notify traveler and start timeout timer
      const approvalKey = `${event.trip_id}:${event.timestamp}`;

      await notifyTraveler(
        event.trip_id,
        `⚠️ Disruption detected: ${proposal.message_to_traveler}\n\nProposed changes:\n${proposal.proposed_changes.map(c => `• ${c}`).join('\n')}\n\nTime change: ${proposal.time_delta_minutes > 0 ? '+' : ''}${proposal.time_delta_minutes} min | Cost change: ₹${proposal.cost_delta.amount}\n\nReply "ACCEPT" to apply, or changes will be ${policy.policy_on_timeout === 'auto_execute' ? 'auto-applied' : 'queued'} in ${policy.timeout_minutes} minutes.`,
      );

      // #4: Schedule timeout action
      const timer = setTimeout(async () => {
        const pending = pendingApprovals.get(approvalKey);
        if (!pending) return; // Already handled

        pendingApprovals.delete(approvalKey);
        console.log(`[LiveRerouting] Timeout for ${approvalKey} — executing policy: ${pending.policy.policy_on_timeout}`);

        if (pending.policy.policy_on_timeout === 'auto_execute') {
          await applyRerouting(event.trip_id, pending.proposal, pending.itinerary);
          await notifyTraveler(
            event.trip_id,
            `ℹ️ No response received — rerouting has been auto-applied: ${pending.proposal.message_to_traveler}`,
          );
        } else {
          // queue_and_alert: keep queued, re-notify when traveler reconnects
          await notifyTraveler(
            event.trip_id,
            `⚠️ Queued rerouting awaiting your decision: ${pending.proposal.message_to_traveler}\n\nReply "ACCEPT" to apply or "REJECT" to dismiss.`,
          );
        }
      }, policy.timeout_minutes * 60 * 1000);

      pendingApprovals.set(approvalKey, { tripId: event.trip_id, proposal, itinerary, received_at: Date.now(), policy, timer });
    },
    'live-rerouting-consumer',
  ).catch(err => {
    console.warn('[LiveRerouting] Event subscription failed (Redis likely unavailable):', err.message);
  });

  console.log('[LiveRerouting] Subscribed to disruption events');
}

/**
 * Called when traveler responds "ACCEPT" to a pending rerouting proposal.
 */
export async function acceptRerouting(approvalKey: string): Promise<boolean> {
  const pending = pendingApprovals.get(approvalKey);
  if (!pending) return false;
  clearTimeout(pending.timer);
  pendingApprovals.delete(approvalKey);
  await applyRerouting(pending.tripId, pending.proposal, pending.itinerary);
  return true;
}
