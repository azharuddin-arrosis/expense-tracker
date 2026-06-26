export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  flow: 'in' | 'out';
  account?: 'suami' | 'istri' | 'bersama'; // tambahan untuk breakdown rekening
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
  { id: 'freelance', name: 'Freelance', color: '#059669' },
  { id: 'bisnis', name: 'Bisnis', color: '#047857' },
  { id: 'investasi', name: 'Investasi', color: '#065F46' },
  { id: 'hadiah', name: 'Hadiah', color: '#F59E0B' },
  { id: 'lainnya_in', name: 'Lainnya', color: '#6B7280' },
];

// Backward compat
export const CATEGORIES = EXPENSE_CATEGORIES;

export function getCategoryColor(id: string): string {
  return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find((c) => c.id === id)?.color ?? '#6B7280';
}

export function getCategoryName(id: string): string {
  return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find((c) => c.id === id)?.name ?? id;
}

// ===== NEW: Monthly Summary & Targets =====

export interface MonthlySummary {
  month: string; // "2026-06"
  income: number;
  expense: number;
  balance: number;

  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;

  dailyBalance: Record<string, { income: number; expense: number; balance: number }>;

  byAccount: {
    suami: { income: number; expense: number; balance: number };
    istri: { income: number; expense: number; balance: number };
    bersama: { income: number; expense: number; balance: number };
  };

  targets: {
    saving: { target: number; achieved: number };
    liburan: { target: number; achieved: number };
    custom: { name: string; target: number; achieved: number }[];
  };
}

export interface SavingTarget {
  id: string;
  name: string;
  target: number;
  category?: string; // kategori yg dihitung sbg target (mis: "saving", "liburan")
  month: string; // "2026-06" atau "all" untuk bulanan berulang
  color: string;
  icon: string;
}

export const DEFAULT_SAVING_TARGETS: SavingTarget[] = [
  { id: 'saving', name: 'Tabungan', target: 0, category: 'tabungan', month: 'all', color: '#10B981', icon: 'PiggyBank' },
  { id: 'liburan', name: 'Liburan', target: 0, category: 'liburan', month: 'all', color: '#06B6D4', icon: 'Plane' },
];

export interface RecurringTransaction {
  id: string;
  userEmail: string;
  name: string;           // "Gaji Bulanan", "Sewa Kost", "Netflix"
  amount: number;
  category: string;       // pakai kategori existing
  flow: 'in' | 'out';     // pemasukan/pengeluaran
  description?: string;
  
  // Schedule
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  dayOfMonth?: number;    // untuk monthly: 1-28 (28 = akhir bulan)
  dayOfWeek?: number;     // untuk weekly: 0-6 (0=Minggu)
  startDate: string;      // YYYY-MM-DD
  endDate?: string;       // optional, null = selamanya
  
  // Status
  isActive: boolean;
  lastGenerated?: string; // YYYY-MM-DD, kapan terakhir generate
  nextDueDate: string;    // YYYY-MM-DD, kapan berikutnya
  
  createdAt: string;
  updatedAt: string;
}
