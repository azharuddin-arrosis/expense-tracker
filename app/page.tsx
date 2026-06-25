'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getExpensesByMonth,
  getExpensesByDate,
  getExpensesByCategory,
  getBudget,
} from '@/lib/storage';
import { formatRupiah, formatDate, getMonthName, prevMonth, nextMonth, getTodayString } from '@/lib/format';
import { CategoryBar } from '@/components/CategoryBar';
import { CategoryIcon } from '@/components/CategoryIcon';
import { getCategoryColor, getCategoryName } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';

export default function DashboardPage() {
  const { refreshKey, currentMonth, setCurrentMonth } = useAppContext();

  const expenses = useMemo(
    () => getExpensesByMonth(currentMonth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentMonth, refreshKey]
  );

  const categoryData = useMemo(
    () => getExpensesByCategory(currentMonth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentMonth, refreshKey]
  );

  const budget = useMemo(
    () => getBudget(currentMonth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentMonth, refreshKey]
  );

  const todayStr = getTodayString();
  const totalMonth = expenses.reduce((sum, e) => sum + e.amount, 0);
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const totalToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget ? budget.target - totalMonth : null;
  const usagePercent = budget && budget.target > 0 ? (totalMonth / budget.target) * 100 : 0;
  const isWarning = usagePercent >= 80 && usagePercent < 100;
  const isOverspent = usagePercent >= 100;

  // Top 3 largest expenses
  const topExpenses = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Finance Keluarga</h1>
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <button
          onClick={() => setCurrentMonth(prevMonth(currentMonth))}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-base font-semibold text-gray-800">
          {getMonthName(currentMonth)}
        </h2>
        <button
          onClick={() => setCurrentMonth(nextMonth(currentMonth))}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Bulan Ini */}
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs text-emerald-700 font-medium mb-1">Total Bulan Ini</p>
          <p className="text-xl font-bold text-emerald-900 tabular-nums">
            {formatRupiah(totalMonth)}
          </p>
        </div>

        {/* Pengeluaran Hari Ini */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-blue-700 font-medium mb-1">Hari Ini</p>
          <p className="text-xl font-bold text-blue-900 tabular-nums">
            {formatRupiah(totalToday)}
          </p>
          {totalToday > 0 && (
            <p className="text-[10px] text-blue-600 mt-0.5">
              {todayExpenses.length} transaksi
            </p>
          )}
        </div>
      </div>

      {/* Budget Status */}
      {budget ? (
        <div className={`rounded-xl p-4 space-y-2 ${
          isOverspent ? 'bg-red-50' : isWarning ? 'bg-amber-50' : 'bg-gray-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isOverspent ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              )}
              <span className={`text-xs font-medium ${
                isOverspent ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-gray-700'
              }`}>
                Target Bulanan
              </span>
            </div>
            <span className="text-xs text-gray-500">{formatRupiah(budget.target)}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden">
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
              ⚠️ Perhatian! Pengeluaran sudah mencapai {usagePercent.toFixed(0)}% dari target.
            </p>
          )}
          {isOverspent && (
            <p className="text-[11px] text-red-600 font-medium">
              ⚠️ Overspent! Pengeluaran melebihi target bulanan.
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

      {/* Category Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Pengeluaran per Kategori
        </h3>
        <CategoryBar data={categoryData} total={totalMonth} />
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
      {expenses.length === 0 && (
        <EmptyState
          title="Belum ada pengeluaran"
          description={`Belum ada catatan pengeluaran untuk ${getMonthName(currentMonth)}. Tambahkan pengeluaran pertama kamu!`}
        />
      )}
    </div>
  );
}
