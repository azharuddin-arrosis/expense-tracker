'use client';

import { useEffect, useState, useRef } from 'react';
import { getExpensesWithSync } from './storage';
import { getStoredEmail } from './cloud';

export function useSyncOnMount(deps: any[] = []) {
  const email = getStoredEmail();
  const [synced, setSynced] = useState(!email);
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'local'>(email ? 'checking' : 'local');
  const didSync = useRef(false);

  useEffect(() => {
    if (!email || didSync.current) return;
    didSync.current = true;
    let cancelled = false;
    setSynced(false);
    const sync = async () => {
      try {
        await getExpensesWithSync(email);
        if (!cancelled) setCloudStatus('connected');
      } catch {
        if (!cancelled) setCloudStatus('local');
      }
      if (!cancelled) setSynced(true);
    };
    sync();
    return () => { cancelled = true; };
  }, [email, ...deps]);

  return { synced, cloudStatus, email };
}
