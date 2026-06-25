import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { RecurringTransaction } from '@/lib/types';

/**
 * GET /api/recurring?email=xxx
 * Returns all recurring transactions for the given email.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const key = `user:${email}:recurring`;
    const recurring = await kv.get<RecurringTransaction[]>(key);
    return NextResponse.json({ recurring: recurring ?? [] });
  } catch (error) {
    console.error('KV GET recurring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring transactions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recurring?email=xxx
 * Body: { email: string, recurring: RecurringTransaction[] }
 * Saves recurring transactions for the given email (overwrites).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, recurring } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!Array.isArray(recurring)) {
      return NextResponse.json(
        { error: 'Recurring must be an array' },
        { status: 400 }
      );
    }

    const key = `user:${email}:recurring`;
    await kv.set(key, recurring);

    return NextResponse.json({ success: true, count: recurring.length });
  } catch (error) {
    console.error('KV POST recurring error:', error);
    return NextResponse.json(
      { error: 'Failed to save recurring transactions' },
      { status: 500 }
    );
  }
}