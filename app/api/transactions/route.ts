import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { Expense } from '@/lib/types';

/**
 * GET /api/transactions?email=xxx
 * Returns all transactions for the given email.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const key = `user:${email}:transactions`;
    const transactions = await kv.get<Expense[]>(key);
    return NextResponse.json({ transactions: transactions ?? [] });
  } catch (error) {
    console.error('KV GET transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transactions?email=xxx
 * Body: { email: string, transactions: Expense[] }
 * Saves transactions for the given email (overwrites).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, transactions } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Transactions must be an array' },
        { status: 400 }
      );
    }

    const key = `user:${email}:transactions`;
    await kv.set(key, transactions);

    return NextResponse.json({ success: true, count: transactions.length });
  } catch (error) {
    console.error('KV POST transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to save transactions' },
      { status: 500 }
    );
  }
}
