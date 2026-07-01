'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredEmail } from '@/lib/cloud';
import { BottomNav } from '@/components/BottomNav';
import { FAB } from '@/components/FAB';
import { ExpenseFormGlobal } from '@/components/ExpenseFormGlobal';

const FAB_PAGES = ['/', '/riwayat', '/wawasan'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const showFAB = FAB_PAGES.includes(pathname);

  useEffect(() => {
    const email = getStoredEmail();

    if (pathname === '/login') {
      if (email) {
        router.replace('/');
      } else {
        setChecked(true);
      }
      return;
    }

    if (!email) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [router, pathname]);

  // Show nothing while checking (prevents flash of content)
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login page gets a full-screen layout without BottomNav/shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // All other pages get the standard app shell
  return (
    <div className="min-h-screen max-w-[480px] mx-auto bg-white shadow-sm relative">
      <main className="pb-24 min-h-screen">{children}</main>
      {showFAB && <FAB />}
      <BottomNav />
      <ExpenseFormGlobal />
    </div>
  );
}
