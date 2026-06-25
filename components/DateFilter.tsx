'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getMonthName, prevMonth, nextMonth, getTodayString } from '@/lib/format';

type FilterMode = 'month' | 'week' | 'range';

interface DateFilterProps {
  month: string;
  onMonthChange: (month: string) => void;
  dateRange: { start: string; end: string } | null;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
}

export function DateFilter({
  month,
  onMonthChange,
  dateRange,
  onDateRangeChange,
  filterMode,
  onFilterModeChange,
}: DateFilterProps) {
  const today = getTodayString();

  const handleModeChange = (mode: FilterMode) => {
    onFilterModeChange(mode);
    if (mode === 'week') {
      const d = new Date();
      const dayOfWeek = d.getDay();
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      const end = new Date(mon);
      end.setDate(mon.getDate() + 6);
      onDateRangeChange({
        start: fmt(mon),
        end: fmt(end),
      });
    } else if (mode === 'month') {
      onDateRangeChange(null);
    }
  };

  const fmt = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const handlePrev = () => {
    if (filterMode === 'month') {
      onMonthChange(prevMonth(month));
    } else if (dateRange) {
      const days = diffDays(dateRange.start, dateRange.end);
      const s = shiftDays(dateRange.start, -days - 1);
      const e = shiftDays(dateRange.end, -days - 1);
      onDateRangeChange({ start: s, end: e });
    }
  };

  const handleNext = () => {
    if (filterMode === 'month') {
      onMonthChange(nextMonth(month));
    } else if (dateRange) {
      const days = diffDays(dateRange.start, dateRange.end);
      const s = shiftDays(dateRange.start, days + 1);
      const e = shiftDays(dateRange.end, days + 1);
      onDateRangeChange({ start: s, end: e });
    }
  };

  const diffDays = (a: string, b: string): number => {
    return Math.round(
      (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const shiftDays = (d: string, n: number): string => {
    const date = new Date(d);
    date.setDate(date.getDate() + n);
    return fmt(date);
  };

  const rangeLabel = dateRange
    ? `${formatDateShort(dateRange.start)} - ${formatDateShort(dateRange.end)}`
    : getMonthName(month);

  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
          aria-label="Sebelumnya"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-base font-semibold text-gray-800">{rangeLabel}</h2>
        <button
          onClick={handleNext}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
          aria-label="Berikutnya"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {([
          { key: 'month' as const, label: 'Bulan Ini', icon: null },
          { key: 'week' as const, label: 'Minggu Ini', icon: null },
          { key: 'range' as const, label: 'Custom', icon: Calendar },
        ] as const).map((opt) => {
          const active = filterMode === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => handleModeChange(opt.key)}
              className={`flex items-center gap-1 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 active:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Date Range Pickers */}
      {filterMode === 'range' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 mb-1 font-medium">Dari</label>
            <input
              type="date"
              value={dateRange?.start || today}
              onChange={(e) =>
                onDateRangeChange({
                  start: e.target.value,
                  end: dateRange?.end || today,
                })
              }
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 mb-1 font-medium">Ke</label>
            <input
              type="date"
              value={dateRange?.end || today}
              onChange={(e) =>
                onDateRangeChange({
                  start: dateRange?.start || today,
                  end: e.target.value,
                })
              }
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
