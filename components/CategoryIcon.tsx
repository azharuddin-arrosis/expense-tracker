'use client';

import {
  Utensils,
  Car,
  ShoppingCart,
  Receipt,
  Gamepad2,
  Heart,
  MoreHorizontal,
  Wallet,
  Briefcase,
  Building2,
  TrendingUp,
  Gift,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  // Expense icons
  makanan: Utensils,
  transport: Car,
  belanja: ShoppingCart,
  tagihan: Receipt,
  hiburan: Gamepad2,
  kesehatan: Heart,
  lainnya: MoreHorizontal,
  // Income icons
  gaji: Wallet,
  freelance: Briefcase,
  bisnis: Building2,
  investasi: TrendingUp,
  hadiah: Gift,
  lainnya_in: MoreHorizontal,
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
