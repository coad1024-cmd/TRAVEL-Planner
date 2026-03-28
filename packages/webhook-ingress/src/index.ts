/**
 * Webhook ingress server.
 * Receives external events and routes them to the Redis event bus.
 * Sources: FlightAware, Booking.com, Stripe/Razorpay, WhatsApp, Telegram.
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import { publishEvent } from '@travel/shared';
import type { TravelSystemEvent } from '@travel/shared';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.raw({ type: 'application/json', limit: '1mb' }));

// #5: Rate limiting middleware applied to all webhook endpoints
app.use('/webhooks', (req: Request, res: Response, next: NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string ?? req.socket.remoteAddress ?? 'unknown').split(',')[0].trim();
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }
  next();
});

// ─────────────────────────────────────────────
// Dead-letter queue (in-memory for MVP; Redis list in production)
// ─────────────────────────────────────────────

interface DeadLetterEntry {
  source: string;
  payload: unknown;
  error: string;
  timestamp: string;
  retries: number;
}

const deadLetterQueue: DeadLetterEntry[] = [];

async function publishOrDeadLetter(
  source: string,
  event: TravelSystemEvent,
  rawPayload: unknown,
): Promise<void> {
  try {
    await publishEvent(event);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    deadLetterQueue.push({ source, payload: rawPayload, error, timestamp: new Date().toISOString(), retries: 0 });
    console.error(`[Webhook] Dead-letter: ${source} — ${error}`);
  }
}

// ─────────────────────────────────────────────
// Signature verification
// ─────────────────────────────────────────────

function verifyStripeSignature(payload: string, signature: string): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return true; // Skip in dev
  const timestamp = signature.split(',')[0]?.split('=')[1];
  const sig = signature.split(',')[1]?.split('=')[1];
  if (!timestamp || !sig) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

function verifyTelegramSecret(payload: string, signature: string): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return true;
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const expected = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
  return expected === signature;
}

// #5: HMAC verification for FlightAware and Booking.com webhooks
function verifyFlightAwareSignature(payload: string, signature: string): boolean {
  const secret = process.env.FLIGHTAWARE_WEBHOOK_SECRET;
  if (!secret) return true; // Skip in dev; enforce in production
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function verifyBookingSignature(payload: string, signature: string): boolean {
  const secret = process.env.BOOKING_WEBHOOK_SECRET;
  if (!secret) return true;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// #5: Simple in-memory rate limiter — sliding window per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// Cleanup rate limit map every 5 minutes to avoid memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap) {
    const fresh = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (fresh.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, fresh);
  }
}, 5 * 60_000);

// ─────────────────────────────────────────────
// Webhook handlers
// ─────────────────────────────────────────────

/** FlightAware AeroAPI — flight status changes */
app.post('/webhooks/flightaware', async (req: Request, res: Response) => {
  // #5: HMAC verification
  const signature = req.headers['x-fa-signature'] as string ?? '';
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  if (!verifyFlightAwareSignature(rawBody, signature)) {
    res.status(401).json({ error: 'Invalid FlightAware signature' });
    return;
  }

  const body = req.body as {
    ident?: string;
    status?: string;
    delay?: number;
    gate_destination?: string;
    trip_id?: string;
  };

  res.status(200).json({ received: true });

  const event: TravelSystemEvent = {
    event_type: 'flight.status_changed',
    trip_id: body.trip_id ?? 'unknown',
    timestamp: new Date().toISOString(),
    severity: (body.delay ?? 0) > 120 ? 'critical' : (body.delay ?? 0) > 30 ? 'warning' : 'info',
    data: {
      flight_number: body.ident ?? 'unknown',
      new_status: body.status ?? 'unknown',
      delay_minutes: body.delay ?? 0,
      gate: body.gate_destination,
    },
  };

  await publishOrDeadLetter('flightaware', event, body);
});

