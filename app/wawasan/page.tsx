'use client';

import { useMemo } from 'react';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Wallet,
  PiggyBank,
  Calendar,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getExpensesByMonth,
  getIncomesByMonth,
  getExpensesByCategory,
  getBudget,
  computeMonthlySummary,
} from '@/lib/storage';
import { formatRupiah, getMonthName, getCurrentMonthString, prevMonth } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { useSyncOnMount } from '@/lib/use-sync';
import {
  EXPENSE_CATEGORIES,
  getCategoryColor,
  getCategoryName,
  getCategoryColor as getColor,
} from '@/lib/types';

function getLast3Months(from: string): string[] {
  const months: string[] = [];
  let [y, m] = from.split('-').map(Number);
  for (let i = 0; i < 3; i++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m--;
    if (m === 0) { m = 12; y--; }
  }
  return months;
}

interface InsightCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  color?: string;
}

function InsightCard({ icon: Icon, title, children, color }: InsightCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color || 'text-emerald-600'}`} />
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="text-sm text-gray-700 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function WawasanPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);
  const month = getCurrentMonthString();
  const prevMonthStr = prevMonth(month);

  const summary = useMemo(
    () => {
      if (!synced && email) return { month, income: 0, expense: 0, balance: 0, incomeByCategory: {}, expenseByCategory: {}, dailyBalance: {}, byAccount: { suami: { income: 0, expense: 0, balance: 0 }, istri: { income: 0, expense: 0, balance: 0 }, bersama: { income: 0, expense: 0, balance: 0 } }, targets: { saving: { target: 0, achieved: 0 }, liburan: { target: 0, achieved: 0 }, custom: [] } };
      return computeMonthlySummary(month, email || 'guest');
    },
    [month, email, refreshKey, synced]
  );

  const prevSummary = useMemo(
    () => {
      if (!synced && email) return { month, income: 0, expense: 0, balance: 0, incomeByCategory: {}, expenseByCategory: {}, dailyBalance: {}, byAccount: { suami: { income: 0, expense: 0, balance: 0 }, istri: { income: 0, expense: 0, balance: 0 }, bersama: { income: 0, expense: 0, balance: 0 } }, targets: { saving: { target: 0, achieved: 0 }, liburan: { target: 0, achieved: 0 }, custom: [] } };
      return computeMonthlySummary(prevMonthStr, email || 'guest');
    },
    [prevMonthStr, email, refreshKey, synced]
  );

  const expenses = useMemo(() => {
    if (!synced && email) return [];
    return getExpensesByMonth(month);
  }, [month, refreshKey, synced, email]);
  const incomes = useMemo(() => {
    if (!synced && email) return [];
    return getIncomesByMonth(month);
  }, [month, refreshKey, synced, email]);
  const categoryData = useMemo(() => {
    if (!synced && email) return {};
    return getExpensesByCategory(month);
  }, [month, refreshKey, synced, email]);
  const prevCatData = useMemo(() => {
    if (!synced && email) return {};
    return getExpensesByCategory(prevMonthStr);
  }, [prevMonthStr, refreshKey, synced, email]);
  const budget = useMemo(() => {
    if (!synced && email) return null;
    return getBudget(month);
  }, [month, refreshKey, synced, email]);

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomes.reduce((s, e) => s + e.amount, 0);

  // Largest category
  const largestCat = useMemo(() => {
    let maxCat = '';
    let maxVal = 0;
    for (const [cat, val] of Object.entries(categoryData)) {
      if (val > maxVal) { maxVal = val; maxCat = cat; }
    }
    return { id: maxCat, total: maxVal };
  }, [categoryData]);

  const largestPct = totalExpense > 0 ? ((largestCat.total / totalExpense) * 100) : 0;

  // Category with biggest increase
  const biggestIncrease = useMemo(() => {
    let maxDelta = 0;
    let maxCat = '';
    for (const cat of EXPENSE_CATEGORIES) {
      const curr = categoryData[cat.id] || 0;
      const prev = prevCatData[cat.id] || 0;
      const delta = curr - prev;
      if (delta > maxDelta) { maxDelta = delta; maxCat = cat.id; }
    }
    return { id: maxCat, delta: maxDelta };
  }, [categoryData, prevCatData]);

  // Mom change
  const prevTotalExpense = prevSummary.expense;
  const momChange = prevTotalExpense > 0 ? ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100 : 0;

  // Budget
  const budgetPct = budget && budget.target > 0 ? (totalExpense / budget.target) * 100 : 0;
  const remaining = budget ? budget.target - totalExpense : 0;

  // Daily average
  const daysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();
  const dailyAvg = totalExpense / daysInMonth;

  // Account breakdown
  const { byAccount } = summary;
  const accountTotal = byAccount.suami.expense + byAccount.istri.expense + byAccount.bersama.expense;
  const istriPct = accountTotal > 0 ? (byAccount.istri.expense / accountTotal) * 100 : 0;
  const suamiPct = accountTotal > 0 ? (byAccount.suami.expense / accountTotal) * 100 : 0;
  const bersamaPct = accountTotal > 0 ? (byAccount.bersama.expense / accountTotal) * 100 : 0;

  // Saving suggestion
  const transactionCount = expenses.length;

  const savingSuggestion = largestCat.id && largestCat.total > 0
    ? Math.round(largestCat.total * 0.1)
    : 0;

  const hasData = expenses.length > 0 || incomes.length > 0;

  if (!synced && email) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-white px-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm mb-4">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-700">Memuat data...</p>
        <p className="text-xs text-gray-400 mt-1">Menyinkronkan dari cloud</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Wawasan" subtitle={`Analisis keuangan untuk ${getMonthName(month)}`} />

      <div className="px-4 pt-5 pb-6 space-y-4">

      <div className="px-4 pb-6 space-y-4">
      {hasData ? (
        <>
          {/* 1. Largest Category */}
          {largestCat.id && (
            <InsightCard icon={TrendingUp} title="Kategori Terbesar" color="text-red-500">
              <p>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle"
                  style={{ backgroundColor: getColor(largestCat.id) }}
                />
                <span className="font-semibold">{getCategoryName(largestCat.id)}</span>{' '}
                adalah pengeluaran terbesar bulan ini{' '}
                (<span className="font-semibold tabular-nums">{largestPct.toFixed(0)}%</span>)
                dari total pengeluaran sebesar{' '}
                <span className="font-semibold tabular-nums">{formatRupiah(totalExpense)}</span>.
              </p>
            </InsightCard>
          )}

          {/* 2. MoM Comparison */}
          <InsightCard
            icon={momChange > 0 ? ArrowUp : ArrowDown}
            title="Perbandingan Bulan Lalu"
            color={momChange > 0 ? 'text-red-500' : 'text-emerald-600'}
          >
            <p>
              Pengeluaran bulan ini{' '}
              <span className={`font-semibold ${momChange > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {momChange > 0 ? 'naik' : 'turun'} {Math.abs(momChange).toFixed(1)}%
              </span>{' '}
              dibanding bulan lalu ({formatRupiah(prevTotalExpense)}).
            </p>
          </InsightCard>

          {/* 3. Biggest Increase */}
          {biggestIncrease.id && biggestIncrease.delta > 0 && (
            <InsightCard icon={AlertTriangle} title="Peringatan Kenaikan" color="text-red-500">
              <p>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle"
                  style={{ backgroundColor: getColor(biggestIncrease.id) }}
                />
                <span className="font-semibold">{getCategoryName(biggestIncrease.id)}</span>{' '}
                naik <span className="font-semibold text-red-600">{formatRupiah(biggestIncrease.delta)}</span>{' '}
                dibanding bulan lalu. Ada yang perlu dicek?
              </p>
            </InsightCard>
          )}

          {/* 4. Budget Alert */}
          {budget && (
            <InsightCard
              icon={Target}
              title="Status Budget"
              color={budgetPct >= 100 ? 'text-red-500' : budgetPct >= 80 ? 'text-amber-500' : 'text-emerald-600'}
            >
              <p>
                Budget sudah terpakai{' '}
                <span className={`font-semibold ${budgetPct >= 100 ? 'text-red-600' : budgetPct >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {budgetPct.toFixed(0)}%
                </span>{' '}
                ({formatRupiah(totalExpense)} dari {formatRupiah(budget.target)}).
                {remaining > 0 ? (
                  <> Sisa <span className="font-semibold tabular-nums">{formatRupiah(remaining)}</span> untuk sisa bulan ini.</>
                ) : (
                  <span className="text-red-600 font-semibold"> Overspent!</span>
                )}
              </p>
            </InsightCard>
          )}

          {/* 5. Saving Suggestion */}
          {savingSuggestion > 0 && (
            <InsightCard icon={PiggyBank} title="Potensi Hemat" color="text-emerald-600">
              <p>
                Jika kurangi{' '}
                <span className="font-semibold">{getCategoryName(largestCat.id)}</span>{' '}
                sebesar 10%, kamu bisa hemat{' '}
                <span className="font-semibold text-emerald-600">{formatRupiah(savingSuggestion)}/bulan</span>
                {' '}(setara {formatRupiah(savingSuggestion * 12)}/tahun).
              </p>
            </InsightCard>
          )}

          {/* 6. Daily Average */}
          <InsightCard icon={Calendar} title="Rata-rata Harian" color="text-blue-500">
            <p>
              Rata-rata pengeluaran harian:{' '}
              <span className="font-semibold tabular-nums">{formatRupiah(Math.round(dailyAvg))}</span>
              {' '}dari {transactionCount} transaksi.
            </p>
          </InsightCard>

          {/* 7. Account Breakdown */}
          <InsightCard icon={Wallet} title="Per Rekening" color="text-violet-500">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Suami</span>
                <span className="font-semibold tabular-nums">{suamiPct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${suamiPct}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Istri</span>
                <span className="font-semibold tabular-nums">{istriPct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-pink-500" style={{ width: `${istriPct}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Bersama</span>
                <span className="font-semibold tabular-nums">{bersamaPct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${bersamaPct}%` }} />
              </div>
            </div>
          </InsightCard>

          {/* 8. Top 3 Expenses Summary */}
          {expenses.length > 0 && (
            <InsightCard icon={TrendingDown} title="Transaksi Terbesar" color="text-red-500">
              <div className="space-y-1.5">
                {[...expenses]
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 3)
                  .map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getColor(exp.category) }}
                        />
                        <span className="text-gray-600 truncate max-w-[160px]">
                          {exp.description || getCategoryName(exp.category)}
                        </span>
                      </div>
                      <span className="font-medium tabular-nums text-gray-900">
                        {formatRupiah(exp.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </InsightCard>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Belum ada data untuk {getMonthName(month)}. Wawasan akan muncul setelah kamu mencatat transaksi.
          </p>
        </div>
      )}
    </div>
    </>
  );
}
