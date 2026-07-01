'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  List,
  FileText,
  PieChart,
  SlidersHorizontal,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getExpenses,
  getTransactionsByDateRange,
  getExpenseByPeriod,
  getIncomeByPeriod,
  getPeriodSettings,
  getExpensesWithSync,
  deleteExpenseAndSync,
} from '@/lib/storage';
import {
  formatRupiah,
  getMonthName,
} from '@/lib/format';
import { DateFilter } from '@/components/DateFilter';
import { Expense, getPeriodDateRange } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { DetailPopup } from '@/components/DetailPopup';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getStoredEmail } from '@/lib/cloud';

export default function DashboardPage() {
  const router = useRouter();
  const { refreshKey, refreshData } = useAppContext();
  const [synced, setSynced] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'local'>('checking');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterMode, setFilterMode] = useState<'month' | 'week' | 'range'>('month');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [detailTarget, setDetailTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const email = getStoredEmail();

  useEffect(() => {
    if (!email) {
      setCloudStatus('local');
      setSynced(true);
      return;
    }
    let cancelled = false;
    const syncFirst = async () => {
      try {
        await getExpensesWithSync(email);
        if (!cancelled) setCloudStatus('connected');
      } catch {
        if (!cancelled) setCloudStatus('local');
      }
      if (!cancelled) setSynced(true);
    };
    syncFirst();
    return () => { cancelled = true; };
  }, [email, refreshKey]);

  const expenses = useMemo(() => {
    if (filterMode === 'month' || !dateRange) return getExpenseByPeriod(month);
    return getTransactionsByDateRange(dateRange.start, dateRange.end).filter((e) => e.flow === 'out');
  }, [month, filterMode, dateRange, refreshKey]);

  const incomes = useMemo(() => {
    if (!synced && email) return [];
    if (filterMode === 'month' || !dateRange) return getIncomeByPeriod(month);
    return getTransactionsByDateRange(dateRange.start, dateRange.end).filter((e) => e.flow === 'in');
  }, [month, filterMode, dateRange, refreshKey, synced, email]);

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = incomes.reduce((sum, e) => sum + e.amount, 0);
  const balance = useMemo(() => {
    if (filterMode !== 'month') return totalIncome - totalExpense;
    const settings = getPeriodSettings();
    const { end } = getPeriodDateRange(month, settings);
    return getExpenses()
      .filter((e) => e.date <= end)
      .reduce((s, e) => s + (e.flow === 'in' ? e.amount : -e.amount), 0);
  }, [month, filterMode, totalIncome, totalExpense, refreshKey]);

  const hasAny = expenses.length > 0 || incomes.length > 0;

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
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4">
        <div className="h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Duit</h1>
          </div>
          <div className="flex items-center gap-2">
            {cloudStatus === 'checking' ? (
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
            ) : cloudStatus === 'connected' ? (
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-gray-400" />
            )}
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-6 space-y-4">

      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-medium text-emerald-100 tracking-wide uppercase">
            Saldo Bersih
          </p>
          <Wallet className="w-3.5 h-3.5 text-emerald-200" />
        </div>
        <p className="text-3xl font-bold tracking-tight tabular-nums mb-4">
          {formatRupiah(balance)}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
              <ArrowUpRight className="w-3 h-3 text-emerald-200" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-200">Pemasukan</p>
              <p className="text-xs font-semibold text-white tabular-nums">
                {formatRupiah(totalIncome)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
              <ArrowDownRight className="w-3 h-3 text-emerald-200" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-200">Pengeluaran</p>
              <p className="text-xs font-semibold text-white tabular-nums">
                {formatRupiah(totalExpense)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Riwayat', icon: List, path: '/riwayat', color: '#6366F1', bg: '#EEF2FF' },
          { label: 'Rekap', icon: FileText, path: '/ringkasan', color: '#10B981', bg: '#ECFDF5' },
          { label: 'Statistik', icon: PieChart, path: '/statistik', color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Pengaturan', icon: SlidersHorizontal, path: '/setting', color: '#EF4444', bg: '#FEF2F2' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div
                className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: item.bg }}
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <span className="text-[11px] font-medium text-gray-600">{item.label}</span>
            </button>
          );
        })}
      </div>

      <DateFilter
        month={month}
        onMonthChange={setMonth}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
      />
      {!hasAny && (
        <EmptyState
          title="Belum ada transaksi"
          description={`Belum ada catatan untuk ${getMonthName(month)}. Tambahkan transaksi pertama!`}
        />
      )}

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

      <DetailPopup
        transaction={detailTarget}
        onClose={() => setDetailTarget(null)}
        onDelete={(id) => setDeleteTarget(id)}
      />
    </div>
    </>
  );
}
