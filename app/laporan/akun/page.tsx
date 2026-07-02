'use client';

import { useMemo, useState, useCallback } from 'react';
import { Users, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getExpensesByMonth } from '@/lib/storage';
import { formatRupiah } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { THead, TRow, TFooter } from '../_components/table';
import { MONTHS, getShortMonth, csvEscape } from '../_components/helpers';

export default function AkunPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);

  const perAccountData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;
      const expenses = getExpensesByMonth(monthStr);
      const suami = expenses.filter((e) => e.account === 'suami').reduce((s, e) => s + e.amount, 0);
      const istri = expenses.filter((e) => e.account === 'istri').reduce((s, e) => s + e.amount, 0);
      const bersama = expenses.filter((e) => !e.account || e.account === 'bersama').reduce((s, e) => s + e.amount, 0);
      return { month: monthStr, monthNum: m, suami, istri, bersama };
    });
  }, [year, refreshKey, synced, email]);

  const perAccountTotals = useMemo(() => {
    return {
      suami: perAccountData.reduce((s, d) => s + d.suami, 0),
      istri: perAccountData.reduce((s, d) => s + d.istri, 0),
      bersama: perAccountData.reduce((s, d) => s + d.bersama, 0),
    };
  }, [perAccountData]);

  const hasData = perAccountData.some((d) => d.suami > 0 || d.istri > 0 || d.bersama > 0);

  const handleExport = useCallback(() => {
    const lines: string[] = [];
    lines.push('\ufeff');
    lines.push(`"LAPORAN PER AKUN ${year}"`);
    lines.push(`"Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"`);
    lines.push('');
    lines.push('Bulan,Suami,Istri,Bersama');
    for (const d of perAccountData) {
      lines.push(`${csvEscape(getShortMonth(d.month))},${csvEscape(d.suami)},${csvEscape(d.istri)},${csvEscape(d.bersama)}`);
    }
    lines.push(`Total,${csvEscape(perAccountTotals.suami)},${csvEscape(perAccountTotals.istri)},${csvEscape(perAccountTotals.bersama)}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `per-akun-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [year, perAccountData, perAccountTotals]);

  if (!synced && email) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-white px-6">
        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mb-2" />
        <p className="text-sm font-medium text-gray-700">Memuat data...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Per Akun"
        backHref="/laporan"
        rightAction={
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-xs active:bg-emerald-100 transition-colors"
            aria-label="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        }
      />

      <div className="px-3 pt-3 pb-8 space-y-3">
        {/* Year Selector */}
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
            aria-label="Tahun sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-gray-900 tabular-nums">{year}</span>
          </div>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
            aria-label="Tahun berikutnya"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {hasData ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-800">Laporan Per Akun {year}</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Pengeluaran berdasarkan rekening</p>
            </div>
            <THead cols="grid-cols-[70px_1fr_1fr_1fr]" labels={['Bulan', 'Suami', 'Istri', 'Bersama']} />
            {perAccountData.map((d, i) => (
              <TRow
                key={d.month}
                cols="grid-cols-[70px_1fr_1fr_1fr]"
                cells={[
                  getShortMonth(d.month),
                  { value: d.suami > 0 ? formatRupiah(d.suami) : '-', className: d.suami > 0 ? 'text-blue-700 font-medium' : '' },
                  { value: d.istri > 0 ? formatRupiah(d.istri) : '-', className: d.istri > 0 ? 'text-pink-700 font-medium' : '' },
                  { value: d.bersama > 0 ? formatRupiah(d.bersama) : '-', className: d.bersama > 0 ? 'text-emerald-700 font-medium' : '' },
                ]}
                isEven={i % 2 === 0}
                isLast={i === perAccountData.length - 1}
              />
            ))}
            <TFooter
              cols="grid-cols-[70px_1fr_1fr_1fr]"
              cells={[
                'Total',
                { value: perAccountTotals.suami, className: 'text-blue-800' },
                { value: perAccountTotals.istri, className: 'text-pink-800' },
                { value: perAccountTotals.bersama, className: 'text-emerald-800' },
              ]}
            />
          </div>
        ) : (
          <EmptyState
            title="Belum ada data"
            description={`Belum ada transaksi untuk tahun ${year}.`}
          />
        )}
      </div>
    </>
  );
}
