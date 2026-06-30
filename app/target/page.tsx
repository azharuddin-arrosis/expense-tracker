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
      <PageHeader title="Target Bulanan" />

      <div className="px-4 pb-6 space-y-4">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-800">
            Target Budget Bulanan
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Atur target pengeluaran untuk{' '}
            <span className="font-semibold text-gray-800">
              {getMonthName(currentMonth)}
            </span>
          </p>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={targetInput}
              onChange={handleTargetChange}
              placeholder="0"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleSaveBudget}
            disabled={!targetInput}
            className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              saved
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-emerald-500 text-white active:bg-emerald-600 disabled:opacity-50'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Tersimpan
              </>
            ) : (
              'Simpan Target'
            )}
          </button>

          {budget && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-500">Target saat ini</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatRupiah(budget.target)}
              </span>
            </div>
          )}
        </div>

        <div className="bg-emerald-50 rounded-xl px-4 py-3">
          <p className="text-xs text-emerald-800 leading-relaxed">
            Target budget membantumu mengontrol pengeluaran bulanan. Dashboard
            akan menampilkan sisa budget dan peringatan jika pengeluaran mendekati
            atau melebihi target.
          </p>
        </div>
      </section>
    </div>
    </>
  );
}
