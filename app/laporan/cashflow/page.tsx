'use client';

import { useMemo, useState, useCallback } from 'react';
import { TrendingDown, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { formatRupiah } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { THead, TRow, TFooter } from '../_components/table';
import { MONTHS, computeMonthData, getShortMonth, csvEscape } from '../_components/helpers';

export default function CashflowPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);

  const monthlyData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => computeMonthData(year, m));
  }, [year, refreshKey, synced, email]);

  const annualTotalIncome = useMemo(() => monthlyData.reduce((s, m) => s + m.income, 0), [monthlyData]);
  const annualTotalExpense = useMemo(() => monthlyData.reduce((s, m) => s + m.expense, 0), [monthlyData]);

  const cashFlowData = useMemo(() => {
    if (!synced && email) return [];
    let saldoAwal = 0;
    return MONTHS.map((m) => {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;
      const row = monthlyData.find((d) => d.month === monthStr);
      const pemasukan = row?.income ?? 0;
      const pengeluaran = row?.expense ?? 0;
      const saldoAkhir = saldoAwal + pemasukan - pengeluaran;
      const result = { month: monthStr, monthNum: m, saldoAwal, pemasukan, pengeluaran, saldoAkhir };
      saldoAwal = saldoAkhir;
      return result;
    });
  }, [year, refreshKey, synced, email, monthlyData]);

  const hasData = cashFlowData.some((d) => d.pemasukan > 0 || d.pengeluaran > 0);

  const handleExport = useCallback(() => {
    const lines: string[] = [];
    lines.push('\ufeff');
    lines.push(`"CASH FLOW ${year}"`);
    lines.push(`"Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"`);
    lines.push('');
    lines.push('Bulan,Saldo Awal,Pemasukan,Pengeluaran,Saldo Akhir');
    for (const d of cashFlowData) {
      lines.push(
        `${csvEscape(getShortMonth(d.month))},${csvEscape(d.saldoAwal)},` +
        `${csvEscape(d.pemasukan)},${csvEscape(d.pengeluaran)},${csvEscape(d.saldoAkhir)}`
      );
    }
    const lastCf = cashFlowData[cashFlowData.length - 1];
    if (lastCf) {
      lines.push(`Total,,${csvEscape(annualTotalIncome)},${csvEscape(annualTotalExpense)},${csvEscape(lastCf.saldoAkhir)}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [year, cashFlowData, annualTotalIncome, annualTotalExpense]);

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
        title="Cash Flow"
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
            <TrendingDown className="w-4 h-4 text-indigo-500" />
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
              <h3 className="text-xs font-semibold text-gray-800">Cash Flow {year}</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Saldo awal bulan 1 = 0 (sejak awal tahun)</p>
            </div>
            <THead
              cols="grid-cols-[70px_1fr_1fr_1fr_1fr]"
              labels={['Bulan', 'Saldo Awal', 'Pemasukan', 'Pengeluaran', 'Saldo Akhir']}
            />
            {cashFlowData.map((d, i) => (
              <TRow
                key={d.month}
                cols="grid-cols-[70px_1fr_1fr_1fr_1fr]"
                cells={[
                  getShortMonth(d.month),
                  { value: formatRupiah(d.saldoAwal), className: 'text-gray-500' },
                  { value: d.pemasukan > 0 ? formatRupiah(d.pemasukan) : '-', className: d.pemasukan > 0 ? 'text-amber-700 font-medium' : '' },
                  { value: d.pengeluaran > 0 ? formatRupiah(d.pengeluaran) : '-', className: d.pengeluaran > 0 ? 'text-red-700 font-medium' : '' },
                  {
                    value: formatRupiah(d.saldoAkhir),
                    className: `font-semibold ${d.saldoAkhir >= 0 ? 'text-emerald-700' : 'text-red-700'}`,
                  },
                ]}
                isEven={i % 2 === 0}
                isLast={i === cashFlowData.length - 1}
              />
            ))}
            <TFooter
              cols="grid-cols-[70px_1fr_1fr_1fr_1fr]"
              cells={[
                'Total',
                '',
                { value: formatRupiah(annualTotalIncome), className: 'text-amber-800' },
                { value: formatRupiah(annualTotalExpense), className: 'text-red-800' },
                {
                  value: formatRupiah(cashFlowData.length > 0 ? cashFlowData[cashFlowData.length - 1].saldoAkhir : 0),
                  className:
                    cashFlowData.length > 0 && cashFlowData[cashFlowData.length - 1].saldoAkhir >= 0
                      ? 'text-emerald-800'
                      : 'text-red-800',
                },
              ]}
            />
          </div>
        ) : (
          <EmptyState
            title="Belum ada data"
            description={`Belum ada catatan keuangan untuk tahun ${year}.`}
          />
        )}
      </div>
    </>
  );
}
