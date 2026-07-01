'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Download,
  Trash2,
  Mail,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
  Target,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Shield,
  Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/lib/context';
import {
  getBudget,
  getExpenses,
  syncAllToCloud,
  getPeriodSettings,
  savePeriodSettings,
  getTransactionsByPeriod,
  saveBudgetAndSync,
} from '@/lib/storage';
import { formatRupiah, getMonthName, getCurrentMonthString } from '@/lib/format';
import { PeriodSettings, getPeriodDateRange, getPeriodLabel } from '@/lib/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { getStoredEmail, clearStoredEmail } from '@/lib/cloud';

export default function SettingPage() {
  const router = useRouter();
  const { refreshKey, currentMonth, refreshData } = useAppContext();
  const budget = useMemo(
    () => getBudget(currentMonth),
    [currentMonth, refreshKey]
  );

  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const email = getStoredEmail();

  const initPeriod = getPeriodSettings();
  const [periodStart, setPeriodStart] = useState(initPeriod.startDay);
  const [periodEnd, setPeriodEnd] = useState(initPeriod.endDay);
  const [periodSaved, setPeriodSaved] = useState(false);
  const [targetAmount, setTargetAmount] = useState(0);

  useEffect(() => {
    if (budget) {
      setTargetAmount(budget.target);
    }
  }, [budget]);

  const handleSaveBudget = async () => {
    saveBudgetAndSync({ month: currentMonth, target: targetAmount }, email);
    refreshData();
  };

  const currentPeriodKey = getCurrentMonthString();
  const periodRange = useMemo(
    () => getPeriodDateRange(currentPeriodKey, { startDay: periodStart, endDay: periodEnd }),
    [currentPeriodKey, periodStart, periodEnd]
  );
  const periodLabel = useMemo(
    () => getPeriodLabel(currentPeriodKey, { startDay: periodStart, endDay: periodEnd }),
    [currentPeriodKey, periodStart, periodEnd]
  );

  const handleSavePeriod = async () => {
    const s = Math.max(1, Math.min(28, periodStart));
    const e = Math.max(1, Math.min(28, periodEnd));
    setPeriodStart(s);
    setPeriodEnd(e);
    savePeriodSettings({ startDay: s, endDay: e });
    setPeriodSaved(true);
    setTimeout(() => setPeriodSaved(false), 2000);

    if (email) {
      try {
        await syncAllToCloud(email);
      } catch {
        // silent
      }
    }
  };

  useEffect(() => {
    if (syncStatus === 'success' || syncStatus === 'error') {
      const timer = setTimeout(() => setSyncStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  const handleExportJSON = () => {
    const all = getExpenses();
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-keluarga-export-${currentMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportText = async () => {
    const all = getExpenses();
    const monthExpenses = all.filter((e) => e.date.startsWith(currentMonth));
    const total = monthExpenses.reduce((s, e) => s + e.amount, 0);

    const lines = [
      `=== LAPORAN KEUANGAN KELUARGA ===`,
      `Bulan: ${getMonthName(currentMonth)}`,
      `Total Pengeluaran: ${formatRupiah(total)}`,
      budget ? `Target Budget: ${formatRupiah(budget.target)}` : '',
      budget ? `Sisa Budget: ${formatRupiah(budget.target - total)}` : '',
      '',
      '--- Rincian Transaksi ---',
      '',
    ];

    const sorted = [...monthExpenses].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (const exp of sorted) {
      lines.push(
        `${exp.date} | ${exp.category} | ${exp.description || '-'} | ${formatRupiah(exp.amount)}`
      );
    }

    try {
      await navigator.clipboard.writeText(lines.filter((l) => l !== undefined).join('\n'));
    } catch {
      // fallback
    }
  };

  const handleSync = async () => {
    if (!email) return;
    setSyncing(true);
    setSyncStatus('syncing');
    try {
      await syncAllToCloud(email);
      setSyncStatus('success');
    } catch {
      setSyncStatus('error');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    clearStoredEmail();
    router.replace('/login');
  };

  const handleClearAll = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('expense-tracker-expenses-v2');
    localStorage.removeItem('expense-tracker-budgets-v2');
    refreshData();
  };

  return (
    <>
      <PageHeader title="Pengaturan" />

      <div className="px-4 pb-6 space-y-5">

      {/* ── Akun ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Mail className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-800">Akun</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Mail className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900">{email ?? '-'}</p>
              </div>
            </div>
            {email && (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="text-xs font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg active:bg-red-100 transition-colors"
              >
                Ganti
              </button>
            )}
          </div>

          <div className="h-px bg-gray-100 mx-4" />

          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                {email ? (
                  <Cloud className="w-4 h-4 text-emerald-500" />
                ) : (
                  <CloudOff className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400">Cloud Sync</p>
                <p className={`text-sm font-medium ${email ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {email ? 'Tersimpan di Cloud' : 'Hanya Lokal'}
                </p>
              </div>
            </div>
            {email && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg disabled:opacity-50 active:bg-emerald-100 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sync...' : syncStatus === 'success' ? 'Done' : 'Sync'}
              </button>
            )}
          </div>

          {syncStatus === 'error' && (
            <div className="px-4 pb-3">
              <p className="text-xs text-red-500">Gagal. Periksa koneksi.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Periode Laporan ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-800">Periode Laporan</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1.5">Tanggal Mulai</p>
              <select
                value={periodStart}
                onChange={(e) => setPeriodStart(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1.5">Tanggal Tutup</p>
              <select
                value={periodEnd}
                onChange={(e) => setPeriodEnd(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Periode Saat Ini</p>
            <p className="text-sm font-semibold text-gray-800">{periodLabel}</p>
          </div>

          <button
            onClick={handleSavePeriod}
            className="w-full h-11 rounded-xl bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 active:bg-emerald-600 transition-colors"
          >
            {periodSaved ? 'Tersimpan' : 'Simpan Periode'}
          </button>
        </div>
      </section>

      {/* ── Target Budget Bulanan ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Target className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-800">Target Budget Bulanan</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          {budget ? (
            <div className="bg-emerald-50 rounded-xl p-3 space-y-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Target Saat Ini</p>
              <p className="text-base font-bold text-emerald-700 tabular-nums">{formatRupiah(budget.target)}</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{getMonthName(currentMonth)}</p>
              <p className="text-sm font-semibold text-gray-800">Belum ada target</p>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Atur Target</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(Number(e.target.value))}
              placeholder="Masukkan nominal target"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          <button
            onClick={handleSaveBudget}
            disabled={targetAmount <= 0}
            className="w-full h-11 rounded-xl bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:bg-emerald-600 transition-colors"
          >
            Simpan Target
          </button>
        </div>
      </section>

      {/* ── Menu ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-800">Pengaturan</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => router.push('/target')}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900">Target Budget</p>
              <p className="text-xs text-gray-400 mt-0.5">Atur target pengeluaran bulanan</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>

          <div className="h-px bg-gray-100 mx-4" />

          <button
            onClick={() => router.push('/kategori-budget')}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-cyan-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900">Budget per Kategori</p>
              <p className="text-xs text-gray-400 mt-0.5">Batas pengeluaran per kategori</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>

          <div className="h-px bg-gray-100 mx-4" />

          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Download className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Ekspor Data</p>
                <p className="text-xs text-gray-400 mt-0.5">Download atau salin data pengeluaran</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 ml-[52px]">
              <button
                onClick={handleExportJSON}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 active:bg-gray-50 transition-colors"
              >
                Download JSON
              </button>
              <button
                onClick={handleExportText}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 active:bg-gray-50 transition-colors"
              >
                Salin Teks
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Data & Privasi ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-800">Data & Privasi</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500 leading-relaxed">
              Semua data disimpan di perangkat ini. Hapus data jika ingin memulai dari awal.
            </p>
          </div>
          <button
            onClick={handleClearAll}
            className="w-full h-11 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-xs flex items-center justify-center gap-2 active:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Hapus Semua Data
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-300 pt-1">
          Duit v1.0 &mdash; Data tersimpan di perangkat
        </p>
      </section>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Ganti Email?"
        message="Kamu akan logout dari akun saat ini. Data lokal tidak akan dihapus."
        confirmLabel="Ya, Ganti Email"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
    </>
  );
}
