'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  BarChart3,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useAppContext } from '@/lib/context';
import { getExpenseByCategoryPeriod } from '@/lib/storage';
import { formatRupiah, getMonthName } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { getCategoryName, getCategoryColor } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { THead, TRow, TFooter } from '../_components/table';
import { MONTHS, computeMonthData, getShortMonth, csvEscape } from '../_components/helpers';

export default function RingkasanPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);

  const monthlyData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => computeMonthData(year, m));
  }, [year, refreshKey, synced, email]);

  const annualSummary = useMemo(() => {
    const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpense = monthlyData.reduce((s, m) => s + m.expense, 0);
    const surplus = totalIncome - totalExpense;
    return { totalIncome, totalExpense, surplus };
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

  const topCategories = useMemo(() => {
    return Object.entries(yearlyCategoryData)
      .map(([id, total]) => ({ id, total, name: getCategoryName(id), color: getCategoryColor(id) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [yearlyCategoryData]);

  const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.income, d.expense, 1)), 1);
  const barMaxH = 80;
  const hasData = monthlyData.some((m) => m.income > 0 || m.expense > 0);

  const handleExport = useCallback(() => {
    const lines: string[] = [];
    lines.push('\ufeff');
    lines.push(`"LAPORAN KEUANGAN ${year}"`);
    lines.push(`"Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"`);
    lines.push('');
    lines.push('RINGKASAN TAHUNAN');
    lines.push('Item,Jumlah');
    lines.push(`Pemasukan,${csvEscape(annualSummary.totalIncome)}`);
    lines.push(`Pengeluaran,${csvEscape(annualSummary.totalExpense)}`);
    lines.push(`Surplus,${csvEscape(annualSummary.surplus)}`);
    lines.push('');
    lines.push('RINCIAN BULANAN');
    lines.push('Bulan,Pemasukan,Pengeluaran,Saldo');
    for (const d of monthlyData) {
      lines.push(`${csvEscape(getShortMonth(d.month))},${csvEscape(d.income)},${csvEscape(d.expense)},${csvEscape(d.balance)}`);
    }
    lines.push(`Total,${csvEscape(annualSummary.totalIncome)},${csvEscape(annualSummary.totalExpense)},${csvEscape(annualSummary.surplus)}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ringkasan-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [year, annualSummary, monthlyData]);

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
        title="Ringkasan Tahunan"
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
            <BarChart3 className="w-4 h-4 text-indigo-500" />
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
          <>
            {/* Annual Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <ArrowUpRight className="w-3 h-3 text-amber-500" />
                    <p className="text-[9px] font-medium text-amber-600">Pemasukan</p>
                  </div>
                  <p className="text-sm font-bold text-amber-900 tabular-nums">
                    {formatRupiah(annualSummary.totalIncome)}
                  </p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                    <p className="text-[9px] font-medium text-red-600">Pengeluaran</p>
                  </div>
                  <p className="text-sm font-bold text-red-900 tabular-nums">
                    {formatRupiah(annualSummary.totalExpense)}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Wallet className={`w-3 h-3 ${annualSummary.surplus >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                    <p className={`text-[9px] font-medium ${annualSummary.surplus >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {annualSummary.surplus >= 0 ? 'Surplus' : 'Defisit'}
                    </p>
                  </div>
                  <p className={`text-sm font-bold tabular-nums ${annualSummary.surplus >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                    {formatRupiah(Math.abs(annualSummary.surplus))}
                  </p>
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <h3 className="text-xs font-semibold text-gray-800 mb-2">Grafik Bulanan</h3>
              <div className="flex items-end gap-1.5" style={{ height: `${barMaxH + 30}px` }}>
                {monthlyData.map((d) => {
                  const expenseH = (d.expense / maxVal) * barMaxH;
                  const incomeH = (d.income / maxVal) * barMaxH;
                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5 justify-end h-full">
                      {d.income > 0 && (
                        <div
                          className="w-full rounded-t-sm bg-amber-400 transition-all duration-300"
                          style={{ height: `${Math.max(incomeH, 2)}px` }}
                          title={`Pemasukan ${getMonthName(d.month)}: ${formatRupiah(d.income)}`}
                        />
                      )}
                      {d.expense > 0 && (
                        <div
                          className="w-full rounded-b-sm bg-red-400 transition-all duration-300"
                          style={{ height: `${Math.max(expenseH, 2)}px` }}
                          title={`Pengeluaran ${getMonthName(d.month)}: ${formatRupiah(d.expense)}`}
                        />
                      )}
                      {(d.income > 0 || d.expense > 0) && (
                        <span className="text-[7px] text-gray-400 mt-0.5 tabular-nums">
                          {d.month.slice(5)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                  <span className="text-[9px] text-gray-500">Pemasukan</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                  <span className="text-[9px] text-gray-500">Pengeluaran</span>
                </div>
              </div>
            </div>

            {/* Top Categories */}
            {topCategories.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                <h3 className="text-xs font-semibold text-gray-800">Kategori Teratas {year}</h3>
                <div className="space-y-2">
                  {topCategories.map((cat) => {
                    const pct = annualSummary.totalExpense > 0 ? (cat.total / annualSummary.totalExpense) * 100 : 0;
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="text-[11px] font-medium text-gray-800 truncate">{cat.name}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-900 tabular-nums flex-shrink-0 ml-2">
                            {formatRupiah(cat.total)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ backgroundColor: cat.color, width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 tabular-nums w-7 text-right">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-800">Rincian Bulanan</h3>
              </div>
              <THead cols="grid-cols-[70px_1fr_1fr_80px]" labels={['Bulan', 'Pemasukan', 'Pengeluaran', 'Saldo']} />
              {monthlyData.map((d, i) => (
                <TRow
                  key={d.month}
                  cols="grid-cols-[70px_1fr_1fr_80px]"
                  cells={[
                    getShortMonth(d.month),
                    { value: formatRupiah(d.income), className: 'text-amber-700 font-medium' },
                    { value: formatRupiah(d.expense), className: 'text-red-700 font-medium' },
                    { value: formatRupiah(d.balance), className: `font-semibold ${d.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}` },
                  ]}
                  isEven={i % 2 === 0}
                  isLast={i === monthlyData.length - 1}
                />
              ))}
              <TFooter
                cols="grid-cols-[70px_1fr_1fr_80px]"
                cells={[
                  'Total',
                  { value: formatRupiah(annualSummary.totalIncome), className: 'text-amber-800' },
                  { value: formatRupiah(annualSummary.totalExpense), className: 'text-red-800' },
                  { value: formatRupiah(annualSummary.surplus), className: annualSummary.surplus >= 0 ? 'text-emerald-800' : 'text-red-800' },
                ]}
              />
            </div>
          </>
        ) : (
          <EmptyState
            title="Belum ada data"
            description={`Belum ada catatan keuangan untuk tahun ${year}.`}
          />
        )}
      </div>
    </>
  );
}
