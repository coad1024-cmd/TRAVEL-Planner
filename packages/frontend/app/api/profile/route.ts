import { NextRequest, NextResponse } from 'next/server';
import { AgentRegistry } from '@travel/orchestrator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const travelerId = searchParams.get('id') || '00000000-0000-0000-0000-000000000001'; // Default seed ID

    const registry = new AgentRegistry();
    await registry.startAll();

    const profileAgent = registry.get('traveler-profile');
    const response = await profileAgent.handleMessage(`Get profile for ${travelerId}`);

    await registry.stopAll();

    // The agent might return a stringified JSON or a natural language response.
    // In a real system, we'd have a more structured interface.
    let profile = null;
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            profile = JSON.parse(jsonMatch[0]);
        }
    } catch {
        // Fallback or log error
    }

    if (!profile) {
        return NextResponse.json({ error: 'Profile not found or invalid format' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err: any) {
    console.error('[Profile API] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
