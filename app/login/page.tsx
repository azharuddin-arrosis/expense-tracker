'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ArrowRight, Mail, Sparkles } from 'lucide-react';
import { setStoredEmail } from '@/lib/cloud';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError('Masukkan alamat email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Format email tidak valid');
      return;
    }

    setStoredEmail(trimmed);
    router.replace('/');
  };

  return (
    <div className="min-h-dvh max-w-[480px] mx-auto flex flex-col">
      <div className="relative flex-1 flex flex-col bg-gradient-to-b from-emerald-600 via-emerald-500 to-teal-600 pt-14 pb-6 px-4 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/[0.06]" />
        <div className="absolute top-10 -left-10 w-60 h-60 rounded-full bg-emerald-400/[0.08]" />
        <div className="absolute bottom-40 -right-10 w-40 h-40 rounded-full bg-teal-300/[0.08]" />

        {/* Wave graphic */}
        <svg className="absolute bottom-0 left-0 w-full h-48 opacity-[0.08]" viewBox="0 0 400 120" preserveAspectRatio="none">
          <path d="M0,100 Q40,60 80,80 T160,50 T240,70 T320,30 T400,20 L400,120 L0,120 Z" fill="white" />
        </svg>

        {/* Branding + Form */}
        <div className="relative z-10 flex-1 flex flex-col justify-center space-y-6">
          <div className="text-center">
            <p className="text-sm text-emerald-100/80">Catat pemasukan &amp; pengeluaran keluarga</p>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {['Pemasukan', 'Pengeluaran', 'Budget'].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-emerald-100/80 text-[10px] font-medium"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
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
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/10 text-white placeholder:text-white/40 text-sm border border-white/10 focus:outline-none focus:bg-white/15 focus:border-white/30 transition-all backdrop-blur-sm"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-red-200 text-xs flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-300" />
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-white text-emerald-700 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-black/10"
            >
              Mulai
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-emerald-100/50 text-center leading-relaxed">
            Data tersimpan aman di cloud.
            <br />Akses dari perangkat mana pun.
          </p>
        </div>
      </div>
    </div>
  );
}
