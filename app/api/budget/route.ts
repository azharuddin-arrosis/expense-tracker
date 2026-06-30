import { NextRequest, NextResponse } from 'next/server';
import { getBudgets, replaceBudgets } from '@/lib/db';
import { Budget } from '@/lib/types';

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
    const all = await getBudgets(email);
    const budget = all.find(b => b.month === month) ?? null;
    return NextResponse.json({ budget });
  } catch (error) {
    console.error('DB GET budget error:', error);
    return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, budget } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!budget || !budget.month) {
      return NextResponse.json({ error: 'Budget with month is required' }, { status: 400 });
    }

    const all = await getBudgets(email);
    const idx = all.findIndex((b: Budget) => b.month === budget.month);
    if (idx >= 0) {
      all[idx] = budget;
    } else {
      all.push(budget);
    }
    await replaceBudgets(email, all);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DB POST budget error:', error);
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 });
  }
}
