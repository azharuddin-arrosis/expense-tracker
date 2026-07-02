'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  BarChart3,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getExpenseByPeriod,
  getIncomeByPeriod,
  getExpenseByCategoryPeriod,
  getExpenses,
} from '@/lib/storage';
import { formatRupiah, getMonthName } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { getCategoryName, getCategoryColor } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function LaporanPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);

  // Get all available years from data
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

  // Monthly data for the selected year
  const monthlyData = useMemo(() => {
    if (!synced && email) return [];

    return MONTHS.map((m) => {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;
      const exps = getExpenseByPeriod(monthStr);
      const incs = getIncomeByPeriod(monthStr);
      const expense = exps.reduce((s, e) => s + e.amount, 0);
      const income = incs.reduce((s, e) => s + e.amount, 0);
      return { month: monthStr, monthNum: m, expense, income, balance: income - expense };
    });
  }, [year, refreshKey, synced, email]);

  // Annual summary
  const annualSummary = useMemo(() => {
    const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpense = monthlyData.reduce((s, m) => s + m.expense, 0);
    const surplus = totalIncome - totalExpense;
    const numMonthsWithData = monthlyData.filter((m) => m.income > 0 || m.expense > 0).length;
    return { totalIncome, totalExpense, surplus, numMonthsWithData };
  }, [monthlyData]);

  // Top categories for the year
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

  // Chart dimensions
  const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.income, d.expense, 1)), 1);
  const barMaxH = 80;

  // Export
  const handleExport = useCallback(() => {
    const data = {
      year,
      exportedAt: new Date().toISOString(),
      summary: annualSummary,
      monthly: monthlyData,
      topCategories,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-keuangan-${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [year, annualSummary, monthlyData, topCategories]);

  const hasData = monthlyData.some((m) => m.income > 0 || m.expense > 0);

  if (!synced && email) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-white px-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-3">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mb-2" />
        <p className="text-sm font-medium text-gray-700">Memuat data...</p>
        <p className="text-xs text-gray-400 mt-1">Menyinkronkan dari cloud</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Laporan Tahunan"
        rightAction={
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-xs active:bg-emerald-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
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
            {/* Annual Summary Bar */}
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

            {/* Monthly Bar Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <h3 className="text-xs font-semibold text-gray-800 mb-2">Grafik Bulanan</h3>
              <div className="flex items-end gap-1.5" style={{ height: `${barMaxH + 30}px` }}>
                {monthlyData.map((d) => {
                  const expenseH = (d.expense / maxVal) * barMaxH;
                  const incomeH = (d.income / maxVal) * barMaxH;
                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5 justify-end h-full">
                      {/* Income bar (top) */}
                      {d.income > 0 && (
                        <div
                          className="w-full rounded-t-sm bg-amber-400 transition-all duration-300"
                          style={{ height: `${Math.max(incomeH, 2)}px` }}
                          title={`Pemasukan ${getMonthName(d.month)}: ${formatRupiah(d.income)}`}
                        />
                      )}
                      {/* Expense bar (bottom negative space) */}
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
              {/* Legend */}
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
                    const pct = annualSummary.totalExpense > 0
                      ? (cat.total / annualSummary.totalExpense) * 100 : 0;
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

            {/* Monthly Breakdown Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-800">Rincian Bulanan</h3>
              </div>
              {/* Table header */}
              <div className="grid grid-cols-[70px_1fr_1fr_80px] gap-0 border-b border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                <div className="px-2.5 py-1.5 border-r border-gray-200">Bulan</div>
                <div className="px-2.5 py-1.5 border-r border-gray-200 text-right">Pemasukan</div>
                <div className="px-2.5 py-1.5 border-r border-gray-200 text-right">Pengeluaran</div>
                <div className="px-2.5 py-1.5 text-right">Saldo</div>
              </div>
              {/* Table rows */}
              {monthlyData.map((d, i) => {
                const hasData = d.income > 0 || d.expense > 0;
                return (
                  <div
                    key={d.month}
                    className={`grid grid-cols-[70px_1fr_1fr_80px] gap-0 text-[11px] border-b border-gray-100 ${
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    } ${!hasData ? 'opacity-40' : ''}`}
                  >
                    <div className="px-2.5 py-2 border-r border-gray-100 text-gray-700 font-medium">
                      {getMonthName(d.month).slice(0, 3)}
                    </div>
                    <div className="px-2.5 py-2 border-r border-gray-100 text-right text-amber-700 tabular-nums font-medium">
                      {hasData ? formatRupiah(d.income) : '-'}
                    </div>
                    <div className="px-2.5 py-2 border-r border-gray-100 text-right text-red-700 tabular-nums font-medium">
                      {hasData ? formatRupiah(d.expense) : '-'}
                    </div>
                    <div className={`px-2.5 py-2 text-right tabular-nums font-semibold ${
                      d.balance >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {hasData ? formatRupiah(d.balance) : '-'}
                    </div>
                  </div>
                );
              })}
              {/* Table footer */}
              <div className="grid grid-cols-[70px_1fr_1fr_80px] gap-0 border-t border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-900">
                <div className="px-2.5 py-1.5 border-r border-gray-200 text-gray-500">Total</div>
                <div className="px-2.5 py-1.5 border-r border-gray-200 text-right tabular-nums text-amber-800">
                  {formatRupiah(annualSummary.totalIncome)}
                </div>
                <div className="px-2.5 py-1.5 border-r border-gray-200 text-right tabular-nums text-red-800">
                  {formatRupiah(annualSummary.totalExpense)}
                </div>
                <div className={`px-2.5 py-1.5 text-right tabular-nums ${
                  annualSummary.surplus >= 0 ? 'text-emerald-800' : 'text-red-800'
                }`}>
                  {formatRupiah(annualSummary.surplus)}
                </div>
              </div>
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
