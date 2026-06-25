'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getExpensesByMonth, getExpensesByCategory } from '@/lib/storage';
import { formatRupiah, getMonthName, prevMonth, nextMonth } from '@/lib/format';
import { CATEGORIES, getCategoryColor, getCategoryName } from '@/lib/types';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryBar } from '@/components/CategoryBar';
import { EmptyState } from '@/components/EmptyState';

export default function StatistikPage() {
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

  const totalMonth = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgPerDay = totalMonth > 0 ? totalMonth / new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).getDate() : 0;
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
          description={`Belum ada pengeluaran untuk ${getMonthName(
            currentMonth
          )}. Data statistik akan muncul setelah kamu mencatat pengeluaran.`}
        />
      )}
    </div>
  );
}
