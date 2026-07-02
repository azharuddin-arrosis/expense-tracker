'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  id: string;
  name: string;
  color: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  flow?: 'in' | 'out';
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih kategori...',
  flow = 'out',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(filtered.length * 34 + 44, 240);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const top =
      spaceBelow >= estimatedHeight
        ? rect.bottom + 4
        : Math.max(8, rect.top - estimatedHeight - 4);

    setDropdownStyle({
      position: 'fixed',
      top,
      left: rect.left,
      width: rect.width,
      zIndex: 999,
    });
  };

  // Open dropdown
  const openDropdown = () => {
    setIsOpen(true);
    setSearch('');
    setHighlightIdx(-1);
  };

  // Position & focus on open
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [isOpen]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const selectOption = (id: string) => {
    onChange(id);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1,
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < filtered.length) {
          selectOption(filtered[highlightIdx].id);
        } else if (filtered.length === 1) {
          selectOption(filtered[0].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
    }
  };

  const accent =
    flow === 'in'
      ? {
          focus: 'focus:ring-amber-500',
          bg: 'bg-amber-50',
          text: 'text-amber-900',
          selected: 'text-amber-600',
        }
      : {
          focus: 'focus:ring-emerald-500',
          bg: 'bg-emerald-50',
          text: 'text-emerald-900',
          selected: 'text-emerald-600',
        };

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className={`w-full h-8 flex items-center gap-2 px-2.5 rounded-lg border border-gray-200 transition-colors text-xs ${
          selected ? 'text-gray-900' : 'text-gray-400'
        } focus:outline-none focus:ring-2 focus:border-transparent ${accent.focus}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selected ? (
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: selected.color }}
            />
            <span className="flex-1 text-left truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left">{placeholder}</span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown via Portal (escapes BottomSheet overflow clipping) */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
            role="listbox"
          >
            {/* Search Input */}
            <div className="relative border-b border-gray-100">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIdx(-1);
                }}
                placeholder="Cari kategori..."
                className="w-full h-8 pl-8 pr-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
              />
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto py-0.5">
              {filtered.length === 0 ? (
                <div className="px-2.5 py-3 text-xs text-gray-400 text-center">
                  Kategori tidak ditemukan
                </div>
              ) : (
                filtered.map((opt, idx) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={value === opt.id}
                    onClick={() => selectOption(opt.id)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors ${
                      highlightIdx === idx
                        ? `${accent.bg} ${accent.text}`
                        : 'text-gray-700 hover:bg-gray-50'
                    } ${value === opt.id ? 'font-medium' : ''}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                    <span className="flex-1 truncate">{opt.name}</span>
                    {value === opt.id && (
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 ${accent.selected}`}
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
