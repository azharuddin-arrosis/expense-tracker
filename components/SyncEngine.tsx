'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '@/lib/context';
import { getStoredEmail } from '@/lib/cloud';
import { startAutoSync, stopAutoSync, setOnSync } from '@/lib/sync-engine';

export function SyncEngine() {
  const { refreshData } = useAppContext();
  const emailRef = useRef<string | null>(getStoredEmail());

  /**
   * Start or restart auto-sync for a given email.
   * If null/undefined, only stops any running sync.
   */
  const syncForEmail = useCallback((email: string | null) => {
    stopAutoSync();
    if (email) {
      startAutoSync(email, refreshData);
    }
  }, [refreshData]);

  // Initial setup: register onSync callback and start sync for current email
  useEffect(() => {
    setOnSync(refreshData);

    const email = getStoredEmail();
    emailRef.current = email;
    if (email) {
      startAutoSync(email, refreshData);
    }

    // Listen for email changes dispatched from cloud.ts (setStoredEmail / clearStoredEmail)
    const handleEmailChange = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      const newEmail = customEvent.detail;

      // Skip if email hasn't actually changed
      if (newEmail === emailRef.current) return;
      emailRef.current = newEmail;

      syncForEmail(newEmail);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('expense-email-changed', handleEmailChange);
    }

    return () => {
      stopAutoSync();
      if (typeof window !== 'undefined') {
        window.removeEventListener('expense-email-changed', handleEmailChange);
      }
    };
  }, [refreshData, syncForEmail]);

  return null;
}
