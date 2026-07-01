import { NextRequest, NextResponse } from 'next/server';
import { getGoals } from '@/lib/db';
import { SavingGoal } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const currentGoals = await getGoals(email);
    await exportToGoogleSheets(email, currentGoals);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google Sheets Goals sync error:', error);
    return NextResponse.json({ error: 'Failed to export goals to Google Sheets' }, { status: 500 });
  }
}

async function exportToGoogleSheets(email: string, goals: SavingGoal[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  if (!spreadsheetId || !apiKey) {
    console.warn('Google Sheets credentials not configured');
    return;
  }

  const sheetName = 'Goals';
  const timestamp = new Date().toISOString();

  const header = [
    'Email', 'Goal Name', 'Target Amount', 'Saved Amount',
    'Percentage Complete', 'Icon', 'Color',
    'Created At', 'Updated At', 'Data di Sync'
  ];

  const rows = goals.map(goal => [
    email,
    goal.name,
    goal.target,
    goal.saved,
    goal.target > 0 ? ((goal.saved / goal.target) * 100).toFixed(1) + '%' : '0%',
    goal.icon || '',
    goal.color || '',
    new Date(goal.createdAt).toLocaleString(),
    new Date(goal.updatedAt).toLocaleString(),
    timestamp
  ]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?valueInputOption=USER_ENTERED&key=${apiKey}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [header, ...rows] })
    }
  );

  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${await response.text()}`);
  }
}