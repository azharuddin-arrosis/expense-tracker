'use client';

import { useMemo, useState } from 'react';
import {
  Target,
  Download,
  Trash2,
  Check,
  FileDown,
  AlertTriangle,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getBudget, saveBudget, getExpenses } from '@/lib/storage';
import { formatRupiah, getMonthName } from '@/lib/format';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function SettingPage() {
  const { refreshKey, currentMonth, refreshData } = useAppContext();
  const budget = useMemo(
    () => getBudget(currentMonth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentMonth, refreshKey]
  );

  const [targetInput, setTargetInput] = useState(
    budget ? formatTargetInput(budget.target) : ''
  );
  const [saved, setSaved] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportText, setExportText] = useState('');

  function formatTargetInput(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num);
  }

  const handleSaveBudget = () => {
    const raw = targetInput.replace(/[^0-9]/g, '');
    const num = parseInt(raw);
    if (!num || num <= 0) return;

    saveBudget({ month: currentMonth, target: num });
    refreshData();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setTargetInput('');
      return;
    }
    setTargetInput(formatTargetInput(parseInt(raw)));
  };

  // ── Export ──
  const handleExportJSON = () => {
    const all = getExpenses();
    const blob = new Blob([JSON.stringify(all, null, 2)], {
      type: 'application/json',
    });
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

    const lines: string[] = [
      `=== LAPORAN KEUANGAN KELUARGA ===`,
      `Bulan: ${getMonthName(currentMonth)}`,
      `Total Pengeluaran: ${formatRupiah(total)}`,
      budget ? `Target Budget: ${formatRupiah(budget.target)}` : '',
      budget
        ? `Sisa Budget: ${formatRupiah(budget.target - total)}`
        : '',
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

    const text = lines.filter((l) => l !== undefined).join('\n');
    setExportText(text);
    setShowExport(true);

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: user can manually copy
    }
  };

  const handleClearAll = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('expense-tracker-expenses-v2');
    localStorage.removeItem('expense-tracker-budgets-v2');
    refreshData();
    setTargetInput('');
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900">Pengaturan</h1>

      {/* Budget Target */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-800">
            Target Budget Bulanan
          </h2>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Atur target pengeluaran untuk{' '}
            <span className="font-semibold text-gray-800">
              {getMonthName(currentMonth)}
            </span>
          </p>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={targetInput}
              onChange={handleTargetChange}
              placeholder="0"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleSaveBudget}
            disabled={!targetInput}
            className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              saved
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-emerald-500 text-white active:bg-emerald-600 disabled:opacity-50'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Tersimpan
              </>
            ) : (
              'Simpan Target'
            )}
          </button>

          {budget && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-500">Target saat ini</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatRupiah(budget.target)}
              </span>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-emerald-50 rounded-xl px-4 py-3">
          <p className="text-xs text-emerald-800 leading-relaxed">
            💡 Target budget membantumu mengontrol pengeluaran bulanan. Dashboard
            akan menampilkan sisa budget dan peringatan jika pengeluaran mendekati
            atau melebihi target.
          </p>
        </div>
      </section>

      {/* Export Data */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-800">
            Export Data
          </h2>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Download atau salin data pengeluaran untuk backup atau analisis
            lebih lanjut.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportJSON}
              className="flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl border-2 border-dashed border-gray-200 active:bg-gray-100 transition-colors"
            >
              <Download className="w-5 h-5 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">
                Download JSON
              </span>
            </button>

            <button
              onClick={handleExportText}
              className="flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl border-2 border-dashed border-gray-200 active:bg-gray-100 transition-colors"
            >
              <FileDown className="w-5 h-5 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">
                Salin sebagai Teks
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Export Text Modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowExport(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Data Tersalin</h3>
              <button
                onClick={() => setShowExport(false)}
                className="text-sm text-emerald-600 font-medium"
              >
                Tutup
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {exportText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-base font-semibold text-gray-800">
            Data & Privasi
          </h2>
        </div>

        <div className="bg-red-50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-red-700">
            Semua data disimpan di localStorage perangkat ini. Hapus data jika
            ingin memulai dari awal.
          </p>
          <button
            onClick={handleClearAll}
            className="w-full h-11 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 active:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Hapus Semua Data
          </button>
        </div>
      </section>
    </div>
  );
}
