import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { Expense, Budget, RecurringTransaction } from '@/lib/types';

/**
 * GET /api/sync?email=xxx
 * Returns all data (transactions + budgets + recurring) for the given email.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const txKey = `user:${email}:transactions`;
    const bdKey = `user:${email}:budgets`;
    const rtKey = `user:${email}:recurring`;

    const [transactions, budgets, recurring] = await Promise.all([
      kv.get<Expense[]>(txKey),
      kv.get<Budget[]>(bdKey),
      kv.get<RecurringTransaction[]>(rtKey),
    ]);

    return NextResponse.json({
      transactions: transactions ?? [],
      budgets: budgets ?? [],
      recurring: recurring ?? [],
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
 * Body: { email, transactions, budgets, recurring }
 * Saves all data for the given email (full sync).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, transactions, budgets, recurring } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const txKey = `user:${email}:transactions`;
    const bdKey = `user:${email}:budgets`;
    const rtKey = `user:${email}:recurring`;

    const operations = [];
    if (Array.isArray(transactions)) {
      operations.push(kv.set(txKey, transactions));
    }
    if (Array.isArray(budgets)) {
      operations.push(kv.set(bdKey, budgets));
    }
    if (Array.isArray(recurring)) {
      operations.push(kv.set(rtKey, recurring));
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
