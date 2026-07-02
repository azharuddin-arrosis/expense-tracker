'use client';

import { loadAllFromCloud, syncAllToCloud, type CloudData, getStoredEmail } from './cloud';
import { Expense, Budget, RecurringTransaction, Investment, Debt } from './types';

const EXPENSES_PREFIX = 'expense-tracker-expenses-v2:';
const BUDGET_PREFIX = 'expense-tracker-budgets-v2:';
const RECURRING_PREFIX = 'expense-tracker-recurring-v2:';
const INVESTMENTS_PREFIX = 'expense-tracker-investments:';
const DEBTS_PREFIX = 'expense-tracker-debts:';

const POLL_INTERVAL = 60000;

function getEmailKey(prefix: string, email: string): string {
  return prefix + email;
}

function getExpenses(): Expense[] {
  try {
    const email = getStoredEmail();
    if (!email) return [];
    const key = getEmailKey(EXPENSES_PREFIX, email);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveExpenses(expenses: Expense[]): void {
  const email = getStoredEmail();
  if (!email) return;
  const key = getEmailKey(EXPENSES_PREFIX, email);
  localStorage.setItem(key, JSON.stringify(expenses));
}

function getBudgets(): Budget[] {
  try {
    const email = getStoredEmail();
    if (!email) return [];
    const key = getEmailKey(BUDGET_PREFIX, email);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveBudgets(budgets: Budget[]): void {
  const email = getStoredEmail();
  if (!email) return;
  const key = getEmailKey(BUDGET_PREFIX, email);
  localStorage.setItem(key, JSON.stringify(budgets));
}

function getRecurringLocal(email: string): RecurringTransaction[] {
  try {
    const key = getEmailKey(RECURRING_PREFIX, email);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveRecurringLocal(email: string, recurring: RecurringTransaction[]): void {
  const key = getEmailKey(RECURRING_PREFIX, email);
  localStorage.setItem(key, JSON.stringify(recurring));
}

function getInvestmentsLocal(email: string): Investment[] {
  try {
    const key = getEmailKey(INVESTMENTS_PREFIX, email);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveInvestmentsLocal(email: string, investments: Investment[]): void {
  const key = getEmailKey(INVESTMENTS_PREFIX, email);
  localStorage.setItem(key, JSON.stringify(investments));
}

function getDebtsLocal(email: string): Debt[] {
  try {
    const key = getEmailKey(DEBTS_PREFIX, email);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveDebtsLocal(email: string, debts: Debt[]): void {
  const key = getEmailKey(DEBTS_PREFIX, email);
  localStorage.setItem(key, JSON.stringify(debts));
}

function mergeTransactions(cloud: Expense[], local: Expense[]): Expense[] {
  const map = new Map<string, Expense>();

  for (const tx of local) {
    map.set(tx.id, tx);
  }

  for (const tx of cloud) {
    const existing = map.get(tx.id);
    if (!existing) {
      map.set(tx.id, tx);
    } else {
      const cloudTime = new Date(tx.updatedAt || tx.createdAt).getTime();
      const localTime = new Date(existing.updatedAt || existing.createdAt).getTime();
      if (cloudTime >= localTime) {
        map.set(tx.id, tx);
      }
    }
  }

  return Array.from(map.values());
}

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let onSyncCallback: (() => void) | null = null;

export function setOnSync(cb: (() => void) | null): void {
  onSyncCallback = cb;
}

export async function pullFromCloud(email: string): Promise<boolean> {
  try {
    const cloudData: CloudData = await loadAllFromCloud(email);
    if (!cloudData) return false;

    const localExpenses = getExpenses();
    const merged = mergeTransactions(cloudData.transactions || [], localExpenses);
    saveExpenses(merged);

    const localBudgets = getBudgets();
    const cloudBudgets = cloudData.budgets || [];
    if (cloudBudgets.length > 0) {
      const budgetMap = new Map<string, Budget>();
      for (const b of localBudgets) budgetMap.set(b.month, b);
      for (const b of cloudBudgets) budgetMap.set(b.month, b);
      saveBudgets(Array.from(budgetMap.values()));
    }

    const cloudRecurring = cloudData.recurring || [];
    if (cloudRecurring.length > 0) {
      const localRecurring = getRecurringLocal(email);
      const recurringMap = new Map<string, RecurringTransaction>();
      for (const r of localRecurring) recurringMap.set(r.id, r);
      for (const r of cloudRecurring) {
        const existing = recurringMap.get(r.id);
        if (!existing) {
          recurringMap.set(r.id, r);
        } else {
          const cloudTime = new Date(r.updatedAt || r.createdAt).getTime();
          const localTime = new Date(existing.updatedAt || existing.createdAt).getTime();
          if (cloudTime >= localTime) {
            recurringMap.set(r.id, r);
          }
        }
      }
      saveRecurringLocal(email, Array.from(recurringMap.values()));
    }

    // Investments
    const cloudInvestments = cloudData.investments || [];
    if (cloudInvestments.length > 0) {
      saveInvestmentsLocal(email, cloudInvestments);
    }

    // Debts
    const cloudDebts = cloudData.debts || [];
    if (cloudDebts.length > 0) {
      saveDebtsLocal(email, cloudDebts);
    }

    markSyncDone();
    return true;
  } catch {
    return false;
  }
}

function markSyncDone(): void {
  try {
    localStorage.setItem('expense-tracker-last-sync', String(Date.now()));
  } catch {
    // storage full — ignore
  }
}

export async function pushToCloud(email: string): Promise<boolean> {
  try {
    const transactions = getExpenses();
    const key = getEmailKey(BUDGET_PREFIX, email);
    const data = localStorage.getItem(key);
    const budgets: Budget[] = data ? JSON.parse(data) : [];
    const recurring = getRecurringLocal(email);
    const investments = getInvestmentsLocal(email);
    const debts = getDebtsLocal(email);
    let settings;
    try {
      const raw = localStorage.getItem('expense-tracker-period-settings');
      if (raw) settings = JSON.parse(raw);
    } catch {
      // ignore
    }

    await syncAllToCloud(email, { transactions, budgets, recurring, settings, investments, debts });
    markSyncDone();
    return true;
  } catch {
    return false;
  }
}

async function doSync(email: string): Promise<void> {
  const pulled = await pullFromCloud(email);
  const pushed = await pushToCloud(email);
  if ((pushed || pulled) && onSyncCallback) {
    onSyncCallback();
  }
}

export function startAutoSync(email: string, onSync?: () => void): void {
  stopAutoSync();

  if (onSync) onSyncCallback = onSync;

  doSync(email);

  pollingTimer = setInterval(() => {
    doSync(email);
  }, POLL_INTERVAL);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibility);
  }
}

function handleVisibility(): void {
  if (document.visibilityState === 'visible') {
    const email = getStoredEmail();
    if (email) {
      doSync(email);
    }
  }
}

export function stopAutoSync(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibility);
  }
}
