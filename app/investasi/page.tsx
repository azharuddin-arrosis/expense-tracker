'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  Plus,
  Trash2,
  ChevronRight,
  Wallet,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getInvestments,
  addInvestment,
  updateInvestment,
  deleteInvestment,
  syncAllToCloud,
} from '@/lib/storage';
import { formatRupiah } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { getStoredEmail } from '@/lib/cloud';
import { PageHeader } from '@/components/PageHeader';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Investment } from '@/lib/types';

const INVESTMENT_TYPES: { value: Investment['type']; label: string }[] = [
  { value: 'saham', label: 'Saham' },
  { value: 'reksadana', label: 'Reksadana' },
  { value: 'emas', label: 'Emas' },
  { value: 'kripto', label: 'Kripto' },
  { value: 'deposito', label: 'Deposito' },
  { value: 'other', label: 'Lainnya' },
];

const TYPE_COLORS: Record<Investment['type'], string> = {
  saham: '#6366F1',
  reksadana: '#8B5CF6',
  emas: '#F59E0B',
  kripto: '#EF4444',
  deposito: '#10B981',
  other: '#6B7280',
};

const TYPE_BG: Record<Investment['type'], string> = {
  saham: '#EEF2FF',
  reksadana: '#F5F3FF',
  emas: '#FFFBEB',
  kripto: '#FEF2F2',
  deposito: '#ECFDF5',
  other: '#F3F4F6',
};

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export default function InvestasiPage() {
  const { refreshKey, refreshData } = useAppContext();
  useSyncOnMount([refreshKey]);
  const email = getStoredEmail();

  const investments = useMemo(() => getInvestments(), [refreshKey]);

  const totalInvested = investments.reduce((s, i) => s + i.buyPrice * i.quantity, 0);
  const totalValue = investments.reduce((s, i) => s + i.currentPrice * i.quantity, 0);
  const totalReturn = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<Investment['type']>('saham');
  const [formBuyPrice, setFormBuyPrice] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formCurrentPrice, setFormCurrentPrice] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const resetForm = () => {
    setFormName('');
    setFormType('saham');
    setFormBuyPrice('');
    setFormQty('');
    setFormCurrentPrice('');
    setFormNotes('');
    setEditId(null);
  };

  const openEdit = (inv: Investment) => {
    setEditId(inv.id);
    setFormName(inv.name);
    setFormType(inv.type);
    setFormBuyPrice(new Intl.NumberFormat('id-ID').format(inv.buyPrice));
    setFormQty(String(inv.quantity));
    setFormCurrentPrice(new Intl.NumberFormat('id-ID').format(inv.currentPrice));
    setFormNotes(inv.notes || '');
    setShowAdd(true);
  };

  const handleSave = () => {
    const buyPrice = parseInt(formBuyPrice.replace(/[^0-9]/g, '')) || 0;
    const qty = parseInt(formQty.replace(/[^0-9]/g, '')) || 0;
    const currentPrice = parseInt(formCurrentPrice.replace(/[^0-9]/g, '')) || 0;
    if (!formName || buyPrice <= 0 || qty <= 0 || currentPrice <= 0) return;

    if (editId) {
      updateInvestment(editId, {
        name: formName,
        type: formType,
        buyPrice,
        quantity: qty,
        currentPrice,
        notes: formNotes || undefined,
      });
    } else {
      addInvestment({
        name: formName,
        type: formType,
        buyPrice,
        quantity: qty,
        currentPrice,
        notes: formNotes || undefined,
      });
    }

    if (email) syncAllToCloud(email).catch(() => {});
    resetForm();
    setShowAdd(false);
    refreshData();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteInvestment(deleteId);
    if (email) syncAllToCloud(email).catch(() => {});
    setDeleteId(null);
    refreshData();
  };

  return (
    <>
      <PageHeader title="Investasi" subtitle="Pantau portofolio investasi" />

      <div className="px-3 pt-3 pb-8 space-y-3">

        {/* Summary Bar */}
        <div className="rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 p-3 text-white border border-emerald-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-emerald-100 uppercase tracking-wide">
              Portofolio
            </p>
            <BarChart3 className="w-3 h-3 text-emerald-200" />
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums mb-3">
            {formatRupiah(totalValue)}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] text-emerald-200">Total Investasi</p>
              <p className="text-[11px] font-semibold text-white tabular-nums">
                {formatRupiah(totalInvested)}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-emerald-200">Return</p>
              <div className="flex items-center gap-0.5">
                {totalReturn >= 0
                  ? <ArrowUpRight className="w-3 h-3 text-emerald-200" />
                  : <ArrowDownRight className="w-3 h-3 text-red-200" />
                }
                <p className={`text-[11px] font-semibold tabular-nums ${totalReturn >= 0 ? 'text-white' : 'text-red-200'}`}>
                  {formatRupiah(Math.abs(totalReturn))}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[9px] text-emerald-200">Return %</p>
              <p className={`text-[11px] font-semibold tabular-nums ${returnPct >= 0 ? 'text-white' : 'text-red-200'}`}>
                {formatPercent(returnPct)}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {investments.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between text-[10px] text-gray-500">
            <span><strong className="text-gray-700">{investments.length}</strong> investasi</span>
            <span>Total investasi <strong className="text-gray-900">{formatRupiah(totalInvested)}</strong></span>
          </div>
        )}

        {/* Investment List */}
        <div className="space-y-1.5">
          {investments.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-500">Belum ada investasi</p>
              <p className="text-[10px] text-gray-400 mt-1">Tambahkan portofolio investasi pertama</p>
            </div>
          ) : (
            investments.map((inv, i) => {
              const itemValue = inv.currentPrice * inv.quantity;
              const itemInvested = inv.buyPrice * inv.quantity;
              const itemReturn = itemValue - itemInvested;
              const itemReturnPct = itemInvested > 0 ? (itemReturn / itemInvested) * 100 : 0;

              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: TYPE_BG[inv.type] }}
                      >
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: TYPE_COLORS[inv.type] }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{inv.name}</p>
                        <span
                          className="text-[9px] font-medium px-1 py-0.5 rounded"
                          style={{ backgroundColor: TYPE_BG[inv.type], color: TYPE_COLORS[inv.type] }}
                        >
                          {INVESTMENT_TYPES.find(t => t.value === inv.type)?.label || inv.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(inv)}
                        className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center active:bg-gray-100 transition-colors"
                        aria-label="Edit investasi"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setDeleteId(inv.id)}
                        className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center active:bg-red-100 transition-colors"
                        aria-label="Hapus investasi"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-4 gap-0 text-center divide-x divide-gray-100">
                    <div className="px-2 py-2">
                      <p className="text-[9px] text-gray-400">Harga Beli</p>
                      <p className="text-[11px] font-semibold text-gray-900 tabular-nums mt-0.5">
                        {formatRupiah(inv.buyPrice)}
                      </p>
                    </div>
                    <div className="px-2 py-2">
                      <p className="text-[9px] text-gray-400">Qty</p>
                      <p className="text-[11px] font-semibold text-gray-900 tabular-nums mt-0.5">
                        {inv.quantity}
                      </p>
                    </div>
                    <div className="px-2 py-2">
                      <p className="text-[9px] text-gray-400">Harga Skrg</p>
                      <p className="text-[11px] font-semibold text-gray-900 tabular-nums mt-0.5">
                        {formatRupiah(inv.currentPrice)}
                      </p>
                    </div>
                    <div className="px-2 py-2">
                      <p className="text-[9px] text-gray-400">Nilai</p>
                      <p className="text-[11px] font-semibold text-gray-900 tabular-nums mt-0.5">
                        {formatRupiah(itemValue)}
                      </p>
                    </div>
                  </div>

                  {/* Return row */}
                  <div className="px-3 py-1.5 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {itemReturn >= 0
                        ? <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        : <ArrowDownRight className="w-3 h-3 text-red-500" />
                      }
                      <span className={`text-[10px] font-semibold tabular-nums ${itemReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {itemReturn >= 0 ? '+' : ''}{formatRupiah(itemReturn)} ({formatPercent(itemReturnPct)})
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400">
                      Investasi {formatRupiah(itemInvested)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Investment Button */}
        <button
          onClick={() => { resetForm(); setShowAdd(true); }}
          className="w-full h-10 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 font-medium text-xs flex items-center justify-center gap-1.5 active:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Investasi
        </button>

      </div>

      {/* Bottom Sheet: Add/Edit Investment */}
      <BottomSheet
        open={showAdd}
        onClose={() => { setShowAdd(false); resetForm(); }}
        title={editId ? 'Edit Investasi' : 'Tambah Investasi'}
      >
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Nama Investasi</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Misal: BBCA, SBN, Emas Antam..."
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Tipe</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as Investment['type'])}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {INVESTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Harga Beli (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={formBuyPrice}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (raw === '') { setFormBuyPrice(''); return; }
                  setFormBuyPrice(new Intl.NumberFormat('id-ID').format(parseInt(raw)));
                }}
                placeholder="0"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Quantity</label>
              <input
                type="text"
                inputMode="numeric"
                value={formQty}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setFormQty(raw);
                }}
                placeholder="0"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Harga Saat Ini (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={formCurrentPrice}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                if (raw === '') { setFormCurrentPrice(''); return; }
                setFormCurrentPrice(new Intl.NumberFormat('id-ID').format(parseInt(raw)));
              }}
              placeholder="0"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Catatan (opsional)</label>
            <input
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Misal: Dibeli di Sekolah Saham..."
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!formName || !formBuyPrice || !formQty || !formCurrentPrice}
            className="w-full h-10 rounded-lg bg-emerald-500 text-white font-semibold text-xs disabled:opacity-50 active:bg-emerald-600 transition-colors"
          >
            {editId ? 'Simpan Perubahan' : 'Tambah Investasi'}
          </button>
        </div>
      </BottomSheet>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Hapus Investasi?"
        message="Data investasi ini akan dihapus permanen."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
