'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getMonthName, prevMonth, nextMonth, getTodayString } from '@/lib/format';
import { getPeriodLabel } from '@/lib/types';
import { getPeriodSettings } from '@/lib/storage';

type FilterMode = 'month' | 'week' | 'range';

interface DateFilterProps {
  month: string;
  onMonthChange: (month: string) => void;
  dateRange: { start: string; end: string } | null;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
}

const filterOptions: { key: FilterMode; label: string }[] = [
  { key: 'month', label: 'Bulan' },
  { key: 'week', label: 'Minggu' },
  { key: 'range', label: 'Custom' },
];

export function DateFilter({
  month,
  onMonthChange,
  dateRange,
  onDateRangeChange,
  filterMode,
  onFilterModeChange,
}: DateFilterProps) {
  const today = getTodayString();
  const [showPickers, setShowPickers] = useState(filterMode === 'range');

  const fmt = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const handleModeChange = (mode: FilterMode) => {
    onFilterModeChange(mode);
    setShowPickers(mode === 'range');
    if (mode === 'week') {
      const d = new Date();
      const dayOfWeek = d.getDay();
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      const end = new Date(mon);
      end.setDate(mon.getDate() + 6);
      onDateRangeChange({ start: fmt(mon), end: fmt(end) });
    } else if (mode === 'month') {
      onDateRangeChange(null);
    }
  };

  const handlePrev = () => {
    if (filterMode === 'month') onMonthChange(prevMonth(month));
    else if (dateRange) {
      const days = diffDays(dateRange.start, dateRange.end);
      onDateRangeChange({ start: shiftDays(dateRange.start, -days - 1), end: shiftDays(dateRange.end, -days - 1) });
    }
  };

  const handleNext = () => {
    if (filterMode === 'month') onMonthChange(nextMonth(month));
    else if (dateRange) {
      const days = diffDays(dateRange.start, dateRange.end);
      onDateRangeChange({ start: shiftDays(dateRange.start, days + 1), end: shiftDays(dateRange.end, days + 1) });
    }
  };

  const diffDays = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
  const shiftDays = (d: string, n: number) => { const date = new Date(d); date.setDate(date.getDate() + n); return fmt(date); };

  const periodLabel = useMemo(() => {
    const settings = getPeriodSettings();
    if (settings.startDay === 1 && settings.endDay >= 31) return getMonthName(month);
    return getPeriodLabel(month, settings);
  }, [month]);

  const rangeLabel = dateRange && filterMode !== 'month'
    ? `${formatDateShort(dateRange.start)} - ${formatDateShort(dateRange.end)}`
    : periodLabel;

  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-2">
      {/* Row 1: Navigation + Filter Mode + Date Range */}
      <div className="flex items-center gap-1.5">
        <button onClick={handlePrev} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors flex-shrink-0" aria-label="Sebelumnya">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>

        <span className="flex-1 text-center text-xs font-semibold text-gray-800 truncate px-1">
          {rangeLabel}
        </span>

        <button onClick={handleNext} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors flex-shrink-0" aria-label="Berikutnya">
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        <div className="flex gap-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleModeChange(opt.key)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                filterMode === opt.key
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-500 active:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Date Range Pickers (only when range mode) */}
      {showPickers && (
        <div className="flex gap-2 pt-1">
          <div className="flex-1">
            <input
              type="date"
              value={dateRange?.start || today}
              onChange={(e) => onDateRangeChange({ start: e.target.value, end: dateRange?.end || today })}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-gray-400 self-center">-</span>
          <div className="flex-1">
            <input
              type="date"
              value={dateRange?.end || today}
              onChange={(e) => onDateRangeChange({ start: dateRange?.start || today, end: e.target.value })}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
