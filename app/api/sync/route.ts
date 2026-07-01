import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, replaceTransactions, getBudgets, replaceBudgets, getRecurring, replaceRecurring, getSettings, replaceSettings } from '@/lib/db';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const [transactions, budgets, recurring, settings] = await Promise.all([
      getTransactions(email),
      getBudgets(email),
      getRecurring(email),
      getSettings(email),
    ]);
    return NextResponse.json({ transactions, budgets, recurring, settings });
  } catch (error) {
    console.error('DB GET sync error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, transactions, budgets, recurring, settings } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const ops = [];
    if (Array.isArray(transactions)) ops.push(replaceTransactions(email, transactions));
    if (Array.isArray(budgets)) ops.push(replaceBudgets(email, budgets));
    if (Array.isArray(recurring)) ops.push(replaceRecurring(email, recurring));
    if (settings) ops.push(replaceSettings(email, settings));

    await Promise.all(ops);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DB POST sync error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
