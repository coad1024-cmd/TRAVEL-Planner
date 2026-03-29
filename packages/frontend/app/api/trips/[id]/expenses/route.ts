import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { expenseService } = await import('@travel/orchestrator');
    const expenses = await expenseService.getTransactions(params.id);
    return NextResponse.json(expenses);
  } catch (err) {
    console.error('Failed to fetch expenses:', err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { expenseService } = await import('@travel/orchestrator');
    
    const newExpense = await expenseService.addExpense(params.id, {
      description: body.description,
      amount: parseFloat(body.amount),
      category: body.category || 'Other'
    });

    return NextResponse.json(newExpense);
  } catch (err) {
    console.error('Failed to create expense:', err);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
