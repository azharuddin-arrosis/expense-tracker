import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactions, replaceTransactions,
  getBudgets, replaceBudgets,
  getRecurring, replaceRecurring,
  getSettings, replaceSettings,
  getGoals, replaceGoals,
  getAutoSisih, replaceAutoSisih,
  getInvestments, replaceInvestments,
  getDebts, replaceDebts,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  const { initGoalTables } = await import('@/lib/db');
  await initGoalTables();
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const [transactions, budgets, recurring, settings, goals, autoSisih, investments, debts] = await Promise.all([
      getTransactions(email),
      getBudgets(email),
      getRecurring(email),
      getSettings(email),
      getGoals(email),
      getAutoSisih(email),
      getInvestments(email),
      getDebts(email),
    ]);
    return NextResponse.json(
      { transactions, budgets, recurring, settings, goals, autoSisih, investments, debts },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('DB GET sync error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { initGoalTables } = await import('@/lib/db');
    await initGoalTables();
    const body = await request.json();
    const { email, transactions, budgets, recurring, settings, goals, autoSisih, investments, debts } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const ops = [];
    if (Array.isArray(transactions)) ops.push(replaceTransactions(email, transactions));
    if (Array.isArray(budgets)) ops.push(replaceBudgets(email, budgets));
    if (Array.isArray(recurring)) ops.push(replaceRecurring(email, recurring));
    if (settings) ops.push(replaceSettings(email, settings));
    if (Array.isArray(goals)) ops.push(replaceGoals(email, goals));
    if (autoSisih) ops.push(replaceAutoSisih(email, autoSisih));
    if (Array.isArray(investments)) ops.push(replaceInvestments(email, investments));
    if (Array.isArray(debts)) ops.push(replaceDebts(email, debts));

    await Promise.all(ops);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DB POST sync error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
