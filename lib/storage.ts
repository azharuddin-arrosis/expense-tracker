import { Expense, Budget, RecurringTransaction, SavingTarget, DEFAULT_SAVING_TARGETS, MonthlySummary } from './types';
import { getStoredEmail } from './cloud';

const EXPENSES_PREFIX = 'expense-tracker-expenses-v2:';
const BUDGET_PREFIX = 'expense-tracker-budgets-v2:';
const RECURRING_PREFIX = 'expense-tracker-recurring-v2:';

function getEmailKey(prefix: string): string {
  const email = getStoredEmail();
  return prefix + (email || 'guest');
}

function getRecurringKey(email: string): string {
  return RECURRING_PREFIX + email;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// ── All Transactions ──

export function getExpenses(): Expense[] {
  if (!isBrowser()) return [];
  try {
    const key = getEmailKey(EXPENSES_PREFIX);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveExpenses(expenses: Expense[]): void {
  if (!isBrowser()) return;
  const key = getEmailKey(EXPENSES_PREFIX);
  localStorage.setItem(key, JSON.stringify(expenses));
}

export function addExpense(
  expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>
): Expense {
  const expenses = getExpenses();
  const now = new Date().toISOString();
  const newExpense: Expense = {
    ...expense,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
    createdAt: now,
    updatedAt: now,
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
  updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>
): void {
  const expenses = getExpenses();
  const idx = expenses.findIndex((e) => e.id === id);
  if (idx === -1) return;
  expenses[idx] = { ...expenses[idx], ...updates, updatedAt: new Date().toISOString() };
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
    const key = getEmailKey(BUDGET_PREFIX);
    const data = localStorage.getItem(key);
    if (!data) return null;
    const all: Budget[] = JSON.parse(data);
    return all.find((b) => b.month === month) ?? null;
  } catch {
    return null;
  }
}

export function saveBudget(budget: Budget): void {
  if (!isBrowser()) return;
  const key = getEmailKey(BUDGET_PREFIX);
  const data = localStorage.getItem(key);
  const all: Budget[] = data ? JSON.parse(data) : [];
  const idx = all.findIndex((b) => b.month === budget.month);
  if (idx >= 0) {
    all[idx] = budget;
  } else {
    all.push(budget);
  }
  localStorage.setItem(key, JSON.stringify(all));
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
// Per-Category Budgets
// ═══════════════════════════════════════════════════

const CATEGORY_BUDGET_PREFIX = 'expense-tracker-category-budgets:';

export function getCategoryBudgets(email: string): Record<string, number> {
  if (!isBrowser()) return {};
  try {
    const key = CATEGORY_BUDGET_PREFIX + email;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveCategoryBudgets(email: string, budgets: Record<string, number>): void {
  if (!isBrowser()) return;
  const key = CATEGORY_BUDGET_PREFIX + email;
  localStorage.setItem(key, JSON.stringify(budgets));
}

// ═══════════════════════════════════════════════════
// Recurring Transactions
// ═══════════════════════════════════════════════════

export function getRecurringTransactions(email: string): RecurringTransaction[] {
  if (!isBrowser()) return [];
  try {
    const key = getRecurringKey(email);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveRecurringTransactions(email: string, transactions: RecurringTransaction[]): void {
  if (!isBrowser()) return;
  const key = getRecurringKey(email);
  localStorage.setItem(key, JSON.stringify(transactions));
}

function generateNextDueDate(rt: RecurringTransaction, fromDate: string): string {
  const date = new Date(fromDate + 'T00:00:00');
  
  switch (rt.frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      if (rt.dayOfWeek !== undefined) {
        const currentDay = date.getDay();
        let daysToAdd = rt.dayOfWeek - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        date.setDate(date.getDate() + daysToAdd);
      } else {
        date.setDate(date.getDate() + 7);
      }
      break;
    case 'monthly':
      const dayOfMonth = rt.dayOfMonth || date.getDate();
      date.setMonth(date.getMonth() + 1);
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(dayOfMonth, daysInMonth));
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().slice(0, 10);
}

export function addRecurringTransaction(
  rt: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>,
  email: string
): RecurringTransaction {
  const now = new Date().toISOString();
  const newRt: RecurringTransaction = {
    ...rt,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
    createdAt: now,
    updatedAt: now,
  };
  
  const transactions = getRecurringTransactions(email);
  transactions.push(newRt);
  saveRecurringTransactions(email, transactions);
  
  return newRt;
}

export function updateRecurringTransaction(
  id: string,
  updates: Partial<Omit<RecurringTransaction, 'id' | 'createdAt'>>,
  email: string
): void {
  const transactions = getRecurringTransactions(email);
  const idx = transactions.findIndex((e) => e.id === id);
  if (idx === -1) return;
  
  transactions[idx] = {
    ...transactions[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveRecurringTransactions(email, transactions);
}

export function deleteRecurringTransaction(id: string, email: string): void {
  const transactions = getRecurringTransactions(email);
  saveRecurringTransactions(email, transactions.filter((e) => e.id !== id));
}

export function getDueRecurringTransactions(
  email: string,
  date: string
): RecurringTransaction[] {
  const transactions = getRecurringTransactions(email);
  return transactions.filter(
    (rt) => rt.isActive && rt.nextDueDate <= date
  );
}

export function markRecurringGenerated(
  id: string,
  generatedDate: string,
  email: string
): void {
  const transactions = getRecurringTransactions(email);
  const idx = transactions.findIndex((e) => e.id === id);
  if (idx === -1) return;
  
  const rt = transactions[idx];
  const nextDue = generateNextDueDate(rt, generatedDate);
  
  // Check if we should deactivate (past endDate)
  let isActive = rt.isActive;
  if (rt.endDate && nextDue > rt.endDate) {
    isActive = false;
  }
  
  transactions[idx] = {
    ...rt,
    lastGenerated: generatedDate,
    nextDueDate: nextDue,
    isActive,
    updatedAt: new Date().toISOString(),
  };
  saveRecurringTransactions(email, transactions);
}

export function getRecurringWithSync(
  email: string | null
): Promise<RecurringTransaction[]> {
  if (!email) return Promise.resolve(getRecurringTransactions('guest'));
  
  try {
    const { loadRecurringFromCloud } = require('./cloud');
    return loadRecurringFromCloud(email);
  } catch {
    return Promise.resolve(getRecurringTransactions(email));
  }
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
  const budgetKey = getEmailKey(BUDGET_PREFIX);
  const budgetData = localStorage.getItem(budgetKey);
  const budgets: Budget[] = budgetData ? JSON.parse(budgetData) : [];
  const recurringKey = getEmailKey(RECURRING_PREFIX);
  const recurringData = localStorage.getItem(recurringKey);
  const recurring: RecurringTransaction[] = recurringData ? JSON.parse(recurringData) : [];
  try {
    await syncAll(email, { transactions, budgets, recurring });
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
  expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>,
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
export async function deleteExpenseAndSync(
  id: string,
  email: string | null
): Promise<void> {
  deleteExpense(id);

  if (email) {
    const { deleteTransactionFromCloud } = await import('./cloud');
    try {
      await deleteTransactionFromCloud(email, id);
    } catch (err) {
      console.warn('Delete sync to cloud failed:', err);
      throw err; // Re-throw the error so the caller knows
    }
  }
}

/**
 * Update expense locally AND sync to cloud in background.
 */
export function updateExpenseAndSync(
  id: string,
  updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>,
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

/**
 * Sync recurring transactions to cloud.
 */
export async function syncRecurringToCloud(email: string): Promise<void> {
  const { syncRecurringToCloud: syncRecurring } = await import('./cloud');
  const transactions = getRecurringTransactions(email);
  try {
    await syncRecurring(email, transactions);
  } catch (err) {
    console.warn('Recurring sync to cloud failed (offline?):', err);
  }
}

/**
 * Add recurring transaction locally AND sync to cloud in background.
 */
export function addRecurringTransactionAndSync(
  rt: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>,
  email: string | null
): RecurringTransaction {
  const result = addRecurringTransaction(rt, email || 'guest');

  if (email) {
    syncRecurringToCloud(email).catch(() => {});
  }

  return result;
}

/**
 * Update recurring transaction locally AND sync to cloud in background.
 */
export function updateRecurringTransactionAndSync(
  id: string,
  updates: Partial<Omit<RecurringTransaction, 'id' | 'createdAt'>>,
  email: string | null
): void {
  updateRecurringTransaction(id, updates, email || 'guest');

  if (email) {
    syncRecurringToCloud(email).catch(() => {});
  }
}

/**
 * Delete recurring transaction locally AND sync to cloud in background.
 */
export function deleteRecurringTransactionAndSync(
  id: string,
  email: string | null
): void {
  deleteRecurringTransaction(id, email || 'guest');

  if (email) {
    syncRecurringToCloud(email).catch(() => {});
  }
}

// ===== Monthly Summary & Saving Targets =====

const SAVING_TARGETS_PREFIX = 'expense-tracker-targets-v1:';

function getSavingTargetsKey(email: string): string {
  return SAVING_TARGETS_PREFIX + email;
}

export function getSavingTargets(email: string): SavingTarget[] {
  if (!isBrowser()) return DEFAULT_SAVING_TARGETS;
  try {
    const key = getSavingTargetsKey(email);
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.length > 0 ? parsed : DEFAULT_SAVING_TARGETS;
    }
  } catch {}
  return DEFAULT_SAVING_TARGETS;
}

export function saveSavingTargets(email: string, targets: SavingTarget[]): void {
  if (!isBrowser()) return;
  const key = getSavingTargetsKey(email);
  localStorage.setItem(key, JSON.stringify(targets));
}

export function updateSavingTargetAndSync(
  email: string,
  targetId: string,
  updates: Partial<SavingTarget>
): void {
  const targets = getSavingTargets(email);
  const idx = targets.findIndex((t) => t.id === targetId);
  if (idx >= 0) {
    targets[idx] = { ...targets[idx], ...updates };
    saveSavingTargets(email, targets);
  }
}

/**
 * Compute monthly summary for a given month and email.
 * Runs entirely on client using localStorage (offline-first).
 */
export function computeMonthlySummary(
  month: string,
  email: string
): MonthlySummary {
  const all = getExpenses();
  const transactions = all.filter((e) => e.date.startsWith(month));
  
  const income = transactions.filter((e) => e.flow === 'in');
  const expense = transactions.filter((e) => e.flow === 'out');
  
  const totalIncome = income.reduce((s, e) => s + e.amount, 0);
  const totalExpense = expense.reduce((s, e) => s + e.amount, 0);

  // Running balance from all transactions up to this month (carryover)
  const upToMonth = all.filter((e) => e.date.startsWith(month) || e.date < month);
  const cumIn = upToMonth.filter((e) => e.flow === 'in').reduce((s, e) => s + e.amount, 0);
  const cumOut = upToMonth.filter((e) => e.flow === 'out').reduce((s, e) => s + e.amount, 0);
  const balance = cumIn - cumOut;

  // By category
  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  
  for (const t of income) {
    incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
  }
  for (const t of expense) {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
  }

  // Daily balance
  const dailyBalance: Record<string, { income: number; expense: number; balance: number }> = {};
  for (const t of transactions) {
    if (!dailyBalance[t.date]) {
      dailyBalance[t.date] = { income: 0, expense: 0, balance: 0 };
    }
    if (t.flow === 'in') {
      dailyBalance[t.date].income += t.amount;
    } else {
      dailyBalance[t.date].expense += t.amount;
    }
    dailyBalance[t.date].balance = dailyBalance[t.date].income - dailyBalance[t.date].expense;
  }

  // By account
  const byAccount = {
    suami: { income: 0, expense: 0, balance: 0 },
    istri: { income: 0, expense: 0, balance: 0 },
    bersama: { income: 0, expense: 0, balance: 0 },
  };
  
  for (const t of transactions) {
    const acc = t.account || 'bersama';
    if (t.flow === 'in') {
      byAccount[acc].income += t.amount;
    } else {
      byAccount[acc].expense += t.amount;
    }
    byAccount[acc].balance = byAccount[acc].income - byAccount[acc].expense;
  }

  // Targets
  const targets = getSavingTargets(email);
  const savingTarget = targets.find((t) => t.id === 'saving');
  const liburanTarget = targets.find((t) => t.id === 'liburan');
  const customTargets = targets.filter((t) => !['saving', 'liburan'].includes(t.id));

  // Calculate achieved: sum of income categorized as saving/liburan
  // For simplicity, we'll track via a separate category or tag
  // Here we'll use income with category matching target category
  let savingAchieved = 0;
  let liburanAchieved = 0;
  const customAchieved: Record<string, number> = {};
  
  for (const t of income) {
    if (savingTarget && t.category === savingTarget.category) {
      savingAchieved += t.amount;
    }
    if (liburanTarget && t.category === liburanTarget.category) {
      liburanAchieved += t.amount;
    }
    for (const ct of customTargets) {
      if (t.category === ct.category) {
        customAchieved[ct.id] = (customAchieved[ct.id] || 0) + t.amount;
      }
    }
  }

  return {
    month,
    income: totalIncome,
    expense: totalExpense,
    balance,
    incomeByCategory,
    expenseByCategory,
    dailyBalance,
    byAccount,
    targets: {
      saving: { target: savingTarget?.target || 0, achieved: savingAchieved },
      liburan: { target: liburanTarget?.target || 0, achieved: liburanAchieved },
      custom: customTargets.map((ct) => ({
        name: ct.name,
        target: ct.target,
        achieved: customAchieved[ct.id] || 0,
      })),
    },
  };
}
