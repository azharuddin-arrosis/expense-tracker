'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  List,
  FileText,
  PieChart,
  SlidersHorizontal,
  Lightbulb,
  Target,
  User,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Loader2,
  Calendar,
  TrendingUp,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getExpenses,
  getTransactionsByDateRange,
  getExpenseByPeriod,
  getIncomeByPeriod,
  getExpenseByCategoryPeriod,
  getPeriodSettings,
  getExpensesWithSync,
  deleteExpenseAndSync,
} from '@/lib/storage';
import {
  formatRupiah,
  formatDate,
  getMonthName,
} from '@/lib/format';
import { DateFilter } from '@/components/DateFilter';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Expense, getPeriodDateRange, getCategoryName, getCategoryColor } from '@/lib/types';
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

  const totalExpense = expenses.filter((e) => e.category !== 'tabungan').reduce((sum, e) => sum + e.amount, 0);
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

  const recentExpenses = useMemo(() =>
    [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 2),
    [expenses]
  );

  const topCategories = useMemo(() => {
    const catData = getExpenseByCategoryPeriod(month);
    return Object.entries(catData)
      .map(([id, total]) => ({ id, total, name: getCategoryName(id), color: getCategoryColor(id) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [month, refreshKey]);

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
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-3">
        <div className="h-11 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-base font-bold text-gray-900">Duit</h1>
          </div>
          <div className="flex items-center gap-2">
            {cloudStatus === 'checking' ? (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
            ) : cloudStatus === 'connected' ? (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            )}
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pt-3 pb-8 space-y-3">

        {/* Compact Hero Card */}
        <div className="rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 p-3 text-white border border-emerald-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-emerald-100 tracking-wide uppercase">
              Saldo Bersih
            </p>
            <Wallet className="w-3 h-3 text-emerald-200" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums mb-3">
            {formatRupiah(balance)}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3 h-3 text-emerald-200" />
              <div>
                <p className="text-[9px] text-emerald-200">Pemasukan</p>
                <p className="text-[11px] font-semibold text-white tabular-nums">
                  {formatRupiah(totalIncome)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowDownRight className="w-3 h-3 text-emerald-200" />
              <div>
                <p className="text-[9px] text-emerald-200">Pengeluaran</p>
                <p className="text-[11px] font-semibold text-white tabular-nums">
                  {formatRupiah(totalExpense)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Nav Grid — 3×3 */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Riwayat', icon: List, path: '/riwayat', color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Buku Kas', icon: Lightbulb, path: '/wawasan', color: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'Rekap', icon: FileText, path: '/ringkasan', color: '#10B981', bg: '#ECFDF5' },
            { label: 'Statistik', icon: PieChart, path: '/statistik', color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Tabungan', icon: Target, path: '/tabungan', color: '#06B6D4', bg: '#ECFEFF' },
            { label: 'Investasi', icon: TrendingUp, path: '/investasi', color: '#10B981', bg: '#ECFDF5' },
            { label: 'Hutang', icon: DollarSign, path: '/hutang', color: '#EF4444', bg: '#FEF2F2' },
            { label: 'Laporan', icon: BarChart3, path: '/laporan', color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Pengaturan', icon: SlidersHorizontal, path: '/setting', color: '#EF4444', bg: '#FEF2F2' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform p-2 rounded-lg border border-gray-100 bg-white"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: item.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <span className="text-[10px] font-medium text-gray-600">{item.label}</span>
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

        {hasAny && topCategories.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-800">Kategori Teratas</h3>
              <button onClick={() => router.push('/statistik')} className="text-[10px] font-medium text-emerald-600 flex items-center gap-0.5">
                Detail <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {topCategories.map((cat) => {
                const pct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-[11px] font-medium text-gray-800 truncate">{cat.name}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-gray-900 tabular-nums flex-shrink-0 ml-2">{formatRupiah(cat.total)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ backgroundColor: cat.color, width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 tabular-nums w-7 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {recentExpenses.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-semibold text-gray-800">Pengeluaran Terakhir</h3>
              <button onClick={() => router.push('/riwayat')} className="text-[10px] font-medium text-emerald-600 flex items-center gap-0.5">
                Semua <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_80px] gap-0 border-b border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                <div className="px-2.5 py-1.5 border-r border-gray-200">Keterangan</div>
                <div className="px-2.5 py-1.5 text-right">Nominal</div>
              </div>
              {recentExpenses.map((exp, i) => (
                <div
                  key={exp.id}
                  onClick={() => setDetailTarget(exp)}
                  className={`grid grid-cols-[1fr_80px] gap-0 text-[11px] border-b border-gray-100 cursor-pointer ${
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  } ${i === 0 ? '' : ''}`}
                >
                  <div className="px-2.5 py-2 border-r border-gray-100 min-w-0">
                    <p className="text-gray-900 truncate font-medium">{exp.description || getCategoryName(exp.category)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatDate(exp.date)}
                    </p>
                  </div>
                  <div className="px-2.5 py-2 text-right font-semibold text-gray-900 tabular-nums">
                    {formatRupiah(exp.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasAny && (
          <EmptyState
            title="Belum ada transaksi"
            description={`Belum ada catatan untuk ${getMonthName(month)}. Tambahkan transaksi pertama!`}
          />
        )}

        {/* Delete Error Banner */}
        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-[11px] flex items-center justify-between">
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
