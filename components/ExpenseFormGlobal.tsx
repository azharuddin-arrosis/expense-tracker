'use client';

import { ExpenseForm } from './ExpenseForm';

/**
 * This component is rendered in the layout and connects
 * the global "showAddExpense" state to the form.
 */
export function ExpenseFormGlobal() {
  return <ExpenseForm onSuccess={() => {}} />;
}
