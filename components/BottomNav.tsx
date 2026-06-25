'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  List,
  PieChart,
  Settings,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { BottomSheet } from './BottomSheet';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Riwayat', icon: List, path: '/riwayat' },
  { label: 'Tambah', icon: PlusCircle, path: null, isAdd: true },
  { label: 'Statistik', icon: PieChart, path: '/statistik' },
  { label: 'Setting', icon: Settings, path: '/setting' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setShowAddExpense, setAddFlow, showFlowSelector, setShowFlowSelector } = useAppContext();

  const openForm = (flow: 'in' | 'out') => {
    setAddFlow(flow);
    setShowFlowSelector(false);
    setShowAddExpense(true);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 z-50 px-2 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item, idx) => {
            const isActive = item.path === pathname;
            const Icon = item.icon;

            if (item.isAdd) {
              return (
                <button
                  key={item.label}
                  onClick={() => setShowFlowSelector(true)}
                  className="flex flex-col items-center justify-center w-16 h-14 gap-0.5 text-emerald-600 transition-colors active:scale-95"
                  aria-label="Tambah transaksi"
                >
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200 -mt-6 ring-4 ring-white">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => router.push(item.path!)}
                className={`flex flex-col items-center justify-center w-16 h-14 gap-0.5 transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-gray-400'
                }`}
                aria-label={item.label}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Flow Selector Bottom Sheet */}
      <BottomSheet
        open={showFlowSelector}
        onClose={() => setShowFlowSelector(false)}
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
        </div>
      </BottomSheet>
    </>
  );
}
