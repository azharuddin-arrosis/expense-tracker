'use client';

import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getExpenseByPeriod,
  getIncomeByPeriod,
  getTransactionsByDateRange,
} from '@/lib/storage';
import { formatRupiah, getMonthName, getCurrentMonthString } from '@/lib/format';
import { DateFilter } from '@/components/DateFilter';
import { PageHeader } from '@/components/PageHeader';
import { useSyncOnMount } from '@/lib/use-sync';

function fmt(d: string): string {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

const c = 'border border-gray-300 px-2 py-1.5 text-[11px]';
const cr = 'border border-gray-300 px-2 py-1.5 text-[11px] text-right tabular-nums';
const h = 'border border-gray-400 px-2 py-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider bg-gray-100';
const hr = 'border border-gray-400 px-2 py-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider bg-gray-100 text-right';

export default function WawasanPage() {
  const { refreshKey } = useAppContext();
  useSyncOnMount([refreshKey]);

  const [month, setMonth] = useState(getCurrentMonthString());
  const [filterMode, setFilterMode] = useState<'month' | 'week' | 'range'>('month');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const incomes = useMemo(() => {
    if (filterMode === 'month' || !dateRange) return getIncomeByPeriod(month);
    const all = getTransactionsByDateRange(dateRange.start, dateRange.end);
    return all.filter((t) => t.flow === 'in');
  }, [month, filterMode, dateRange, refreshKey]);

  const expenses = useMemo(() => {
    if (filterMode === 'month' || !dateRange) return getExpenseByPeriod(month);
    const all = getTransactionsByDateRange(dateRange.start, dateRange.end);
    return all.filter((t) => t.flow === 'out');
  }, [month, filterMode, dateRange, refreshKey]);

  const totalDebit = incomes.reduce((s, e) => s + e.amount, 0);
  const totalKredit = expenses.reduce((s, e) => s + e.amount, 0);
  const saldo = totalDebit - totalKredit;

  const allTransactions = useMemo(() => {
    const merged = [...incomes, ...expenses];
    merged.sort((a, b) => a.date.localeCompare(b.date));
    return merged;
  }, [incomes, expenses]);

  const hasData = allTransactions.length > 0;

  return (
    <>
      <PageHeader title="Buku Kas" subtitle="Debit / Kredit" />

      <div className="px-4 pt-6 pb-8 space-y-3">

        <DateFilter
          month={month}
          onMonthChange={setMonth}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
        />

        <div className="flex gap-1">
          <div className="flex-1 border border-gray-300 rounded px-2 py-1.5 bg-emerald-50/30">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Debit</p>
            <p className="text-xs font-bold text-emerald-700 tabular-nums">{formatRupiah(totalDebit)}</p>
          </div>
          <div className="flex-1 border border-gray-300 rounded px-2 py-1.5 bg-red-50/30">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Kredit</p>
            <p className="text-xs font-bold text-red-600 tabular-nums">{formatRupiah(totalKredit)}</p>
          </div>
          <div className="flex-1 border border-gray-300 rounded px-2 py-1.5">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Saldo</p>
            <p className={`text-xs font-bold tabular-nums ${saldo >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatRupiah(saldo)}
            </p>
          </div>
        </div>

        {hasData ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse" style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th className={h} style={{ width: 48 }}>Tgl</th>
                  <th className={h}>Keterangan</th>
                  <th className={h} style={{ width: 28 }}>Akun</th>
                  <th className={hr} style={{ width: 80 }}>Debit</th>
                  <th className={hr} style={{ width: 80 }}>Kredit</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className={c}>{fmt(t.date)}</td>
                    <td className={c}>
                      <span className="font-medium text-gray-800">{t.description || '-'}</span>
                      <span className="text-gray-400 ml-1">({t.category})</span>
                    </td>
                    <td className={c}>{t.account || '-'}</td>
                    <td className={`${cr} ${t.flow === 'in' ? 'text-emerald-700 font-medium' : 'text-gray-200'}`}>
                      {t.flow === 'in' ? formatRupiah(t.amount) : '-'}
                    </td>
                    <td className={`${cr} ${t.flow === 'out' ? 'text-red-600 font-medium' : 'text-gray-200'}`}>
                      {t.flow === 'out' ? formatRupiah(t.amount) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={3} className="border border-gray-400 px-2 py-1.5 text-[11px] text-gray-700">TOTAL</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-[11px] text-right tabular-nums text-emerald-700">{formatRupiah(totalDebit)}</td>
                  <td className="border border-gray-400 px-2 py-1.5 text-[11px] text-right tabular-nums text-red-600">{formatRupiah(totalKredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 border border-gray-200 rounded-lg">
            <Wallet className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Belum ada transaksi</p>
          </div>
        )}

      </div>
    </>
  );
}