'use client';

import { useState, useMemo } from 'react';
import { Target, Check, Loader2, Wallet } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getBudget, saveBudgetAndSync } from '@/lib/storage';
import { formatRupiah, getMonthName } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { PageHeader } from '@/components/PageHeader';

function formatTargetInput(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

export default function TargetPage() {
  const { refreshKey, currentMonth, refreshData } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey, currentMonth]);

  const budget = useMemo(
    () => {
      if (!synced && email) return null;
      return getBudget(currentMonth);
    },
    [currentMonth, refreshKey, synced, email]
  );

  const [targetInput, setTargetInput] = useState(
    budget ? formatTargetInput(budget.target) : ''
  );
  const [saved, setSaved] = useState(false);

  const handleSaveBudget = () => {
    const raw = targetInput.replace(/[^0-9]/g, '');
    const num = parseInt(raw);
    if (!num || num <= 0) return;

    saveBudgetAndSync({ month: currentMonth, target: num }, email);
    refreshData();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setTargetInput('');
      return;
    }
    setTargetInput(formatTargetInput(parseInt(raw)));
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
      <PageHeader title="Target Bulanan" />

      <div className="px-3 pt-3 pb-8 space-y-3">
        <div className="flex items-center gap-1.5">
          <Target className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-800">
            Target Budget Bulanan
          </h2>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2.5">
          <p className="text-[11px] text-gray-600">
            Atur target pengeluaran untuk{' '}
            <span className="font-semibold text-gray-800">
              {getMonthName(currentMonth)}
            </span>
          </p>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={targetInput}
              onChange={handleTargetChange}
              placeholder="0"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleSaveBudget}
            disabled={!targetInput}
            className={`w-full h-8 rounded-lg font-semibold text-[10px] flex items-center justify-center gap-1.5 transition-all ${
              saved
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-emerald-500 text-white active:bg-emerald-600 disabled:opacity-50'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Tersimpan
              </>
            ) : (
              'Simpan Target'
            )}
          </button>

          {budget && (
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[10px] text-gray-500">Target saat ini</span>
              <span className="text-xs font-semibold text-gray-900">
                {formatRupiah(budget.target)}
              </span>
            </div>
          )}
        </div>

        <div className="bg-emerald-50 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-emerald-800 leading-relaxed">
            Target budget membantumu mengontrol pengeluaran bulanan. Dashboard
            akan menampilkan sisa budget dan peringatan jika pengeluaran mendekati
            atau melebihi target.
          </p>
        </div>
      </div>
    </>
  );
}
