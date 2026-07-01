'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  Wallet,
  Target,
  User,
  Users,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Wallet as WalletIcon,
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
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm mb-4">
          <WalletIcon className="w-6 h-6 text-white" />
        </div>
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-700">Memuat data...</p>
        <p className="text-xs text-gray-400 mt-1">Menyinkronkan dari cloud</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Rekap" subtitle={`${getMonthName(month)} ${year}`} />

      <div className="px-4 pt-5 pb-8 space-y-5">
        {/* Month & Year Filter */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">Bulan</label>
            <select
              value={monthNum}
              onChange={(e) => setMonthNum(parseInt(e.target.value))}
              className="w-full h-11 rounded-2xl border border-gray-200 text-sm font-medium text-gray-900 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{getMonthName(`2024-${String(m).padStart(2, '0')}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full h-11 rounded-2xl border border-gray-200 text-sm font-medium text-gray-900 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[10px] font-medium text-amber-600">Pemasukan</p>
              </div>
              <p className="text-base font-bold text-amber-900 tabular-nums">
                {formatRupiah(summary.income)}
              </p>
            </div>
            <div className="text-center border-x border-gray-100">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                <p className="text-[10px] font-medium text-red-600">Pengeluaran</p>
              </div>
              <p className="text-base font-bold text-red-900 tabular-nums">
                {formatRupiah(summary.expense)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wallet className={`w-3.5 h-3.5 ${summary.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                <p className={`text-[10px] font-medium ${summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Saldo
                </p>
              </div>
              <p className={`text-base font-bold tabular-nums ${summary.balance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {formatRupiah(summary.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* MoM Comparison */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${momChange > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <TrendingUp className={`w-4 h-4 ${momChange > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">vs Bulan Lalu</p>
                <p className="text-[11px] text-gray-400">{getMonthName(prevMonth)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-base font-bold tabular-nums ${momChange > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {momChange > 0 ? '+' : ''}{momChange.toFixed(1)}%
              </p>
              <p className={`text-[11px] ${momChange > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {momChange > 0 ? 'Naik' : 'Turun'}
              </p>
            </div>
          </div>
        </div>

        {/* Budget vs Actual */}
        {budget && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-gray-800">Budget</span>
              </div>
              <span className="text-xs font-medium text-gray-500 tabular-nums">{formatRupiah(budget.target)}</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverspent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(savingProgress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Terpakai <span className="font-semibold text-gray-700">{formatRupiah(totalExpense)}</span>
              </span>
              <span className="text-xs tabular-nums text-gray-400">{savingProgress.toFixed(0)}%</span>
            </div>
            {isOverspent && (
              <p className="text-xs font-semibold text-red-600">Overspent {formatRupiah(Math.abs(budget.target - totalExpense))}</p>
            )}
            {isWarning && !isOverspent && (
              <p className="text-xs text-amber-600 font-medium">Sisa {formatRupiah(budget.target - totalExpense)}</p>
            )}
          </div>
        )}

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Kategori Teratas</h3>
            <div className="space-y-2.5">
              {topCategories.map((cat, idx) => {
                const pct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-gray-400 w-4">{idx + 1}</span>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-900 tabular-nums">{formatRupiah(cat.total)}</span>
                        <span className="text-[10px] text-gray-400 ml-1 tabular-nums">({pct.toFixed(0)}%)</span>
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

        {/* By Account */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Per Rekening</h3>
          <div className="space-y-2">
            {[
              { key: 'suami' as const, label: 'Suami', icon: User, color: '#3B82F6' },
              { key: 'istri' as const, label: 'Istri', icon: Heart, color: '#EC4899' },
              { key: 'bersama' as const, label: 'Bersama', icon: Users, color: '#10B981' },
            ].map(({ key, label, icon: Icon, color }) => {
              const data = summary.byAccount[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '15' }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">{label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-amber-600 font-medium tabular-nums">+{formatRupiah(data.income)}</span>
                      <span className="text-[10px] text-red-500 font-medium tabular-nums">-{formatRupiah(data.expense)}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${data.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatRupiah(data.balance)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Delete Error Banner */}
      {deleteError && (
        <div className="mx-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
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


