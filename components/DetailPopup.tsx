'use client';

import { X, TrendingUp, TrendingDown, Calendar, Tag, FileText, Pencil, Trash2 } from 'lucide-react';
import { Expense } from '@/lib/types';
import { formatRupiah, formatDateFull } from '@/lib/format';
import { getCategoryColor, getCategoryName } from '@/lib/types';
import { CategoryIcon } from './CategoryIcon';
import { useAppContext } from '@/lib/context';

interface DetailPopupProps {
  transaction: Expense | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function DetailPopup({ transaction, onClose, onDelete }: DetailPopupProps) {
  const { setEditTarget, setShowAddExpense } = useAppContext();

  if (!transaction) return null;

  const handleEdit = () => {
    setEditTarget(transaction);
    setShowAddExpense(true);
    onClose();
  };

  const handleDelete = () => {
    onDelete(transaction.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="relative w-full max-w-[480px] bg-white rounded-t-2xl shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto pb-safe">
        {/* Drag handle indicator */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white rounded-t-2xl">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className={`mx-4 px-5 py-4 rounded-xl ${
          transaction.flow === 'in' ? 'bg-amber-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: transaction.flow === 'in'
                    ? '#F59E0B20'
                    : getCategoryColor(transaction.category) + '20',
                }}
              >
                <CategoryIcon
                  categoryId={transaction.category}
                  className="w-6 h-6"
                  style={{
                    color: transaction.flow === 'in' ? '#F59E0B' : getCategoryColor(transaction.category),
                  }}
                />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {transaction.flow === 'in' ? 'Pemasukan' : 'Pengeluaran'}
                </p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">
                  {transaction.flow === 'in' ? '+' : '-'}{formatRupiah(transaction.amount)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/5 active:bg-black/10 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Detail Rows */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Tag className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Kategori</p>
              <p className="text-sm font-medium text-gray-900">{getCategoryName(transaction.category)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Tanggal</p>
              <p className="text-sm font-medium text-gray-900">{formatDateFull(transaction.date)}</p>
            </div>
          </div>

          {transaction.description && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Deskripsi</p>
                <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              {transaction.flow === 'in'
                ? <TrendingUp className="w-4 h-4 text-amber-500" />
                : <TrendingDown className="w-4 h-4 text-red-500" />
              }
            </div>
            <div>
              <p className="text-xs text-gray-400">Tipe</p>
              <p className={`text-sm font-medium ${
                transaction.flow === 'in' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {transaction.flow === 'in' ? 'Pemasukan' : 'Pengeluaran'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 pb-6 space-y-2">
          <button
            onClick={handleEdit}
            className="w-full h-11 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Transaksi
          </button>
          <button
            onClick={handleDelete}
            className="w-full h-11 rounded-xl bg-red-50 text-red-600 font-semibold text-sm active:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Hapus Transaksi
          </button>
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm active:bg-gray-200 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
