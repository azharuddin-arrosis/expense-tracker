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
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { computeMonthlySummary, getBudget } from '@/lib/storage';
import { formatRupiah, getMonthName } from '@/lib/format';
import { getStoredEmail } from '@/lib/cloud';

export default function RingkasanPage() {
  const { refreshKey } = useAppContext();
  const email = getStoredEmail() || 'guest';

  const today = new Date();
  const [month, setMonth] = useState(
    today.toISOString().slice(0, 7)
  );

  const summary = useMemo(
    () => computeMonthlySummary(month, email),
    [month, email, refreshKey]
  );

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
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700">{label}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-amber-600">+{formatRupiah(data.income)}</span>
                    <span className="text-[10px] text-red-500">-{formatRupiah(data.expense)}</span>
                    <span className={`text-[10px] font-medium ${data.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
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
                return (
                  <div key={date} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-gray-500 flex-shrink-0">{dayName} {dateStr}</span>
                    <div className="flex-1 flex items-center gap-0.5 h-6">
                      {data.income > 0 && (
                        <div
                          className="h-full rounded-sm bg-amber-400"
                          style={{ width: `${(data.income / maxInOut) * 40}%` }}
                          title={`Pemasukan: ${formatRupiah(data.income)}`}
                        />
                      )}
                      {data.expense > 0 && (
                        <div
                          className="h-full rounded-sm bg-red-400"
                          style={{ width: `${(data.expense / maxInOut) * 40}%` }}
                          title={`Pengeluaran: ${formatRupiah(data.expense)}`}
                        />
                      )}
                    </div>
                    <span className={`w-16 text-right tabular-nums font-medium ${
                      data.balance >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {formatRupiah(data.balance)}
                    </span>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">Belum ada data</p>
        )}
      </div>
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
