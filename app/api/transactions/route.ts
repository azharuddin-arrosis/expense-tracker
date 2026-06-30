import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, replaceTransactions } from '@/lib/db';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const transactions = await getTransactions(email);
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('DB GET transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, transactions } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Transactions must be an array' }, { status: 400 });
    }

    await replaceTransactions(email, transactions);
    return NextResponse.json({ success: true, count: transactions.length });
  } catch (error) {
    console.error('DB POST transactions error:', error);
    return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 });
  }
}
