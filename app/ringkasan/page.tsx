'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { computeMonthlySummary, getBudget, getExpenseByCategoryPeriod, deleteExpenseAndSync } from '@/lib/storage';
import { formatRupiah, getMonthName, prevMonth as prevMonthStr } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { Expense, getCategoryName, getCategoryColor } from '@/lib/types';
import { DetailPopup } from '@/components/DetailPopup';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function RingkasanPage() {
  const { refreshKey, refreshData } = useAppContext();
  const { synced, email: syncEmail } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [monthNum, setMonthNum] = useState(currentMonthNum);
  const month = `${year}-${String(monthNum).padStart(2, '0')}`;

  const [selectedTx, setSelectedTx] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const email = syncEmail || 'guest';

  const summary = useMemo(
    () => {
      if (!synced && email !== 'guest') return { month, income: 0, expense: 0, balance: 0, incomeByCategory: {}, expenseByCategory: {}, dailyBalance: {}, byAccount: { suami: { income: 0, expense: 0, balance: 0 }, istri: { income: 0, expense: 0, balance: 0 }, bersama: { income: 0, expense: 0, balance: 0 } }, targets: { saving: { target: 0, achieved: 0 }, liburan: { target: 0, achieved: 0 }, custom: [] } };
      return computeMonthlySummary(month, email);
    },
    [month, email, refreshKey, synced]
  );

  const prevMonth = prevMonthStr(month);
  const prevSummary = useMemo(
    () => {
      if (!synced && email !== 'guest') return { month, income: 0, expense: 0, balance: 0, incomeByCategory: {}, expenseByCategory: {}, dailyBalance: {}, byAccount: { suami: { income: 0, expense: 0, balance: 0 }, istri: { income: 0, expense: 0, balance: 0 }, bersama: { income: 0, expense: 0, balance: 0 } }, targets: { saving: { target: 0, achieved: 0 }, liburan: { target: 0, achieved: 0 }, custom: [] } };
      return computeMonthlySummary(prevMonth, email);
    },
    [prevMonth, email, refreshKey, synced]
  );

  const budget = getBudget(month);
  const savingProgress =
    budget && budget.target > 0
      ? Math.min((summary.expense / budget.target) * 100, 100)
      : 0;
  const isOverspent = savingProgress >= 100;
  const isWarning = savingProgress >= 80 && savingProgress < 100;

  // MoM
  const momChange = prevSummary.expense > 0
    ? ((summary.expense - prevSummary.expense) / prevSummary.expense) * 100
    : 0;

  // Category breakdown for this month
  const categoryData = useMemo(
    () => {
      if (!synced && email !== 'guest') return {};
      return getExpenseByCategoryPeriod(month);
    },
    [month, refreshKey, synced, email]
  );
  const topCategories = useMemo(() => {
    return Object.entries(categoryData)
      .map(([id, total]) => ({ id, total, name: getCategoryName(id), color: getCategoryColor(id) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [categoryData]);
  const totalExpense = summary.expense;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteExpenseAndSync(deleteTarget, email);
      refreshData();
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus transaksi dari cloud');
    }
  };

  const years = useMemo(() => {
    const y = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) y.push(i);
    return y;
  }, [currentYear]);

  if (!synced && email !== 'guest') {
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
      <PageHeader title="Rekap" subtitle={`${getMonthName(month)} ${year}`} />

      <div className="px-3 pt-3 pb-8 space-y-3">
        {/* Month & Year Filter */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Bulan</label>
            <select
              value={monthNum}
              onChange={(e) => setMonthNum(parseInt(e.target.value))}
              className="w-full h-9 rounded-lg border border-gray-200 text-xs font-medium text-gray-900 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{getMonthName(`2024-${String(m).padStart(2, '0')}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full h-9 rounded-lg border border-gray-200 text-xs font-medium text-gray-900 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Compact Summary Grid */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <ArrowUpRight className="w-3 h-3 text-amber-500" />
                <p className="text-[9px] font-medium text-amber-600">Pemasukan</p>
              </div>
              <p className="text-sm font-bold text-amber-900 tabular-nums">
                {formatRupiah(summary.income)}
              </p>
            </div>
            <div className="text-center border-x border-gray-100">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <ArrowDownRight className="w-3 h-3 text-red-500" />
                <p className="text-[9px] font-medium text-red-600">Pengeluaran</p>
              </div>
              <p className="text-sm font-bold text-red-900 tabular-nums">
                {formatRupiah(summary.expense)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Wallet className={`w-3 h-3 ${summary.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                <p className={`text-[9px] font-medium ${summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Saldo
                </p>
              </div>
              <p className={`text-sm font-bold tabular-nums ${summary.balance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {formatRupiah(summary.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Compact MoM Comparison */}
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${momChange > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <TrendingUp className={`w-3.5 h-3.5 ${momChange > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">vs Bulan Lalu</p>
              <p className="text-[10px] text-gray-400">{getMonthName(prevMonth)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold tabular-nums ${momChange > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {momChange > 0 ? '+' : ''}{momChange.toFixed(1)}%
            </p>
            <p className={`text-[10px] ${momChange > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {momChange > 0 ? 'Naik' : 'Turun'}
            </p>
          </div>
        </div>

        {/* Compact Budget vs Actual */}
        {budget && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-800">Budget</span>
              <span className="text-[10px] font-medium text-gray-500 tabular-nums">{formatRupiah(budget.target)}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverspent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(savingProgress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">
                Terpakai <span className="font-semibold text-gray-700">{formatRupiah(totalExpense)}</span>
              </span>
              <span className="text-[10px] tabular-nums text-gray-400">{savingProgress.toFixed(0)}%</span>
            </div>
            {isOverspent && (
              <p className="text-[10px] font-semibold text-red-600">Overspent {formatRupiah(Math.abs(budget.target - totalExpense))}</p>
            )}
            {isWarning && !isOverspent && (
              <p className="text-[10px] text-amber-600 font-medium">Sisa {formatRupiah(budget.target - totalExpense)}</p>
            )}
          </div>
        )}

        {/* Compact Top Categories */}
        {topCategories.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <h3 className="text-xs font-semibold text-gray-800">Kategori Teratas</h3>
            <div className="space-y-2">
              {topCategories.map((cat, idx) => {
                const pct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-medium text-gray-400 w-3">{idx + 1}</span>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-[11px] font-medium text-gray-700">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-gray-900 tabular-nums">{formatRupiah(cat.total)}</span>
                        <span className="text-[9px] text-gray-400 ml-1 tabular-nums">({pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Delete Error Banner */}
      {deleteError && (
        <div className="mx-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-[11px] flex items-center justify-between">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="font-bold ml-2">OK</button>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Transaksi?"
        message="Data yang sudah dihapus tidak dapat dikembalikan."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Detail Bottom Sheet */}
      <DetailPopup
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onDelete={(id) => setDeleteTarget(id)}
      />
    </>
  );
}
