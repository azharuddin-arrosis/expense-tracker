'use client';

import { useMemo, useState } from 'react';
import { Search, Trash2, Pencil, ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getTransactionsByMonth, deleteExpenseAndSync } from '@/lib/storage';
import { formatRupiah, formatDate, getMonthName, prevMonth, nextMonth, getCurrentMonthString } from '@/lib/format';
import { CATEGORIES, getCategoryColor, getCategoryName, INCOME_CATEGORIES } from '@/lib/types';
import { getStoredEmail } from '@/lib/cloud';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function RiwayatPage() {
  const { refreshKey, refreshData, setShowAddExpense, setEditTarget } = useAppContext();
  const [month, setMonth] = useState(getCurrentMonthString);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const allExpenses = useMemo(
    () => getTransactionsByMonth(month),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, refreshKey]
  );

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
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allExpenses, search, filterCat]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    const email = getStoredEmail();
    deleteExpenseAndSync(deleteTarget, email);
    refreshData();
    setDeleteTarget(null);
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

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900">Riwayat</h1>

      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <button
          onClick={() => setMonth(prevMonth(month))}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-base font-semibold text-gray-800">
          {getMonthName(month)}
        </h2>
        <button
          onClick={() => setMonth(nextMonth(month))}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pengeluaran..."
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setFilterCat(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
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
              <CategoryIcon categoryId={cat.id} className="w-3 h-3" />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Total filtered */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
          <span className="text-sm text-gray-600">
            {filtered.length} transaksi
          </span>
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {formatRupiah(totalFiltered)}
          </span>
        </div>
      )}

      {/* Expense list grouped by date */}
      {grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                {formatDate(date)}
              </h3>
              <div className="space-y-1">
                {items.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 active:bg-gray-50 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: exp.flow === 'in'
                            ? '#F59E0B20'
                            : getCategoryColor(exp.category) + '20',
                        }}
                      >
                        <CategoryIcon
                          categoryId={exp.category}
                          className="w-4 h-4"
                          style={{
                            color: exp.flow === 'in' ? '#F59E0B' : getCategoryColor(exp.category),
                          }}
                        />
                      </div>
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                        exp.flow === 'in' ? 'bg-amber-500' : 'bg-red-400'
                      }`}>
                        {exp.flow === 'in'
                          ? <TrendingUp className="w-2.5 h-2.5 text-white" />
                          : <TrendingDown className="w-2.5 h-2.5 text-white" />
                        }
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {exp.description || getCategoryName(exp.category)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getCategoryName(exp.category)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-sm font-semibold tabular-nums ${
                        exp.flow === 'in' ? 'text-amber-600' : 'text-gray-900'
                      }`}>
                        {exp.flow === 'in' ? '+' : '-'}{formatRupiah(exp.amount)}
                      </span>
                      <button
                        onClick={() => {
                          setEditTarget(exp);
                          setShowAddExpense(true);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 active:bg-blue-50 active:text-blue-500 transition-colors"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(exp.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 active:bg-red-50 active:text-red-500 transition-colors"
                        aria-label="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
    </div>
  );
}
