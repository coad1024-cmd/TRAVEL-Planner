import { NextRequest, NextResponse } from 'next/server';
import { getManagerSession, buildVisualState } from '@travel/orchestrator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const travelerId = searchParams.get('travelerId');

  if (!travelerId) {
    return new NextResponse('Missing travelerId', { status: 400 });
  }

  const encoder = new TextEncoder();
  
  const customReadable = new ReadableStream({
    start(controller) {
      // Send initial state once connected
      const session = getManagerSession(travelerId);
      let lastSerialized = '';

      if (session) {
        const state = buildVisualState(session);
        lastSerialized = JSON.stringify(state);
        controller.enqueue(encoder.encode(`data: ${lastSerialized}\n\n`));
      }

      if (searchParams.get('poll') === 'true') {
        controller.close();
        return;
      }

      // Poll for updates every 500ms and send if changed
      const intervalId = setInterval(() => {
        const currentSession = getManagerSession(travelerId);
        if (currentSession) {
          const state = buildVisualState(currentSession);
          const serialized = JSON.stringify(state);
          
          if (serialized !== lastSerialized) {
            lastSerialized = serialized;
            try {
              controller.enqueue(encoder.encode(`data: ${serialized}\n\n`));
            } catch (e) {
              clearInterval(intervalId);
            }
          }
        }
      }, 500);

      // Handle disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
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
