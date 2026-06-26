'use client';

import { useState, useEffect } from 'react';
import { Target, PiggyBank, Plane, Check } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getBudget, saveBudgetAndSync, getSavingTargets, saveSavingTargets } from '@/lib/storage';
import { formatRupiah } from '@/lib/format';
import { getStoredEmail } from '@/lib/cloud';
import { BottomSheet } from './BottomSheet';
import { DEFAULT_SAVING_TARGETS } from '@/lib/types';

export function TargetForm() {
  const { showAddTarget, setShowAddTarget, currentMonth, refreshData } = useAppContext();
  const email = getStoredEmail();

  const budget = getBudget(currentMonth);
  const savingTargets = getSavingTargets(email || 'guest');

  const [budgetInput, setBudgetInput] = useState(budget ? formatInput(budget.target) : '');
  const [savingInput, setSavingInput] = useState(
    savingTargets.find(t => t.id === 'saving')?.target ? formatInput(savingTargets.find(t => t.id === 'saving')!.target) : ''
  );
  const [liburanInput, setLiburanInput] = useState(
    savingTargets.find(t => t.id === 'liburan')?.target ? formatInput(savingTargets.find(t => t.id === 'liburan')!.target) : ''
  );
  const [saved, setSaved] = useState(false);

  function formatInput(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
  }

  function parseInput(val: string): number {
    return parseInt(val.replace(/[^0-9]/g, '')) || 0;
  }

  const handleSave = () => {
    const budgetNum = parseInput(budgetInput);
    const savingNum = parseInput(savingInput);
    const liburanNum = parseInput(liburanInput);

    // Save budget target
    if (budgetNum > 0) {
      saveBudgetAndSync({ month: currentMonth, target: budgetNum }, email);
    }

    // Save saving targets
    const updatedTargets = [...savingTargets];
    const savingIdx = updatedTargets.findIndex(t => t.id === 'saving');
    const liburanIdx = updatedTargets.findIndex(t => t.id === 'liburan');

    if (savingIdx >= 0) {
      updatedTargets[savingIdx] = { ...updatedTargets[savingIdx], target: savingNum };
    } else {
      updatedTargets.push({ ...DEFAULT_SAVING_TARGETS[0], target: savingNum, month: currentMonth });
    }

    if (liburanIdx >= 0) {
      updatedTargets[liburanIdx] = { ...updatedTargets[liburanIdx], target: liburanNum };
    } else {
      updatedTargets.push({ ...DEFAULT_SAVING_TARGETS[1], target: liburanNum, month: currentMonth });
    }

    saveSavingTargets(email || 'guest', updatedTargets);

    refreshData();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowAddTarget(false);
    }, 1000);
  };

  const handleClose = () => {
    setShowAddTarget(false);
  };

  return (
    <BottomSheet open={showAddTarget} onClose={handleClose} title="Atur Target">
      <div className="space-y-5">
        {/* Budget Bulanan */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-800">Target Pengeluaran</span>
          </div>
          <p className="text-xs text-gray-500">Budget maksimal pengeluaran bulan ini</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={budgetInput}
              onChange={(e) => setBudgetInput(formatInput(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0))}
              placeholder="0"
              className="w-full h-11 pl-9 pr-4 rounded-lg border border-gray-200 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {budget && (
            <p className="text-[10px] text-gray-400">Target saat ini: {formatRupiah(budget.target)}</p>
          )}
        </div>

        {/* Target Tabungan */}
        <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-800">Target Tabungan</span>
          </div>
          <p className="text-xs text-gray-500">Target nominal tabungan per bulan</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={savingInput}
              onChange={(e) => setSavingInput(formatInput(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0))}
              placeholder="0"
              className="w-full h-11 pl-9 pr-4 rounded-lg border border-emerald-200 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Target Liburan */}
        <div className="bg-cyan-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-cyan-600" />
            <span className="text-sm font-semibold text-gray-800">Target Liburan</span>
          </div>
          <p className="text-xs text-gray-500">Target dana liburan yang dikumpulkan</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={liburanInput}
              onChange={(e) => setLiburanInput(formatInput(parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0))}
              placeholder="0"
              className="w-full h-11 pl-9 pr-4 rounded-lg border border-cyan-200 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className={`w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors ${
            saved
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-emerald-500 text-white active:bg-emerald-600'
          }`}
        >
          {saved ? (
            <><Check className="w-5 h-5" /> Tersimpan!</>
          ) : (
            'Simpan Target'
          )}
        </button>
      </div>
    </BottomSheet>
  );
}
