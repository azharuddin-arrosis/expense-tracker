'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ArrowRight, Mail } from 'lucide-react';
import { setStoredEmail, getStoredEmail } from '@/lib/cloud';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const existing = getStoredEmail();
    if (existing) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError('Masukkan alamat email');
      return;
    }

    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Format email tidak valid');
      return;
    }

    setStoredEmail(trimmed);
    router.replace('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 px-6">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Finance Keluarga
          </h1>
          <p className="text-sm text-gray-500">
            Catat pengeluaran &amp; atur budget keluarga
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="contoh@email.com"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-base flex items-center justify-center gap-2 active:from-emerald-600 active:to-emerald-700 transition-all shadow-sm shadow-emerald-200"
            >
              Mulai
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-5 leading-relaxed">
            Data akan disimpan di cloud dan aman.
            <br />
            Kamu bisa akses dari perangkat mana pun.
          </p>
        </div>
      </div>
    </div>
  );
}
