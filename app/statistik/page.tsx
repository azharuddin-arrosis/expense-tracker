'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/lib/context';
import { getExpensesByMonth, getExpensesByCategory, getTransactionsByDateRange } from '@/lib/storage';
import { formatRupiah, getMonthName, getCurrentMonthString } from '@/lib/format';
import { CATEGORIES, getCategoryColor, getCategoryName } from '@/lib/types';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryBar } from '@/components/CategoryBar';
import { DateFilter } from '@/components/DateFilter';
import { EmptyState } from '@/components/EmptyState';

export default function StatistikPage() {
  const { refreshKey } = useAppContext();
  const [month, setMonth] = useState(getCurrentMonthString);
  const [filterMode, setFilterMode] = useState<'month' | 'week' | 'range'>('month');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const expenses = useMemo(() => {
    if (filterMode === 'month' || !dateRange) {
      return getExpensesByMonth(month);
    }
    return getTransactionsByDateRange(dateRange.start, dateRange.end).filter((e) => e.flow === 'out');
  }, [month, filterMode, dateRange, refreshKey]);

  const categoryData = useMemo(
    () => getExpensesByCategory(month),
    [month, refreshKey]
  );

  const totalMonth = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgPerDay = totalMonth > 0 ? totalMonth / new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate() : 0;
  const transactionCount = expenses.length;

  // Build conic-gradient for pie chart
  const pieGradient = useMemo(() => {
    const items = CATEGORIES.filter((cat) => (categoryData[cat.id] || 0) > 0);
    if (items.length === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';

    const total = items.reduce((sum, cat) => sum + (categoryData[cat.id] || 0), 0);
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

  const hasData = expenses.length > 0;

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900">Statistik</h1>

      {/* Date Filter */}
      <DateFilter
        month={month}
        onMonthChange={setMonth}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
      />

      {hasData ? (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Total</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">
                {formatRupiah(totalMonth)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Rata-rata</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">
                {formatRupiah(Math.round(avgPerDay))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Transaksi</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">
                {transactionCount}
              </p>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-gray-50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">
              Pie Chart Kategori
            </h3>
            <div className="flex flex-col items-center gap-5">
              <div
                className="w-44 h-44 rounded-full shadow-inner"
                style={{ background: pieGradient }}
              />

              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
                {CATEGORIES.filter(
                  (cat) => (categoryData[cat.id] || 0) > 0
                )
                  .sort(
                    (a, b) =>
                      (categoryData[b.id] || 0) - (categoryData[a.id] || 0)
                  )
                  .map((cat) => {
                    const pct =
                      totalMonth > 0
                        ? ((categoryData[cat.id] || 0) / totalMonth) * 100
                        : 0;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center gap-2"
                      >
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
          </div>

          {/* Detail Bars */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Detail per Kategori
            </h3>
            <CategoryBar data={categoryData} total={totalMonth} />
          </div>
        </>
      ) : (
        <EmptyState
          title="Belum ada data"
          description={`Belum ada pengeluaran untuk ${getMonthName(month)}. Data statistik akan muncul setelah kamu mencatat pengeluaran.`}
        />
      )}
    </div>
  );
}
