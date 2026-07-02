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

      <div className="px-3 pt-3 pb-8 space-y-3">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.route}
                href={report.route}
                className="flex items-center gap-2.5 px-3 py-2.5 active:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECFDF5' }}>
                  <Icon className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">{report.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{report.description}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
