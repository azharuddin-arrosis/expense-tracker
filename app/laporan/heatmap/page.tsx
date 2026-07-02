'use client';

import { useMemo, useState, useCallback } from 'react';
import { Grid3X3, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { formatRupiah } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { MONTHS, computeMonthData, getShortMonth, csvEscape, getHeatmapColor } from '../_components/helpers';

export default function HeatmapPage() {
  const { refreshKey } = useAppContext();
  const { synced, email } = useSyncOnMount([refreshKey]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);

  const monthlyData = useMemo(() => {
    if (!synced && email) return [];
    return MONTHS.map((m) => computeMonthData(year, m));
  }, [year, refreshKey, synced, email]);

  const heatmapData = useMemo(() => {
    return monthlyData.map((d) => ({
      month: d.month,
      monthNum: d.monthNum,
      total: d.expense,
    }));
  }, [monthlyData]);

  const heatmapMin = useMemo(() => Math.min(...heatmapData.map((d) => d.total).filter((t) => t > 0), 0), [heatmapData]);
  const heatmapMax = useMemo(() => Math.max(...heatmapData.map((d) => d.total), 1), [heatmapData]);

  const hasData = heatmapData.some((d) => d.total > 0);

  const handleExport = useCallback(() => {
    const lines: string[] = [];
    lines.push('\ufeff');
    lines.push(`"HEATMAP ${year}"`);
    lines.push(`"Diekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}"`);
    lines.push('');
    lines.push('Bulan,Total Pengeluaran');
    for (const d of heatmapData) {
      lines.push(`${csvEscape(getShortMonth(d.month))},${csvEscape(d.total)}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatmap-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [year, heatmapData]);

  if (!synced && email) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-white px-6">
        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mb-2" />
        <p className="text-sm font-medium text-gray-700">Memuat data...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Heatmap"
        backHref="/laporan"
        rightAction={
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-xs active:bg-emerald-100 transition-colors"
            aria-label="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        }
      />

      <div className="px-3 pt-3 pb-8 space-y-3">
        {/* Year Selector */}
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
            aria-label="Tahun sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-gray-900 tabular-nums">{year}</span>
          </div>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-gray-100 transition-colors"
            aria-label="Tahun berikutnya"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {hasData ? (
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h3 className="text-xs font-semibold text-gray-800 mb-3">Heatmap Pengeluaran {year}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {heatmapData.map((d) => {
                const color = d.total > 0 ? getHeatmapColor(d.total, heatmapMin, heatmapMax) : '#F3F4F6';
                const textColor = d.total > heatmapMax * 0.6 ? 'text-white' : 'text-gray-800';
                return (
                  <div
                    key={d.month}
                    className="rounded-lg p-2.5 text-center transition-all"
                    style={{ backgroundColor: color }}
                  >
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${textColor}`}>
                      {getShortMonth(d.month)}
                    </p>
                    <p className={`text-xs font-bold mt-0.5 tabular-nums ${textColor}`}>
                      {d.total > 0 ? formatRupiah(d.total) : '-'}
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
                <span className="text-[9px] text-gray-500">Rendah</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
                <span className="text-[9px] text-gray-500">Sedang</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }} />
                <span className="text-[9px] text-gray-500">Tinggi</span>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Belum ada data"
            description={`Belum ada pengeluaran untuk tahun ${year}.`}
          />
        )}
      </div>
    </>
  );
}
