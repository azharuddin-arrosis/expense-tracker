'use client';

import { useMemo, useState, useCallback } from 'react';
import { Download, ChevronLeft, ChevronRight, DollarSign, Loader2 } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getBudget } from '@/lib/storage';
import { formatRupiah } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { THead, TRow, TFooter } from '../_components/table';
import { MONTHS, computeMonthData, getShortMonth, csvEscape } from '../_components/helpers';

export default function BudgetPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);

  const monthlyData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => computeMonthData(year, m));
  }, [year, refreshKey, synced, email]);

  const budgetData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;
      const budget = getBudget(monthStr);
      const realisasi = monthlyData.find((d) => d.month === monthStr)?.expense ?? 0;
      const target = budget?.target ?? null;
      let selisih: number | null = null;
      let pct: number | null = null;
      if (target !== null) {
        selisih = target - realisasi;
        pct = target > 0 ? (realisasi / target) * 100 : 0;
      }
      return { month: monthStr, monthNum: m, budget: target, realisasi, selisih, pct };
    });
  }, [year, refreshKey, synced, email, monthlyData]);

  const budgetTotals = useMemo(() => {
    let totalBudget = 0;
    let totalRealisasi = 0;
    let budgetCount = 0;
    for (const d of budgetData) {
      if (d.budget !== null) {
        totalBudget += d.budget;
        budgetCount++;
      }
      totalRealisasi += d.realisasi;
    }
    const totalSelisih = budgetCount > 0 ? totalBudget - totalRealisasi : null;
    const totalPct = totalBudget > 0 ? (totalRealisasi / totalBudget) * 100 : null;
    return { totalBudget, totalRealisasi, totalSelisih, totalPct, budgetCount };
  }, [budgetData]);

  const hasBudget = budgetData.some((d) => d.budget !== null);

  const handleExport = useCallback(() => {
    const lines: string[] = [];
    lines.push('\ufeff');
    lines.push(`"BUDGET VS AKTUAL ${year}"`);
    lines.push(`"Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"`);
    lines.push('');
    lines.push('Bulan,Budget,Realisasi,Selisih,%');
    for (const d of budgetData) {
      lines.push(
        `${csvEscape(getShortMonth(d.month))},` +
        `${csvEscape(d.budget ?? 0)},${csvEscape(d.realisasi)},` +
        `${csvEscape(d.selisih ?? 0)},${csvEscape(d.pct !== null ? d.pct.toFixed(1) : 'N/A')}`
      );
    }
    lines.push(
      `Total,${csvEscape(budgetTotals.totalBudget)},${csvEscape(budgetTotals.totalRealisasi)},` +
      `${csvEscape(budgetTotals.totalSelisih ?? 0)},${csvEscape(budgetTotals.totalPct !== null ? budgetTotals.totalPct.toFixed(1) : 'N/A')}`
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [year, budgetData, budgetTotals]);

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
        title="Budget vs Aktual"
        backHref="/laporan"
        rightAction={
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-xs active:bg-emerald-100 transition-colors"
            aria-label="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        }
      />

      <div className="px-3 pt-3 pb-8 space-y-3">
        {/* Year Selector */}
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
            aria-label="Tahun sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-500" />
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

        {hasBudget ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-800">Budget vs Aktual {year}</h3>
            </div>
            <THead cols="grid-cols-[70px_1fr_1fr_1fr_70px]" labels={['Bulan', 'Budget', 'Realisasi', 'Selisih', '%']} />
            {budgetData.map((d, i) => {
              const hasRowBudget = d.budget !== null;
              const pctClass = !hasRowBudget
                ? 'text-gray-400'
                : d.pct !== null && d.pct <= 80
                  ? 'text-emerald-600'
                  : d.pct !== null && d.pct <= 100
                    ? 'text-amber-600'
                    : 'text-red-600';
              const selisihClass = !hasRowBudget
                ? 'text-gray-400'
                : d.selisih !== null && d.selisih >= 0
                  ? 'text-emerald-600'
                  : 'text-red-600';
              return (
                <TRow
                  key={d.month}
                  cols="grid-cols-[70px_1fr_1fr_1fr_70px]"
                  cells={[
                    getShortMonth(d.month),
                    { value: hasRowBudget ? d.budget! : '-', className: 'text-gray-800 font-medium' },
                    { value: d.realisasi, className: 'text-red-700 font-medium' },
                    { value: hasRowBudget ? d.selisih! : '-', className: `${selisihClass} font-medium` },
                    { value: hasRowBudget && d.pct !== null ? `${d.pct.toFixed(0)}%` : '-', className: `${pctClass} font-medium` },
                  ]}
                  isEven={i % 2 === 0}
                  isLast={i === budgetData.length - 1}
                />
              );
            })}
            <TFooter
              cols="grid-cols-[70px_1fr_1fr_1fr_70px]"
              cells={[
                'Total',
                { value: budgetTotals.budgetCount > 0 ? budgetTotals.totalBudget : '-', className: 'text-gray-800' },
                { value: budgetTotals.totalRealisasi, className: 'text-red-800' },
                {
                  value: budgetTotals.totalSelisih !== null ? budgetTotals.totalSelisih : '-',
                  className: budgetTotals.totalSelisih !== null && budgetTotals.totalSelisih >= 0 ? 'text-emerald-800' : 'text-red-800',
                },
                {
                  value: budgetTotals.totalPct !== null ? `${budgetTotals.totalPct.toFixed(0)}%` : '-',
                  className: budgetTotals.totalPct !== null
                    ? budgetTotals.totalPct <= 80
                      ? 'text-emerald-800'
                      : budgetTotals.totalPct <= 100
                        ? 'text-amber-800'
                        : 'text-red-800'
                    : 'text-gray-800',
                },
              ]}
            />
          </div>
        ) : (
          <EmptyState
            title="Belum ada budget"
            description={`Belum ada data budget untuk tahun ${year}. Atur budget di halaman Budget.`}
          />
        )}
      </div>
    </>
  );
}
