import { callMcpTool } from '../mcp-client.js';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  time: string;
}

export class ExpenseService {
  /**
   * Fetch all transactions for a trip from mcp-payments.
   */
  async getTransactions(tripId: string): Promise<Expense[]> {
    try {
      const result = await callMcpTool('mcp-payments', 'get_transactions', { trip_id: tripId }) as any;
      const txns = result.transactions || [];
      
      // Transform MCP transaction to Frontend Expense format
      return txns.map((t: any) => ({
        id: t.payment_id,
        description: t.description,
        amount: t.amount.amount,
        currency: t.amount.currency,
        category: this.inferCategory(t.description),
        time: new Date(t.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }));
    } catch (err) {
      console.error(`[ExpenseService] Failed to get transactions:`, err);
      return [];
    }
  }

  /**
   * Manual expense addition.
   */
  async addExpense(tripId: string, details: { description: string, amount: number, category: string }): Promise<Expense> {
    const idempotencyKey = `${tripId}:manual:${Date.now()}`;
    const result = await callMcpTool('mcp-payments', 'process_payment', {
      amount: details.amount,
      currency: 'INR',
      method: 'manual',
      description: details.description,
      idempotency_key: idempotencyKey,
    }) as any;

    if (result.error) throw new Error(result.message);

    return {
      id: result.payment_id,
      description: details.description,
      amount: result.amount.amount,
      currency: result.amount.currency,
      category: details.category,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  /**
   * AI Receipt scanning.
   */
  async scanReceipt(tripId: string, imageBase64: string): Promise<Expense> {
    const result = await callMcpTool('mcp-payments', 'scan_receipt', {
      image_base64: imageBase64,
      trip_id: tripId,
    }) as any;

    if (result.error) throw new Error(result.message);

    // Automagically log the scanned receipt as a transaction too
    return await this.addExpense(tripId, {
      description: `${result.vendor} (Scanned)`,
      amount: result.total,
      category: 'Food', // Default for now
    });
  }

  private inferCategory(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('hotel') || desc.includes('resort') || desc.includes('stay')) return 'Hotel';
    if (desc.includes('flight') || desc.includes('air') || desc.includes('transfer')) return 'Transport';
    if (desc.includes('trek') || desc.includes('valley') || desc.includes('valley')) return 'Activities';
    if (desc.includes('dinner') || desc.includes('breakfast') || desc.includes('lunch') || desc.includes('food')) return 'Food';
    return 'Other';
  }
}

export const expenseService = new ExpenseService();
