'use client';

import { CATEGORIES, getCategoryColor, getCategoryName } from '@/lib/types';
import { formatRupiah } from '@/lib/format';
import { CategoryIcon } from './CategoryIcon';

interface CategoryTotal {
  categoryId: string;
  total: number;
  percentage: number;
}

interface CategoryBarProps {
  data: Record<string, number>;
  total: number;
  showPercentage?: boolean;
  categoryBudgets?: Record<string, number>;
}

export function CategoryBar({ data, total, showPercentage = true, categoryBudgets }: CategoryBarProps) {
  const items: CategoryTotal[] = CATEGORIES.map((cat) => ({
    categoryId: cat.id,
    total: data[cat.id] || 0,
    percentage: total > 0 ? ((data[cat.id] || 0) / total) * 100 : 0,
  }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-xs">
        Belum ada pengeluaran bulan ini
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-[1fr_70px_50px] gap-0 border-b border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
        <div className="px-2.5 py-1.5 border-r border-gray-200">Kategori</div>
        <div className="px-2.5 py-1.5 border-r border-gray-200 text-right">Nominal</div>
        <div className="px-2.5 py-1.5 text-right">%</div>
      </div>
      {items.map((item, i) => (
        <div key={item.categoryId} className={`grid grid-cols-[1fr_70px_50px] gap-0 text-xs border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
          <div className="px-2.5 py-2 border-r border-gray-100 flex items-center gap-1.5 min-w-0">
            <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: getCategoryColor(item.categoryId) }} />
            <span className="text-gray-700 truncate">{getCategoryName(item.categoryId)}</span>
            {categoryBudgets && categoryBudgets[item.categoryId] > 0 && (
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                item.total >= categoryBudgets[item.categoryId]
                  ? 'bg-red-500'
                  : item.total >= categoryBudgets[item.categoryId] * 0.8
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`} />
            )}
          </div>
          <div className="px-2.5 py-2 border-r border-gray-100 text-right font-semibold text-gray-900 tabular-nums">
            {formatRupiah(item.total)}
          </div>
          <div className="px-2.5 py-2 text-right text-gray-400 tabular-nums">
            {item.percentage.toFixed(1)}%
          </div>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_70px_50px] gap-0 border-t border-gray-200 bg-gray-50 text-xs font-bold text-gray-900">
        <div className="px-2.5 py-1.5 border-r border-gray-200 text-gray-500 font-medium">Total</div>
        <div className="px-2.5 py-1.5 border-r border-gray-200 text-right tabular-nums">{formatRupiah(total)}</div>
        <div className="px-2.5 py-1.5 text-right tabular-nums">100%</div>
      </div>
    </div>
  );
}
