'use client';

import { useState } from 'react';
import {
  Plus,
  TrendingDown,
  TrendingUp,
  Crosshair,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { BottomSheet } from './BottomSheet';

export function FAB() {
  const [open, setOpen] = useState(false);
  const { setShowAddExpense, setAddFlow, setShowAddTarget, setShowFlowSelector } = useAppContext();

  const openForm = (flow: 'in' | 'out') => {
    setAddFlow(flow);
    setOpen(false);
    setShowAddExpense(true);
  };

  const openTargetForm = () => {
    setOpen(false);
    setShowAddTarget(true);
  };

  return (
    <>
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200 flex items-center justify-center active:scale-95 transition-transform ring-4 ring-white"
          aria-label="Tambah transaksi"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Pilih Jenis Transaksi"
      >
        <div className="space-y-4 pb-2">
          <button
            onClick={() => openForm('out')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50 active:bg-emerald-100 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-7 h-7 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-base font-semibold text-emerald-900">
                Catat Pengeluaran
              </p>
              <p className="text-sm text-emerald-600">
                Makanan, transport, belanja, dll
              </p>
            </div>
          </button>

          <button
            onClick={() => openForm('in')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-amber-100 bg-amber-50 active:bg-amber-100 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-base font-semibold text-amber-900">
                Catat Pemasukan
              </p>
              <p className="text-sm text-amber-600">
                Gaji, freelance, bisnis, dll
              </p>
            </div>
          </button>

          <button
            onClick={openTargetForm}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-violet-100 bg-violet-50 active:bg-violet-100 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
              <Crosshair className="w-7 h-7 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-base font-semibold text-violet-900">
                Atur Target
              </p>
              <p className="text-sm text-violet-600">
                Budget, tabungan, liburan
              </p>
            </div>
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
