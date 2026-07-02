'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  BarChart3,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Grid3X3,
  PiggyBank,
  Users,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getExpenseByPeriod,
  getIncomeByPeriod,
  getExpenseByCategoryPeriod,
  getExpenses,
  getBudget,
  getExpensesByMonth,
} from '@/lib/storage';
import { formatRupiah, getMonthName } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { getCategoryName, getCategoryColor } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

// ── Constants ──

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

type TabId = 'ringkasan' | 'kategori' | 'akun' | 'budget' | 'cashflow' | 'yoy' | 'heatmap';

const TABS: { id: TabId; label: string }[] = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'kategori', label: 'Kategori' },
  { id: 'akun', label: 'Akun' },
  { id: 'budget', label: 'Budget' },
  { id: 'cashflow', label: 'Cash Flow' },
  { id: 'yoy', label: 'YoY' },
  { id: 'heatmap', label: 'Heatmap' },
];

// ── Helpers ──

function computeMonthData(year: number, monthNum: number) {
  const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
  const exps = getExpenseByPeriod(monthStr);
  const incs = getIncomeByPeriod(monthStr);
  const expense = exps.reduce((s, e) => s + e.amount, 0);
  const income = incs.reduce((s, e) => s + e.amount, 0);
  return { month: monthStr, monthNum, expense, income, balance: income - expense };
}

function getShortMonth(monthStr: string): string {
  return getMonthName(monthStr).slice(0, 3);
}

