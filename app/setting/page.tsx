'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Download,
  Trash2,
  Mail,
  Cloud,
  CloudOff,
  RefreshCw,
  Target,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Shield,
  Calendar,
  PiggyBank,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getBudget,
  getExpenses,
  syncAllToCloud,
  getPeriodSettings,
  savePeriodSettings,
  saveBudgetAndSync,
} from '@/lib/storage';
import { formatRupiah, getMonthName, getCurrentMonthString } from '@/lib/format';
import { getPeriodDateRange, getPeriodLabel } from '@/lib/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BottomSheet } from '@/components/BottomSheet';
import { PageHeader } from '@/components/PageHeader';
import { getStoredEmail, clearStoredEmail } from '@/lib/cloud';

export default function SettingPage() {
  const { refreshKey, currentMonth, refreshData } = useAppContext();
  const budget = useMemo(
    () => getBudget(currentMonth),
    [currentMonth, refreshKey]
  );

  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const email = getStoredEmail();

  // Bottom sheet states
  const [sheetPeriod, setSheetPeriod] = useState(false);
  const [sheetTarget, setSheetTarget] = useState(false);
  const [sheetExport, setSheetExport] = useState(false);

  // Period form
  const initPeriod = getPeriodSettings();
  const [periodStart, setPeriodStart] = useState(initPeriod.startDay);
  const [periodEnd, setPeriodEnd] = useState(initPeriod.endDay);
  const [periodSaved, setPeriodSaved] = useState(false);

  // Target form
  const [targetAmount, setTargetAmount] = useState(0);

  useEffect(() => {
    if (budget) setTargetAmount(budget.target);
  }, [budget]);

  const handleSaveBudget = async () => {
    saveBudgetAndSync({ month: currentMonth, target: targetAmount }, email);
    refreshData();
    setSheetTarget(false);
  };

  const currentPeriodKey = getCurrentMonthString();
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
      try { await syncAllToCloud(email); } catch { /* silent */ }
    }
    setSheetPeriod(false);
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
    } catch { /* fallback */ }
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
    window.location.href = '/login';
  };

  const handleClearAll = () => {
    localStorage.removeItem('expense-tracker-expenses-v2');
    localStorage.removeItem('expense-tracker-budgets-v2');
    refreshData();
  };

  function SettingRow({
    icon: Icon,
    label,
    desc,
    color,
    bg,
    onClick,
    right,
  }: {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    label: string;
    desc?: string;
    color: string;
    bg: string;
    onClick: () => void;
    right?: React.ReactNode;
  }) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          {desc && <p className="text-xs text-gray-400 mt-0.5 truncate">{desc}</p>}
        </div>
        {right || <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />}
      </button>
    );
  }

  return (
    <>
      <PageHeader title="Pengaturan" />

      <div className="px-4 pt-6 pb-6 space-y-5">

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
                {email ? <Cloud className="w-4 h-4 text-emerald-500" /> : <CloudOff className="w-4 h-4 text-gray-400" />}
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

      {/* ── Daftar Pengaturan ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-800">Pengaturan</h2>
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          <SettingRow
            icon={Calendar}
            label="Periode Laporan"
            desc={periodLabel}
            color="#10B981"
            bg="#ECFDF5"
            onClick={() => setSheetPeriod(true)}
          />
          <SettingRow
            icon={PiggyBank}
            label="Target Budget"
            desc={budget ? formatRupiah(budget.target) : 'Belum diatur'}
            color="#EF4444"
            bg="#FEF2F2"
            onClick={() => setSheetTarget(true)}
          />
          <SettingRow
            icon={SlidersHorizontal}
            label="Budget per Kategori"
            desc="Batas pengeluaran per kategori"
            color="#06B6D4"
            bg="#ECFEFF"
            onClick={() => window.location.href = '/kategori-budget'}
          />
          <SettingRow
            icon={Download}
            label="Ekspor Data"
            desc="Download atau salin data"
            color="#10B981"
            bg="#ECFDF5"
            onClick={() => setSheetExport(true)}
          />
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
              Data tersimpan di cloud dan perangkat. Hapus data lokal jika ingin memulai dari awal.
            </p>
          </div>
          <button
            onClick={handleClearAll}
            className="w-full h-11 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-xs flex items-center justify-center gap-2 active:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Hapus Semua Data Lokal
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-300 pt-1">
          Duit v1.0
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

      {/* ── Bottom Sheet: Periode Laporan ── */}
      <BottomSheet open={sheetPeriod} onClose={() => setSheetPeriod(false)} title="Periode Laporan">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1.5">Tanggal Mulai</p>
              <select
                value={periodStart}
                onChange={(e) => setPeriodStart(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
            className="w-full h-11 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-colors"
          >
            {periodSaved ? 'Tersimpan' : 'Simpan'}
          </button>
        </div>
      </BottomSheet>

      {/* ── Bottom Sheet: Target Budget ── */}
      <BottomSheet open={sheetTarget} onClose={() => setSheetTarget(false)} title="Target Budget">
        <div className="space-y-4">
          {budget ? (
            <div className="bg-emerald-50 rounded-xl p-3 space-y-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Target Saat Ini</p>
              <p className="text-base font-bold text-emerald-700 tabular-nums">{formatRupiah(budget.target)}</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">Belum ada target untuk {getMonthName(currentMonth)}</p>
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
            className="w-full h-11 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50 active:bg-emerald-600 transition-colors"
          >
            Simpan Target
          </button>
        </div>
      </BottomSheet>

      {/* ── Bottom Sheet: Ekspor Data ── */}
      <BottomSheet open={sheetExport} onClose={() => setSheetExport(false)} title="Ekspor Data">
        <div className="space-y-3">
          <button
            onClick={handleExportJSON}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 active:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-gray-900">Download JSON</p>
              <p className="text-xs text-gray-400">Semua data transaksi</p>
            </div>
          </button>
          <button
            onClick={handleExportText}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 active:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Download className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-gray-900">Salin Teks</p>
              <p className="text-xs text-gray-400">Laporan siap rekap</p>
            </div>
          </button>
        </div>
      </BottomSheet>

    </div>
    </>
  );
}