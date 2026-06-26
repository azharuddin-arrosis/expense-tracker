'use client';

import {
  Utensils,
  Car,
  ShoppingCart,
  Receipt,
  GraduationCap,
  Landmark,
  Home,
  Shirt,
  Smartphone,
  ShieldCheck,
  Heart,
  Baby,
  Sparkles,
  HeartHandshake,
  PawPrint,
  CookingPot,
  Dumbbell,
  Gamepad2,
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
  sekolah: GraduationCap,
  cicilan: Landmark,
  rumah: Home,
  pakaian: Shirt,
  pulsa: Smartphone,
  asuransi: ShieldCheck,
  kesehatan: Heart,
  bayi: Baby,
  perawatan: Sparkles,
  sosial: HeartHandshake,
  hewan: PawPrint,
  dapur: CookingPot,
  olahraga: Dumbbell,
  hiburan: Gamepad2,
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
