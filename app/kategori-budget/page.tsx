'use client';

import { useState } from 'react';
import { Target, Check, SlidersHorizontal } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getCategoryBudgets, saveCategoryBudgets } from '@/lib/storage';
import { formatRupiah, getMonthName } from '@/lib/format';
import { getStoredEmail } from '@/lib/cloud';
import { EXPENSE_CATEGORIES } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';

function formatTargetInput(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

export default function KategoriBudgetPage() {
  const { currentMonth } = useAppContext();
  const email = getStoredEmail() || 'guest';

  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>(() => {
    const saved = getCategoryBudgets(email);
    const formatted: Record<string, string> = {};
    for (const [cat, val] of Object.entries(saved)) {
      formatted[cat] = formatTargetInput(val);
    }
    return formatted;
  });
  const [saved, setSaved] = useState(false);

  return (
    <>
      <PageHeader title="Budget per Kategori" />

      <div className="px-3 pt-3 pb-8 space-y-3">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-800">
            Budget per Kategori
          </h2>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2.5">
          <p className="text-[11px] text-gray-600">
            Atur batas pengeluaran per kategori untuk {getMonthName(currentMonth)}.
          </p>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {EXPENSE_CATEGORIES.map((cat) => {
              const currentVal = categoryBudgets[cat.id] || '';
              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-[11px] text-gray-700 w-20 flex-shrink-0">
                    {cat.name}
                  </span>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={currentVal}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        if (raw === '') {
                          setCategoryBudgets((prev) => ({ ...prev, [cat.id]: '' }));
                          return;
                        }
                        setCategoryBudgets((prev) => ({
                          ...prev,
                          [cat.id]: formatTargetInput(parseInt(raw)),
                        }));
                      }}
                      placeholder="0"
                      className="w-full h-8 pl-7 pr-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              const toSave: Record<string, number> = {};
              for (const [cat, val] of Object.entries(categoryBudgets)) {
                const num = parseInt(val.replace(/[^0-9]/g, ''));
                if (num > 0) toSave[cat] = num;
              }
              saveCategoryBudgets(email, toSave);
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
            className={`w-full h-8 rounded-lg font-semibold text-[10px] flex items-center justify-center gap-1.5 transition-all ${
              saved
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-emerald-500 text-white active:bg-emerald-600'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Tersimpan
              </>
            ) : (
              'Simpan Budget per Kategori'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
