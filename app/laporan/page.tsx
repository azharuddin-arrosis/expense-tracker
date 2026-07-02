'use client';

import Link from 'next/link';
import {
  BarChart3,
  PieChart,
  Users,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Grid3X3,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface ReportItem {
  label: string;
  route: string;
  icon: typeof BarChart3;
  description: string;
}

const REPORTS: ReportItem[] = [
  {
    label: 'Ringkasan Tahunan',
    route: '/laporan/ringkasan',
    icon: BarChart3,
    description: 'Grafik, top kategori, rincian bulanan',
  },
  {
    label: 'Per Kategori',
    route: '/laporan/kategori',
    icon: PieChart,
    description: 'Breakdown per kategori setahun',
  },
  {
    label: 'Per Akun',
    route: '/laporan/akun',
    icon: Users,
    description: 'Transaksi suami/istri/bersama',
  },
  {
    label: 'Budget vs Aktual',
    route: '/laporan/budget',
    icon: DollarSign,
    description: 'Perbandingan budget & realisasi',
  },
  {
    label: 'Cash Flow',
    route: '/laporan/cashflow',
    icon: TrendingDown,
    description: 'Arus kas bulanan',
  },
  {
    label: 'YoY Comparison',
    route: '/laporan/yoy',
    icon: TrendingUp,
    description: 'Bandingkan 2 tahun',
  },
  {
    label: 'Heatmap',
    route: '/laporan/heatmap',
    icon: Grid3X3,
    description: 'Visual grid warna pengeluaran',
  },
];

export default function LaporanMenuPage() {
  return (
    <>
      <PageHeader title="Laporan" />

      <div className="px-3 pt-3 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.route}
                href={report.route}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 active:bg-emerald-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900">{report.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{report.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
