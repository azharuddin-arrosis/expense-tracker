'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
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
import { CategoryBar } from '@/components/CategoryBar';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DateFilter } from '@/components/DateFilter';
import { EXPENSE_CATEGORIES, getCategoryColor, getCategoryName } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { getStoredEmail } from '@/lib/cloud';

export default function DashboardPage() {
  const { refreshKey } = useAppContext();
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'local'>('checking');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterMode, setFilterMode] = useState<'month' | 'week' | 'range'>('month');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const email = getStoredEmail();

  // Background sync: try to refresh localStorage from cloud on mount
  useEffect(() => {
    if (!email) {
      setCloudStatus('local');
      return;
    }

    let cancelled = false;

    const syncFromCloud = async () => {
      try {
        await getExpensesWithSync(email);
        if (!cancelled) setCloudStatus('connected');
      } catch {
        if (!cancelled) setCloudStatus('local');
      }
    };

    syncFromCloud();

    return () => {
      cancelled = true;
    };
  }, [email, refreshKey]);

  const expenses = useMemo(() => {
    if (filterMode === 'month' || !dateRange) {
      return getExpensesByMonth(month);
    }
    return getTransactionsByDateRange(dateRange.start, dateRange.end).filter((e) => e.flow === 'out');
  }, [month, filterMode, dateRange, refreshKey]);

  const incomes = useMemo(() => {
    if (filterMode === 'month' || !dateRange) {
      return getIncomesByMonth(month);
    }
    return getTransactionsByDateRange(dateRange.start, dateRange.end).filter((e) => e.flow === 'in');
  }, [month, filterMode, dateRange, refreshKey]);

  const categoryData = useMemo(
    () => getExpensesByCategory(month),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, refreshKey]
  );

  const budget = useMemo(
    () => getBudget(month),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, refreshKey]
  );

  const todayStr = getTodayString();
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = incomes.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpense;
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const totalToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget ? budget.target - totalExpense : null;
  const usagePercent =
    budget && budget.target > 0
      ? (totalExpense / budget.target) * 100
      : 0;
  const isWarning = usagePercent >= 80 && usagePercent < 100;
  const isOverspent = usagePercent >= 100;

  // Top 3 largest expenses
  const topExpenses = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Largest expense category
  const categoryEntries = useMemo(() => {
    return Object.entries(categoryData)
      .map(([id, total]) => ({
        id,
        total,
        name: getCategoryName(id),
        color: getCategoryColor(id),
        percentage: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [categoryData, totalExpense]);

  const largestCategory = categoryEntries.length > 0 ? categoryEntries[0] : null;

  // Pie chart: conic-gradient for expense categories
  const pieGradient = useMemo(() => {
    const items = EXPENSE_CATEGORIES.filter(
      (cat) => (categoryData[cat.id] || 0) > 0
    );
    if (items.length === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';

    const total = items.reduce(
      (sum, cat) => sum + (categoryData[cat.id] || 0),
      0
    );
    let currentDeg = 0;
    const parts: string[] = [];

    for (const cat of items) {
      const pct = ((categoryData[cat.id] || 0) / total) * 360;
      const start = currentDeg;
      currentDeg += pct;
      parts.push(`${cat.color} ${start}deg ${currentDeg}deg`);
    }

    return `conic-gradient(${parts.join(', ')})`;
  }, [categoryData]);

  const hasExpenses = expenses.length > 0;

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Duit</h1>
        <div className="flex items-center gap-2">
          {/* Cloud Status Indicator */}
          {cloudStatus === 'checking' ? (
            <div className="w-2 h-2 rounded-full bg-gray-300" title="Memeriksa koneksi..." />
          ) : cloudStatus === 'connected' ? (
            <Cloud
              className="w-5 h-5 text-emerald-500"
              aria-label="Tersimpan di Cloud"
            />
          ) : (
            <CloudOff
              className="w-5 h-5 text-gray-400"
              aria-label="Hanya Lokal"
            />
          )}
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <DateFilter
        month={month}
        onMonthChange={setMonth}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
      />

      {/* Summary Cards: Income | Expense | Balance */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            <p className="text-[10px] font-medium text-amber-700">
              Pemasukan
            </p>
          </div>
          <p className="text-base font-bold text-amber-900 tabular-nums">
            {formatRupiah(totalIncome)}
          </p>
          {incomes.length > 0 && (
            <p className="text-[10px] text-amber-600 mt-0.5">
              {incomes.length} transaksi
            </p>
          )}
        </div>

        <div className="bg-red-50 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            <p className="text-[10px] font-medium text-red-700">
              Pengeluaran
            </p>
          </div>
          <p className="text-base font-bold text-red-900 tabular-nums">
            {formatRupiah(totalExpense)}
          </p>
          {expenses.length > 0 && (
            <p className="text-[10px] text-red-600 mt-0.5">
              {expenses.length} transaksi
            </p>
          )}
        </div>

        <div
          className={`rounded-xl p-3 ${
            balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'
          }`}
        >
          <div className="flex items-center gap-1 mb-1">
            <Wallet
              className={`w-3.5 h-3.5 ${
                balance >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            />
            <p
              className={`text-[10px] font-medium ${
                balance >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              Saldo Bersih
            </p>
          </div>
          <p
            className={`text-base font-bold tabular-nums ${
              balance >= 0 ? 'text-emerald-900' : 'text-red-900'
            }`}
          >
            {formatRupiah(balance)}
          </p>
          {totalIncome > 0 && totalExpense > 0 && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              {totalIncome > 0
                ? `${((balance / totalIncome) * 100).toFixed(0)}% dari pemasukan`
                : ''}
            </p>
          )}
        </div>
      </div>

      {/* Budget Status */}
      {budget ? (
        <div
          className={`rounded-xl p-4 space-y-2 ${
            isOverspent
              ? 'bg-red-50'
              : isWarning
                ? 'bg-amber-50'
                : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isOverspent ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              )}
              <span
                className={`text-xs font-medium ${
                  isOverspent
                    ? 'text-red-700'
                    : isWarning
                      ? 'text-amber-700'
                      : 'text-gray-700'
                }`}
              >
                Target Bulanan
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {formatRupiah(budget.target)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverspent
                  ? 'bg-red-500'
                  : isWarning
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
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
              <span className="text-xs text-gray-600">
                Sisa {formatRupiah(remaining!)}
              </span>
            )}
            <span className="text-xs tabular-nums text-gray-500">
              {usagePercent.toFixed(1)}%
            </span>
          </div>

          {isWarning && !isOverspent && (
            <p className="text-[11px] text-amber-600 font-medium">
              Perhatian! Pengeluaran sudah mencapai {usagePercent.toFixed(0)}% dari target.
            </p>
          )}
          {isOverspent && (
            <p className="text-[11px] text-red-600 font-medium">
              Overspent! Pengeluaran melebihi target bulanan.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              Belum ada target budget
            </span>
            <a
              href="/setting"
              className="text-xs font-medium text-emerald-600 active:text-emerald-700"
            >
              Atur Target
            </a>
          </div>
        </div>
      )}

      {/* Pie Chart & Largest Category */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          Pengeluaran per Kategori
        </h3>

        {hasExpenses ? (
          <div className="flex flex-col items-center gap-4">
            {/* Simple Pie Chart (conic-gradient) */}
            <div
              className="w-40 h-40 rounded-full shadow-inner"
              style={{ background: pieGradient }}
            />

            {/* Largest category highlight */}
            {largestCategory && (
              <div className="bg-white rounded-xl px-4 py-3 w-full text-center">
                <p className="text-sm text-gray-600">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: largestCategory.color }}
                  />
                  <span className="font-semibold text-gray-900">
                    {largestCategory.name}
                  </span>{' '}
                  adalah kategori pengeluaran terbesar bulan ini (
                  <span className="font-semibold tabular-nums">
                    {largestCategory.percentage.toFixed(0)}%
                  </span>
                  )
                </p>
              </div>
            )}

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
              {EXPENSE_CATEGORIES.filter(
                (cat) => (categoryData[cat.id] || 0) > 0
              )
                .sort(
                  (a, b) =>
                    (categoryData[b.id] || 0) - (categoryData[a.id] || 0)
                )
                .map((cat) => {
                  const pct =
                    totalExpense > 0
                      ? ((categoryData[cat.id] || 0) / totalExpense) * 100
                      : 0;
                  return (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-gray-600 truncate">
                        {cat.name}
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums ml-auto">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <p className="text-center py-6 text-sm text-gray-400">
            Belum ada pengeluaran bulan ini
          </p>
        )}
      </div>

      {/* Category Breakdown Bars */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Rincian per Kategori
        </h3>
        <CategoryBar data={categoryData} total={totalExpense} />
      </div>

      {/* Top Expenses */}
      {topExpenses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Pengeluaran Terbesar
          </h3>
          <div className="space-y-2">
            {topExpenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: getCategoryColor(exp.category) + '20',
                  }}
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

      {/* Empty State */}
      {expenses.length === 0 && incomes.length === 0 && (
        <EmptyState
          title="Belum ada transaksi"
          description={`Belum ada catatan untuk ${getMonthName(month)}. Tambahkan transaksi pertama kamu!`}
        />
      )}
    </div>
  );
}
