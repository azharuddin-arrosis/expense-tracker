'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Heart,
  SlidersHorizontal,
  PiggyBank,
  List,
  Lightbulb,
  FileText,
  PieChart,
  Target,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  LayoutGrid,
  User,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getExpensesByMonth,
  getIncomesByMonth,
  getTransactionsByDateRange,
  getExpensesByCategory,
  getBudget,
  getExpensesWithSync,
  getCategoryBudgets,
  getSavingTargets,
} from '@/lib/storage';
import {
  formatRupiah,
  formatDate,
  getMonthName,
  getTodayString,
} from '@/lib/format';
import { CategoryBar } from '@/components/CategoryBar';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DateFilter } from '@/components/DateFilter';
import { EXPENSE_CATEGORIES, getCategoryColor, getCategoryName, Expense } from '@/lib/types';
import { EmptyState } from '@/components/EmptyState';
import { DetailPopup } from '@/components/DetailPopup';
import { getStoredEmail } from '@/lib/cloud';

export default function DashboardPage() {
  const router = useRouter();
  const { refreshKey } = useAppContext();
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'local'>('checking');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterMode, setFilterMode] = useState<'month' | 'week' | 'range'>('month');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const [detailTarget, setDetailTarget] = useState<Expense | null>(null);
  const [showSimulasi, setShowSimulasi] = useState(false);
  const [simulasiCategory, setSimulasiCategory] = useState('');
  const [simulasiPct, setSimulasiPct] = useState(10);
  const email = getStoredEmail();

  useEffect(() => {
    if (!email) {
      setCloudStatus('local');
      return;
    }

    let cancelled = false;

    const syncFromCloud = async () => {
      try {
        await getExpensesWithSync(email);
        if (!cancelled) setCloudStatus('connected');
      } catch {
        if (!cancelled) setCloudStatus('local');
      }
    };

    syncFromCloud();

    return () => {
      cancelled = true;
    };
  }, [email, refreshKey]);

  const expenses = useMemo(() => {
    if (filterMode === 'month' || !dateRange) {
      return getExpensesByMonth(month);
    }
    return getTransactionsByDateRange(dateRange.start, dateRange.end).filter((e) => e.flow === 'out');
  }, [month, filterMode, dateRange, refreshKey]);

  const incomes = useMemo(() => {
    if (filterMode === 'month' || !dateRange) {
      return getIncomesByMonth(month);
    }
    return getTransactionsByDateRange(dateRange.start, dateRange.end).filter((e) => e.flow === 'in');
  }, [month, filterMode, dateRange, refreshKey]);

  const categoryData = useMemo(
    () => getExpensesByCategory(month),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, refreshKey]
  );

  const budget = useMemo(
    () => getBudget(month),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, refreshKey]
  );

  const todayStr = getTodayString();
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = incomes.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpense;
  const remaining = budget ? budget.target - totalExpense : null;
  const usagePercent =
    budget && budget.target > 0
      ? (totalExpense / budget.target) * 100
      : 0;
  const isWarning = usagePercent >= 80 && usagePercent < 100;
  const isOverspent = usagePercent >= 100;

  const topExpenses = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const categoryEntries = useMemo(() => {
    return Object.entries(categoryData)
      .map(([id, total]) => ({
        id,
        total,
        name: getCategoryName(id),
        color: getCategoryColor(id),
        percentage: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [categoryData, totalExpense]);

  const largestCategory = categoryEntries.length > 0 ? categoryEntries[0] : null;

  const pieGradient = useMemo(() => {
    const items = EXPENSE_CATEGORIES.filter(
      (cat) => (categoryData[cat.id] || 0) > 0
    );
    if (items.length === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';

    const total = items.reduce(
      (sum, cat) => sum + (categoryData[cat.id] || 0),
      0
    );
    let currentDeg = 0;
    const parts: string[] = [];

    for (const cat of items) {
      const pct = ((categoryData[cat.id] || 0) / total) * 360;
      const start = currentDeg;
      currentDeg += pct;
      parts.push(`${cat.color} ${start}deg ${currentDeg}deg`);
    }

    return `conic-gradient(${parts.join(', ')})`;
  }, [categoryData]);

  const categoryBudgets = useMemo(() => getCategoryBudgets(email || 'guest'), [email, refreshKey]);

  const healthScore = useMemo(() => {
    let score = 0;
    if (budget && budget.target > 0) {
      score += Math.max(0, Math.min(3, (1 - totalExpense / budget.target) * 3));
    }
    if (totalIncome > 0) {
      const rate = (totalIncome - totalExpense) / totalIncome;
      score += Math.max(0, Math.min(3, rate * 3));
    }
    const activeCats = Object.keys(categoryData).length;
    if (activeCats >= 5) score += 2;
    else if (activeCats >= 3) score += 1;
    if (totalIncome > 0) score += 2;

    return Math.round(score * 10) / 10;
  }, [budget, totalExpense, totalIncome, categoryData]);

  const healthLabel = healthScore >= 8 ? 'Sangat Sehat' : healthScore >= 5 ? 'Cukup' : 'Perlu Perhatian';
  const healthColor = healthScore >= 8 ? '#10B981' : healthScore >= 5 ? '#F59E0B' : '#EF4444';

  const simulasiCategoryTotal = simulasiCategory ? (categoryData[simulasiCategory] || 0) : 0;
  const simulasiSavings = Math.round(simulasiCategoryTotal * (simulasiPct / 100));
  const simulasiProjected = totalExpense - simulasiSavings;

  const savingTargets = useMemo(
    () => email ? getSavingTargets(email || 'guest') : [],
    [email]
  );
  const primaryTarget = savingTargets.find((t) => t.id === 'saving');
  const simulasiTargetMonths = primaryTarget && primaryTarget.target > 0 && simulasiSavings > 0
    ? Math.round(primaryTarget.target / simulasiSavings)
    : 0;

  const hasExpenses = expenses.length > 0;

  return (
    <div className="px-4 pt-4 pb-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Duit</h1>
        </div>
        <div className="flex items-center gap-2">
          {cloudStatus === 'checking' ? (
            <div className="w-2 h-2 rounded-full bg-gray-300" title="Memeriksa koneksi..." />
          ) : cloudStatus === 'connected' ? (
            <div className="w-2 h-2 rounded-full bg-emerald-500" title="Tersimpan di Cloud" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-gray-400" title="Hanya Lokal" />
          )}
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* ── Saldo Card (Gojek-style gradient) ── */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-medium text-emerald-100 tracking-wide uppercase">
            Saldo Bersih
          </p>
          <div className="flex items-center gap-1 text-emerald-200">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight tabular-nums mb-4">
          {formatRupiah(balance)}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
              <ArrowUpRight className="w-3 h-3 text-emerald-200" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-200">Pemasukan</p>
              <p className="text-xs font-semibold text-white tabular-nums">
                {formatRupiah(totalIncome)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
              <ArrowDownRight className="w-3 h-3 text-emerald-200" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-200">Pengeluaran</p>
              <p className="text-xs font-semibold text-white tabular-nums">
                {formatRupiah(totalExpense)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Action Grid (Gojek-style) ── */}
      <div className="grid grid-cols-3 gap-y-4 gap-x-2">
        {[
          { label: 'Riwayat', icon: List, path: '/riwayat', color: '#6366F1', bg: '#EEF2FF' },
          { label: 'Wawasan', icon: Lightbulb, path: '/wawasan', color: '#8B5CF6', bg: '#F5F3FF' },
          { label: 'Rekap', icon: FileText, path: '/ringkasan', color: '#10B981', bg: '#ECFDF5' },
          { label: 'Statistik', icon: PieChart, path: '/statistik', color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Target', icon: Target, path: '/target', color: '#EF4444', bg: '#FEF2F2' },
          { label: 'Kategori', icon: SlidersHorizontal, path: '/kategori-budget', color: '#06B6D4', bg: '#ECFEFF' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div
                className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: item.bg }}
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <span className="text-[11px] font-medium text-gray-600">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Date Filter ── */}
      <DateFilter
        month={month}
        onMonthChange={setMonth}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
      />

      {/* ── Budget Card (White Card with Shadow) ── */}
      {budget ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOverspent ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <Zap className="w-4 h-4 text-emerald-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">
                Budget Bulanan
              </span>
            </div>
            <span className="text-xs font-medium text-gray-500 tabular-nums">
              {formatRupiah(budget.target)}
            </span>
          </div>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverspent
                  ? 'bg-red-500'
                  : isWarning
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            {isOverspent ? (
              <span className="text-xs font-semibold text-red-600">
                Kelebihan {formatRupiah(Math.abs(remaining!))}
              </span>
            ) : (
              <span className="text-xs text-gray-500">
                Sisa <span className="font-semibold text-gray-700">{formatRupiah(remaining!)}</span>
              </span>
            )}
            <span className="text-xs tabular-nums text-gray-400">
              {usagePercent.toFixed(1)}%
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Belum ada target budget
            </span>
            <a
              href="/setting"
              className="text-xs font-semibold text-emerald-600 active:text-emerald-700"
            >
              Atur Target
            </a>
          </div>
        </div>
      )}

      {/* ── Health Score (compact card) ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f3f4f6" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke={healthColor} strokeWidth="3"
              strokeDasharray={`${(healthScore / 10) * 100} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums" style={{ color: healthColor }}>
            {healthScore.toFixed(1)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5" style={{ color: healthColor }} />
            <h3 className="text-sm font-semibold text-gray-800">Skor Kesehatan</h3>
          </div>
          <p className="text-xs font-semibold mt-0.5" style={{ color: healthColor }}>
            {healthLabel}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>

      {/* ── Pie Chart (white card) ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">
            Pengeluaran per Kategori
          </h3>
          {largestCategory && (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: largestCategory.color }}
            />
          )}
        </div>

        {hasExpenses ? (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-40 h-40 rounded-full shadow-sm"
              style={{ background: pieGradient }}
            />

            {largestCategory && (
              <div className="bg-gray-50 rounded-xl px-4 py-2.5 w-full text-center">
                <p className="text-xs text-gray-600">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: largestCategory.color }}
                  />
                  <span className="font-semibold text-gray-900">
                    {largestCategory.name}
                  </span>{' '}
                  terbesar ({largestCategory.percentage.toFixed(0)}%)
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
              {EXPENSE_CATEGORIES.filter(
                (cat) => (categoryData[cat.id] || 0) > 0
              )
                .sort(
                  (a, b) =>
                    (categoryData[b.id] || 0) - (categoryData[a.id] || 0)
                )
                .map((cat) => {
                  const pct =
                    totalExpense > 0
                      ? ((categoryData[cat.id] || 0) / totalExpense) * 100
                      : 0;
                  return (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-gray-600 truncate">
                        {cat.name}
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums ml-auto">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <p className="text-center py-6 text-sm text-gray-400">
            Belum ada pengeluaran bulan ini
          </p>
        )}
      </div>

      {/* ── Category Breakdown Bars ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3 px-0.5">
          Rincian per Kategori
        </h3>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <CategoryBar data={categoryData} total={totalExpense} categoryBudgets={categoryBudgets} />
        </div>
      </div>

      {/* ── What-If Simulator ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowSimulasi(!showSimulasi)}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Simulasi Pengeluaran</span>
          </div>
          <span className={`text-xs text-gray-400 transition-transform ${showSimulasi ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showSimulasi && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Pilih Kategori</label>
              <select
                value={simulasiCategory}
                onChange={(e) => setSimulasiCategory(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
              >
                <option value="">Pilih kategori...</option>
                {EXPENSE_CATEGORIES.filter((cat) => (categoryData[cat.id] || 0) > 0).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {simulasiCategory && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    Kurangi {getCategoryName(simulasiCategory)} sebesar: {simulasiPct}%
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={simulasiPct}
                    onChange={(e) => setSimulasiPct(parseInt(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>

                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Saat ini ({getCategoryName(simulasiCategory)})</span>
                    <span className="font-semibold tabular-nums text-gray-900">
                      {formatRupiah(simulasiCategoryTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total pengeluaran</span>
                    <span className="font-semibold tabular-nums text-gray-900">
                      {formatRupiah(totalExpense)}
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-600 font-medium">Jika dikurangi {simulasiPct}%</span>
                      <span className="font-semibold tabular-nums text-emerald-600">
                        {formatRupiah(simulasiProjected)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-0.5">
                      <span className="text-violet-600 font-medium">Hemat</span>
                      <span className="font-semibold tabular-nums text-violet-600">
                        {formatRupiah(simulasiSavings)}/bulan
                      </span>
                    </div>
                  </div>

                  {simulasiTargetMonths > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                      <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] text-gray-500">
                        Hemat setara{' '}
                        <span className="font-semibold text-emerald-600">{simulasiTargetMonths} bulan</span>{' '}
                        target {primaryTarget?.name || 'Tabungan'}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Top Expenses ── */}
      {topExpenses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h3 className="text-sm font-semibold text-gray-800">
              Pengeluaran Terbesar
            </h3>
            <button
              onClick={() => router.push('/riwayat')}
              className="text-xs font-medium text-emerald-600"
            >
              Lihat Semua
            </button>
          </div>
          <div className="space-y-2">
            {topExpenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setDetailTarget(exp)}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm active:bg-gray-50 transition-colors cursor-pointer"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: getCategoryColor(exp.category) + '15',
                  }}
                >
                  <CategoryIcon
                    categoryId={exp.category}
                    className="w-4 h-4"
                    style={{ color: getCategoryColor(exp.category) }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {exp.description || getCategoryName(exp.category)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(exp.date)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                  {formatRupiah(exp.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {expenses.length === 0 && incomes.length === 0 && (
        <EmptyState
          title="Belum ada transaksi"
          description={`Belum ada catatan untuk ${getMonthName(month)}. Tambahkan transaksi pertama kamu!`}
        />
      )}

      {/* ── Detail Popup ── */}
      <DetailPopup
        transaction={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </div>
  );
}
