import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * SSE endpoint for live trip status updates.
 * The frontend's LiveStatusPanel connects here via EventSource.
 * 
 * In production this would subscribe to Redis Pub/Sub.
 * For MVP, we use an in-memory EventEmitter from the orchestrator's liveStatusStore.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id;
  const encoder = new TextEncoder();

  // Dynamic import to avoid webpack bundling issues with Node EventEmitter
  let liveStatusStore: any;
  try {
    const mod = await import('@travel/orchestrator');
    liveStatusStore = mod.liveStatusStore;
  } catch {
    // Fallback: return empty SSE if orchestrator not available
    return new NextResponse('data: {}\n\n', {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  }

  // Single poll mode — return current state and close
  if (request.nextUrl.searchParams.get('poll') === 'true') {
    const status = liveStatusStore.getLiveStatus(tripId);
    return new NextResponse(`data: ${JSON.stringify(status)}\n\n`, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  }

  // Streaming mode — keep connection open and push updates
  const customReadable = new ReadableStream({
    start(controller) {
      // Send initial state
      const initial = liveStatusStore.getLiveStatus(tripId);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initial)}\n\n`));

      // Listen for updates from the store's EventEmitter
      const eventKey = `update:${tripId}`;
      const onUpdate = (status: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(status)}\n\n`));
        } catch {
          liveStatusStore.removeListener(eventKey, onUpdate);
        }
      };

      liveStatusStore.on(eventKey, onUpdate);

      // Also poll every 2s as a heartbeat / catch missed events
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          liveStatusStore.removeListener(eventKey, onUpdate);
        }
      }, 15000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        liveStatusStore.removeListener(eventKey, onUpdate);
      });
    }
  });

  return new NextResponse(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
