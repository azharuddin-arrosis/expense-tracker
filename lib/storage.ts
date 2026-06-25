import { Expense, Budget } from './types';

const EXPENSES_KEY = 'expense-tracker-expenses-v2';
const BUDGET_KEY = 'expense-tracker-budgets-v2';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// ── All Transactions ──

export function getExpenses(): Expense[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveExpenses(expenses: Expense[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function addExpense(
  expense: Omit<Expense, 'id' | 'createdAt'>
): Expense {
  const expenses = getExpenses();
  const newExpense: Expense = {
    ...expense,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
    createdAt: new Date().toISOString(),
  };
  expenses.push(newExpense);
  saveExpenses(expenses);
  return newExpense;
}

export function deleteExpense(id: string): void {
  const expenses = getExpenses();
  saveExpenses(expenses.filter((e) => e.id !== id));
}

export function updateExpense(
  id: string,
  updates: Partial<Omit<Expense, 'id' | 'createdAt'>>
): void {
  const expenses = getExpenses();
  const idx = expenses.findIndex((e) => e.id === id);
  if (idx === -1) return;
  expenses[idx] = { ...expenses[idx], ...updates };
  saveExpenses(expenses);
}

export function getTransactionsByMonth(month: string): Expense[] {
  return getExpenses().filter((e) => e.date.startsWith(month));
}

export function getIncomesByMonth(month: string): Expense[] {
  return getExpenses().filter((e) => e.date.startsWith(month) && e.flow === 'in');
}

export function getExpensesByMonth(month: string): Expense[] {
  return getExpenses().filter((e) => e.date.startsWith(month) && e.flow === 'out');
}

export function getExpensesByDate(date: string): Expense[] {
  return getExpenses().filter((e) => e.date === date);
}

export function getTransactionsByDateRange(start: string, end: string): Expense[] {
  return getExpenses().filter((e) => e.date >= start && e.date <= end);
}

export function getExpensesByCategory(
  month: string
): Record<string, number> {
  const expenses = getExpensesByMonth(month);
  const totals: Record<string, number> = {};
  for (const exp of expenses) {
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
  }
  return totals;
}

// ── Budget ──

export function getBudget(month: string): Budget | null {
  if (!isBrowser()) return null;
  try {
    const data = localStorage.getItem(BUDGET_KEY);
    if (!data) return null;
    const all: Budget[] = JSON.parse(data);
    return all.find((b) => b.month === month) ?? null;
  } catch {
    return null;
  }
}

export function saveBudget(budget: Budget): void {
  if (!isBrowser()) return;
  const data = localStorage.getItem(BUDGET_KEY);
  const all: Budget[] = data ? JSON.parse(data) : [];
  const idx = all.findIndex((b) => b.month === budget.month);
  if (idx >= 0) {
    all[idx] = budget;
  } else {
    all.push(budget);
  }
  localStorage.setItem(BUDGET_KEY, JSON.stringify(all));
}

export function getAllMonths(): string[] {
  const expenses = getExpenses();
  const months = new Set<string>();
  for (const exp of expenses) {
    months.add(exp.date.slice(0, 7));
  }
  return Array.from(months).sort();
}

// ═══════════════════════════════════════════════════
// Hybrid Cloud + LocalStorage Sync Functions
// ═══════════════════════════════════════════════════
//
// These functions add cloud sync on top of existing localStorage.
// They NEVER remove localStorage — it remains as fallback.
// When online, data syncs to Vercel KV (Redis).
// When offline, localStorage is used directly.
//
// All existing functions above remain unchanged for backward compat.

export async function syncExpensesToCloud(email: string): Promise<void> {
  const { syncTransactionsToCloud } = await import('./cloud');
  const expenses = getExpenses();
  try {
    await syncTransactionsToCloud(email, expenses);
  } catch (err) {
    console.warn('Sync to cloud failed (offline?):', err);
  }
}

export async function syncBudgetToCloud(email: string, month: string): Promise<void> {
  const { syncBudgetToCloud: syncBudget } = await import('./cloud');
  const budget = getBudget(month);
  if (budget) {
    try {
      await syncBudget(email, budget);
    } catch {
      console.warn('Budget sync failed (offline?)');
    }
  }
}

export async function syncAllToCloud(email: string): Promise<void> {
  const { syncAllToCloud: syncAll } = await import('./cloud');
  const transactions = getExpenses();
  const data = localStorage.getItem(BUDGET_KEY);
  const budgets: Budget[] = data ? JSON.parse(data) : [];
  try {
    await syncAll(email, { transactions, budgets });
  } catch {
    console.warn('Full sync failed (offline?)');
  }
}

/**
 * Try to load transactions from cloud first.
 * Falls back to localStorage if offline or error.
 */
export async function getExpensesWithSync(
  email: string | null
): Promise<Expense[]> {
  if (!email) return getExpenses();

  try {
    const { loadTransactionsFromCloud } = await import('./cloud');
    const cloudData = await loadTransactionsFromCloud(email);
    if (cloudData.length > 0) {
      // Merge: cloud is source of truth, but merge with local
      const localData = getExpenses();
      const cloudIds = new Set(cloudData.map((e) => e.id));
      const onlyLocal = localData.filter((e) => !cloudIds.has(e.id));
      const merged = [...cloudData, ...onlyLocal];
      if (merged.length > 0) {
        saveExpenses(merged);
      }
      return merged;
    }
  } catch {
    // Offline — fall through to localStorage
  }

  return getExpenses();
}

/**
 * Try to load budget from cloud first.
 * Falls back to localStorage if offline or error.
 */
export async function getBudgetWithSync(
  email: string | null,
  month: string
): Promise<Budget | null> {
  // Try cloud first
  if (email) {
    try {
      const { loadBudgetFromCloud } = await import('./cloud');
      const cloudBudget = await loadBudgetFromCloud(email, month);
      if (cloudBudget) {
        // Update local cache
        saveBudget(cloudBudget);
        return cloudBudget;
      }
    } catch {
      // Offline — fall through
    }
  }

  return getBudget(month);
}

/**
 * Add expense locally AND sync to cloud in background.
 */
export function addExpenseAndSync(
  expense: Omit<Expense, 'id' | 'createdAt'>,
  email: string | null
): Expense {
  const result = addExpense(expense);

  // Fire-and-forget sync (don't block the UI)
  if (email) {
    syncExpensesToCloud(email).catch(() => {});
  }

  return result;
}

/**
 * Delete expense locally AND sync to cloud in background.
 */
export function deleteExpenseAndSync(
  id: string,
  email: string | null
): void {
  deleteExpense(id);

  if (email) {
    syncExpensesToCloud(email).catch(() => {});
  }
}

/**
 * Update expense locally AND sync to cloud in background.
 */
export function updateExpenseAndSync(
  id: string,
  updates: Partial<Omit<Expense, 'id' | 'createdAt'>>,
  email: string | null
): void {
  updateExpense(id, updates);

  if (email) {
    syncExpensesToCloud(email).catch(() => {});
  }
}

/**
 * Save budget locally AND sync to cloud in background.
 */
export function saveBudgetAndSync(
  budget: Budget,
  email: string | null
): void {
  saveBudget(budget);

  if (email) {
    syncBudgetToCloud(email, budget.month).catch(() => {});
  }
}
