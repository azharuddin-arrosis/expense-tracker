import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Expense, Budget } from '@/lib/types';

/**
 * GET /api/sync?email=xxx
 * Returns all data (transactions + budgets) for the given email.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const txKey = `user:${email}:transactions`;
    const bdKey = `user:${email}:budgets`;

    const [transactions, budgets] = await Promise.all([
      kv.get<Expense[]>(txKey),
      kv.get<Budget[]>(bdKey),
    ]);

    return NextResponse.json({
      transactions: transactions ?? [],
      budgets: budgets ?? [],
    });
  } catch (error) {
    console.error('KV GET sync error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync?email=xxx
 * Body: { email, transactions, budgets }
 * Saves all data for the given email (full sync).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, transactions, budgets } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const txKey = `user:${email}:transactions`;
    const bdKey = `user:${email}:budgets`;

    const operations = [];
    if (Array.isArray(transactions)) {
      operations.push(kv.set(txKey, transactions));
    }
    if (Array.isArray(budgets)) {
      operations.push(kv.set(bdKey, budgets));
    }

    await Promise.all(operations);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('KV POST sync error:', error);
    return NextResponse.json(
      { error: 'Failed to save data' },
      { status: 500 }
    );
  }
}
