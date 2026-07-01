'use client';

import { useState, useEffect } from 'react';
import { Wallet, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { getStoredEmail } from '@/lib/cloud';
import { getExpenses, getRecurringTransactions } from '@/lib/storage';
import { Budget } from '@/lib/types';

function getAllBudgetsFromLocal(): Budget[] {
  if (typeof window === 'undefined') return [];
  try {
    const email = getStoredEmail();
    const key = 'expense-tracker-budgets-v2:' + (email || 'guest');
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

type StepStatus = 'idle' | 'running' | 'done' | 'error';

export default function MigratePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<string, StepStatus>>({
    'read-local': 'idle',
    'push-transactions': 'idle',
    'push-budgets': 'idle',
    'push-recurring': 'idle',
  });
  const [counts, setCounts] = useState({ transactions: 0, budgets: 0, recurring: 0 });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setEmail(getStoredEmail());
  }, []);

  const run = async () => {
    setError('');
    setSteps({
      'read-local': 'running',
      'push-transactions': 'idle',
      'push-budgets': 'idle',
      'push-recurring': 'idle',
    });

    const currentEmail = getStoredEmail();
    if (!currentEmail) {
      setError('Belum login. Silakan login dulu.');
      setSteps(s => ({ ...s, 'read-local': 'error' }));
      return;
    }
    setEmail(currentEmail);

    const transactions = getExpenses();
    const budgets = getAllBudgetsFromLocal();
    const recurring = getRecurringTransactions('');

    setCounts({ transactions: transactions.length, budgets: budgets.length, recurring: recurring.length });
    setSteps(s => ({ ...s, 'read-local': 'done' }));

    try {
      setSteps(s => ({ ...s, 'push-transactions': 'running', 'push-budgets': 'running', 'push-recurring': 'running' }));

      const res = await fetch(`/api/sync?email=${encodeURIComponent(currentEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail, transactions, budgets, recurring }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }

      setSteps(s => ({
        ...s,
        'push-transactions': 'done',
        'push-budgets': 'done',
        'push-recurring': 'done',
      }));
      setDone(true);
    } catch (e: any) {
      setError(e.message);
      setSteps(s => ({
        ...s,
        'push-transactions': 'error',
        'push-budgets': 'error',
        'push-recurring': 'error',
      }));
    }
  };

  const icon = (status: StepStatus) => {
    if (status === 'running') return <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />;
    if (status === 'done') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
  };

  return (
    <div className="min-h-dvh max-w-[480px] mx-auto flex flex-col bg-gray-50">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4">
        <div className="h-12 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Migrasi Data</h1>
        </div>
      </div>

      <div className="px-4 pt-6 pb-6 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-sm text-gray-600">
            Aplikasi sekarang pake MySQL sebagai database. Klik tombol di bawah untuk migrasi data dari
            penyimpanan lokal browser ke database.
          </p>

          {email && (
            <p className="text-xs text-gray-400">
              Email: <span className="font-mono text-gray-600">{email}</span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">1. Baca data dari lokal</span>
            {icon(steps['read-local'])}
          </div>

          {steps['read-local'] === 'done' && (
            <div className="space-y-1.5 pl-0">
              <p className="text-xs text-gray-500">Transaksi: {counts.transactions}</p>
              <p className="text-xs text-gray-500">Budget: {counts.budgets}</p>
              <p className="text-xs text-gray-500">Recurring: {counts.recurring}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-medium text-gray-700">2. Push ke MySQL via API</span>
            {icon(steps['push-transactions'])}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
            <p className="text-xs text-red-600 font-medium">Error:</p>
            <p className="text-xs text-red-500 mt-1 break-all">{error}</p>
            {error.includes('login') && (
              <a href="/login" className="text-xs font-semibold text-emerald-600 mt-2 inline-flex items-center gap-1">
                Login dulu <ArrowRight className="w-3 h-3" />
              </a>
            )}
            {error.includes('401') || error.includes('403') || error.includes('Vercel') || error.includes('Redirect') && (
              <p className="text-xs text-gray-500 mt-2">
                API di-block Vercel Auth. Matikan "Vercel Authentication" di dashboard Vercel &gt; Settings &gt; Deployment Protection.
              </p>
            )}
          </div>
        )}

        {done ? (
          <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100 space-y-3">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-emerald-800">Migrasi Berhasil!</p>
            <p className="text-xs text-emerald-600">
              {counts.transactions} transaksi, {counts.budgets} budget, {counts.recurring} recurring
              telah tersimpan di MySQL.
            </p>
            <a href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
              Kembali ke Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <button
            onClick={run}
            disabled={!email}
            className="w-full h-12 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200"
          >
            Mulai Migrasi
          </button>
        )}
      </div>
    </div>
  );
}
