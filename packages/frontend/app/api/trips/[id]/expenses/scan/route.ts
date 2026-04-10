import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 });

    const { expenseService } = await import('@travel/orchestrator');
    const result = await expenseService.scanReceipt(params.id, imageBase64);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Failed to scan receipt:', err);
    return NextResponse.json({ error: 'Failed to scan receipt' }, { status: 500 });
  }
}
