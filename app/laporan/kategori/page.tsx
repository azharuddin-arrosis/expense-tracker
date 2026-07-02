'use client';

import { useMemo, useState, useCallback } from 'react';
import { BarChart3, Download, ChevronLeft, ChevronRight, Loader2, PieChart } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getExpenseByCategoryPeriod } from '@/lib/storage';
import { formatRupiah } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { getCategoryName, getCategoryColor } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { THead, TRow, TFooter } from '../_components/table';
import { MONTHS, computeMonthData, csvEscape } from '../_components/helpers';

export default function KategoriPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);

  const monthlyData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => computeMonthData(year, m));
  }, [year, refreshKey, synced, email]);

  const annualExpense = useMemo(() => {
    return monthlyData.reduce((s, m) => s + m.expense, 0);
  }, [monthlyData]);

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

  const allCategories = useMemo(() => {
    const activeMonths = monthlyData.filter((m) => m.expense > 0).length || 1;
    return Object.entries(yearlyCategoryData)
      .map(([id, total]) => ({
        id,
        name: getCategoryName(id),
        total,
        avg: Math.round(total / activeMonths),
        pct: annualExpense > 0 ? (total / annualExpense) * 100 : 0,
        color: getCategoryColor(id),
      }))
      .sort((a, b) => b.total - a.total);
  }, [yearlyCategoryData, monthlyData, annualExpense]);

  const hasData = allCategories.length > 0;

  const handleExport = useCallback(() => {
    const lines: string[] = [];
    lines.push('\ufeff');
    lines.push(`"LAPORAN PER KATEGORI ${year}"`);
    lines.push(`"Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"`);
    lines.push('');
    lines.push('Kategori,Total,Rata-rata/Bulan,% dari Total');
    for (const c of allCategories) {
      lines.push(`${csvEscape(c.name)},${csvEscape(c.total)},${csvEscape(c.avg)},${csvEscape(c.pct.toFixed(1))}`);
    }
    const catTotalPct = allCategories.reduce((s, c) => s + c.pct, 0);
    lines.push(`Total,${csvEscape(annualExpense)},,${csvEscape(catTotalPct.toFixed(1))}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kategori-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [year, allCategories, annualExpense]);

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
        title="Per Kategori"
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
            <PieChart className="w-4 h-4 text-indigo-500" />
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

        {hasData ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-800">Laporan Per Kategori {year}</h3>
            </div>
            <THead cols="grid-cols-[1fr_100px_100px_70px]" labels={['Kategori', 'Total', 'Rata/bln', '%']} />
            {allCategories.map((cat, i) => (
              <TRow
                key={cat.id}
                cols="grid-cols-[1fr_100px_100px_70px]"
                cells={[
                  { value: cat.name, className: 'truncate' },
                  { value: cat.total, className: 'text-gray-800 font-medium' },
                  { value: cat.avg, className: 'text-gray-600' },
                  { value: `${cat.pct.toFixed(1)}%`, className: 'text-gray-500' },
                ]}
                isEven={i % 2 === 0}
                isLast={i === allCategories.length - 1}
              />
            ))}
            <TFooter
              cols="grid-cols-[1fr_100px_100px_70px]"
              cells={[
                'Total',
                { value: annualExpense, className: 'text-gray-800' },
                '',
                { value: '100%', className: 'text-gray-600' },
              ]}
            />
          </div>
        ) : (
          <EmptyState
            title="Belum ada data"
            description={`Belum ada kategori untuk tahun ${year}.`}
          />
        )}
      </div>
    </>
  );
}
