export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  flow: 'in' | 'out';
}

export interface Budget {
  month: string; // YYYY-MM
  target: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'makanan', name: 'Makanan', color: '#10B981' },
  { id: 'transport', name: 'Transport', color: '#3B82F6' },
  { id: 'belanja', name: 'Belanja', color: '#F59E0B' },
  { id: 'tagihan', name: 'Tagihan', color: '#EF4444' },
  { id: 'hiburan', name: 'Hiburan', color: '#8B5CF6' },
  { id: 'kesehatan', name: 'Kesehatan', color: '#EC4899' },
  { id: 'lainnya', name: 'Lainnya', color: '#6B7280' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'gaji', name: 'Gaji', color: '#10B981' },
  { id: 'freelance', name: 'Freelance', color: '#F59E0B' },
  { id: 'bisnis', name: 'Bisnis', color: '#8B5CF6' },
  { id: 'investasi', name: 'Investasi', color: '#3B82F6' },
  { id: 'hadiah', name: 'Hadiah', color: '#EC4899' },
  { id: 'lainnya_in', name: 'Lainnya', color: '#6B7280' },
];

// Backward-compat alias
export const CATEGORIES = EXPENSE_CATEGORIES;

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoryColor(id: string): string {
  return ALL_CATEGORIES.find((c) => c.id === id)?.color ?? '#6B7280';
}

export function getCategoryName(id: string): string {
  return ALL_CATEGORIES.find((c) => c.id === id)?.name ?? id;
}
