import { getStoredEmail } from './cloud';
import {
  getDueRecurringTransactions,
  markRecurringGenerated,
  addExpenseAndSync,
} from './storage';
import { getTodayString } from './format';

/**
 * Process all due recurring transactions for the current user.
 * Creates regular transactions and updates the recurring schedule.
 * Returns the number of transactions generated.
 */
export function processDueRecurring(): number {
  const email = getStoredEmail();
  if (!email) return 0;

  const today = getTodayString();
  const dueTransactions = getDueRecurringTransactions(email, today);

  let generated = 0;

  for (const rt of dueTransactions) {
    // Create the regular transaction
    addExpenseAndSync(
      {
        amount: rt.amount,
        category: rt.category,
        description: rt.description || rt.name,
        date: rt.nextDueDate,
        flow: rt.flow,
      },
      email
    );

    // Update the recurring transaction
    markRecurringGenerated(rt.id, today, email);
    generated++;
  }

  return generated;
}

/**
 * Check if we should run the recurring processor (once per day).
 * Uses a localStorage flag to track last check date.
 */
export function shouldProcessRecurring(): boolean {
  if (typeof window === 'undefined') return false;
  
  const lastCheck = localStorage.getItem('lastRecurringCheck');
  const today = getTodayString();
  
  return lastCheck !== today;
}

/**
 * Mark that we've processed recurring transactions for today.
 */
export function markRecurringProcessed(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lastRecurringCheck', getTodayString());
}

/**
 * Run the recurring processor if it hasn't run today.
 * Returns the number of transactions generated.
 */
export function runDailyRecurringCheck(): number {
  if (!shouldProcessRecurring()) return 0;
  
  const generated = processDueRecurring();
  markRecurringProcessed();
  
  return generated;
}

/**
 * Manually trigger recurring generation (for "Generate Sekarang" button).
 * Runs regardless of the daily check flag.
 */
export function manualGenerateRecurring(): number {
  const generated = processDueRecurring();
  markRecurringProcessed(); // Also update the flag
  return generated;
}