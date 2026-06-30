import { NextRequest, NextResponse } from 'next/server';
import { getRecurring, replaceRecurring } from '@/lib/db';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const recurring = await getRecurring(email);
    return NextResponse.json({ recurring });
  } catch (error) {
    console.error('DB GET recurring error:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, recurring } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!Array.isArray(recurring)) {
      return NextResponse.json({ error: 'Recurring must be an array' }, { status: 400 });
    }

    await replaceRecurring(email, recurring);
    return NextResponse.json({ success: true, count: recurring.length });
  } catch (error) {
    console.error('DB POST recurring error:', error);
    return NextResponse.json({ error: 'Failed to save recurring transactions' }, { status: 500 });
  }
}
