'use client';

import { useEffect, useRef } from 'react';
import { useAppContext } from '@/lib/context';
import { getStoredEmail } from '@/lib/cloud';
import { startAutoSync, stopAutoSync, setOnSync } from '@/lib/sync-engine';

export function SyncEngine() {
  const { refreshData } = useAppContext();
  const started = useRef(false);

  useEffect(() => {
    setOnSync(refreshData);

    const email = getStoredEmail();
    if (email && !started.current) {
      started.current = true;
      startAutoSync(email, refreshData);
    }

    return () => {
      stopAutoSync();
      started.current = false;
    };
  }, [refreshData]);

  return null;
}
