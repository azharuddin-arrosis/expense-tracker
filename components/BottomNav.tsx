'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  List,
  PieChart,
  Settings,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Tambah', icon: PlusCircle, path: null, isAdd: true },
  { label: 'Riwayat', icon: List, path: '/riwayat' },
  { label: 'Statistik', icon: PieChart, path: '/statistik' },
  { label: 'Setting', icon: Settings, path: '/setting' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setShowAddExpense } = useAppContext();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 z-50 px-2 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = item.path === pathname;
          const Icon = item.icon;

          if (item.isAdd) {
            return (
              <button
                key={item.label}
                onClick={() => setShowAddExpense(true)}
                className="flex flex-col items-center justify-center w-16 h-14 gap-0.5 text-emerald-600 transition-colors active:scale-95"
                aria-label="Tambah pengeluaran"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg -mt-4">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
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
  );
}
