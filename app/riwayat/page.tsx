'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Search, Loader2, Wallet, Calendar, ChevronDown } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getTransactionsByPeriod, getTransactionsByDateRange, deleteExpenseAndSync } from '@/lib/storage';
import { formatRupiah, formatDate, getMonthName, getCurrentMonthString } from '@/lib/format';
import { CATEGORIES, getCategoryColor, getCategoryName, Expense } from '@/lib/types';
import { useSyncOnMount } from '@/lib/use-sync';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DateFilter } from '@/components/DateFilter';
import { DetailPopup } from '@/components/DetailPopup';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';

export default function RiwayatPage() {
  const { refreshKey, refreshData } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);
  const [month, setMonth] = useState(getCurrentMonthString);
  const [filterMode, setFilterMode] = useState<'month' | 'week' | 'range'>('month');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<Expense | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(10);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const allExpenses = useMemo(() => {
    if (!synced && email) return [];
    if (filterMode === 'month' || !dateRange) {
      return getTransactionsByPeriod(month);
    }
    return getTransactionsByDateRange(dateRange.start, dateRange.end);
  }, [month, filterMode, dateRange, refreshKey, synced, email]);

  const filtered = useMemo(() => {
    let result = allExpenses;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          getCategoryName(e.category).toLowerCase().includes(q)
      );
    }
    if (filterCat) {
      result = result.filter((e) => e.category === filterCat);
    }
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allExpenses, search, filterCat]);

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

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const exp of filtered) {
      if (!groups[exp.date]) groups[exp.date] = [];
      groups[exp.date].push(exp);
    }
    return Object.entries(groups).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [filtered]);

  const displayed = useMemo(() => grouped.slice(0, displayLimit), [grouped, displayLimit]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (displayLimit >= grouped.length) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDisplayLimit((prev) => Math.min(prev + 10, grouped.length));
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [displayLimit, grouped.length]);

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
      <PageHeader title="Riwayat" />

      <div className="px-3 pt-3 pb-8 space-y-3">
      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-[11px] flex items-center justify-between">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="font-bold ml-2">OK</button>
        </div>
      )}

      {/* Date Filter */}
      <DateFilter
        month={month}
        onMonthChange={setMonth}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
      />

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pengeluaran..."
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setFilterCat(null)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
              filterCat === null
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            Semua
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(filterCat === cat.id ? null : cat.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors flex items-center gap-1 ${
                filterCat === cat.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
              style={
                filterCat === cat.id
                  ? { backgroundColor: cat.color }
                  : undefined
              }
            >
              <CategoryIcon categoryId={cat.id} className="w-2.5 h-2.5" />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Total filtered */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
          <span className="text-[11px] text-gray-600">
            {filtered.length} transaksi
          </span>
          <span className="text-xs font-semibold text-gray-900 tabular-nums">
            {formatRupiah(totalFiltered)}
          </span>
        </div>
      )}

      {/* Expense list grouped by date - compact table style */}
      {grouped.length > 0 ? (
        <div className="space-y-3">
          {displayed.map(([date, items]) => (
            <div key={date}>
              <h3 className="text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                {formatDate(date)}
              </h3>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-2 gap-0 border-b border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="px-2.5 py-1.5 border-r border-gray-200">Keterangan</div>
                  <div className="px-2.5 py-1.5 text-right">Nominal</div>
                </div>
                {/* Table Rows */}
                {items.map((exp, i) => (
                  <div
                    key={exp.id}
                    onClick={() => setDetailTarget(exp)}
                    className={`grid grid-cols-2 gap-0 text-[11px] border-b border-gray-100 cursor-pointer ${
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <div className="px-2.5 py-2 border-r border-gray-100 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: exp.flow === 'in' ? '#F59E0B' : getCategoryColor(exp.category) }}
                        />
                        <span className={`text-gray-900 truncate font-medium ${
                          exp.flow === 'in' ? 'text-amber-700' : ''
                        }`}>
                          {exp.description || getCategoryName(exp.category)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {getCategoryName(exp.category)}
                      </p>
                    </div>
                    <div className={`px-2.5 py-2 text-right font-semibold tabular-nums ${
                      exp.flow === 'in' ? 'text-amber-600' : 'text-gray-900'
                    }`}>
                      {exp.flow === 'in' ? '+' : '-'}{formatRupiah(exp.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Load More Sentinel */}
          {displayed.length < grouped.length && (
            <>
              {/* Invisible sentinel for IntersectionObserver */}
              <div ref={sentinelRef} className="h-4" />
              {/* Fallback button */}
              <button
                onClick={() => setDisplayLimit((prev) => Math.min(prev + 10, grouped.length))}
                className="w-full h-8 rounded-lg border border-gray-200 text-gray-500 font-medium text-[10px] flex items-center justify-center gap-1.5 active:bg-gray-50 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Tampilkan {Math.min(10, grouped.length - displayed.length)} lagi ({grouped.length - displayed.length} tersisa)
              </button>
            </>
          )}
        </div>
      ) : (
        <EmptyState
          title={allExpenses.length === 0 ? 'Belum ada transaksi' : 'Tidak ditemukan'}
          description={
            allExpenses.length === 0
              ? `Belum ada catatan untuk ${getMonthName(month)}.`
              : 'Tidak ada transaksi yang cocok dengan pencarian atau filter.'
          }
        />
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
        transaction={detailTarget}
        onClose={() => setDetailTarget(null)}
        onDelete={(id) => setDeleteTarget(id)}
      />
    </div>
    </>
  );
}
