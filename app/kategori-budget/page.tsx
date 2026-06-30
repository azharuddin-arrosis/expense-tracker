'use client';

import { useState } from 'react';
import { Target, Check, ChevronLeft, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/lib/context';
import { getCategoryBudgets, saveCategoryBudgets } from '@/lib/storage';
import { formatRupiah, getMonthName } from '@/lib/format';
import { getStoredEmail } from '@/lib/cloud';
import { EXPENSE_CATEGORIES } from '@/lib/types';

function formatTargetInput(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

export default function KategoriBudgetPage() {
  const router = useRouter();
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
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center active:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Budget per Kategori</h1>
      </div>

      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
        <h2 className="text-base font-semibold text-gray-800">
          Budget per Kategori
        </h2>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-sm text-gray-600">
          Atur batas pengeluaran per kategori untuk {getMonthName(currentMonth)}.
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {EXPENSE_CATEGORIES.map((cat) => {
            const currentVal = categoryBudgets[cat.id] || '';
            return (
              <div key={cat.id} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-gray-700 w-24 flex-shrink-0">
                  {cat.name}
                </span>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
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
                    className="w-full h-9 pl-8 pr-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
          className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            saved
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-emerald-500 text-white active:bg-emerald-600'
          }`}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              Tersimpan
            </>
          ) : (
            'Simpan Budget per Kategori'
          )}
        </button>
      </div>
    </div>
  );
}