function getHeatmapColor(value: number, min: number, max: number): string {
  if (max === min) return '#10B981';
  const ratio = (value - min) / (max - min);
  // green (#10B981) → yellow (#F59E0B) → red (#EF4444)
  if (ratio < 0.5) {
    const t = ratio / 0.5;
    const r = Math.round(0x10 + (0xF5 - 0x10) * t);
    const g = Math.round(0xB9 - (0xB9 - 0x9E) * t);
    const b = Math.round(0x81 - (0x81 - 0x0B) * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = (ratio - 0.5) / 0.5;
  const r = Math.round(0xF5 + (0xEF - 0xF5) * t);
  const g = Math.round(0x9E - (0x9E - 0x44) * t);
  const b = Math.round(0x0B + (0x44 - 0x0B) * t);
  return `rgb(${r},${g},${b})`;
}

function csvEscape(val: string | number): string {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── Tab Icon ──

function TabIcon({ tabId, className }: { tabId: TabId; className?: string }) {
  const props = { className: className ?? 'w-3.5 h-3.5' };
  switch (tabId) {
    case 'ringkasan': return <BarChart3 {...props} />;
    case 'kategori': return <PieChart {...props} />;
    case 'akun': return <Users {...props} />;
    case 'budget': return <PiggyBank {...props} />;
    case 'cashflow': return <DollarSign {...props} />;
    case 'yoy': return <TrendingUp {...props} />;
    case 'heatmap': return <Grid3X3 {...props} />;
  }
}

// ── Table Components ──

function THead({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div className={`grid ${cols} gap-0 border-b border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider`}>
      {labels.map((l, i) => (
        <div
          key={i}
          className={`px-2.5 py-1.5 ${i < labels.length - 1 ? 'border-r border-gray-200' : ''} ${i > 0 ? 'text-right' : ''}`}
        >
          {l}
        </div>
      ))}
    </div>
  );
}

function TRow({
  cols,
  cells,
  isEven,
  isLast,
  emptyValue = '-',
}: {
  cols: string;
  cells: (string | number | { value: string | number; className?: string })[];
  isEven: boolean;
  isLast?: boolean;
  emptyValue?: string;
}) {
  const hasData = cells.some((c) => {
    if (typeof c === 'object') return c.value !== 0 && c.value !== '-' && c.value !== '';
    return c !== 0 && c !== '-' && c !== '';
  });
  return (
    <div
      className={`grid ${cols} gap-0 text-[11px] ${!isLast ? 'border-b border-gray-100' : ''} ${
        isEven ? 'bg-white' : 'bg-gray-50/50'
      } ${!hasData ? 'opacity-40' : ''}`}
    >
      {cells.map((c, i) => {
        const val = typeof c === 'object' ? c.value : c;
        const extraClass = typeof c === 'object' ? c.className ?? '' : '';
        const display = (val === 0 || val === '0') && i > 0 ? emptyValue : val;
        return (
          <div
            key={i}
            className={`px-2.5 py-2 ${i < cells.length - 1 ? 'border-r border-gray-100' : ''} ${i > 0 ? 'text-right tabular-nums' : 'text-gray-700 font-medium'} ${extraClass}`}
          >
            {display}
          </div>
        );
      })}
    </div>
  );
}

function TFooter({ cols, cells }: { cols: string; cells: (string | number | { value: string | number; className?: string })[] }) {
  return (
    <div className={`grid ${cols} gap-0 border-t border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-900`}>
      {cells.map((c, i) => {
        const val = typeof c === 'object' ? c.value : c;
        const extraClass = typeof c === 'object' ? c.className ?? '' : '';
        return (
          <div
            key={i}
            className={`px-2.5 py-1.5 ${i < cells.length - 1 ? 'border-r border-gray-200' : ''} ${i > 0 ? 'text-right tabular-nums' : 'text-gray-500'}`}
          >
            <span className={extraClass || undefined}>{val}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──

export default function LaporanPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState<TabId>('ringkasan');
  const [compareYear, setCompareYear] = useState(currentYear - 1);

  // ── All available years ──
  const availableYears = useMemo(() => {
    const expenses = getExpenses();
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    for (const e of expenses) {
      const y = parseInt(e.date.slice(0, 4));
      if (!isNaN(y)) yearsSet.add(y);
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [refreshKey, currentYear]);

  const availableCompareYears = useMemo(() => {
    return availableYears.filter((y) => y !== year);
  }, [availableYears, year]);

  // Auto-adjust compareYear
  if (compareYear === year || (availableCompareYears.length > 0 && !availableCompareYears.includes(compareYear))) {
    // fix in next render
  }

  // ── Monthly data for the selected year ──
  const monthlyData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => computeMonthData(year, m));
  }, [year, refreshKey, synced, email]);

  // ── Monthly data for compare year (YoY) ──
  const prevMonthlyData = useMemo(() => {
    if (!synced && email) return [];
    if (compareYear === year) return [];
    return MONTHS.map((m) => computeMonthData(compareYear, m));
  }, [compareYear, year, refreshKey, synced, email]);

  // ── Annual summary ──
  const annualSummary = useMemo(() => {
    const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpense = monthlyData.reduce((s, m) => s + m.expense, 0);
    const surplus = totalIncome - totalExpense;
    const numMonthsWithData = monthlyData.filter((m) => m.income > 0 || m.expense > 0).length;
    return { totalIncome, totalExpense, surplus, numMonthsWithData };
  }, [monthlyData]);

  const prevAnnualSummary = useMemo(() => {
    const totalIncome = prevMonthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpense = prevMonthlyData.reduce((s, m) => s + m.expense, 0);
    const surplus = totalIncome - totalExpense;
    return { totalIncome, totalExpense, surplus };
  }, [prevMonthlyData]);

  // ── Yearly category data ──
  const yearlyCategoryData = useMemo(() => {
    if (!synced && email) return {};
    const aggregated: Record<string, number> = {};
    for (const m of MONTHS) {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;
      const catData = getExpenseByCategoryPeriod(monthStr);
      for (const [catId, total] of Object.entries(catData)) {
        aggregated[catId] = (aggregated[catId] || 0) + total;
      }
    }
    return aggregated;
  }, [year, refreshKey, synced, email]);

  const prevYearlyCategoryData = useMemo(() => {
    if (!synced && email) return {};
    if (compareYear === year) return {};
    const aggregated: Record<string, number> = {};
    for (const m of MONTHS) {
      const monthStr = `${compareYear}-${String(m).padStart(2, '0')}`;
      const catData = getExpenseByCategoryPeriod(monthStr);
      for (const [catId, total] of Object.entries(catData)) {
        aggregated[catId] = (aggregated[catId] || 0) + total;
      }
    }
    return aggregated;
  }, [compareYear, year, refreshKey, synced, email]);

  // ── Top categories ──
  const topCategories = useMemo(() => {
    return Object.entries(yearlyCategoryData)
      .map(([id, total]) => ({ id, total, name: getCategoryName(id), color: getCategoryColor(id) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [yearlyCategoryData]);

  // ═══════════════════════════════════════════════
  // REPORT 1: Per Kategori
  // ═══════════════════════════════════════════════

  const allCategories = useMemo(() => {
    const activeMonths = monthlyData.filter((m) => m.expense > 0).length || 1;
    return Object.entries(yearlyCategoryData)
      .map(([id, total]) => ({
        id,
        name: getCategoryName(id),
        total,
        avg: Math.round(total / activeMonths),
        pct: annualSummary.totalExpense > 0 ? (total / annualSummary.totalExpense) * 100 : 0,
        color: getCategoryColor(id),
      }))
      .sort((a, b) => b.total - a.total);
  }, [yearlyCategoryData, monthlyData, annualSummary.totalExpense]);

  // ═══════════════════════════════════════════════
  // REPORT 2: Per Akun
  // ═══════════════════════════════════════════════

  const perAccountData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;
      const expenses = getExpensesByMonth(monthStr);
      const suami = expenses.filter((e) => e.account === 'suami').reduce((s, e) => s + e.amount, 0);
      const istri = expenses.filter((e) => e.account === 'istri').reduce((s, e) => s + e.amount, 0);
      const bersama = expenses.filter((e) => !e.account || e.account === 'bersama').reduce((s, e) => s + e.amount, 0);
      return { month: monthStr, monthNum: m, suami, istri, bersama };
    });
  }, [year, refreshKey, synced, email]);

  const perAccountTotals = useMemo(() => {
    return {
      suami: perAccountData.reduce((s, d) => s + d.suami, 0),
      istri: perAccountData.reduce((s, d) => s + d.istri, 0),
      bersama: perAccountData.reduce((s, d) => s + d.bersama, 0),
    };
  }, [perAccountData]);

  // ═══════════════════════════════════════════════
  // REPORT 3: Budget vs Aktual
  // ═══════════════════════════════════════════════

  const budgetData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;
      const budget = getBudget(monthStr);
      const realisasi = monthlyData.find((d) => d.month === monthStr)?.expense ?? 0;
      const target = budget?.target ?? null;
      let selisih: number | null = null;
      let pct: number | null = null;
      if (target !== null) {
        selisih = target - realisasi;
        pct = target > 0 ? (realisasi / target) * 100 : 0;
      }
      return { month: monthStr, monthNum: m, budget: target, realisasi, selisih, pct };
    });
  }, [year, refreshKey, synced, email, monthlyData]);

  const budgetTotals = useMemo(() => {
    let totalBudget = 0;
    let totalRealisasi = 0;
    let budgetCount = 0;
    for (const d of budgetData) {
      if (d.budget !== null) {
        totalBudget += d.budget;
        budgetCount++;
      }
      totalRealisasi += d.realisasi;
    }
    const totalSelisih = budgetCount > 0 ? totalBudget - totalRealisasi : null;
    const totalPct = totalBudget > 0 ? (totalRealisasi / totalBudget) * 100 : null;
    return { totalBudget, totalRealisasi, totalSelisih, totalPct, budgetCount };
  }, [budgetData]);

  // ═══════════════════════════════════════════════
  // REPORT 4: Cash Flow
  // ═══════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════
  // REPORT 5: YoY Comparison
  // ═══════════════════════════════════════════════

  const hasPrevYear = prevMonthlyData.some((m) => m.income > 0 || m.expense > 0);

  const yoyItems = useMemo(() => {
    if (!hasPrevYear || compareYear === year) return [];

    const items: { name: string; prev: number; curr: number; change: number; pct: number | null; isPositive: boolean }[] = [];

    // Pemasukan
    const prevIncome = prevAnnualSummary.totalIncome;
    const currIncome = annualSummary.totalIncome;
    const incomeChange = currIncome - prevIncome;
    items.push({
      name: 'Pemasukan',
      prev: prevIncome,
      curr: currIncome,
      change: incomeChange,
      pct: prevIncome > 0 ? ((currIncome - prevIncome) / prevIncome) * 100 : null,
      isPositive: incomeChange >= 0,
    });

    // Pengeluaran
    const prevExpense = prevAnnualSummary.totalExpense;
    const currExpense = annualSummary.totalExpense;
    const expenseChange = currExpense - prevExpense;
    items.push({
      name: 'Pengeluaran',
      prev: prevExpense,
      curr: currExpense,
      change: expenseChange,
      pct: prevExpense > 0 ? ((currExpense - prevExpense) / prevExpense) * 100 : null,
      isPositive: expenseChange <= 0, // lower expense is better
    });

    // Surplus
    const prevSurplus = prevAnnualSummary.surplus;
    const currSurplus = annualSummary.surplus;
    const surplusChange = currSurplus - prevSurplus;
    items.push({
      name: 'Surplus',
      prev: prevSurplus,
      curr: currSurplus,
      change: surplusChange,
      pct: Math.abs(prevSurplus) > 0 ? ((currSurplus - prevSurplus) / Math.abs(prevSurplus)) * 100 : null,
      isPositive: surplusChange >= 0,
    });

    // Categories
    const allCatIds = new Set([...Object.keys(yearlyCategoryData), ...Object.keys(prevYearlyCategoryData)]);
    for (const catId of [...allCatIds].sort()) {
      const prevVal = prevYearlyCategoryData[catId] ?? 0;
      const currVal = yearlyCategoryData[catId] ?? 0;
      const catChange = currVal - prevVal;
      if (prevVal === 0 && currVal === 0) continue;
      items.push({
        name: getCategoryName(catId),
        prev: prevVal,
        curr: currVal,
        change: catChange,
        pct: prevVal > 0 ? ((currVal - prevVal) / prevVal) * 100 : null,
        isPositive: catChange <= 0, // lower expense is better for categories
      });
    }

    return items;
  }, [yearlyCategoryData, prevYearlyCategoryData, annualSummary, prevAnnualSummary, hasPrevYear, compareYear, year]);

  // ═══════════════════════════════════════════════
  // REPORT 6: Heatmap
  // ═══════════════════════════════════════════════

  const heatmapData = useMemo(() => {
    return monthlyData.map((d) => ({
      month: d.month,
      monthNum: d.monthNum,
      total: d.expense,
    }));
  }, [monthlyData]);

  const heatmapMin = useMemo(() => Math.min(...heatmapData.map((d) => d.total).filter((t) => t > 0), 0), [heatmapData]);
  const heatmapMax = useMemo(() => Math.max(...heatmapData.map((d) => d.total), 1), [heatmapData]);

  // ── Chart dimensions ──
  const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.income, d.expense, 1)), 1);
  const barMaxH = 80;

  // ── Has data check ──
  const hasData = monthlyData.some((m) => m.income > 0 || m.expense > 0);

  // ═══════════════════════════════════════════════
  // CSV Export
  // ═══════════════════════════════════════════════

  const handleExport = useCallback(() => {
    const lines: string[] = [];
    // BOM for Excel
    lines.push('\ufeff');

    // Title
    lines.push(`"LAPORAN KEUANGAN ${year}"`);
    lines.push(`"Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"`);
    lines.push('');

    // ── Ringkasan Tahunan ──
    lines.push('RINGKASAN TAHUNAN');
    lines.push('Item,Jumlah');
    lines.push(`Pemasukan,${csvEscape(annualSummary.totalIncome)}`);
    lines.push(`Pengeluaran,${csvEscape(annualSummary.totalExpense)}`);
    lines.push(`Surplus,${csvEscape(annualSummary.surplus)}`);
    lines.push('');

    // ── Rincian Bulanan ──
    lines.push('RINCIAN BULANAN');
    lines.push('Bulan,Pemasukan,Pengeluaran,Saldo');
    for (const d of monthlyData) {
      lines.push(`${csvEscape(getShortMonth(d.month))},${csvEscape(d.income)},${csvEscape(d.expense)},${csvEscape(d.balance)}`);
    }
    lines.push(
      `Total,${csvEscape(annualSummary.totalIncome)},${csvEscape(annualSummary.totalExpense)},${csvEscape(annualSummary.surplus)}`
    );
    lines.push('');

    // ── Per Kategori ──
    lines.push('LAPORAN PER KATEGORI');
    lines.push('Kategori,Total,Rata-rata/Bulan,% dari Total');
    for (const c of allCategories) {
      lines.push(`${csvEscape(c.name)},${csvEscape(c.total)},${csvEscape(c.avg)},${csvEscape(c.pct.toFixed(1))}`);
    }
    const catTotalPct = allCategories.reduce((s, c) => s + c.pct, 0);
    lines.push(`Total,${csvEscape(annualSummary.totalExpense)},,${csvEscape(catTotalPct.toFixed(1))}`);
    lines.push('');

    // ── Per Akun ──
    lines.push('LAPORAN PER AKUN');
    lines.push('Bulan,Suami,Istri,Bersama');
    for (const d of perAccountData) {
      lines.push(`${csvEscape(getShortMonth(d.month))},${csvEscape(d.suami)},${csvEscape(d.istri)},${csvEscape(d.bersama)}`);
    }
    lines.push(`Total,${csvEscape(perAccountTotals.suami)},${csvEscape(perAccountTotals.istri)},${csvEscape(perAccountTotals.bersama)}`);
    lines.push('');

    // ── Budget vs Aktual ──
    lines.push('BUDGET VS AKTUAL');
    lines.push('Bulan,Budget,Realisasi,Selisih,%');
    for (const d of budgetData) {
      lines.push(
        `${csvEscape(getShortMonth(d.month))},` +
        `${csvEscape(d.budget ?? 0)},${csvEscape(d.realisasi)},` +
        `${csvEscape(d.selisih ?? 0)},${csvEscape(d.pct !== null ? d.pct.toFixed(1) : 'N/A')}`
      );
    }
    lines.push(
      `Total,${csvEscape(budgetTotals.totalBudget)},${csvEscape(budgetTotals.totalRealisasi)},` +
      `${csvEscape(budgetTotals.totalSelisih ?? 0)},${csvEscape(budgetTotals.totalPct !== null ? budgetTotals.totalPct.toFixed(1) : 'N/A')}`
    );
    lines.push('');

    // ── Cash Flow ──
    lines.push('CASH FLOW STATEMENT');
    lines.push('Bulan,Saldo Awal,Pemasukan,Pengeluaran,Saldo Akhir');
    for (const d of cashFlowData) {
      lines.push(
        `${csvEscape(getShortMonth(d.month))},${csvEscape(d.saldoAwal)},` +
        `${csvEscape(d.pemasukan)},${csvEscape(d.pengeluaran)},${csvEscape(d.saldoAkhir)}`
      );
    }
    const lastCf = cashFlowData[cashFlowData.length - 1];
    if (lastCf) {
      lines.push(`Total,,${csvEscape(annualSummary.totalIncome)},${csvEscape(annualSummary.totalExpense)},${csvEscape(lastCf.saldoAkhir)}`);
    }
    lines.push('');

    // ── YoY Comparison ──
    if (yoyItems.length > 0) {
      lines.push('PERBANDINGAN YOY');
      lines.push(`Item,${compareYear},${year},Perubahan (Rp),Perubahan (%)`);
      for (const d of yoyItems) {
        lines.push(
          `${csvEscape(d.name)},${csvEscape(d.prev)},${csvEscape(d.curr)},` +
          `${csvEscape(d.change)},${csvEscape(d.pct !== null ? d.pct.toFixed(1) : 'N/A')}`
        );
      }
      lines.push('');
    }

    // ── Heatmap ──
    lines.push('HEATMAP TAHUNAN');
    lines.push('Bulan,Total Pengeluaran');
    for (const d of heatmapData) {
      lines.push(`${csvEscape(getShortMonth(d.month))},${csvEscape(d.total)}`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-keuangan-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    year, compareYear, annualSummary, monthlyData, allCategories,
    perAccountData, perAccountTotals, budgetData, budgetTotals,
    cashFlowData, yoyItems, heatmapData,
  ]);

  // ── Loading state ──
  if (!synced && email) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-white px-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-3">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mb-2" />
        <p className="text-sm font-medium text-gray-700">Memuat data...</p>
        <p className="text-xs text-gray-400 mt-1">Menyinkronkan dari cloud</p>
      </div>
    );
  }

  // ── Render ──
  return (
    <>
      <PageHeader
        title="Laporan Tahunan"
        rightAction={
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-xs active:bg-emerald-100 transition-colors"
            aria-label="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        }
      />

      <div className="px-3 pt-3 pb-8 space-y-3">

        {/* ─── Year Selector ─── */}
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
            aria-label="Tahun sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
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

        {/* ─── Compare Year Selector (YoY only) ─── */}
        {activeTab === 'yoy' && availableCompareYears.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
            <span className="text-[11px] font-medium text-gray-500">Bandingkan dengan</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompareYear((y) => y - 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
                aria-label="Tahun sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <span className="text-xs font-bold text-gray-900 tabular-nums">{compareYear}</span>
              <button
                onClick={() => setCompareYear((y) => y + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
                aria-label="Tahun berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Tab Navigation ─── */}
        <div className="flex overflow-x-auto gap-1 pb-0.5 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                  : 'bg-gray-100 text-gray-500 active:bg-gray-200'
              }`}
              aria-pressed={activeTab === tab.id}
            >
              <TabIcon tabId={tab.id} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Content ─── */}
        {hasData ? (
          <>
            {/* ═══ RINGKASAN ═══ */}
            {activeTab === 'ringkasan' && (
              <>
                {/* Annual Summary Bar */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <ArrowUpRight className="w-3 h-3 text-amber-500" />
                        <p className="text-[9px] font-medium text-amber-600">Pemasukan</p>
                      </div>
                      <p className="text-sm font-bold text-amber-900 tabular-nums">
                        {formatRupiah(annualSummary.totalIncome)}
                      </p>
                    </div>
                    <div className="text-center border-x border-gray-100">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <ArrowDownRight className="w-3 h-3 text-red-500" />
                        <p className="text-[9px] font-medium text-red-600">Pengeluaran</p>
                      </div>
                      <p className="text-sm font-bold text-red-900 tabular-nums">
                        {formatRupiah(annualSummary.totalExpense)}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Wallet className={`w-3 h-3 ${annualSummary.surplus >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                        <p className={`text-[9px] font-medium ${annualSummary.surplus >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {annualSummary.surplus >= 0 ? 'Surplus' : 'Defisit'}
                        </p>
                      </div>
                      <p className={`text-sm font-bold tabular-nums ${annualSummary.surplus >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                        {formatRupiah(Math.abs(annualSummary.surplus))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Monthly Bar Chart */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <h3 className="text-xs font-semibold text-gray-800 mb-2">Grafik Bulanan</h3>
                  <div className="flex items-end gap-1.5" style={{ height: `${barMaxH + 30}px` }}>
                    {monthlyData.map((d) => {
                      const expenseH = (d.expense / maxVal) * barMaxH;
                      const incomeH = (d.income / maxVal) * barMaxH;
                      return (
                        <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5 justify-end h-full">
                          {d.income > 0 && (
                            <div
                              className="w-full rounded-t-sm bg-amber-400 transition-all duration-300"
                              style={{ height: `${Math.max(incomeH, 2)}px` }}
                              title={`Pemasukan ${getMonthName(d.month)}: ${formatRupiah(d.income)}`}
                            />
                          )}
                          {d.expense > 0 && (
                            <div
                              className="w-full rounded-b-sm bg-red-400 transition-all duration-300"
                              style={{ height: `${Math.max(expenseH, 2)}px` }}
                              title={`Pengeluaran ${getMonthName(d.month)}: ${formatRupiah(d.expense)}`}
                            />
                          )}
                          {(d.income > 0 || d.expense > 0) && (
                            <span className="text-[7px] text-gray-400 mt-0.5 tabular-nums">
                              {d.month.slice(5)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                      <span className="text-[9px] text-gray-500">Pemasukan</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                      <span className="text-[9px] text-gray-500">Pengeluaran</span>
                    </div>
                  </div>
                </div>

                {/* Top Categories */}
                {topCategories.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                    <h3 className="text-xs font-semibold text-gray-800">Kategori Teratas {year}</h3>
                    <div className="space-y-2">
                      {topCategories.map((cat) => {
                        const pct = annualSummary.totalExpense > 0
                          ? (cat.total / annualSummary.totalExpense) * 100 : 0;
                        return (
                          <div key={cat.id}>
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                <span className="text-[11px] font-medium text-gray-800 truncate">{cat.name}</span>
                              </div>
                              <span className="text-[11px] font-semibold text-gray-900 tabular-nums flex-shrink-0 ml-2">
                                {formatRupiah(cat.total)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: cat.color, width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 tabular-nums w-7 text-right">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Monthly Breakdown Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-800">Rincian Bulanan</h3>
                  </div>
                  <THead cols="grid-cols-[70px_1fr_1fr_80px]" labels={['Bulan', 'Pemasukan', 'Pengeluaran', 'Saldo']} />
                  {monthlyData.map((d, i) => (
                    <TRow
                      key={d.month}
                      cols="grid-cols-[70px_1fr_1fr_80px]"
                      cells={[
                        getShortMonth(d.month),
                        { value: d.income, className: 'text-amber-700 font-medium' },
                        { value: d.expense, className: 'text-red-700 font-medium' },
                        {
                          value: d.balance,
                          className: `font-semibold ${d.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`,
                        },
                      ]}
                      isEven={i % 2 === 0}
                      isLast={i === monthlyData.length - 1}
                    />
                  ))}
                  <TFooter
                    cols="grid-cols-[70px_1fr_1fr_80px]"
                    cells={[
                      'Total',
                      { value: annualSummary.totalIncome, className: 'text-amber-800' },
                      { value: annualSummary.totalExpense, className: 'text-red-800' },
                      {
                        value: annualSummary.surplus,
                        className: annualSummary.surplus >= 0 ? 'text-emerald-800' : 'text-red-800',
                      },
                    ]}
                  />
                </div>
              </>
            )}

            {/* ═══ KATEGORI ═══ */}
            {activeTab === 'kategori' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-xs font-semibold text-gray-800">Laporan Per Kategori {year}</h3>
                </div>
                <THead
                  cols="grid-cols-[1fr_100px_100px_70px]"
                  labels={['Kategori', 'Total', 'Rata/bln', '%']}
                />
                {allCategories.map((cat, i) => (
                  <TRow
                    key={cat.id}
                    cols="grid-cols-[1fr_100px_100px_70px]"
                    cells={[
                      { value: cat.name, className: 'truncate' },
                      { value: cat.total, className: 'text-gray-800 font-medium' },
                      { value: cat.avg, className: 'text-gray-600' },
                      { value: `${cat.pct.toFixed(1)}%`, className: 'text-gray-500' },
                    ]}
                    isEven={i % 2 === 0}
                    isLast={i === allCategories.length - 1}
                  />
                ))}
                <TFooter
                  cols="grid-cols-[1fr_100px_100px_70px]"
                  cells={[
                    'Total',
                    { value: annualSummary.totalExpense, className: 'text-gray-800' },
                    '',
                    { value: '100%', className: 'text-gray-600' },
                  ]}
                />
              </div>
            )}

            {/* ═══ AKUN ═══ */}
            {activeTab === 'akun' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-xs font-semibold text-gray-800">Laporan Per Akun {year}</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Pengeluaran berdasarkan rekening</p>
                </div>
                <THead
                  cols="grid-cols-[70px_1fr_1fr_1fr]"
                  labels={['Bulan', 'Suami', 'Istri', 'Bersama']}
                />
                {perAccountData.map((d, i) => {
                  const hasData = d.suami > 0 || d.istri > 0 || d.bersama > 0;
                  return (
                    <TRow
                      key={d.month}
                      cols="grid-cols-[70px_1fr_1fr_1fr]"
                      cells={[
                        getShortMonth(d.month),
                        { value: hasData ? d.suami : '-', className: 'text-blue-700 font-medium' },
                        { value: hasData ? d.istri : '-', className: 'text-pink-700 font-medium' },
                        { value: hasData ? d.bersama : '-', className: 'text-emerald-700 font-medium' },
                      ]}
                      isEven={i % 2 === 0}
                      isLast={i === perAccountData.length - 1}
                    />
                  );
                })}
                <TFooter
                  cols="grid-cols-[70px_1fr_1fr_1fr]"
                  cells={[
                    'Total',
                    { value: perAccountTotals.suami, className: 'text-blue-800' },
                    { value: perAccountTotals.istri, className: 'text-pink-800' },
                    { value: perAccountTotals.bersama, className: 'text-emerald-800' },
                  ]}
                />
              </div>
            )}

            {/* ═══ BUDGET ═══ */}
            {activeTab === 'budget' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-xs font-semibold text-gray-800">Budget vs Aktual {year}</h3>
                </div>
                <THead
                  cols="grid-cols-[70px_1fr_1fr_1fr_70px]"
                  labels={['Bulan', 'Budget', 'Realisasi', 'Selisih', '%']}
                />
                {budgetData.map((d, i) => {
                  const hasBudget = d.budget !== null;
                  const pctClass = !hasBudget
                    ? 'text-gray-400'
                    : d.pct !== null && d.pct <= 80
                      ? 'text-emerald-600'
                      : d.pct !== null && d.pct <= 100
                        ? 'text-amber-600'
                        : 'text-red-600';
                  const selisihClass = !hasBudget
                    ? 'text-gray-400'
                    : d.selisih !== null && d.selisih >= 0
                      ? 'text-emerald-600'
                      : 'text-red-600';
                  return (
                    <TRow
                      key={d.month}
                      cols="grid-cols-[70px_1fr_1fr_1fr_70px]"
                      cells={[
                        getShortMonth(d.month),
                        { value: hasBudget ? d.budget! : '-', className: 'text-gray-800 font-medium' },
                        { value: d.realisasi, className: 'text-red-700 font-medium' },
                        { value: hasBudget ? d.selisih! : '-', className: `${selisihClass} font-medium` },
                        { value: hasBudget && d.pct !== null ? `${d.pct.toFixed(0)}%` : '-', className: `${pctClass} font-medium` },
                      ]}
                      isEven={i % 2 === 0}
                      isLast={i === budgetData.length - 1}
                    />
                  );
                })}
                <TFooter
                  cols="grid-cols-[70px_1fr_1fr_1fr_70px]"
                  cells={[
                    'Total',
                    {
                      value: budgetTotals.budgetCount > 0 ? budgetTotals.totalBudget : '-',
                      className: 'text-gray-800',
                    },
                    { value: budgetTotals.totalRealisasi, className: 'text-red-800' },
                    {
                      value: budgetTotals.totalSelisih !== null ? budgetTotals.totalSelisih : '-',
                      className: budgetTotals.totalSelisih !== null && budgetTotals.totalSelisih >= 0
                        ? 'text-emerald-800' : 'text-red-800',
                    },
                    {
                      value: budgetTotals.totalPct !== null ? `${budgetTotals.totalPct.toFixed(0)}%` : '-',
                      className: budgetTotals.totalPct !== null
                        ? budgetTotals.totalPct <= 80
                          ? 'text-emerald-800'
                          : budgetTotals.totalPct <= 100
                            ? 'text-amber-800'
                            : 'text-red-800'
                        : 'text-gray-800',
                    },
                  ]}
                />
              </div>
            )}

            {/* ═══ CASH FLOW ═══ */}
            {activeTab === 'cashflow' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-xs font-semibold text-gray-800">Cash Flow {year}</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Saldo awal bulan 1 = 0 (sejak awal tahun)</p>
                </div>
                <THead
                  cols="grid-cols-[70px_1fr_1fr_1fr_1fr]"
                  labels={['Bulan', 'Saldo Awal', 'Pemasukan', 'Pengeluaran', 'Saldo Akhir']}
                />
                {cashFlowData.map((d, i) => {
                  const hasData = d.pemasukan > 0 || d.pengeluaran > 0;
                  return (
                    <TRow
                      key={d.month}
                      cols="grid-cols-[70px_1fr_1fr_1fr_1fr]"
                      cells={[
                        getShortMonth(d.month),
                        { value: d.saldoAwal, className: 'text-gray-500' },
                        { value: hasData ? d.pemasukan : '-', className: 'text-amber-700 font-medium' },
                        { value: hasData ? d.pengeluaran : '-', className: 'text-red-700 font-medium' },
                        {
                          value: hasData ? d.saldoAkhir : '-',
                          className: `font-semibold ${d.saldoAkhir >= 0 ? 'text-emerald-700' : 'text-red-700'}`,
                        },
                      ]}
                      isEven={i % 2 === 0}
                      isLast={i === cashFlowData.length - 1}
                    />
                  );
                })}
                <TFooter
                  cols="grid-cols-[70px_1fr_1fr_1fr_1fr]"
                  cells={[
                    'Total',
                    '',
                    { value: annualSummary.totalIncome, className: 'text-amber-800' },
                    { value: annualSummary.totalExpense, className: 'text-red-800' },
                    {
                      value: cashFlowData.length > 0 ? cashFlowData[cashFlowData.length - 1].saldoAkhir : 0,
                      className: cashFlowData.length > 0 && cashFlowData[cashFlowData.length - 1].saldoAkhir >= 0
                        ? 'text-emerald-800' : 'text-red-800',
                    },
                  ]}
                />
              </div>
            )}

            {/* ═══ YOY ═══ */}
            {activeTab === 'yoy' && (
              <>
                {hasPrevYear && compareYear !== year ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-xs font-semibold text-gray-800">
                        Perbandingan {compareYear} vs {year}
                      </h3>
                    </div>
                    <THead
                      cols="grid-cols-[1fr_1fr_1fr_1fr_80px]"
                      labels={['Item', String(compareYear), String(year), 'Perubahan (Rp)', 'Perubahan (%)']}
                    />
                    {yoyItems.map((item, i) => {
                      const changeStr = item.change >= 0 ? `+${formatRupiah(item.change)}` : formatRupiah(item.change);
                      const pctStr = item.pct !== null
                        ? `${item.pct >= 0 ? '+' : ''}${item.pct.toFixed(1)}%`
                        : '-';
                      return (
                        <TRow
                          key={item.name}
                          cols="grid-cols-[1fr_1fr_1fr_1fr_80px]"
                          cells={[
                            { value: item.name, className: 'truncate' },
                            { value: item.prev, className: 'text-gray-700' },
                            { value: item.curr, className: 'text-gray-800 font-medium' },
                            {
                              value: changeStr,
                              className: `font-medium ${item.isPositive ? 'text-emerald-700' : 'text-red-700'}`,
                            },
                            {
                              value: pctStr,
                              className: `font-medium ${item.isPositive ? 'text-emerald-700' : 'text-red-700'}`,
                            },
                          ]}
                          isEven={i % 2 === 0}
                          isLast={i === yoyItems.length - 1}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-500">
                      {compareYear === year
                        ? 'Pilih tahun yang berbeda untuk perbandingan.'
                        : `Belum ada data untuk tahun ${compareYear}.`}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Data tersedia: {availableYears.filter((y) => y !== year).join(', ')}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ═══ HEATMAP ═══ */}
            {activeTab === 'heatmap' && (
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <h3 className="text-xs font-semibold text-gray-800 mb-3">Heatmap Pengeluaran {year}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {heatmapData.map((d) => {
                    const color = d.total > 0
                      ? getHeatmapColor(d.total, heatmapMin, heatmapMax)
                      : '#F3F4F6';
                    const textColor = d.total > heatmapMax * 0.6 ? 'text-white' : 'text-gray-800';
                    return (
                      <div
                        key={d.month}
                        className="rounded-lg p-2.5 text-center transition-all"
                        style={{ backgroundColor: color }}
                      >
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${textColor}`}>
                          {getShortMonth(d.month)}
                        </p>
                        <p className={`text-xs font-bold mt-0.5 tabular-nums ${textColor}`}>
                          {d.total > 0 ? formatRupiah(d.total) : '-'}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
                    <span className="text-[9px] text-gray-500">Rendah</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
                    <span className="text-[9px] text-gray-500">Sedang</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }} />
                    <span className="text-[9px] text-gray-500">Tinggi</span>
                  </div>
                </div>
              </div>
            )}
          </>
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
