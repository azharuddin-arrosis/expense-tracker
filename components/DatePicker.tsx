'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

interface DatePickerProps {
  /** Current value in YYYY-MM-DD format */
  value: string;
  /** Called with the new date in YYYY-MM-DD format */
  onChange: (date: string) => void;
  /** Accent color: 'out' (default, emerald) or 'in' (amber) */
  flow?: 'in' | 'out';
}

// ---------- helpers ----------

function parseDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

function formatYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ---------- component ----------

export function DatePicker({ value, onChange, flow = 'out' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const parsedValue = parseDate(value);
  const today = new Date();
  const todayStr = formatYYYYMMDD(today);

  // Calendar view state
  const initialView = parsedValue ?? today;
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const [highlightDay, setHighlightDay] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dim = daysInMonth(viewYear, viewMonth);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  // Clamp highlight when month changes (e.g. 31 → 30)
  useEffect(() => {
    if (highlightDay !== null && highlightDay > dim) {
      setHighlightDay(dim);
    }
  }, [viewYear, viewMonth, dim, highlightDay]);

  // Accent colour classes (literal strings so Tailwind v4 can scan them)
  const accent =
    flow === 'in'
      ? {
          selected: 'bg-amber-500 text-white',
          hovered: 'bg-amber-50 text-amber-600',
          focus: 'focus:ring-amber-500',
        }
      : {
          selected: 'bg-emerald-500 text-white',
          hovered: 'bg-emerald-50 text-emerald-600',
          focus: 'focus:ring-emerald-500',
        };

  // ---------- calendar grid ----------

  const grid: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let i = 1; i <= dim; i++) grid.push(i);

  // ---------- positioning ----------

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const h = 268; // estimated calendar height
    const below = window.innerHeight - rect.bottom - 8;
    const top =
      below >= h ? rect.bottom + 4 : Math.max(8, rect.top - h - 4);

    setDropdownStyle({
      position: 'fixed',
      top,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 252)),
      width: 244,
      zIndex: 999,
    });
  }, []);

  const openDropdown = () => {
    const ref = parsedValue ?? today;
    setViewYear(ref.getFullYear());
    setViewMonth(ref.getMonth());
    setHighlightDay(ref.getDate());
    setIsOpen(true);
  };

  // Position on open
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    requestAnimationFrame(updatePosition); // account for paint
  }, [isOpen, updatePosition]);

  // Reposition on scroll / resize
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // ---------- click outside ----------

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const el = e.target as Node;
      if (
        containerRef.current?.contains(el) ||
        dropdownRef.current?.contains(el)
      )
        return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // ---------- actions ----------

  const selectDate = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}-${m}-${d}`);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // ---------- keyboard ----------

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    const navigate = (delta: number) => {
      if (highlightDay === null) return;
      const d = new Date(viewYear, viewMonth, highlightDay);
      d.setDate(d.getDate() + delta);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setHighlightDay(d.getDate());
    };

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        navigate(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigate(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigate(-7);
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigate(7);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightDay !== null) selectDate(highlightDay);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
    }
  };

  // ---------- render ----------

  const displayValue = parsedValue
    ? parsedValue.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            triggerRef.current?.focus();
          } else {
            openDropdown();
          }
        }}
        className={`w-full h-8 flex items-center gap-2 px-2.5 rounded-lg border border-gray-200 transition-colors text-xs ${
          displayValue ? 'text-gray-900' : 'text-gray-400'
        } focus:outline-none focus:ring-2 focus:border-transparent ${accent.focus}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="flex-1 text-left truncate">
          {displayValue ?? 'Pilih tanggal...'}
        </span>
      </button>

      {/* Calendar popup via portal — escapes BottomSheet overflow clipping */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 select-none outline-none"
            tabIndex={-1}
            role="dialog"
            aria-label="Pilih tanggal"
          >
            {/* Month header */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-900">
                {new Date(viewYear, viewMonth).toLocaleDateString('id-ID', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day name headers */}
            <div className="grid grid-cols-7 mb-0.5">
              {DAY_NAMES.map((name) => (
                <div
                  key={name}
                  className="w-7 h-5 flex items-center justify-center text-[9px] font-medium text-gray-400 uppercase"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
              {grid.map((day, idx) => {
                if (day === null)
                  return <div key={`e-${idx}`} className="w-7 h-7" />;

                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === value;
                const isHighlighted = highlightDay === day;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => selectDate(day)}
                    onMouseEnter={() => setHighlightDay(day)}
                    className={`w-7 h-7 flex items-center justify-center text-[10px] rounded-full transition-colors outline-none ${
                      isSelected
                        ? accent.selected
                        : isHighlighted
                          ? accent.hovered
                          : 'text-gray-700 hover:bg-gray-100'
                    } ${isToday && !isSelected ? 'ring-1 ring-gray-300' : ''}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