/** Booking.com / hotel confirmation callbacks */
app.post('/webhooks/booking', async (req: Request, res: Response) => {
  // #5: HMAC verification
  const signature = req.headers['x-booking-signature'] as string ?? '';
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  if (!verifyBookingSignature(rawBody, signature)) {
    res.status(401).json({ error: 'Invalid Booking.com signature' });
    return;
  }

  const body = req.body as {
    reservation_id?: string;
    status?: string;
    property_id?: string;
    trip_id?: string;
  };

  res.status(200).json({ received: true });

  const eventType = body.status === 'cancelled' ? 'booking.cancellation' : 'booking.confirmation';

  const event: TravelSystemEvent = eventType === 'booking.confirmation'
    ? {
        event_type: 'booking.confirmation',
        trip_id: body.trip_id ?? 'unknown',
        timestamp: new Date().toISOString(),
        severity: 'info',
        data: {
          booking_id: body.reservation_id ?? 'unknown',
          type: 'accommodation',
          provider: 'booking.com',
          reference: body.reservation_id ?? '',
        },
      }
    : {
        event_type: 'booking.cancellation',
        trip_id: body.trip_id ?? 'unknown',
        timestamp: new Date().toISOString(),
        severity: 'warning',
        data: {
          booking_id: body.reservation_id ?? 'unknown',
          reason: 'Cancelled via Booking.com',
          refund_status: 'pending',
        },
      };

  await publishOrDeadLetter('booking.com', event, body);
});

/** Stripe payment webhooks */
app.post('/webhooks/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string ?? '';
  const rawBody = req.body as Buffer;

  if (!verifyStripeSignature(rawBody.toString(), signature)) {
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  const body = JSON.parse(rawBody.toString()) as { type?: string; data?: { object?: { id?: string; metadata?: { trip_id?: string; items?: unknown[]; amount?: number; currency?: string } } } };
  res.status(200).json({ received: true });

  if (body.type === 'payment_intent.succeeded') {
    const obj = body.data?.object;
    const event: TravelSystemEvent = {
      event_type: 'booking.confirmation',
      trip_id: obj?.metadata?.trip_id ?? 'unknown',
      timestamp: new Date().toISOString(),
      severity: 'info',
      data: {
        booking_id: obj?.id ?? 'unknown',
        type: 'payment',
        provider: 'stripe',
        reference: obj?.id ?? '',
      },
    };
    await publishOrDeadLetter('stripe', event, body);
  }
});

/** WhatsApp Business API incoming messages */
app.post('/webhooks/whatsapp', async (req: Request, res: Response) => {
  // WhatsApp requires immediate 200 response
  res.status(200).json({ received: true });

  const body = req.body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{ from?: string; text?: { body?: string }; id?: string }>;
          metadata?: { phone_number_id?: string };
        };
      }>;
    }>;
  };

  const messages = body.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
  for (const msg of messages) {
    console.log(`[Webhook] WhatsApp message from ${msg.from}: ${msg.text?.body}`);
    // Route to Relationship Manager via event bus (would need a message event type)
    // For now, log for processing
  }
});

/** WhatsApp verification challenge */
app.get('/webhooks/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

/** Telegram Bot webhook */
app.post('/webhooks/telegram', async (req: Request, res: Response) => {
  const signature = req.headers['x-telegram-bot-api-secret-token'] as string ?? '';
  const rawBody = JSON.stringify(req.body);

  if (process.env.TELEGRAM_WEBHOOK_SECRET && !verifyTelegramSecret(rawBody, signature)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  res.status(200).json({ ok: true });

  const body = req.body as {
    message?: { from?: { id?: number; first_name?: string }; text?: string; message_id?: number };
  };
  const msg = body.message;
  if (msg?.text) {
    console.log(`[Webhook] Telegram from ${msg.from?.first_name}: ${msg.text}`);
  }
});

/** Dead-letter queue inspection */
app.get('/dlq', (_req: Request, res: Response) => {
  res.json({ count: deadLetterQueue.length, items: deadLetterQueue.slice(-10) });
});

/** Health check */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'webhook-ingress' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Webhook] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.WEBHOOK_PORT ?? '3001', 10);
app.listen(PORT, () => {
  console.log(`[Webhook] Ingress server running on port ${PORT}`);
  console.log('[Webhook] Endpoints:');
  console.log('  POST /webhooks/flightaware');
  console.log('  POST /webhooks/booking');
  console.log('  POST /webhooks/stripe');
  console.log('  POST /webhooks/whatsapp');
  console.log('  POST /webhooks/telegram');
  console.log('  GET  /dlq  (dead-letter queue)');
});

export default app as import('express').Express;
