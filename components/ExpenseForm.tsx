'use client';

import { useState } from 'react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategoryColor,
} from '@/lib/types';
import { addExpenseAndSync } from '@/lib/storage';
import { useAppContext } from '@/lib/context';
import { getTodayString } from '@/lib/format';
import { getStoredEmail } from '@/lib/cloud';
import { CategoryIcon } from './CategoryIcon';
import { BottomSheet } from './BottomSheet';
import { Check, TrendingDown, TrendingUp } from 'lucide-react';

interface ExpenseFormProps {
  onSuccess: () => void;
}

export function ExpenseForm({ onSuccess }: ExpenseFormProps) {
  const { showAddExpense, setShowAddExpense, addFlow, refreshData } = useAppContext();
  const [flow, setFlow] = useState<'in' | 'out'>(addFlow);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = flow === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const resetForm = (newFlow?: 'in' | 'out') => {
    setAmount('');
    setCategory('');
    setDate(getTodayString());
    setDescription('');
    setErrors({});
    if (newFlow) setFlow(newFlow);
  };

  const handleClose = () => {
    setShowAddExpense(false);
    resetForm();
  };

  const handleTabChange = (newFlow: 'in' | 'out') => {
    resetForm(newFlow);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    const amountNum = parseFloat(amount.replace(/[^0-9]/g, ''));

    if (!amountNum || amountNum <= 0) {
      newErrors.amount = 'Jumlah harus lebih dari 0';
    }
    if (!category) {
      newErrors.category = 'Pilih kategori';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const email = getStoredEmail();
      addExpenseAndSync(
        {
          amount: amountNum,
          category,
          description: description.trim(),
          date,
          flow,
        },
        email
      );
      refreshData();
      handleClose();
      onSuccess();
    } catch {
      setErrors({ amount: 'Gagal menyimpan data' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setAmount('');
      return;
    }
    const num = parseInt(raw);
    setAmount(formatRupiahInput(num));
  };

  const formatRupiahInput = (num: number): string => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <BottomSheet
      open={showAddExpense}
      onClose={handleClose}
      title={flow === 'in' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Flow Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => handleTabChange('out')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              flow === 'out'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('in')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              flow === 'in'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Pemasukan
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Jumlah (Rp)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className={`w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent ${
                flow === 'in'
                  ? 'focus:ring-amber-500'
                  : 'focus:ring-emerald-500'
              }`}
            />
          </div>
          {errors.amount && (
            <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Kategori
          </label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border-2 transition-all ${
                    isSelected
                      ? flow === 'in'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-100 bg-gray-50 active:bg-gray-100'
                  }`}
                  aria-label={cat.name}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cat.color + '20' }}
                  >
                    <CategoryIcon
                      categoryId={cat.id}
                      className="w-4 h-4"
                      style={{ color: cat.color }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-600 text-center leading-tight">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.category && (
            <p className="text-red-500 text-xs mt-1">{errors.category}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tanggal
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent ${
              flow === 'in'
                ? 'focus:ring-amber-500'
                : 'focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Deskripsi <span className="text-gray-400">(opsional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={flow === 'in' ? 'Mis: Gaji bulanan, Bonus, dll' : 'Mis: Nasi goreng, Bensin, dll'}
            maxLength={100}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full h-12 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${
            flow === 'in'
              ? 'bg-amber-500 active:bg-amber-600'
              : 'bg-emerald-500 active:bg-emerald-600'
          }`}
        >
          {isSubmitting ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              {flow === 'in' ? 'Simpan Pemasukan' : 'Simpan'}
            </>
          )}
        </button>
      </form>
    </BottomSheet>
  );
}
