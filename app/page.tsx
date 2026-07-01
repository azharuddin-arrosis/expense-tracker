'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  List,
  Lightbulb,
  FileText,
  PieChart,
  Target,
  SlidersHorizontal,
  Zap,
  User,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getExpenses,
  getExpensesByMonth,
  getIncomesByMonth,
  getTransactionsByDateRange,
  getExpensesByCategory,
  getBudget,
  getExpensesWithSync,
} from '@/lib/storage';
import {
  formatRupiah,
  formatDate,
  getMonthName,
  getTodayString,
} from '@/lib/format';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DateFilter } from '@/components/DateFilter';
import { EXPENSE_CATEGORIES, getCategoryColor, getCategoryName, Expense } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { DetailPopup } from '@/components/DetailPopup';
import { getStoredEmail } from '@/lib/cloud';

export default function DashboardPage() {
  const router = useRouter();
  const { refreshKey } = useAppContext();
  const [synced, setSynced] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'local'>('checking');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterMode, setFilterMode] = useState<'month' | 'week' | 'range'>('month');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [detailTarget, setDetailTarget] = useState<Expense | null>(null);
  const email = getStoredEmail();

  useEffect(() => {
    if (!email) {
      setCloudStatus('local');
      setSynced(true);
      return;
    }
    let cancelled = false;
    const syncFirst = async () => {
      try {
        await getExpensesWithSync(email);
        if (!cancelled) setCloudStatus('connected');
      } catch {
        if (!cancelled) setCloudStatus('local');
      }
      if (!cancelled) setSynced(true);
    };
    syncFirst();
    return () => { cancelled = true; };
  }, [email, refreshKey]);

  const expenses = useMemo(() => {
    if (!synced && email) return [];
    if (filterMode === 'month' || !dateRange) return getExpensesByMonth(month);
    return getTransactionsByDateRange(dateRange.start, dateRange.end).filter((e) => e.flow === 'out');
  }, [month, filterMode, dateRange, refreshKey, synced, email]);

  const incomes = useMemo(() => {
    if (!synced && email) return [];
    if (filterMode === 'month' || !dateRange) return getIncomesByMonth(month);
    return getTransactionsByDateRange(dateRange.start, dateRange.end).filter((e) => e.flow === 'in');
  }, [month, filterMode, dateRange, refreshKey, synced, email]);

  const categoryData = useMemo(() => {
    if (!synced && email) return {};
    return getExpensesByCategory(month);
  }, [month, refreshKey, synced, email]);

  const budget = useMemo(() => {
    if (!synced && email) return null;
    return getBudget(month);
  }, [month, refreshKey, synced, email]);

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = incomes.reduce((sum, e) => sum + e.amount, 0);
  const balance = filterMode === 'month'
    ? getExpenses().filter((e) => e.date.startsWith(month) || e.date < month)
        .reduce((s, e) => s + (e.flow === 'in' ? e.amount : -e.amount), 0)
    : totalIncome - totalExpense;
  const remaining = budget ? budget.target - totalExpense : null;
  const usagePercent = budget && budget.target > 0 ? (totalExpense / budget.target) * 100 : 0;
  const isWarning = usagePercent >= 80 && usagePercent < 100;
  const isOverspent = usagePercent >= 100;

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const topCategories = useMemo(() => {
    return Object.entries(categoryData)
      .map(([id, total]) => ({
        id, total,
        name: getCategoryName(id),
        color: getCategoryColor(id),
        percentage: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [categoryData, totalExpense]);

  const hasAny = expenses.length > 0 || incomes.length > 0;

  if (!synced && email) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-white px-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm mb-4">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-700">Memuat data...</p>
        <p className="text-xs text-gray-400 mt-1">Menyinkronkan dari cloud</p>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4">
        <div className="h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Duit</h1>
          </div>
          <div className="flex items-center gap-2">
            {cloudStatus === 'checking' ? (
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
            ) : cloudStatus === 'connected' ? (
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-gray-400" />
            )}
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-6 space-y-4">

      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-medium text-emerald-100 tracking-wide uppercase">
            Saldo Bersih
          </p>
          <Wallet className="w-3.5 h-3.5 text-emerald-200" />
        </div>
        <p className="text-3xl font-bold tracking-tight tabular-nums mb-4">
          {formatRupiah(balance)}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
              <ArrowUpRight className="w-3 h-3 text-emerald-200" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-200">Pemasukan</p>
              <p className="text-xs font-semibold text-white tabular-nums">
                {formatRupiah(totalIncome)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
              <ArrowDownRight className="w-3 h-3 text-emerald-200" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-200">Pengeluaran</p>
              <p className="text-xs font-semibold text-white tabular-nums">
                {formatRupiah(totalExpense)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-y-4 gap-x-2">
        {[
          { label: 'Riwayat', icon: List, path: '/riwayat', color: '#6366F1', bg: '#EEF2FF' },
          { label: 'Wawasan', icon: Lightbulb, path: '/wawasan', color: '#8B5CF6', bg: '#F5F3FF' },
          { label: 'Rekap', icon: FileText, path: '/ringkasan', color: '#10B981', bg: '#ECFDF5' },
          { label: 'Statistik', icon: PieChart, path: '/statistik', color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Target', icon: Target, path: '/target', color: '#EF4444', bg: '#FEF2F2' },
          { label: 'Kategori', icon: SlidersHorizontal, path: '/kategori-budget', color: '#06B6D4', bg: '#ECFEFF' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div
                className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: item.bg }}
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <span className="text-[11px] font-medium text-gray-600">{item.label}</span>
            </button>
          );
        })}
      </div>

      <DateFilter
        month={month}
        onMonthChange={setMonth}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
      />

      {budget ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOverspent ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <Zap className="w-4 h-4 text-emerald-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">Budget Bulanan</span>
            </div>
            <span className="text-xs font-medium text-gray-500 tabular-nums">
              {formatRupiah(budget.target)}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverspent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            {isOverspent ? (
              <span className="text-xs font-semibold text-red-600">
                Kelebihan {formatRupiah(Math.abs(remaining!))}
              </span>
            ) : (
              <span className="text-xs text-gray-500">
                Sisa <span className="font-semibold text-gray-700">{formatRupiah(remaining!)}</span>
              </span>
            )}
            <span className="text-xs tabular-nums text-gray-400">
              {usagePercent.toFixed(1)}%
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <span className="text-sm text-gray-500">Belum ada target budget</span>
          <a href="/target" className="text-xs font-semibold text-emerald-600">Atur Target</a>
        </div>
      )}

      {hasAny && topCategories.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Kategori Teratas</h3>
            <button
              onClick={() => router.push('/statistik')}
              className="text-xs font-medium text-emerald-600 flex items-center gap-0.5"
            >
              Detail <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2.5">
            {topCategories.map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-gray-400 w-4 tabular-nums text-center">
                  {idx + 1}
                </span>
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-gray-700 flex-1 truncate">{cat.name}</span>
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color, width: `${cat.percentage}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-900 tabular-nums w-16 text-right">
                  {formatRupiah(cat.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentExpenses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h3 className="text-sm font-semibold text-gray-800">Pengeluaran Terbaru</h3>
            <button
              onClick={() => router.push('/riwayat')}
              className="text-xs font-medium text-emerald-600 flex items-center gap-0.5"
            >
              Semua <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentExpenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setDetailTarget(exp)}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm active:bg-gray-50 transition-colors cursor-pointer"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getCategoryColor(exp.category) + '15' }}
                >
                  <CategoryIcon
                    categoryId={exp.category}
                    className="w-4 h-4"
                    style={{ color: getCategoryColor(exp.category) }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {exp.description || getCategoryName(exp.category)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(exp.date)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                  {formatRupiah(exp.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasAny && (
        <EmptyState
          title="Belum ada transaksi"
          description={`Belum ada catatan untuk ${getMonthName(month)}. Tambahkan transaksi pertama!`}
        />
      )}

      <DetailPopup
        transaction={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </div>
    </>
  );
}
