'use client';

import { useMemo, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getExpenseByPeriod, getIncomeByPeriod } from '@/lib/storage';
import { formatRupiah, getMonthName, getCurrentMonthString } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { useSyncOnMount } from '@/lib/use-sync';
import { getCategoryName, getCategoryColor } from '@/lib/types';

function getLast6Months(from: string): string[] {
  const months: string[] = [];
  let [y, m] = from.split('-').map(Number);
  for (let i = 0; i < 6; i++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }
  return months;
}

function formatShortDate(dateStr: string): string {
  return `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
}

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

  const totalDebit = useMemo(
    () => incomes.reduce((s, e) => s + e.amount, 0),
    [incomes]
  );

  const totalKredit = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const saldo = totalDebit - totalKredit;

  const allTransactions = useMemo(() => {
    const merged = [...incomes, ...expenses];
    merged.sort((a, b) => a.date.localeCompare(b.date));
    return merged;
  }, [incomes, expenses]);

  const hasData = allTransactions.length > 0;

  // Group by date for date dividers
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof allTransactions> = {};
    for (const t of allTransactions) {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    }
    return groups;
  }, [allTransactions]);

  return (
    <>
      <PageHeader title="Wawasan" subtitle="Buku kas debit/kredit" />

      <div className="px-4 pt-5 pb-6 space-y-4">
        {/* ── Month Selector ── */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full bg-white rounded-2xl shadow-sm px-4 py-3 text-sm font-medium text-gray-700 border-0 focus:ring-2 focus:ring-emerald-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
        >
          {allMonths.map((m) => (
            <option key={m} value={m}>
              {getMonthName(m)}
            </option>
          ))}
        </select>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-3 gap-2">
          {/* Debit */}
          <div className="bg-white rounded-2xl shadow-sm p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Debit
              </span>
            </div>
            <p className="text-sm font-semibold tabular-nums text-emerald-600">
              {formatRupiah(totalDebit)}
            </p>
          </div>

          {/* Kredit */}
          <div className="bg-white rounded-2xl shadow-sm p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Kredit
              </span>
            </div>
            <p className="text-sm font-semibold tabular-nums text-red-500">
              {formatRupiah(totalKredit)}
            </p>
          </div>

          {/* Saldo */}
          <div className="bg-white rounded-2xl shadow-sm p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="w-3.5 h-3.5 text-gray-700" />
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Saldo
              </span>
            </div>
            <p
              className={`text-sm font-semibold tabular-nums ${
                saldo >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {formatRupiah(saldo)}
            </p>
          </div>
        </div>

        {/* ── Ledger Table ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          {hasData ? (
            <>
              {/* Table header (hidden on mobile — semantic only) */}
              <div className="hidden items-center text-xs font-medium text-gray-400 mb-2 pb-2 border-b border-gray-100">
                <div className="flex-1">Keterangan</div>
                <div className="w-[92px] text-right">Debit</div>
                <div className="w-[92px] text-right">Kredit</div>
              </div>

              {/* Grouped rows by date */}
              {Object.entries(groupedByDate).map(([date, txs]) => (
                <div key={date}>
                  {/* Date divider */}
                  <div className="flex items-center gap-2 py-1.5">
                    <span className="text-xs font-medium text-gray-400">
                      {formatShortDate(date)}
                    </span>
                    <div className="flex-1 border-b border-gray-100" />
                  </div>

                  {/* Transactions for this date */}
                  {txs.map((t, idx) => (
                    <div key={t.id}>
                      <div className="flex items-start py-2.5">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {t.description || getCategoryName(t.category)}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {getCategoryName(t.category)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {/* Debit column (income) */}
                          <div className="w-[92px] text-right">
                            {t.flow === 'in' ? (
                              <span className="text-sm font-semibold tabular-nums text-emerald-600">
                                {formatRupiah(t.amount)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-200">&mdash;</span>
                            )}
                          </div>
                          {/* Kredit column (expense) */}
                          <div className="w-[92px] text-right">
                            {t.flow === 'out' ? (
                              <span className="text-sm font-semibold tabular-nums text-red-500">
                                {formatRupiah(t.amount)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-200">&mdash;</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {idx < txs.length - 1 && (
                        <div className="border-b border-gray-50" />
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Footer — totals */}
              <div className="border-t border-gray-200 mt-2 pt-3 flex items-start">
                <div className="flex-1">
                  <span className="text-sm font-bold text-gray-900">TOTAL</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <div className="w-[92px] text-right">
                    <span className="text-sm font-bold tabular-nums text-emerald-600">
                      {formatRupiah(totalDebit)}
                    </span>
                  </div>
                  <div className="w-[92px] text-right">
                    <span className="text-sm font-bold tabular-nums text-red-500">
                      {formatRupiah(totalKredit)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ── Empty state ── */
            <div className="py-12 text-center">
              <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Belum ada transaksi</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
