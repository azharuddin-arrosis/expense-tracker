'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Loader2, Wallet } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getExpenseByPeriod,
  getIncomeByPeriod,
  getExpenseByCategoryPeriod,
  getTransactionsByDateRange,
} from '@/lib/storage';
import { formatRupiah, getMonthName, getCurrentMonthString, prevMonth } from '@/lib/format';
import { CATEGORIES, getCategoryColor, getCategoryName } from '@/lib/types';
import { useSyncOnMount } from '@/lib/use-sync';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryBar } from '@/components/CategoryBar';
import { DateFilter } from '@/components/DateFilter';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

function getLast6Months(from: string): string[] {
  const months: string[] = [];
  let [y, m] = from.split('-').map(Number);
  for (let i = 0; i < 6; i++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m--;
    if (m === 0) { m = 12; y--; }
  }
  return months.reverse();
}

export default function StatistikPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);
  const [month, setMonth] = useState(getCurrentMonthString);
  const [filterMode, setFilterMode] = useState<'month' | 'week' | 'range'>('month');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const expenses = useMemo(() => {
    if (!synced && email) return [];
    if (filterMode === 'month' || !dateRange) {
      return getExpenseByPeriod(month);
    }
    return getTransactionsByDateRange(dateRange.start, dateRange.end).filter((e) => e.flow === 'out');
  }, [month, filterMode, dateRange, refreshKey, synced, email]);

  const categoryData = useMemo(
    () => {
      if (!synced && email) return {};
      return getExpenseByCategoryPeriod(month);
    },
    [month, refreshKey, synced, email]
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

  // ── Trend Data: last 6 months ──
  const trendMonths = useMemo(() => getLast6Months(month), [month]);
  const trendData = useMemo(() => {
    if (!synced && email) return trendMonths.map((m) => ({ month: m, expense: 0, income: 0 }));
    return trendMonths.map((m) => {
      const exps = getExpenseByPeriod(m);
      const incs = getIncomeByPeriod(m);
      return {
        month: m,
        expense: exps.reduce((s, e) => s + e.amount, 0),
        income: incs.reduce((s, e) => s + e.amount, 0),
      };
    });
  }, [trendMonths, refreshKey, synced, email]);

  const maxVal = Math.max(...trendData.map((d) => Math.max(d.expense, d.income)), 1);
  const chartH = 120;
  const chartW = 280;

  // MoM Comparison
  const prevMonthStr = prevMonth(month);
  const prevExpenses = useMemo(() => {
    if (!synced && email) return [];
    if (filterMode === 'month' || !dateRange) {
      return getExpenseByPeriod(prevMonthStr);
    }
    return [];
  }, [prevMonthStr, filterMode, dateRange, refreshKey, synced, email]);
  const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);
  const momChange = prevTotal > 0 ? ((totalMonth - prevTotal) / prevTotal) * 100 : 0;

  // Biggest category change
  const prevCatData = useMemo(() => {
    if (!synced && email) return {};
    return getExpenseByCategoryPeriod(prevMonthStr);
  }, [prevMonthStr, refreshKey, synced, email]);
  const biggestChangeCat = useMemo(() => {
    let maxDelta = 0;
    let maxCat = '';
    for (const cat of CATEGORIES) {
      const curr = categoryData[cat.id] || 0;
      const prev = prevCatData[cat.id] || 0;
      const delta = curr - prev;
      if (Math.abs(delta) > Math.abs(maxDelta) && (curr > 0 || prev > 0)) {
        maxDelta = delta;
        maxCat = cat.id;
      }
    }
    return { id: maxCat, delta: maxDelta };
  }, [categoryData, prevCatData]);

  const hasData = expenses.length > 0;

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
      <PageHeader title="Statistik" />

      <div className="px-4 pt-6 pb-6 space-y-4">
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
            <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Total</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">
                {formatRupiah(totalMonth)}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Rata-rata</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">
                {formatRupiah(Math.round(avgPerDay))}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Transaksi</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">
                {transactionCount}
              </p>
            </div>
          </div>

          {/* MoM Comparison & Biggest Change */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-2xl shadow-sm p-3">
              <p className="text-xs text-gray-500 mb-1">vs Bulan Lalu</p>
              <div className="flex items-center gap-1">
                {momChange > 0 ? (
                  <ArrowUp className="w-4 h-4 text-red-500" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-emerald-500" />
                )}
                <span className={`text-sm font-bold tabular-nums ${momChange > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {Math.abs(momChange).toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {momChange > 0 ? 'Naik' : 'Turun'} dari bulan lalu
              </p>
            </div>
            {biggestChangeCat.id && (
              <div className="bg-white rounded-2xl shadow-sm p-3">
                <p className="text-xs text-gray-500 mb-1">Perubahan Terbesar</p>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(biggestChangeCat.id) }} />
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {getCategoryName(biggestChangeCat.id)}
                  </span>
                </div>
                <p className={`text-[10px] tabular-nums mt-0.5 ${biggestChangeCat.delta > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {biggestChangeCat.delta > 0 ? '+' : ''}{formatRupiah(biggestChangeCat.delta)}
                </p>
              </div>
            )}
          </div>

          {/* SVG Trend Chart */}
          {trendData.some((d) => d.expense > 0 || d.income > 0) && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Tren 6 Bulan</h3>
              <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} className="w-full h-auto">
                {/* Y-axis grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <line
                    key={ratio}
                    x1={0} y1={chartH * (1 - ratio)} x2={chartW} y2={chartH * (1 - ratio)}
                    stroke="#e5e7eb" strokeWidth="0.5"
                  />
                ))}

                {/* Expense line (red) */}
                <polyline
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={trendData.map((d, i) => {
                    const x = (i / (trendData.length - 1)) * (chartW - 20) + 10;
                    const y = chartH - (d.expense / maxVal) * (chartH - 20) - 10;
                    return `${x},${y}`;
                  }).join(' ')}
                />
                {/* Income line (amber) */}
                <polyline
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={trendData.map((d, i) => {
                    const x = (i / (trendData.length - 1)) * (chartW - 20) + 10;
                    const y = chartH - (d.income / maxVal) * (chartH - 20) - 10;
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* X-axis labels */}
                {trendData.map((d, i) => (
                  <text
                    key={d.month}
                    x={(i / (trendData.length - 1)) * (chartW - 20) + 10}
                    y={chartH + 10}
                    textAnchor="middle"
                    className="text-[9px] fill-gray-400"
                  >
                    {getMonthName(d.month).slice(0, 3)}
                  </text>
                ))}
              </svg>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded bg-red-500" />
                  <span className="text-[10px] text-gray-500">Pengeluaran</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded bg-amber-500" />
                  <span className="text-[10px] text-gray-500">Pemasukan</span>
                </div>
              </div>
            </div>
          )}

          {/* Pie Chart */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
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
    </>
  );
}
