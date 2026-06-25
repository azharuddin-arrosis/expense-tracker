import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { Budget } from '@/lib/types';

/**
 * GET /api/budget?email=xxx&month=2026-06
 * Returns budget for the given email and month.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  const month = request.nextUrl.searchParams.get('month');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  if (!month) {
    return NextResponse.json({ error: 'Month is required' }, { status: 400 });
  }

  try {
    const key = `user:${email}:budgets`;
    const all = await kv.get<Budget[]>(key);
    const budgets = all ?? [];
    const budget = budgets.find((b) => b.month === month) ?? null;

    return NextResponse.json({ budget });
  } catch (error) {
    console.error('KV GET budget error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budget?email=xxx
 * Body: { email: string, budget: Budget }
 * Saves/upserts budget for the given email.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, budget } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!budget || !budget.month) {
      return NextResponse.json(
        { error: 'Budget with month is required' },
        { status: 400 }
      );
    }

    const key = `user:${email}:budgets`;
    const all = await kv.get<Budget[]>(key);
    const budgets = all ?? [];

    const idx = budgets.findIndex((b) => b.month === budget.month);
    if (idx >= 0) {
      budgets[idx] = budget;
    } else {
      budgets.push(budget);
    }

    await kv.set(key, budgets);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('KV POST budget error:', error);
    return NextResponse.json(
      { error: 'Failed to save budget' },
      { status: 500 }
    );
  }
}
