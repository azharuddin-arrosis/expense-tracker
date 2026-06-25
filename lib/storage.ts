import { Expense, Budget } from './types';

const EXPENSES_KEY = 'expense-tracker-expenses-v2';
const BUDGET_KEY = 'expense-tracker-budgets-v2';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// ── Expenses ──

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

export function getExpensesByMonth(month: string): Expense[] {
  return getExpenses().filter((e) => e.date.startsWith(month));
}

export function getExpensesByDate(date: string): Expense[] {
  return getExpenses().filter((e) => e.date === date);
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
