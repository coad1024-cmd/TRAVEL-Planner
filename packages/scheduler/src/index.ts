/**
 * Travel system scheduler (node-cron MVP).
 * In production this would be replaced with Temporal.io workflows.
 *
 * Runs:
 * - pre_flight_check: daily at 06:00 (checks T-24hr window)
 * - morning_briefing: daily at 08:00 local
 * - passport_expiry_scan: 1st of each month at 09:00
 * - price_watch: daily at 07:00
 * - feedback_request: daily at 11:00 (checks T+24hr window)
 * - claim_followup: every Monday at 10:00
 */
import cron from 'node-cron';
import { passportExpiryScan, priceWatch, morningBriefing, preFlightCheck, feedbackRequest, claimFollowup } from './workflows.js';

// #13: Emergency data staleness validator
// Calls mcp-emergency health check endpoint and alerts if any record is stale
async function emergencyDataStalenessCheck(): Promise<void> {
  console.log('[Scheduler] Running emergency data staleness validation...');
  // In production: call mcp-emergency with a dedicated validate_staleness tool
  // For now: spawn a quick check against the seeded data constants
  const DATA_SEEDED_DATE = '2026-01-15';
  const thresholdMs = 30 * 24 * 60 * 60 * 1000;
  const ageMs = Date.now() - new Date(DATA_SEEDED_DATE).getTime();
  if (ageMs > thresholdMs) {
    const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    console.error(`[Scheduler] ALERT: Emergency contact data (embassies, emergency numbers) is ${days} days old. Update from official sources: MEA India https://www.mea.gov.in/`);
  } else {
    console.log('[Scheduler] Emergency data freshness OK.');
  }
}

// Demo context for test scenario
const DEMO_CTX = {
  tripId: '00000000-0000-0000-0000-000000000002',
  travelerId: '00000000-0000-0000-0000-000000000001',
  flightNumber: '6E-2345',
  documentType: 'passport',
  expiryDate: '2029-03-15',
};

interface ScheduledJob {
  name: string;
  schedule: string;
  handler: () => Promise<void>;
}

const JOBS: ScheduledJob[] = [
  {
    name: 'pre_flight_check',
    schedule: '0 6 * * *', // daily at 06:00
    handler: () => preFlightCheck(DEMO_CTX),
  },
  {
    name: 'morning_briefing',
    schedule: '0 8 * * *', // daily at 08:00
    handler: () => morningBriefing(DEMO_CTX),
  },
  {
    name: 'passport_expiry_scan',
    schedule: '0 9 1 * *', // 1st of month at 09:00
    handler: () => passportExpiryScan(DEMO_CTX),
  },
  {
    name: 'price_watch',
    schedule: '0 7 * * *', // daily at 07:00
    handler: () => priceWatch(DEMO_CTX),
  },
  {
    name: 'feedback_request',
    schedule: '0 11 * * *', // daily at 11:00
    handler: () => feedbackRequest(DEMO_CTX),
  },
  {
    name: 'claim_followup',
    schedule: '0 10 * * 1', // every Monday at 10:00
    handler: () => claimFollowup(DEMO_CTX),
  },
  {
    // #13: Weekly emergency data staleness check — Sundays at 02:00
    name: 'emergency_data_staleness_check',
    schedule: '0 2 * * 0',
    handler: emergencyDataStalenessCheck,
  },
];

function startScheduler(): void {
  console.log('[Scheduler] Starting travel system scheduler (node-cron MVP)');
  console.log('[Scheduler] Production: replace with Temporal.io for distributed workflows\n');

  for (const job of JOBS) {
    cron.schedule(job.schedule, async () => {
      console.log(`[Scheduler] Running: ${job.name}`);
      try {
        await job.handler();
      } catch (err) {
        console.error(`[Scheduler] Job failed (${job.name}):`, err);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata', // IST for J&K trips
    });

    console.log(`  • ${job.name}: ${job.schedule}`);
  }

  console.log('\n[Scheduler] All jobs scheduled. Running...');
}

startScheduler();

// Simple status output every 60s
setInterval(() => {
  console.log(`[Scheduler] ${new Date().toISOString()} — ${JOBS.length} jobs active`);
}, 60_000);
