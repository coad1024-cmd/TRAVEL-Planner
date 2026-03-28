/**
 * Traveler Profile Agent — long-term profile management.
 * Learns from every trip. Runs proactive scans.
 */
import type { TravelerProfile, BayesianPreference, PreferenceObservation } from '@travel/shared';
import { callMcpTool } from './mcp-client.js';

// ─────────────────────────────────────────────
// #9: Bayesian preference update model
// ─────────────────────────────────────────────

/**
 * Update a Bayesian preference given a new observation.
 * Single observation shifts estimate slightly (weight 0.2).
 * Five+ consistent observations converge confidence toward 0.9+.
 * Traveler's stated override always available via `stated_value`.
 */
function bayesianUpdate(
  prior: BayesianPreference,
  newValue: string,
  tripId: string,
  observationWeight = 0.2,
): BayesianPreference {
  const observation: PreferenceObservation = {
    value: newValue,
    observed_at: new Date().toISOString(),
    trip_id: tripId,
    confidence_weight: observationWeight,
  };

  const observations = [...prior.observations, observation];

  // Count observations agreeing with the most common value
  const valueCounts = new Map<string, number>();
  for (const obs of observations) {
    valueCounts.set(obs.value, (valueCounts.get(obs.value) ?? 0) + obs.confidence_weight);
  }
  const [[bestValue, bestWeight]] = [...valueCounts.entries()].sort((a, b) => b[1] - a[1]);
  const totalWeight = [...valueCounts.values()].reduce((a, b) => a + b, 0);

  // Confidence: fraction of weight agreeing with best value, scaled by observation count
  // Caps at 0.95 — always leaves room for stated override
  const rawConfidence = bestWeight / totalWeight;
  const countFactor = Math.min(observations.length / 5, 1); // saturates at 5 observations
  const newConfidence = Math.min(0.95, rawConfidence * countFactor + prior.confidence * (1 - countFactor) * 0.5);

  return {
    stated_value: prior.stated_value,
    inferred_value: bestValue,
    observations,
    confidence: newConfidence,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Update profile based on ACTUAL trip behavior vs stated preferences.
 * Called after each trip completes.
 */
// In-memory Bayesian preference store — keyed by traveler_id
// In production, persist these alongside the TravelerProfile in Postgres
const bayesianPreferenceStore = new Map<string, {
  activity_style: BayesianPreference;
  budget_ceiling: BayesianPreference;
}>();

function getOrInitPreferences(
  travelerId: string,
  profile: TravelerProfile,
): { activity_style: BayesianPreference; budget_ceiling: BayesianPreference } {
  return bayesianPreferenceStore.get(travelerId) ?? {
    activity_style: {
      stated_value: profile.activity_style,
      inferred_value: profile.activity_style,
      observations: [],
      confidence: 0.5,
      last_updated: new Date().toISOString(),
    },
    budget_ceiling: {
      stated_value: String(profile.budget_comfort_zone.max.amount),
      inferred_value: String(profile.budget_comfort_zone.max.amount),
      observations: [],
      confidence: 0.5,
      last_updated: new Date().toISOString(),
    },
  };
}

export async function updateProfileFromTrip(
  travelerId: string,
  tripData: {
    trip_id: string;
    actual_activities: string[];
    stated_activity_level: string;
    actual_spend: number;
    budget: number;
    dietary_issues: string[];
  },
): Promise<void> {
  const profile = await callMcpTool('mcp-profile', 'get_profile', { traveler_id: travelerId })
    .catch(() => null) as TravelerProfile | null;

  if (!profile) return;

  // #9: Load existing Bayesian priors (or initialise from stated preferences)
  const prefs = getOrInitPreferences(travelerId, profile);
  const updates: Partial<TravelerProfile> = {};

  // ── Activity style ─────────────────────────
  const hardActivities = tripData.actual_activities.filter(a =>
    /tulian|glacier|trek|hike|summit|peak/.test(a.toLowerCase())
  );
  const observedActivityStyle = hardActivities.length >= 2 ? 'adventurous'
    : hardActivities.length === 1 ? 'moderate'
    : 'relaxed';

  // Weight hard evidence more strongly (0.3 vs 0.2 default)
  prefs.activity_style = bayesianUpdate(prefs.activity_style, observedActivityStyle, tripData.trip_id, 0.3);

  // Only update profile if we have sufficient confidence AND inferred differs from stored
  if (prefs.activity_style.confidence >= 0.7 && prefs.activity_style.inferred_value !== profile.activity_style) {
    updates.activity_style = prefs.activity_style.inferred_value;
    console.log(`[ProfileAgent] Bayesian update activity_style: ${profile.activity_style} → ${prefs.activity_style.inferred_value} (confidence: ${prefs.activity_style.confidence.toFixed(2)}, obs: ${prefs.activity_style.observations.length})`);
  }

  // ── Budget comfort zone ─────────────────────────
  const spendRatio = tripData.actual_spend / tripData.budget;
  const observedBudgetCeiling = spendRatio > 0.95 ? String(Math.round(tripData.budget * 1.2))
    : spendRatio < 0.5 ? String(Math.round(tripData.budget * 0.8))
    : String(tripData.budget);

  prefs.budget_ceiling = bayesianUpdate(prefs.budget_ceiling, observedBudgetCeiling, tripData.trip_id, 0.25);

  const newCeiling = parseFloat(prefs.budget_ceiling.inferred_value);
  if (prefs.budget_ceiling.confidence >= 0.6 && newCeiling !== profile.budget_comfort_zone.max.amount) {
    updates.budget_comfort_zone = {
      ...profile.budget_comfort_zone,
      max: { amount: newCeiling, currency: 'INR' },
    };
    console.log(`[ProfileAgent] Bayesian update budget ceiling: ${profile.budget_comfort_zone.max.amount} → ${newCeiling} (confidence: ${prefs.budget_ceiling.confidence.toFixed(2)})`);
  }

  // Persist updated preferences
  bayesianPreferenceStore.set(travelerId, prefs);

  if (Object.keys(updates).length > 0) {
    await callMcpTool('mcp-profile', 'update_profile', {
      traveler_id: travelerId,
      updates,
    }).catch(err => console.warn('[ProfileAgent] Profile update failed:', err));
  }
}

/**
 * Monthly passport expiry scan.
 * Alerts for documents expiring within 6 months.
 */
export async function runPassportExpiryScan(travelerId: string): Promise<string[]> {
  const docs = await callMcpTool('mcp-profile', 'get_documents', { traveler_id: travelerId })
    .catch(() => []) as TravelerProfile['documents'];

  const alerts: string[] = [];
  const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;

  for (const doc of docs) {
    const expiryMs = new Date(doc.expiry).getTime();
    const daysLeft = Math.floor((expiryMs - Date.now()) / (1000 * 60 * 60 * 24));

    if (expiryMs - Date.now() <= sixMonthsMs) {
      const msg = `${doc.type.toUpperCase()} expires in ${daysLeft} days (${doc.expiry})`;
      alerts.push(msg);
      console.log(`[ProfileAgent] ALERT: ${msg}`);

      // Send notification
      await callMcpTool('mcp-notifications', 'send_push', {
        title: `⚠️ ${doc.type} expiring soon`,
        body: msg,
        urgency: daysLeft < 30 ? 'critical' : 'warning',
      }).catch(() => {});
    }
  }

  return alerts;
}

/**
 * Daily price watch for saved routes.
 */
export async function runPriceWatch(
  travelerId: string,
  savedRoutes: Array<{ origin: string; destination: string; budget: number; currency: string }>,
): Promise<void> {
  for (const route of savedRoutes) {
    const results = await callMcpTool('mcp-flights', 'search_flights', {
      origin: route.origin,
      destination: route.destination,
      departure_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      passengers: 2,
      cabin_class: 'economy',
      max_results: 3,
    }).catch(() => ({ offers: [] })) as { offers: Array<{ price: { amount: number } }> };

    const cheapest = results.offers.sort((a, b) => a.price.amount - b.price.amount)[0];
    if (cheapest && cheapest.price.amount < route.budget * 0.8) {
      console.log(`[ProfileAgent] FARE DROP: ${route.origin}→${route.destination} at ${route.currency} ${cheapest.price.amount} (budget: ${route.budget})`);

      await callMcpTool('mcp-notifications', 'send_push', {
        title: '✈️ Fare drop on your saved route!',
        body: `${route.origin}→${route.destination}: ${route.currency} ${cheapest.price.amount.toLocaleString()} (20% below your budget)`,
        urgency: 'info',
      }).catch(() => {});
    }
  }
}

/**
 * Proactive anniversary trip suggestion.
 */
export async function checkAnniversarySuggestion(
  travelerId: string,
  previousHoneymoonDestination: string,
  anniversaryDate: string,
): Promise<void> {
  const daysToAnniversary = Math.floor(
    (new Date(anniversaryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysToAnniversary > 0 && daysToAnniversary <= 60) {
    await callMcpTool('mcp-notifications', 'send_push', {
      title: '💕 Anniversary coming up!',
      body: `Your anniversary is ${daysToAnniversary} days away. Want to revisit ${previousHoneymoonDestination} or explore somewhere new?`,
      urgency: 'info',
    }).catch(() => {});

    console.log(`[ProfileAgent] Anniversary suggestion sent for ${travelerId}`);
  }
}
