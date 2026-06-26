'use client';

import { useState } from 'react';
import { Target, Check, Edit2, X } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getBudget, saveBudgetAndSync } from '@/lib/storage';
import { formatRupiah, getTodayString } from '@/lib/format';
import { getStoredEmail } from '@/lib/cloud';

interface BudgetCardProps {
  className?: string;
}

export function BudgetCard({ className = '' }: BudgetCardProps) {
  const { refreshKey, currentMonth, refreshData } = useAppContext();
  const email = getStoredEmail();
  
  // Get current month for budget
  const month = currentMonth || getTodayString().slice(0, 7);
  
  const budget = getBudget(month);
  const [isEditing, setIsEditing] = useState(false);
  const [targetInput, setTargetInput] = useState(budget ? formatTargetInput(budget.target) : '');
  const [saved, setSaved] = useState(false);

  function formatTargetInput(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
  }

  const handleSave = () => {
    const raw = targetInput.replace(/[^0-9]/g, '');
    const num = parseInt(raw);
    if (!num || num <= 0) {
      setIsEditing(false);
      setTargetInput(budget ? formatTargetInput(budget.target) : '');
      return;
    }

    saveBudgetAndSync({ month, target: num }, email);
    refreshData();
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTargetInput(budget ? formatTargetInput(budget.target) : '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setTargetInput('');
      return;
    }
    setTargetInput(formatTargetInput(parseInt(raw)));
  };

  // If not editing, show normal budget display
  if (!isEditing) {
    return (
      <div className={`bg-gray-50 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-gray-700">Target Budget</span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-full active:bg-gray-200 transition-colors"
            aria-label="Edit budget"
          >
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {budget ? (
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-gray-900 tabular-nums">
              {formatRupiah(budget.target)}
            </span>
            <span className="text-xs text-gray-500">per bulan</span>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-emerald-600 font-medium active:text-emerald-700"
          >
            + Tambah Target
          </button>
        )}
      </div>
    );
  }

  // Editing mode
  return (
    <div className={`bg-gray-50 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-gray-700">Target Budget</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
            Rp
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={targetInput}
            onChange={handleChange}
            placeholder="0"
            className="w-full h-11 pl-9 pr-4 rounded-lg border border-gray-200 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 h-9 rounded-lg border border-gray-200 text-gray-600 font-medium text-sm active:bg-gray-100"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 h-9 rounded-lg font-medium text-sm text-white flex items-center justify-center gap-1 ${
              saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500 active:bg-emerald-600'
            }`}
          >
            {saved ? <><Check className="w-4 h-4" /> Simpan</> : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}