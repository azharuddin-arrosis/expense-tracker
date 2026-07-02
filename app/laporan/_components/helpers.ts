import { getExpenseByPeriod, getIncomeByPeriod } from '@/lib/storage';
import { getMonthName } from '@/lib/format';

export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function computeMonthData(year: number, monthNum: number) {
  const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
  const exps = getExpenseByPeriod(monthStr);
  const incs = getIncomeByPeriod(monthStr);
  const expense = exps.reduce((s, e) => s + e.amount, 0);
  const income = incs.reduce((s, e) => s + e.amount, 0);
  return { month: monthStr, monthNum, expense, income, balance: income - expense };
}

export function getShortMonth(monthStr: string): string {
  return getMonthName(monthStr).slice(0, 3);
}

export function getHeatmapColor(value: number, min: number, max: number): string {
  if (max === min) return '#10B981';
  const ratio = (value - min) / (max - min);
  if (ratio < 0.5) {
    const t = ratio / 0.5;
    const r = Math.round(0x10 + (0xf5 - 0x10) * t);
    const g = Math.round(0xb9 - (0xb9 - 0x9e) * t);
    const b = Math.round(0x81 - (0x81 - 0x0b) * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = (ratio - 0.5) / 0.5;
  const r = Math.round(0xf5 + (0xef - 0xf5) * t);
  const g = Math.round(0x9e - (0x9e - 0x44) * t);
  const b = Math.round(0x0b + (0x44 - 0x0b) * t);
  return `rgb(${r},${g},${b})`;
}

export function csvEscape(val: string | number): string {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
