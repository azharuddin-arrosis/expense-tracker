import { Expense, Budget } from './types';

const API_BASE = '/api';

export interface CloudData {
  transactions: Expense[];
  budgets: Budget[];
}

/**
 * Sync all transactions for a given email to the cloud.
 * Overwrites the server-side data with local data.
 */
export async function syncTransactionsToCloud(
  email: string,
  transactions: Expense[]
): Promise<void> {
  const res = await fetch(`${API_BASE}/transactions?email=${encodeURIComponent(email)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, transactions }),
  });
  if (!res.ok) {
    throw new Error(`Sync transactions failed: ${res.status} ${res.statusText}`);
  }
}

/**
 * Load all transactions for a given email from the cloud.
 */
export async function loadTransactionsFromCloud(
  email: string
): Promise<Expense[]> {
  const res = await fetch(
    `${API_BASE}/transactions?email=${encodeURIComponent(email)}`
  );
  if (!res.ok) {
    throw new Error(`Load transactions failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.transactions ?? [];
}

/**
 * Sync budget for a given email and month to the cloud.
 */
export async function syncBudgetToCloud(
  email: string,
  budget: Budget
): Promise<void> {
  const res = await fetch(`${API_BASE}/budget?email=${encodeURIComponent(email)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, budget }),
  });
  if (!res.ok) {
    throw new Error(`Sync budget failed: ${res.status} ${res.statusText}`);
  }
}

/**
 * Load budget for a given email and month from the cloud.
 */
export async function loadBudgetFromCloud(
  email: string,
  month: string
): Promise<Budget | null> {
  const res = await fetch(
    `${API_BASE}/budget?email=${encodeURIComponent(email)}&month=${encodeURIComponent(month)}`
  );
  if (!res.ok) {
    throw new Error(`Load budget failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.budget ?? null;
}

/**
 * Sync all data (transactions + budgets) to the cloud in one request.
 */
export async function syncAllToCloud(
  email: string,
  data: CloudData
): Promise<void> {
  const res = await fetch(`${API_BASE}/sync?email=${encodeURIComponent(email)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...data }),
  });
  if (!res.ok) {
    throw new Error(`Full sync failed: ${res.status} ${res.statusText}`);
  }
}

/**
 * Load all data (transactions + budgets) from the cloud in one request.
 */
export async function loadAllFromCloud(email: string): Promise<CloudData> {
  const res = await fetch(
    `${API_BASE}/sync?email=${encodeURIComponent(email)}`
  );
  if (!res.ok) {
    throw new Error(`Full load failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return {
    transactions: data.transactions ?? [],
    budgets: data.budgets ?? [],
  };
}

/**
 * Utility to get the stored email from localStorage.
 */
export function getStoredEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('expense-email');
}

/**
 * Utility to save email to localStorage.
 */
export function setStoredEmail(email: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('expense-email', email);
}

/**
 * Utility to clear stored email (logout).
 */
export function clearStoredEmail(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('expense-email');
}
