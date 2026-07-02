'use client';

import { useMemo, useState, useCallback } from 'react';
import { TrendingUp, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getExpenseByCategoryPeriod, getExpenses } from '@/lib/storage';
import { formatRupiah } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { getCategoryName } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { THead, TRow } from '../_components/table';
import { MONTHS, computeMonthData, csvEscape } from '../_components/helpers';

export default function YoYPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();

  // Available years
  const availableYears = useMemo(() => {
    const expenses = getExpenses();
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    for (const e of expenses) {
      const y = parseInt(e.date.slice(0, 4));
      if (!isNaN(y)) yearsSet.add(y);
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [refreshKey, currentYear]);

  const [year, setYear] = useState(currentYear);
  const [compareYear, setCompareYear] = useState(currentYear - 1);

  const availableCompareYears = useMemo(() => {
    return availableYears.filter((y) => y !== year);
  }, [availableYears, year]);

  // Reset compareYear if it clashes
  if (compareYear === year || !availableCompareYears.includes(compareYear)) {
    // will fix on next render
  }

  const monthlyData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => computeMonthData(year, m));
  }, [year, refreshKey, synced, email]);

  const prevMonthlyData = useMemo(() => {
    if (!synced && email) return [];
    if (compareYear === year) return [];
    return MONTHS.map((m) => computeMonthData(compareYear, m));
  }, [compareYear, year, refreshKey, synced, email]);

  const annualSummary = useMemo(() => {
    const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpense = monthlyData.reduce((s, m) => s + m.expense, 0);
    return { totalIncome, totalExpense, surplus: totalIncome - totalExpense };
  }, [monthlyData]);

  const prevAnnualSummary = useMemo(() => {
    const totalIncome = prevMonthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpense = prevMonthlyData.reduce((s, m) => s + m.expense, 0);
    return { totalIncome, totalExpense, surplus: totalIncome - totalExpense };
  }, [prevMonthlyData]);

  const yearlyCategoryData = useMemo(() => {
    if (!synced && email) return {};
    const aggregated: Record<string, number> = {};
    for (const m of MONTHS) {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;
      const catData = getExpenseByCategoryPeriod(monthStr);
      for (const [catId, total] of Object.entries(catData)) {
        aggregated[catId] = (aggregated[catId] || 0) + total;
      }
    }
    return aggregated;
  }, [year, refreshKey, synced, email]);

  const prevYearlyCategoryData = useMemo(() => {
    if (!synced && email) return {};
    if (compareYear === year) return {};
    const aggregated: Record<string, number> = {};
    for (const m of MONTHS) {
      const monthStr = `${compareYear}-${String(m).padStart(2, '0')}`;
      const catData = getExpenseByCategoryPeriod(monthStr);
      for (const [catId, total] of Object.entries(catData)) {
        aggregated[catId] = (aggregated[catId] || 0) + total;
      }
    }
    return aggregated;
  }, [compareYear, year, refreshKey, synced, email]);

  const hasPrevYear = prevMonthlyData.some((m) => m.income > 0 || m.expense > 0);

  const yoyItems = useMemo(() => {
    if (!hasPrevYear || compareYear === year) return [];

    const items: { name: string; prev: number; curr: number; change: number; pct: number | null; isPositive: boolean }[] = [];

    // Pemasukan
    const incomeChange = annualSummary.totalIncome - prevAnnualSummary.totalIncome;
    items.push({
      name: 'Pemasukan',
      prev: prevAnnualSummary.totalIncome,
      curr: annualSummary.totalIncome,
      change: incomeChange,
      pct: prevAnnualSummary.totalIncome > 0 ? ((annualSummary.totalIncome - prevAnnualSummary.totalIncome) / prevAnnualSummary.totalIncome) * 100 : null,
      isPositive: incomeChange >= 0,
    });

    // Pengeluaran
    const expenseChange = annualSummary.totalExpense - prevAnnualSummary.totalExpense;
    items.push({
      name: 'Pengeluaran',
      prev: prevAnnualSummary.totalExpense,
      curr: annualSummary.totalExpense,
      change: expenseChange,
      pct: prevAnnualSummary.totalExpense > 0 ? ((annualSummary.totalExpense - prevAnnualSummary.totalExpense) / prevAnnualSummary.totalExpense) * 100 : null,
      isPositive: expenseChange <= 0,
    });

    // Surplus
    const surplusChange = annualSummary.surplus - prevAnnualSummary.surplus;
    items.push({
      name: 'Surplus',
      prev: prevAnnualSummary.surplus,
      curr: annualSummary.surplus,
      change: surplusChange,
      pct: Math.abs(prevAnnualSummary.surplus) > 0 ? ((annualSummary.surplus - prevAnnualSummary.surplus) / Math.abs(prevAnnualSummary.surplus)) * 100 : null,
      isPositive: surplusChange >= 0,
    });

    // Categories
    const allCatIds = new Set([...Object.keys(yearlyCategoryData), ...Object.keys(prevYearlyCategoryData)]);
    for (const catId of [...allCatIds].sort()) {
      const prevVal = prevYearlyCategoryData[catId] ?? 0;
      const currVal = yearlyCategoryData[catId] ?? 0;
      const catChange = currVal - prevVal;
      if (prevVal === 0 && currVal === 0) continue;
      items.push({
        name: getCategoryName(catId),
        prev: prevVal,
        curr: currVal,
        change: catChange,
        pct: prevVal > 0 ? ((currVal - prevVal) / prevVal) * 100 : null,
        isPositive: catChange <= 0,
      });
    }

    return items;
  }, [yearlyCategoryData, prevYearlyCategoryData, annualSummary, prevAnnualSummary, hasPrevYear, compareYear, year]);

  const handleExport = useCallback(() => {
    const lines: string[] = [];
    lines.push('\ufeff');
    lines.push(`"PERBANDINGAN ${compareYear} vs ${year}"`);
    lines.push(`"Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"`);
    lines.push('');
    lines.push(`Item,${compareYear},${year},Perubahan (Rp),Perubahan (%)`);
    for (const d of yoyItems) {
      lines.push(
        `${csvEscape(d.name)},${csvEscape(d.prev)},${csvEscape(d.curr)},` +
        `${csvEscape(d.change)},${csvEscape(d.pct !== null ? d.pct.toFixed(1) : 'N/A')}`
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yoy-${compareYear}-vs-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [compareYear, year, yoyItems]);

  if (!synced && email) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-white px-6">
        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mb-2" />
        <p className="text-sm font-medium text-gray-700">Memuat data...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="YoY Comparison"
        backHref="/laporan"
        rightAction={
          yoyItems.length > 0 ? (
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-3 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-xs active:bg-emerald-100 transition-colors"
              aria-label="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          ) : undefined
        }
      />

      <div className="px-3 pt-3 pb-8 space-y-3">
        {/* Year Selector - Current Year */}
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
            aria-label="Tahun sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-gray-900 tabular-nums">{year}</span>
          </div>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
            aria-label="Tahun berikutnya"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Compare Year Selector */}
        {availableCompareYears.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
            <span className="text-[11px] font-medium text-gray-500">Bandingkan dengan</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompareYear((y) => y - 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
                aria-label="Tahun sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <span className="text-xs font-bold text-gray-900 tabular-nums">{compareYear}</span>
              <button
                onClick={() => setCompareYear((y) => y + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
                aria-label="Tahun berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {hasPrevYear && compareYear !== year ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-800">
                Perbandingan {compareYear} vs {year}
              </h3>
            </div>
            <THead
              cols="grid-cols-[1fr_1fr_1fr_1fr_80px]"
              labels={['Item', String(compareYear), String(year), 'Perubahan (Rp)', 'Perubahan (%)']}
            />
            {yoyItems.map((item, i) => {
              const changeStr = item.change >= 0 ? `+${formatRupiah(item.change)}` : formatRupiah(item.change);
              const pctStr = item.pct !== null
                ? `${item.pct >= 0 ? '+' : ''}${item.pct.toFixed(1)}%`
                : '-';
              return (
                <TRow
                  key={item.name}
                  cols="grid-cols-[1fr_1fr_1fr_1fr_80px]"
                  cells={[
                    { value: item.name, className: 'truncate' },
                    { value: formatRupiah(item.prev), className: 'text-gray-700' },
                    { value: formatRupiah(item.curr), className: 'text-gray-800 font-medium' },
                    { value: changeStr, className: `font-medium ${item.isPositive ? 'text-emerald-700' : 'text-red-700'}` },
                    { value: pctStr, className: `font-medium ${item.isPositive ? 'text-emerald-700' : 'text-red-700'}` },
                  ]}
                  isEven={i % 2 === 0}
                  isLast={i === yoyItems.length - 1}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Pilih tahun pembanding"
            description={
              compareYear === year
                ? 'Pilih tahun yang berbeda untuk perbandingan.'
                : `Belum ada data untuk tahun ${compareYear}.`
            }
          />
        )}
      </div>
    </>
  );
}
