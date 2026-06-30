'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Cloud,
  CloudOff,
  Heart,
  SlidersHorizontal,
  PiggyBank,
  List,
  Lightbulb,
  FileText,
  PieChart,
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

  // Background sync: try to refresh localStorage from cloud on mount
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
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const totalToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget ? budget.target - totalExpense : null;
  const usagePercent =
    budget && budget.target > 0
      ? (totalExpense / budget.target) * 100
      : 0;
  const isWarning = usagePercent >= 80 && usagePercent < 100;
  const isOverspent = usagePercent >= 100;

  // Top 3 largest expenses
  const topExpenses = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Largest expense category
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

  // Pie chart: conic-gradient for expense categories
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

  // ── Financial Health Score ──
  const categoryBudgets = useMemo(() => getCategoryBudgets(email || 'guest'), [email, refreshKey]);

  const healthScore = useMemo(() => {
    let score = 0;
    // 1. Budget compliance (3 pts)
    if (budget && budget.target > 0) {
      score += Math.max(0, Math.min(3, (1 - totalExpense / budget.target) * 3));
    }
    // 2. Saving rate (3 pts)
    if (totalIncome > 0) {
      const rate = (totalIncome - totalExpense) / totalIncome;
      score += Math.max(0, Math.min(3, rate * 3));
    }
    // 3. Category diversity (2 pts)
    const activeCats = Object.keys(categoryData).length;
    if (activeCats >= 5) score += 2;
    else if (activeCats >= 3) score += 1;
    // 4. Income stability (2 pts)
    if (totalIncome > 0) score += 2;

    return Math.round(score * 10) / 10;
  }, [budget, totalExpense, totalIncome, categoryData]);

  const healthLabel = healthScore >= 8 ? 'Sangat Sehat' : healthScore >= 5 ? 'Cukup' : 'Perlu Perhatian';
  const healthColor = healthScore >= 8 ? '#10B981' : healthScore >= 5 ? '#F59E0B' : '#EF4444';

  // ── What-If Simulator ──
  const simulasiCategoryTotal = simulasiCategory ? (categoryData[simulasiCategory] || 0) : 0;
  const simulasiSavings = Math.round(simulasiCategoryTotal * (simulasiPct / 100));
  const simulasiProjected = totalExpense - simulasiSavings;

  // Saving target info for simulasi
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
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Duit</h1>
        <div className="flex items-center gap-2">
          {/* Cloud Status Indicator */}
          {cloudStatus === 'checking' ? (
            <div className="w-2 h-2 rounded-full bg-gray-300" title="Memeriksa koneksi..." />
          ) : cloudStatus === 'connected' ? (
            <Cloud
              className="w-5 h-5 text-emerald-500"
              aria-label="Tersimpan di Cloud"
            />
          ) : (
            <CloudOff
              className="w-5 h-5 text-gray-400"
              aria-label="Hanya Lokal"
            />
          )}
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Quick Access Menu */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Riwayat', icon: List, path: '/riwayat', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Wawasan', icon: Lightbulb, path: '/wawasan', color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Rekap', icon: FileText, path: '/ringkasan', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Statistik', icon: PieChart, path: '/statistik', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`${item.bg} rounded-xl py-3 flex flex-col items-center gap-1 active:opacity-70 transition-opacity`}
            >
              <Icon className={`w-5 h-5 ${item.color}`} />
              <span className="text-[10px] font-medium text-gray-600">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date Filter */}
      <DateFilter
        month={month}
        onMonthChange={setMonth}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
      />

      {/* Summary Cards: Income | Expense | Balance */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            <p className="text-[10px] font-medium text-amber-700">
              Pemasukan
            </p>
          </div>
          <p className="text-base font-bold text-amber-900 tabular-nums">
            {formatRupiah(totalIncome)}
          </p>
          {incomes.length > 0 && (
            <p className="text-[10px] text-amber-600 mt-0.5">
              {incomes.length} transaksi
            </p>
          )}
        </div>

        <div className="bg-red-50 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            <p className="text-[10px] font-medium text-red-700">
              Pengeluaran
            </p>
          </div>
          <p className="text-base font-bold text-red-900 tabular-nums">
            {formatRupiah(totalExpense)}
          </p>
          {expenses.length > 0 && (
            <p className="text-[10px] text-red-600 mt-0.5">
              {expenses.length} transaksi
            </p>
          )}
        </div>

        <div
          className={`rounded-xl p-3 ${
            balance >= 0 ? 'bg-emerald-50' : 'bg-red-50'
          }`}
        >
          <div className="flex items-center gap-1 mb-1">
            <Wallet
              className={`w-3.5 h-3.5 ${
                balance >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            />
            <p
              className={`text-[10px] font-medium ${
                balance >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              Saldo Bersih
            </p>
          </div>
          <p
            className={`text-base font-bold tabular-nums ${
              balance >= 0 ? 'text-emerald-900' : 'text-red-900'
            }`}
          >
            {formatRupiah(balance)}
          </p>
          {totalIncome > 0 && totalExpense > 0 && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              {totalIncome > 0
                ? `${((balance / totalIncome) * 100).toFixed(0)}% dari pemasukan`
                : ''}
            </p>
          )}
        </div>
      </div>

      {/* Budget Status */}
      {budget ? (
        <div
          className={`rounded-xl p-4 space-y-2 ${
            isOverspent
              ? 'bg-red-50'
              : isWarning
                ? 'bg-amber-50'
                : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isOverspent ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              )}
              <span
                className={`text-xs font-medium ${
                  isOverspent
                    ? 'text-red-700'
                    : isWarning
                      ? 'text-amber-700'
                      : 'text-gray-700'
                }`}
              >
                Target Bulanan
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {formatRupiah(budget.target)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden">
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
              <span className="text-xs text-gray-600">
                Sisa {formatRupiah(remaining!)}
              </span>
            )}
            <span className="text-xs tabular-nums text-gray-500">
              {usagePercent.toFixed(1)}%
            </span>
          </div>

          {isWarning && !isOverspent && (
            <p className="text-[11px] text-amber-600 font-medium">
              Perhatian! Pengeluaran sudah mencapai {usagePercent.toFixed(0)}% dari target.
            </p>
          )}
          {isOverspent && (
            <p className="text-[11px] text-red-600 font-medium">
              Overspent! Pengeluaran melebihi target bulanan.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              Belum ada target budget
            </span>
            <a
              href="/setting"
              className="text-xs font-medium text-emerald-600 active:text-emerald-700"
            >
              Atur Target
            </a>
          </div>
        </div>
      )}

      {/* Financial Health Score */}
      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke={healthColor} strokeWidth="3"
              strokeDasharray={`${(healthScore / 10) * 100} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums" style={{ color: healthColor }}>
            {healthScore.toFixed(1)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4" style={{ color: healthColor }} />
            <h3 className="text-sm font-semibold text-gray-800">Skor Kesehatan Finansial</h3>
          </div>
          <p className="text-sm font-semibold mt-0.5" style={{ color: healthColor }}>
            {healthLabel}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Dari budget, tabungan, diversifikasi & stabilitas
          </p>
        </div>
      </div>

      {/* Pie Chart & Largest Category */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          Pengeluaran per Kategori
        </h3>

        {hasExpenses ? (
          <div className="flex flex-col items-center gap-4">
            {/* Simple Pie Chart (conic-gradient) */}
            <div
              className="w-40 h-40 rounded-full shadow-inner"
              style={{ background: pieGradient }}
            />

            {/* Largest category highlight */}
            {largestCategory && (
              <div className="bg-white rounded-xl px-4 py-3 w-full text-center">
                <p className="text-sm text-gray-600">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: largestCategory.color }}
                  />
                  <span className="font-semibold text-gray-900">
                    {largestCategory.name}
                  </span>{' '}
                  adalah kategori pengeluaran terbesar bulan ini (
                  <span className="font-semibold tabular-nums">
                    {largestCategory.percentage.toFixed(0)}%
                  </span>
                  )
                </p>
              </div>
            )}

            {/* Legend */}
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
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-gray-600 truncate">
                        {cat.name}
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums ml-auto">
                        {pct.toFixed(1)}%
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

      {/* Category Breakdown Bars */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Rincian per Kategori
        </h3>
        <CategoryBar data={categoryData} total={totalExpense} categoryBudgets={categoryBudgets} />
      </div>

      {/* What-If Simulator */}
      <div className="bg-gray-50 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowSimulasi(!showSimulasi)}
          className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-gray-800">Simulasi Pengeluaran</span>
          </div>
          <span className={`text-xs text-gray-400 transition-transform ${showSimulasi ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showSimulasi && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Pilih Kategori</label>
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
                  <label className="text-xs text-gray-500 mb-1 block">
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

                <div className="bg-white rounded-xl p-3 space-y-1.5">
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

      {/* Top Expenses */}
      {topExpenses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Pengeluaran Terbesar
          </h3>
          <div className="space-y-2">
            {topExpenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setDetailTarget(exp)}
                className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 active:bg-gray-100 transition-colors cursor-pointer"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: getCategoryColor(exp.category) + '20',
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

      {/* Empty State */}
      {expenses.length === 0 && incomes.length === 0 && (
        <EmptyState
          title="Belum ada transaksi"
          description={`Belum ada catatan untuk ${getMonthName(month)}. Tambahkan transaksi pertama kamu!`}
        />
      )}

      {/* Detail Popup */}
      <DetailPopup
        transaction={detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </div>
  );
}
