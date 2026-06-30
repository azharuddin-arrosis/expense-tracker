'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  List,
  Settings,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Riwayat', icon: List, path: '/riwayat' },
  { label: 'Setting', icon: Settings, path: '/setting' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 z-40 px-6 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = item.path === pathname;
          const Icon = item.icon;

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
