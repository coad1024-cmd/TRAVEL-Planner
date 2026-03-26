/**
 * Traveler Profile Agent — long-term profile management.
 * Learns from every trip. Runs proactive scans.
 */
import type { TravelerProfile } from '@travel/shared';
import { callMcpTool } from './mcp-client.js';

/**
 * Update profile based on ACTUAL trip behavior vs stated preferences.
 * Called after each trip completes.
 */
export async function updateProfileFromTrip(
  travelerId: string,
  tripData: {
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

  const updates: Partial<TravelerProfile> = {};

  // Activity level adjustment: if they did more than stated, upgrade
  const hardActivities = tripData.actual_activities.filter(a =>
    /tulian|glacier|trek|hike|summit|peak/.test(a.toLowerCase())
  );

  if (hardActivities.length >= 2 && tripData.stated_activity_level !== 'adventurous') {
    updates.activity_style = 'adventurous';
    console.log(`[ProfileAgent] Upgrading activity_style to adventurous (did ${hardActivities.length} hard activities)`);
  }

  // Budget comfort zone adjustment
  const spendRatio = tripData.actual_spend / tripData.budget;
  if (spendRatio > 0.95 && profile.budget_comfort_zone.max.amount < tripData.budget * 1.2) {
    updates.budget_comfort_zone = {
      ...profile.budget_comfort_zone,
      max: { amount: tripData.budget * 1.2, currency: 'INR' },
    };
    console.log(`[ProfileAgent] Expanding budget ceiling to INR ${(tripData.budget * 1.2).toLocaleString()}`);
  }

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
