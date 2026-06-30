'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  PiggyBank,
  Plane,
  User,
  Users,
  Heart,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Loader2,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { computeMonthlySummary, getBudget, getExpensesByDate, getExpensesByCategory } from '@/lib/storage';
import { formatRupiah, getMonthName, prevMonth as prevMonthStr } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { Expense, getCategoryName, getCategoryColor, EXPENSE_CATEGORIES } from '@/lib/types';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DetailPopup } from '@/components/DetailPopup';
import { PageHeader } from '@/components/PageHeader';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function RingkasanPage() {
  const { refreshKey } = useAppContext();
  const { synced, email: syncEmail } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [monthNum, setMonthNum] = useState(currentMonthNum);
  const month = `${year}-${String(monthNum).padStart(2, '0')}`;

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Expense | null>(null);

  const email = syncEmail || 'guest';

  const summary = useMemo(
    () => {
      if (!synced && email !== 'guest') return { month, income: 0, expense: 0, balance: 0, incomeByCategory: {}, expenseByCategory: {}, dailyBalance: {}, byAccount: { suami: { income: 0, expense: 0, balance: 0 }, istri: { income: 0, expense: 0, balance: 0 }, bersama: { income: 0, expense: 0, balance: 0 } }, targets: { saving: { target: 0, achieved: 0 }, liburan: { target: 0, achieved: 0 }, custom: [] } };
      return computeMonthlySummary(month, email);
    },
    [month, email, refreshKey, synced]
  );

  const dayTransactions = selectedDay
    ? getExpensesByDate(selectedDay)
    : [];

  const prevMonth = prevMonthStr(month);
  const prevSummary = useMemo(
    () => {
      if (!synced && email !== 'guest') return { month, income: 0, expense: 0, balance: 0, incomeByCategory: {}, expenseByCategory: {}, dailyBalance: {}, byAccount: { suami: { income: 0, expense: 0, balance: 0 }, istri: { income: 0, expense: 0, balance: 0 }, bersama: { income: 0, expense: 0, balance: 0 } }, targets: { saving: { target: 0, achieved: 0 }, liburan: { target: 0, achieved: 0 }, custom: [] } };
      return computeMonthlySummary(prevMonth, email);
    },
    [prevMonth, email, refreshKey, synced]
  );

  const budget = getBudget(month);
  const savingProgress =
    budget && budget.target > 0
      ? Math.min((summary.expense / budget.target) * 100, 100)
      : 0;
  const isOverspent = savingProgress >= 100;
  const isWarning = savingProgress >= 80 && savingProgress < 100;

  // MoM
  const momChange = prevSummary.expense > 0
    ? ((summary.expense - prevSummary.expense) / prevSummary.expense) * 100
    : 0;

  // Category breakdown for this month
  const categoryData = useMemo(
    () => {
      if (!synced && email !== 'guest') return {};
      return getExpensesByCategory(month);
    },
    [month, refreshKey, synced, email]
  );
  const topCategories = useMemo(() => {
    return Object.entries(categoryData)
      .map(([id, total]) => ({ id, total, name: getCategoryName(id), color: getCategoryColor(id) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [categoryData]);
  const totalExpense = summary.expense;

  // Goal projection
  const goalProjection = useMemo(() => {
    if (!synced && email !== 'guest') return [];
    const last3Months = [month, prevMonthStr(month), prevMonthStr(prevMonthStr(month))];
    const summaries = last3Months.map((m) => computeMonthlySummary(m, email));
    const avgSaving = summaries.reduce((s, sm) => s + Math.max(0, sm.income - sm.expense), 0) / summaries.length;

    const result: { target: number; achieved: number; label: string; avgMonthly: number }[] = [];
    if (summary.targets.saving.target > 0) {
      result.push({ target: summary.targets.saving.target, achieved: summary.targets.saving.achieved, label: 'Tabungan', avgMonthly: avgSaving });
    }
    if (summary.targets.liburan.target > 0) {
      result.push({ target: summary.targets.liburan.target, achieved: summary.targets.liburan.achieved, label: 'Liburan', avgMonthly: avgSaving });
    }
    for (const ct of summary.targets.custom) {
      result.push({ target: ct.target, achieved: ct.achieved, label: ct.name, avgMonthly: avgSaving });
    }
    return result;
  }, [month, email, summary, refreshKey, synced]);

  const years = useMemo(() => {
    const y = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) y.push(i);
    return y;
  }, [currentYear]);

  if (!synced && email !== 'guest') {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-white px-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm mb-4">
          <WalletIcon className="w-6 h-6 text-white" />
        </div>
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-700">Memuat data...</p>
        <p className="text-xs text-gray-400 mt-1">Menyinkronkan dari cloud</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Rekap" subtitle={`${getMonthName(month)} ${year}`} />

      <div className="px-4 pt-5 pb-6 space-y-4">
        {/* Month & Year Filter */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">Bulan</label>
            <select
              value={monthNum}
              onChange={(e) => setMonthNum(parseInt(e.target.value))}
              className="w-full h-11 rounded-2xl border border-gray-200 text-sm font-medium text-gray-900 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{getMonthName(`2024-${String(m).padStart(2, '0')}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1.5 block">Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full h-11 rounded-2xl border border-gray-200 text-sm font-medium text-gray-900 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[10px] font-medium text-amber-600">Pemasukan</p>
              </div>
              <p className="text-base font-bold text-amber-900 tabular-nums">
                {formatRupiah(summary.income)}
              </p>
            </div>
            <div className="text-center border-x border-gray-100">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                <p className="text-[10px] font-medium text-red-600">Pengeluaran</p>
              </div>
              <p className="text-base font-bold text-red-900 tabular-nums">
                {formatRupiah(summary.expense)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wallet className={`w-3.5 h-3.5 ${summary.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                <p className={`text-[10px] font-medium ${summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Saldo
                </p>
              </div>
              <p className={`text-base font-bold tabular-nums ${summary.balance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {formatRupiah(summary.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* MoM Comparison */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${momChange > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <TrendingUp className={`w-4 h-4 ${momChange > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">vs Bulan Lalu</p>
                <p className="text-[11px] text-gray-400">{getMonthName(prevMonth)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-base font-bold tabular-nums ${momChange > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {momChange > 0 ? '+' : ''}{momChange.toFixed(1)}%
              </p>
              <p className={`text-[11px] ${momChange > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {momChange > 0 ? 'Naik' : 'Turun'}
              </p>
            </div>
          </div>
        </div>

        {/* Budget vs Actual */}
        {budget && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-gray-800">Budget</span>
              </div>
              <span className="text-xs font-medium text-gray-500 tabular-nums">{formatRupiah(budget.target)}</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverspent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(savingProgress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Terpakai <span className="font-semibold text-gray-700">{formatRupiah(totalExpense)}</span>
              </span>
              <span className="text-xs tabular-nums text-gray-400">{savingProgress.toFixed(0)}%</span>
            </div>
            {isOverspent && (
              <p className="text-xs font-semibold text-red-600">Overspent {formatRupiah(Math.abs(budget.target - totalExpense))}</p>
            )}
            {isWarning && !isOverspent && (
              <p className="text-xs text-amber-600 font-medium">Sisa {formatRupiah(budget.target - totalExpense)}</p>
            )}
          </div>
        )}

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Kategori Teratas</h3>
            <div className="space-y-2.5">
              {topCategories.map((cat, idx) => {
                const pct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-gray-400 w-4">{idx + 1}</span>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-900 tabular-nums">{formatRupiah(cat.total)}</span>
                        <span className="text-[10px] text-gray-400 ml-1 tabular-nums">({pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* By Account */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Per Rekening</h3>
          <div className="space-y-2">
            {[
              { key: 'suami' as const, label: 'Suami', icon: User, color: '#3B82F6' },
              { key: 'istri' as const, label: 'Istri', icon: Heart, color: '#EC4899' },
              { key: 'bersama' as const, label: 'Bersama', icon: Users, color: '#10B981' },
            ].map(({ key, label, icon: Icon, color }) => {
              const data = summary.byAccount[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '15' }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">{label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-amber-600 font-medium tabular-nums">+{formatRupiah(data.income)}</span>
                      <span className="text-[10px] text-red-500 font-medium tabular-nums">-{formatRupiah(data.expense)}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${data.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatRupiah(data.balance)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Saving Targets */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-800">Target Tabungan</h3>
          </div>
          <div className="space-y-3">
            {summary.targets.saving.target > 0 && (
              <TargetProgress icon={PiggyBank} label="Tabungan" color="#10B981" target={summary.targets.saving.target} achieved={summary.targets.saving.achieved} />
            )}
            {summary.targets.liburan.target > 0 && (
              <TargetProgress icon={Plane} label="Liburan" color="#06B6D4" target={summary.targets.liburan.target} achieved={summary.targets.liburan.achieved} />
            )}
            {summary.targets.custom.map((ct) => (
              <TargetProgress key={ct.name} icon={Target} label={ct.name} color="#8B5CF6" target={ct.target} achieved={ct.achieved} />
            ))}
            {summary.targets.saving.target === 0 && summary.targets.liburan.target === 0 && summary.targets.custom.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">Belum ada target. Atur di menu Target.</p>
            )}
          </div>

          {/* Goal Projections */}
          {goalProjection.length > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] font-medium text-gray-500">Proyeksi</span>
              </div>
              {goalProjection.map((g) => {
                const remaining = g.target - g.achieved;
                if (remaining <= 0) {
                  return <p key={g.label} className="text-xs text-emerald-600 font-medium">Target {g.label} tercapai!</p>;
                }
                if (g.avgMonthly <= 0) {
                  return (
                    <p key={g.label} className="text-xs text-amber-600">
                      Belum ada surplus. Sisihkan <span className="font-semibold">{formatRupiah(Math.round(g.target / 12))}</span>/bulan untuk {g.label}.
                    </p>
                  );
                }
                const monthsNeeded = Math.ceil(remaining / g.avgMonthly);
                const targetDate = new Date();
                targetDate.setMonth(targetDate.getMonth() + monthsNeeded);
                const targetDateStr = targetDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                return (
                  <div key={g.label} className="space-y-1">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Surplus <span className="font-semibold text-emerald-600 tabular-nums">{formatRupiah(Math.round(g.avgMonthly))}</span>/bln → {g.label} tercapai{' '}
                      <span className="font-semibold text-gray-900 tabular-nums">{monthsNeeded} bln</span> lagi ({targetDateStr}).
                    </p>
                    <div className="relative w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min((g.achieved / g.target) * 100, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily Balance */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Saldo Harian</h3>
          {Object.keys(summary.dailyBalance).length > 0 ? (
            <div className="space-y-0.5">
              {Object.entries(summary.dailyBalance)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-14)
                .map(([date, data]) => {
                  const day = new Date(date + 'T00:00:00');
                  const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][day.getDay()];
                  const dateStr = `${day.getDate()}/${day.getMonth() + 1}`;
                  const isSelected = selectedDay === date;
                  return (
                    <div key={date}>
                      <button
                        onClick={() => setSelectedDay(selectedDay === date ? null : date)}
                        className={`w-full flex items-center gap-2 text-xs py-1.5 px-2 -mx-2 rounded-lg transition-colors ${isSelected ? 'bg-emerald-50' : 'active:bg-gray-100'}`}
                      >
                        <span className="w-14 text-left text-gray-500 flex-shrink-0">{dayName} {dateStr}</span>
                        <div className="flex-1 flex items-center gap-0.5 h-4">
                          {data.income > 0 && (
                            <div className="h-full rounded-sm bg-amber-400 min-w-[2px]" style={{ width: `${((data.income + data.expense) > 0 ? (data.income / (data.income + data.expense)) * 100 : 0)}%` }} />
                          )}
                          {data.expense > 0 && (
                            <div className="h-full rounded-sm bg-red-400 min-w-[2px]" style={{ width: `${((data.income + data.expense) > 0 ? (data.expense / (data.income + data.expense)) * 100 : 0)}%` }} />
                          )}
                          {data.income === 0 && data.expense === 0 && <div className="h-full flex-1" />}
                        </div>
                        <span className={`w-20 text-right tabular-nums font-medium ${data.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatRupiah(data.balance)}
                        </span>
                      </button>

                      {isSelected && dayTransactions.length > 0 && (
                        <div className="mt-1 space-y-0.5 ml-14 border-l-2 border-emerald-100 pl-3">
                          {dayTransactions.map((tx) => (
                            <button
                              key={tx.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); }}
                              className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg active:bg-gray-100 text-left"
                            >
                              <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: getCategoryColor(tx.category) + '20' }}>
                                <CategoryIcon categoryId={tx.category} className="w-3 h-3" style={{ color: getCategoryColor(tx.category) }} />
                              </div>
                              <span className="flex-1 text-xs text-gray-700 truncate">{tx.description || getCategoryName(tx.category)}</span>
                              <span className={`text-xs tabular-nums font-medium ${tx.flow === 'in' ? 'text-amber-600' : 'text-red-500'}`}>
                                {tx.flow === 'in' ? '+' : '-'}{formatRupiah(tx.amount)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {isSelected && dayTransactions.length === 0 && (
                        <p className="text-[10px] text-gray-400 ml-14 mt-1">Tidak ada transaksi</p>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">Belum ada data</p>
          )}
        </div>
      </div>

      {/* Detail Popup */}
      <DetailPopup transaction={selectedTx} onClose={() => setSelectedTx(null)} />
    </>
  );
}

function TargetProgress({
  icon: Icon,
  label,
  color,
  target,
  achieved,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  color: string;
  target: number;
  achieved: number;
}) {
  const pct = Math.min((achieved / target) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-xs font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-xs text-gray-500 tabular-nums">{formatRupiah(achieved)} / {formatRupiah(target)}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
