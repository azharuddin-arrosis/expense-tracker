export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
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

export const CATEGORIES: Category[] = [
  { id: 'makanan', name: 'Makanan', color: '#10B981' },
  { id: 'transport', name: 'Transport', color: '#3B82F6' },
  { id: 'belanja', name: 'Belanja', color: '#F59E0B' },
  { id: 'tagihan', name: 'Tagihan', color: '#EF4444' },
  { id: 'hiburan', name: 'Hiburan', color: '#8B5CF6' },
  { id: 'kesehatan', name: 'Kesehatan', color: '#EC4899' },
  { id: 'lainnya', name: 'Lainnya', color: '#6B7280' },
];

export function getCategoryColor(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.color ?? '#6B7280';
}

export function getCategoryName(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}
