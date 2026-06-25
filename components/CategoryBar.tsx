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
}

export function CategoryBar({ data, total, showPercentage = true }: CategoryBarProps) {
  const items: CategoryTotal[] = CATEGORIES.map((cat) => ({
    categoryId: cat.id,
    total: data[cat.id] || 0,
    percentage: total > 0 ? ((data[cat.id] || 0) / total) * 100 : 0,
  }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Belum ada pengeluaran bulan ini
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.categoryId} className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: getCategoryColor(item.categoryId) + '20' }}
              >
                <CategoryIcon
                  categoryId={item.categoryId}
                  className="w-3.5 h-3.5"
                  style={{ color: getCategoryColor(item.categoryId) }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 truncate">
                {getCategoryName(item.categoryId)}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {formatRupiah(item.total)}
              </span>
              {showPercentage && (
                <span className="text-xs text-gray-400 w-10 text-right tabular-nums">
                  {item.percentage.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: getCategoryColor(item.categoryId),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
