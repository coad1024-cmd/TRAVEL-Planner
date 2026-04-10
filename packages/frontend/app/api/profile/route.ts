import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_TRAVELER_ID = 'traveler-demo-001';

export async function GET() {
  try {
    const { callMcpTool } = await import('@travel/orchestrator');
    const result = await callMcpTool('mcp-profile', 'get_profile', { traveler_id: DEFAULT_TRAVELER_ID }) as any;
    
    // MCP tool returns { content: [{ type: 'text', text: '...' }] }
    // But since callMcpTool in our orchestrator already parses it if possible, 
    // OR we might need to parse the JSON inside the text.
    // Let's assume the orchestrator's callMcpTool is a straight pass-through of the data.
    
    // Parsing the JSON string from MCP text content
    const profile = JSON.parse(result[0].text);
    return NextResponse.json(profile);
  } catch (err) {
    console.error('Failed to fetch profile:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const updates = await request.json();
    const { callMcpTool } = await import('@travel/orchestrator');
    
    const result = await callMcpTool('mcp-profile', 'update_profile', { 
      traveler_id: DEFAULT_TRAVELER_ID,
      updates 
    }) as any;

    const profile = JSON.parse(result[0].text);
    return NextResponse.json(profile);
  } catch (err) {
    console.error('Failed to update profile:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
