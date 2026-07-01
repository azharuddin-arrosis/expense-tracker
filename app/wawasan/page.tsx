'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/lib/context';
import { getExpenseByPeriod, getIncomeByPeriod } from '@/lib/storage';
import { formatRupiah, getMonthName, getCurrentMonthString } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { useSyncOnMount } from '@/lib/use-sync';

function getLast6Months(from: string): string[] {
  const months: string[] = [];
  let [y, m] = from.split('-').map(Number);
  for (let i = 0; i < 6; i++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m--;
    if (m === 0) { m = 12; y--; }
  }
  return months;
}

function formatDate(d: string): string {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

const cellStyle = 'border border-gray-300 px-2 py-1.5 text-[11px]';
const cellRight = 'border border-gray-300 px-2 py-1.5 text-[11px] text-right tabular-nums';
const headerStyle = 'border border-gray-400 px-2 py-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider bg-gray-100';
const headerRight = 'border border-gray-400 px-2 py-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider bg-gray-100 text-right';

export default function WawasanPage() {
  const { refreshKey } = useAppContext();
  useSyncOnMount([refreshKey]);

  const allMonths = useMemo(() => getLast6Months(getCurrentMonthString()), []);
  const [selectedMonth, setSelectedMonth] = useState(allMonths[0]);

  const incomes = useMemo(
    () => getIncomeByPeriod(selectedMonth),
    [selectedMonth, refreshKey]
  );

  const expenses = useMemo(
    () => getExpenseByPeriod(selectedMonth),
    [selectedMonth, refreshKey]
  );

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

      <div className="px-4 pt-4 pb-8 space-y-3">

        {/* Month selector */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full bg-white rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
        >
          {allMonths.map((m) => (
            <option key={m} value={m}>{getMonthName(m)}</option>
          ))}
        </select>

        {/* Summary */}
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

        {/* Excel-style table */}
        {hasData ? (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-[11px] border-collapse" style={{ minWidth: 360 }}>
              <thead>
                <tr>
                  <th className={headerStyle} style={{ width: 48 }}>Tgl</th>
                  <th className={headerStyle}>Keterangan</th>
                  <th className={headerStyle} style={{ width: 28 }}>Akun</th>
                  <th className={headerRight} style={{ width: 80 }}>Debit</th>
                  <th className={headerRight} style={{ width: 80 }}>Kredit</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className={cellStyle}>{formatDate(t.date)}</td>
                    <td className={cellStyle}>
                      <span className="font-medium text-gray-800">{t.description || '-'}</span>
                      <span className="text-gray-400 ml-1">({t.category})</span>
                    </td>
                    <td className={cellStyle}>{t.account || '-'}</td>
                    <td className={`${cellRight} ${t.flow === 'in' ? 'text-emerald-700 font-medium' : 'text-gray-200'}`}>
                      {t.flow === 'in' ? formatRupiah(t.amount) : '-'}
                    </td>
                    <td className={`${cellRight} ${t.flow === 'out' ? 'text-red-600 font-medium' : 'text-gray-200'}`}>
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
            <p className="text-xs text-gray-400">Belum ada transaksi</p>
          </div>
        )}

      </div>
    </>
  );
}