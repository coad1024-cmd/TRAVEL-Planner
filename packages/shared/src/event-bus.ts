/**
 * Redis Streams event bus for inter-agent communication and real-time triggers.
 * Provides publishEvent() and subscribeToEvents() for all system components.
 */
import { Redis } from 'ioredis';
import type { TravelSystemEvent } from './types.js';

export type EventHandler = (event: TravelSystemEvent) => Promise<void>;

const STREAM_KEY = 'travel:events';
const CONSUMER_GROUP = 'travel-agents';

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

function getRedisUrl(): string {
  return process.env.REDIS_URL ?? 'redis://localhost:6379';
}

function createClient(): Redis {
  const client = new Redis(getRedisUrl(), {
    retryStrategy: (times: number) => Math.min(times * 100, 3000),
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  client.on('error', (err: Error) => {
    console.error('[EventBus] Redis error:', err.message);
  });

  return client;
}

export function getPublisher(): Redis {
  if (!publisher) {
    publisher = createClient();
  }
  return publisher;
}

/**
 * Publish a typed event to the Redis Stream.
 * All events include event_type, trip_id, timestamp, severity.
 */
export async function publishEvent(event: TravelSystemEvent): Promise<string> {
  const client = getPublisher();
  const payload = JSON.stringify(event);

  try {
    const id = await client.xadd(
      STREAM_KEY,
      '*', // Auto-generate ID
      'event_type', event.event_type,
      'trip_id', event.trip_id,
      'severity', event.severity,
      'payload', payload,
    );
    return id ?? '';
  } catch (err) {
    // Redis unavailable — log and continue (event bus is best-effort in dev)
    console.warn('[EventBus] Failed to publish event (Redis unavailable):', event.event_type);
    return '';
  }
}

/**
 * Subscribe to specific event types using Redis Stream consumer groups.
 * Each consumer (identified by consumerId) gets its own cursor.
 */
export async function subscribeToEvents(
  eventTypes: string[],
  handler: EventHandler,
  consumerId: string,
  options: { blockMs?: number; batchSize?: number } = {},
): Promise<void> {
  const { blockMs = 5000, batchSize = 10 } = options;

  subscriber = createClient();

  // Ensure consumer group exists
  try {
    await subscriber.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '$', 'MKSTREAM');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('BUSYGROUP')) {
      console.error('[EventBus] Failed to create consumer group:', message);
    }
  }

  console.log(`[EventBus] ${consumerId} subscribing to: ${eventTypes.join(', ')}`);

  // Poll loop
  const poll = async (): Promise<void> => {
    while (true) {
      try {
        const results = await subscriber!.xreadgroup(
          'GROUP', CONSUMER_GROUP, consumerId,
          'COUNT', batchSize,
          'BLOCK', blockMs,
          'STREAMS', STREAM_KEY, '>',
        );

        if (!results) continue;

        for (const [, messages] of results as [string, [string, string[]][]][]) {
          for (const [msgId, fields] of messages) {
            const fieldMap: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              fieldMap[fields[i]] = fields[i + 1];
            }

            const eventType = fieldMap['event_type'];
            if (!eventTypes.includes(eventType)) {
              // ACK but skip — not our event type
              await subscriber!.xack(STREAM_KEY, CONSUMER_GROUP, msgId);
              continue;
            }

            try {
              const event = JSON.parse(fieldMap['payload']) as TravelSystemEvent;
              await handler(event);
              await subscriber!.xack(STREAM_KEY, CONSUMER_GROUP, msgId);
            } catch (err) {
              console.error(`[EventBus] Failed to handle event ${eventType}:`, err);
              // Leave unacked for retry
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('ECONNREFUSED')) {
          console.error('[EventBus] Poll error:', message);
        }
        // Wait before retry on connection issues
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  };

  // Run poll loop in background (don't await)
  poll().catch(err => console.error('[EventBus] Poll loop crashed:', err));
}

export async function closeEventBus(): Promise<void> {
  await Promise.all([
    publisher?.quit(),
    subscriber?.quit(),
  ]);
  publisher = null;
  subscriber = null;
}

// ─────────────────────────────────────────────
// #6: Service health registry
// Each MCP server calls updateServiceHealth() on startup and periodically.
// The Synthesizer calls getServiceHealth() before dispatching to a server.
// ─────────────────────────────────────────────

export interface ServiceHealthRecord {
  server_name: string;
  status: 'healthy' | 'degraded' | 'down';
  last_heartbeat: string; // ISO datetime
  version?: string;
  error?: string;
}

const HEALTH_KEY_PREFIX = 'mcp:health:';
const HEALTH_TTL_SECONDS = 120; // server must heartbeat within 2 minutes

export async function updateServiceHealth(
  serverName: string,
  status: ServiceHealthRecord['status'],
  version?: string,
  error?: string,
): Promise<void> {
  const client = getPublisher();
  const record: ServiceHealthRecord = {
    server_name: serverName,
    status,
    last_heartbeat: new Date().toISOString(),
    version,
    error,
  };
  try {
    await client.setex(`${HEALTH_KEY_PREFIX}${serverName}`, HEALTH_TTL_SECONDS, JSON.stringify(record));
  } catch {
    // Health registry is best-effort — never fail the main flow
  }
}

export async function getServiceHealth(serverName: string): Promise<ServiceHealthRecord | null> {
  const client = getPublisher();
  try {
    const raw = await client.get(`${HEALTH_KEY_PREFIX}${serverName}`);
    if (!raw) return null;
    return JSON.parse(raw) as ServiceHealthRecord;
  } catch {
    return null;
  }
}

export async function getAllServiceHealth(): Promise<ServiceHealthRecord[]> {
  const client = getPublisher();
  try {
    const keys = await client.keys(`${HEALTH_KEY_PREFIX}*`);
    if (keys.length === 0) return [];
    const values = await client.mget(...keys);
    return values
      .filter((v): v is string => v !== null)
      .map(v => JSON.parse(v) as ServiceHealthRecord);
  } catch {
    return [];
  }
}

/**
 * #6: Trace a correlation_id through the system log.
 * Each agent should prefix its console output with [corr:<id>] for traceability.
 */
export function traceLog(correlationId: string, agent: string, message: string): void {
  console.log(`[corr:${correlationId}] [${agent}] ${message}`);
}
