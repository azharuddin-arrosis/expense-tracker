'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  PiggyBank,
  Plane,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Heart,
  List,
  Clock,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { computeMonthlySummary, getBudget, getExpensesByDate } from '@/lib/storage';
import { formatRupiah, getMonthName, prevMonth as prevMonthStr } from '@/lib/format';
import { getStoredEmail } from '@/lib/cloud';
import { Expense, getCategoryName, getCategoryColor } from '@/lib/types';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DetailPopup } from '@/components/DetailPopup';

export default function RingkasanPage() {
  const { refreshKey } = useAppContext();
  const email = getStoredEmail() || 'guest';

  const today = new Date();
  const [month, setMonth] = useState(
    today.toISOString().slice(0, 7)
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Expense | null>(null);

  const summary = useMemo(
    () => computeMonthlySummary(month, email),
    [month, email, refreshKey]
  );

  const dayTransactions = selectedDay
    ? getExpensesByDate(selectedDay)
    : [];

  const prevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const nextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m, 1);
    const next = d.toISOString().slice(0, 7);
    const max = today.toISOString().slice(0, 7);
    if (next > max) return;
    setMonth(next);
  };

  const budget = getBudget(month);
  const savingProgress =
    budget && budget.target > 0
      ? Math.min((summary.expense / budget.target) * 100, 100)
      : 0;

  // Goal projection: average monthly saving over last 3 months
  const goalProjection = useMemo(() => {
    const last3Months = [month, prevMonthStr(month), prevMonthStr(prevMonthStr(month))];
    const summaries = last3Months.map((m) => computeMonthlySummary(m, email));
    const avgSaving = summaries.reduce((s, sm) => s + Math.max(0, sm.income - sm.expense), 0) / summaries.length;

    const result: { target: number; achieved: number; label: string; avgMonthly: number }[] = [];
    if (summary.targets.saving.target > 0) {
      result.push({
        target: summary.targets.saving.target,
        achieved: summary.targets.saving.achieved,
        label: 'Tabungan',
        avgMonthly: avgSaving,
      });
    }
    if (summary.targets.liburan.target > 0) {
      result.push({
        target: summary.targets.liburan.target,
        achieved: summary.targets.liburan.achieved,
        label: 'Liburan',
        avgMonthly: avgSaving,
      });
    }
    for (const ct of summary.targets.custom) {
      result.push({
        target: ct.target,
        achieved: ct.achieved,
        label: ct.name,
        avgMonthly: avgSaving,
      });
    }
    return result;
  }, [month, email, summary, refreshKey]);

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900">Rekap Bulanan</h1>

      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <button onClick={prevMonth} className="p-1 rounded-lg active:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-base font-semibold text-gray-900">
          {getMonthName(month)}
        </span>
        <button
          onClick={nextMonth}
          disabled={month >= today.toISOString().slice(0, 7)}
          className="p-1 rounded-lg active:bg-gray-200 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            <p className="text-[10px] font-medium text-amber-700">Pemasukan</p>
          </div>
          <p className="text-base font-bold text-amber-900 tabular-nums">
            {formatRupiah(summary.income)}
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            <p className="text-[10px] font-medium text-red-700">Pengeluaran</p>
          </div>
          <p className="text-base font-bold text-red-900 tabular-nums">
            {formatRupiah(summary.expense)}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${summary.balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-1 mb-1">
            <Wallet className={`w-3.5 h-3.5 ${summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            <p className={`text-[10px] font-medium ${summary.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              Saldo
            </p>
          </div>
          <p className={`text-base font-bold tabular-nums ${summary.balance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
            {formatRupiah(summary.balance)}
          </p>
        </div>
      </div>

      {/* Budget vs Actual */}
      {budget && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-gray-700">Target vs Realisasi</span>
            </div>
            <span className="text-xs text-gray-500">{formatRupiah(budget.target)}</span>
          </div>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                savingProgress >= 100 ? 'bg-red-500' : savingProgress >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${savingProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">
              Terpakai: {formatRupiah(summary.expense)}
            </span>
            <span className="text-xs tabular-nums text-gray-500">
              {savingProgress.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* By Account */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-800">Per Rekening</h3>
        </div>
        <div className="space-y-2">
          {[
            { key: 'suami' as const, label: 'Suami', icon: User, color: '#3B82F6' },
            { key: 'istri' as const, label: 'Istri', icon: Heart, color: '#EC4899' },
            { key: 'bersama' as const, label: 'Bersama', icon: Users, color: '#10B981' },
          ].map(({ key, label, icon: Icon, color }) => {
            const data = summary.byAccount[key];
            return (
              <div key={key} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700">{label}</p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    <span className="text-[10px] text-amber-600 whitespace-nowrap tabular-nums">+{formatRupiah(data.income)}</span>
                    <span className="text-[10px] text-red-500 whitespace-nowrap tabular-nums">-{formatRupiah(data.expense)}</span>
                    <span className={`text-[10px] font-medium whitespace-nowrap tabular-nums ${data.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      ={formatRupiah(data.balance)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saving Targets Progress */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-800">Target Tabungan</h3>
        </div>
        <div className="space-y-3">
          {summary.targets.saving.target > 0 && (
            <TargetProgress
              icon={PiggyBank}
              label="Tabungan"
              color="#10B981"
              target={summary.targets.saving.target}
              achieved={summary.targets.saving.achieved}
            />
          )}
          {summary.targets.liburan.target > 0 && (
            <TargetProgress
              icon={Plane}
              label="Liburan"
              color="#06B6D4"
              target={summary.targets.liburan.target}
              achieved={summary.targets.liburan.achieved}
            />
          )}
          {summary.targets.custom.map((ct) => (
            <TargetProgress
              key={ct.name}
              icon={Target}
              label={ct.name}
              color="#8B5CF6"
              target={ct.target}
              achieved={ct.achieved}
            />
          ))}
          {summary.targets.saving.target === 0 && summary.targets.liburan.target === 0 && summary.targets.custom.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">
              Belum ada target. Atur target di menu Target.
            </p>
          )}
        </div>

        {/* Goal Projections */}
        {goalProjection.length > 0 && (
          <div className="border-t border-gray-200/60 pt-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-medium text-gray-500">Proyeksi Target</span>
            </div>
            {goalProjection.map((g) => {
              const remaining = g.target - g.achieved;
              if (remaining <= 0) {
                return (
                  <p key={g.label} className="text-xs text-emerald-600 font-medium">
                    Target {g.label} tercapai!
                  </p>
                );
              }
              if (g.avgMonthly <= 0) {
                return (
                  <p key={g.label} className="text-xs text-amber-600">
                    Belum ada surplus bulan ini. Mulai sisihkan minimal{' '}
                    <span className="font-semibold">{formatRupiah(Math.round(g.target / 12))}</span>/bulan
                    {' '}untuk mencapai target {g.label}.
                  </p>
                );
              }
              const monthsNeeded = Math.ceil(remaining / g.avgMonthly);
              const targetDate = new Date();
              targetDate.setMonth(targetDate.getMonth() + monthsNeeded);
              const targetDateStr = targetDate.toLocaleDateString('id-ID', {
                month: 'long', year: 'numeric',
              });
              return (
                <div key={g.label} className="space-y-1">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Dengan rata-rata surplus{' '}
                    <span className="font-semibold tabular-nums text-emerald-600">{formatRupiah(Math.round(g.avgMonthly))}</span>/bulan
                    {' '}(3 bulan terakhir), target <span className="font-semibold">{g.label}</span>{' '}
                    Rp <span className="font-semibold tabular-nums">{formatRupiah(g.target)}</span>{' '}
                    akan tercapai dalam{' '}
                    <span className="font-semibold tabular-nums">{monthsNeeded}</span> bulan
                    {' '}(sekitar {targetDateStr}).
                  </p>
                  {/* Mini progress bar with projection marker */}
                  <div className="relative w-full h-1.5 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min((g.achieved / g.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Balance */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-800">Saldo Harian</h3>
        </div>
        {Object.keys(summary.dailyBalance).length > 0 ? (
          <div className="space-y-1">
            {Object.entries(summary.dailyBalance)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-14)
              .map(([date, data]) => {
                const day = new Date(date + 'T00:00:00');
                const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][day.getDay()];
                const dateStr = `${day.getDate()}/${day.getMonth() + 1}`;
                const maxInOut = Math.max(data.income, data.expense, 1);
                const isSelected = selectedDay === date;
                const hasTransactions = dayTransactions.length > 0 && selectedDay === date;
                return (
                  <div key={date}>
                    <button
                      onClick={() => setSelectedDay(selectedDay === date ? null : date)}
                      className={`w-full flex items-center gap-2 text-xs py-1.5 px-2 -mx-2 rounded-lg transition-colors ${
                        isSelected ? 'bg-emerald-50' : 'active:bg-gray-100'
                      }`}
                    >
                      <span className="w-14 text-left text-gray-500 flex-shrink-0">{dayName} {dateStr}</span>
                      <div className="flex-1 flex items-center gap-0.5 h-5">
                        {data.income > 0 && (
                          <div
                            className="h-full rounded-sm bg-amber-400 min-w-[2px]"
                            style={{ width: `${((data.income + data.expense) > 0 ? (data.income / (data.income + data.expense)) * 100 : 0)}%` }}
                          />
                        )}
                        {data.expense > 0 && (
                          <div
                            className="h-full rounded-sm bg-red-400 min-w-[2px]"
                            style={{ width: `${((data.income + data.expense) > 0 ? (data.expense / (data.income + data.expense)) * 100 : 0)}%` }}
                          />
                        )}
                        {data.income === 0 && data.expense === 0 && (
                          <div className="h-full flex-1" />
                        )}
                      </div>
                      <span className={`w-20 text-right tabular-nums font-medium ${
                        data.balance >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {formatRupiah(data.balance)}
                      </span>
                    </button>

                    {/* Transaction list for selected day */}
                    {isSelected && hasTransactions && (
                      <div className="mt-1 space-y-0.5 ml-14 border-l-2 border-emerald-100 pl-3">
                        {dayTransactions.map((tx) => (
                          <button
                            key={tx.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); }}
                            className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg active:bg-gray-100 text-left"
                          >
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: getCategoryColor(tx.category) + '20' }}
                            >
                              <CategoryIcon
                                categoryId={tx.category}
                                className="w-3 h-3"
                                style={{ color: getCategoryColor(tx.category) }}
                              />
                            </div>
                            <span className="flex-1 text-xs text-gray-700 truncate">
                              {tx.description || getCategoryName(tx.category)}
                            </span>
                            <span className={`text-xs tabular-nums font-medium ${
                              tx.flow === 'in' ? 'text-amber-600' : 'text-red-500'
                            }`}>
                              {tx.flow === 'in' ? '+' : '-'}{formatRupiah(tx.amount)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {isSelected && dayTransactions.length === 0 && (
                      <p className="text-[10px] text-gray-400 ml-14 mt-1">
                        Tidak ada transaksi
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">Belum ada data</p>
        )}
      </div>

      {/* Detail Popup */}
      <DetailPopup
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
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
        <span className="text-xs text-gray-500">
          {formatRupiah(achieved)} / {formatRupiah(target)}
        </span>
      </div>
      <div className="w-full h-2 bg-white rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
