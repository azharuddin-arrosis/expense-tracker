'use client';

import {
  Utensils,
  Car,
  ShoppingCart,
  Receipt,
  Gamepad2,
  Heart,
  MoreHorizontal,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  makanan: Utensils,
  transport: Car,
  belanja: ShoppingCart,
  tagihan: Receipt,
  hiburan: Gamepad2,
  kesehatan: Heart,
  lainnya: MoreHorizontal,
};

interface CategoryIconProps {
  categoryId: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CategoryIcon({ categoryId, className, style }: CategoryIconProps) {
  const Icon = iconMap[categoryId] ?? MoreHorizontal;
  return <Icon className={className} style={style} />;
}
