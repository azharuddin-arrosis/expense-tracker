'use client';

import { useState, useEffect } from 'react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '@/lib/types';
import { addExpenseAndSync, updateExpenseAndSync, getAutoSisih, addContribution, syncAllToCloud } from '@/lib/storage';
import { useAppContext } from '@/lib/context';
import { getTodayString } from '@/lib/format';
import { getStoredEmail } from '@/lib/cloud';
import { BottomSheet } from './BottomSheet';
import { SearchableSelect } from './SearchableSelect';
import { DatePicker } from './DatePicker';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface ExpenseFormProps {
  onSuccess: () => void;
}

export function ExpenseForm({ onSuccess }: ExpenseFormProps) {
  const { showAddExpense, setShowAddExpense, editTarget, setEditTarget, refreshData } = useAppContext();
  const isEditing = editTarget !== null;
  const [flow, setFlow] = useState<'in' | 'out'>(editTarget?.flow || 'out');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = flow === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (editTarget) {
      setFlow(editTarget.flow);
      setAmount(formatRupiahInput(editTarget.amount));
      setCategory(editTarget.category);
      setDate(editTarget.date);
      setDescription(editTarget.description);
    }
  }, [editTarget]);

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
    setEditTarget(null);
    resetForm();
  };

  const handleTabChange = (newFlow: 'in' | 'out') => {
    if (isEditing) return;
    resetForm(newFlow);
  };

  const formatRupiahInput = (num: number): string => {
    return new Intl.NumberFormat('id-ID').format(num);
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

      if (isEditing && editTarget) {
        updateExpenseAndSync(
          editTarget.id,
          { amount: amountNum, category, description: description.trim(), date, flow },
          email
        );
      } else {
        const tx = addExpenseAndSync(
          { amount: amountNum, category, description: description.trim(), date, flow },
          email
        );

        // Auto-sisih: if income and auto-sisih enabled, create contribution
        if (flow === 'in') {
          const auto = getAutoSisih();
          if (auto.enabled && auto.goalId) {
            const sisihAmount = Math.round(amountNum * auto.persen / 100);
            if (sisihAmount > 0) {
              addContribution(auto.goalId, sisihAmount, `Auto-sisih ${auto.persen}% dari ${tx.description || 'pemasukan'}`);
            }
          }
        }
      }

      if (email) syncAllToCloud(email).catch(() => {});
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

  return (
    <BottomSheet
      open={showAddExpense}
      onClose={handleClose}
      title={isEditing ? 'Edit Transaksi' : flow === 'in' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'}
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Flow Toggle (compact) */}
        <div className={`flex bg-gray-100 rounded-lg p-0.5 ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
          <button
            type="button"
            onClick={() => handleTabChange('out')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-all ${
              flow === 'out'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('in')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition-all ${
              flow === 'in'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Pemasukan
          </button>
        </div>

        {/* Amount (compact) */}
        <div>
          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
            Jumlah (Rp)
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className={`w-full h-8 pl-7 pr-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent ${
                flow === 'in'
                  ? 'focus:ring-amber-500'
                  : 'focus:ring-emerald-500'
              }`}
            />
          </div>
          {errors.amount && (
            <p className="text-red-500 text-[10px] mt-0.5">{errors.amount}</p>
          )}
        </div>

        {/* Category (searchable select) */}
        <div>
          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
            Kategori
          </label>
          <SearchableSelect
            options={categories}
            value={category}
            onChange={setCategory}
            placeholder="Pilih kategori..."
            flow={flow}
          />
          {errors.category && (
            <p className="text-red-500 text-[10px] mt-0.5">{errors.category}</p>
          )}
        </div>

        {/* Date (compact custom picker) */}
        <div>
          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
            Tanggal
          </label>
          <DatePicker value={date} onChange={setDate} flow={flow} />
        </div>

        {/* Description (compact) */}
        <div>
          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
            Deskripsi <span className="text-gray-400">(opsional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={flow === 'in' ? 'Mis: Gaji bulanan, Bonus, dll' : 'Mis: Nasi goreng, Bensin, dll'}
            maxLength={100}
            className={`w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${
              flow === 'in'
                ? 'focus:ring-amber-500'
                : 'focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Submit (compact) */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full h-8 rounded-lg text-white font-semibold text-xs flex items-center justify-center disabled:opacity-50 transition-colors ${
            flow === 'in'
              ? 'bg-amber-500 active:bg-amber-600'
              : 'bg-emerald-500 active:bg-emerald-600'
          }`}
        >
          {isSubmitting ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            isEditing ? 'Simpan Perubahan' : flow === 'in' ? 'Simpan Pemasukan' : 'Simpan'
          )}
        </button>
      </form>
    </BottomSheet>
  );
}
