import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Consume the body to avoid any issues (validates JSON)
    await request.json();
    return NextResponse.json(
      { id: '00000000-0000-0000-0000-000000000002', status: 'planning' },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
