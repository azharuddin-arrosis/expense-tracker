'use client';

import { useMemo, useState } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  Pencil,
  CircleDot,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getDebts,
  addDebt,
  updateDebt,
  deleteDebt,
  syncAllToCloud,
} from '@/lib/storage';
import { formatRupiah, formatDate } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { getStoredEmail } from '@/lib/cloud';
import { PageHeader } from '@/components/PageHeader';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Debt } from '@/lib/types';

type FilterTab = 'semua' | 'hutang' | 'piutang';

const STATUS_CONFIG: Record<Debt['status'], { label: string; color: string; bg: string }> = {
  unpaid: { label: 'Belum Dibayar', color: '#EF4444', bg: '#FEF2F2' },
  partial: { label: 'Sebagian', color: '#F59E0B', bg: '#FFFBEB' },
  paid: { label: 'Lunas', color: '#10B981', bg: '#ECFDF5' },
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'hutang', label: 'Hutang' },
  { key: 'piutang', label: 'Piutang' },
];

function getDaysUntil(dueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function HutangPage() {
  const { refreshKey, refreshData } = useAppContext();
  useSyncOnMount([refreshKey]);
  const email = getStoredEmail();

  const allDebts = useMemo(() => getDebts(), [refreshKey]);

  const [filterTab, setFilterTab] = useState<FilterTab>('semua');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPay, setShowPay] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filterTab === 'semua') return allDebts;
    return allDebts.filter((d) => d.type === filterTab);
  }, [allDebts, filterTab]);

  const totalHutang = allDebts
    .filter((d) => d.type === 'hutang')
    .reduce((s, d) => s + (d.amount - d.paidAmount), 0);
  const totalPiutang = allDebts
    .filter((d) => d.type === 'piutang')
    .reduce((s, d) => s + (d.amount - d.paidAmount), 0);
  const net = totalPiutang - totalHutang;

  // Form state
  const [formType, setFormType] = useState<Debt['type']>('hutang');
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Pay form
  const [payAmount, setPayAmount] = useState('');

  const resetForm = () => {
    setFormType('hutang');
    setFormName('');
    setFormAmount('');
    setFormDueDate('');
    setFormNotes('');
    setEditId(null);
  };

  const openEdit = (debt: Debt) => {
    setEditId(debt.id);
    setFormType(debt.type);
    setFormName(debt.name);
    setFormAmount(new Intl.NumberFormat('id-ID').format(debt.amount));
    setFormDueDate(debt.dueDate);
    setFormNotes(debt.notes || '');
    setShowAdd(true);
  };

  const handleSave = () => {
    const amount = parseInt(formAmount.replace(/[^0-9]/g, '')) || 0;
    if (!formName || amount <= 0) return;

    if (editId) {
      updateDebt(editId, {
        type: formType,
        name: formName,
        amount,
        dueDate: formDueDate,
        notes: formNotes || undefined,
      });
    } else {
      addDebt({
        type: formType,
        name: formName,
        amount,
        paidAmount: 0,
        dueDate: formDueDate,
        notes: formNotes || undefined,
        status: 'unpaid',
      });
    }

    if (email) syncAllToCloud(email).catch(() => {});
    resetForm();
    setShowAdd(false);
    refreshData();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDebt(deleteId);
    if (email) syncAllToCloud(email).catch(() => {});
    setDeleteId(null);
    refreshData();
  };

  const handlePay = () => {
    const payValue = parseInt(payAmount.replace(/[^0-9]/g, '')) || 0;
    if (!showPay || payValue <= 0) return;

    const debt = allDebts.find((d) => d.id === showPay);
    if (!debt) return;

    const newPaid = debt.paidAmount + payValue;
    const newStatus: Debt['status'] = newPaid >= debt.amount ? 'paid' : 'partial';

    updateDebt(showPay, { paidAmount: newPaid, status: newStatus });
    if (email) syncAllToCloud(email).catch(() => {});
    setShowPay(null);
    setPayAmount('');
    refreshData();
  };

  return (
    <>
      <PageHeader title="Hutang Piutang" subtitle="Catat hutang & piutang" />

      <div className="px-3 pt-3 pb-8 space-y-3">

        {/* Summary Bar */}
        <div className="rounded-lg bg-gradient-to-br from-orange-600 to-red-700 p-3 text-white border border-orange-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-orange-100 uppercase tracking-wide">
              Ringkasan
            </p>
            <DollarSign className="w-3 h-3 text-orange-200" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] text-orange-200">Total Hutang</p>
              <p className="text-[13px] font-bold text-white tabular-nums mt-0.5">
                {formatRupiah(totalHutang)}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-orange-200">Total Piutang</p>
              <p className="text-[13px] font-bold text-white tabular-nums mt-0.5">
                {formatRupiah(totalPiutang)}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-orange-200">Net</p>
              <p className={`text-[13px] font-bold tabular-nums mt-0.5 ${net >= 0 ? 'text-white' : 'text-red-200'}`}>
                {net >= 0 ? '' : '-'}{formatRupiah(Math.abs(net))}
              </p>
              <p className="text-[8px] text-orange-200">{net >= 0 ? 'Tagihan' : 'Terhutang'}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {allDebts.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between text-[10px] text-gray-500">
            <span><strong className="text-gray-700">{allDebts.length}</strong> catatan</span>
            <span>Lunas <strong className="text-emerald-600">{allDebts.filter(d => d.status === 'paid').length}</strong></span>
            <span>Belum <strong className="text-red-600">{allDebts.filter(d => d.status !== 'paid').length}</strong></span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
                filterTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 active:bg-white/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Debt List */}
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <DollarSign className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-500">
                {filterTab === 'semua' ? 'Belum ada catatan hutang/piutang' :
                 filterTab === 'hutang' ? 'Belum ada hutang' : 'Belum ada piutang'}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Tambahkan catatan baru</p>
            </div>
          ) : (
            filtered.map((debt) => {
              const remaining = debt.amount - debt.paidAmount;
              const daysUntil = debt.dueDate ? getDaysUntil(debt.dueDate) : null;
              const isOverdue = daysUntil !== null && daysUntil < 0 && debt.status !== 'paid';
              const statusConf = STATUS_CONFIG[debt.status];

              return (
                <div
                  key={debt.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          debt.type === 'hutang' ? 'bg-red-50' : 'bg-emerald-50'
                        }`}
                      >
                        <ArrowUpRight className={`w-3.5 h-3.5 ${
                          debt.type === 'hutang' ? 'text-red-500' : 'text-emerald-500'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{debt.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                            debt.type === 'hutang' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {debt.type === 'hutang' ? 'Hutang' : 'Piutang'}
                          </span>
                          <span
                            className="text-[9px] font-medium px-1 py-0.5 rounded"
                            style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
                          >
                            {statusConf.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {debt.status !== 'paid' && (
                        <button
                          onClick={() => { setShowPay(debt.id); setPayAmount(''); }}
                          className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center active:bg-emerald-100 transition-colors"
                          aria-label="Bayar"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(debt)}
                        className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center active:bg-gray-100 transition-colors"
                        aria-label="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setDeleteId(debt.id)}
                        className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center active:bg-red-100 transition-colors"
                        aria-label="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-3 gap-0 border-t border-gray-100 text-center divide-x divide-gray-100">
                    <div className="px-2 py-2">
                      <p className="text-[9px] text-gray-400">Jumlah</p>
                      <p className="text-[11px] font-semibold text-gray-900 tabular-nums mt-0.5">
                        {formatRupiah(debt.amount)}
                      </p>
                    </div>
                    <div className="px-2 py-2">
                      <p className="text-[9px] text-gray-400">Terbayar</p>
                      <p className="text-[11px] font-semibold text-gray-900 tabular-nums mt-0.5">
                        {formatRupiah(debt.paidAmount)}
                      </p>
                    </div>
                    <div className="px-2 py-2">
                      <p className="text-[9px] text-gray-400">Sisa</p>
                      <p className={`text-[11px] font-semibold tabular-nums mt-0.5 ${
                        remaining > 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        {formatRupiah(remaining)}
                      </p>
                    </div>
                  </div>

                  {/* Due date & notes */}
                  <div className="px-3 py-1.5 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {debt.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className={`text-[10px] tabular-nums ${
                            isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'
                          }`}>
                            {formatDate(debt.dueDate)}
                            {isOverdue && ` (telat ${Math.abs(daysUntil)} hr)`}
                            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && debt.status !== 'paid' && (
                              <span className="text-amber-600"> ({daysUntil} hr lagi)</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    {debt.notes && (
                      <span className="text-[9px] text-gray-400 truncate max-w-[120px]">{debt.notes}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Button */}
        <button
          onClick={() => { resetForm(); setShowAdd(true); }}
          className="w-full h-10 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 font-medium text-xs flex items-center justify-center gap-1.5 active:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Catatan
        </button>

      </div>

      {/* Bottom Sheet: Add/Edit */}
      <BottomSheet
        open={showAdd}
        onClose={() => { setShowAdd(false); resetForm(); }}
        title={editId ? 'Edit Catatan' : 'Tambah Catatan'}
      >
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Tipe</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormType('hutang')}
                className={`flex-1 h-10 rounded-lg text-xs font-medium transition-colors ${
                  formType === 'hutang'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                Hutang
              </button>
              <button
                onClick={() => setFormType('piutang')}
                className={`flex-1 h-10 rounded-lg text-xs font-medium transition-colors ${
                  formType === 'piutang'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                Piutang
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Nama</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Nama orang / keterangan"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Jumlah (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={formAmount}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                if (raw === '') { setFormAmount(''); return; }
                setFormAmount(new Intl.NumberFormat('id-ID').format(parseInt(raw)));
              }}
              placeholder="0"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Jatuh Tempo (opsional)</label>
            <input
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Catatan (opsional)</label>
            <input
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Keterangan tambahan"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!formName || !formAmount}
            className="w-full h-10 rounded-lg bg-orange-500 text-white font-semibold text-xs disabled:opacity-50 active:bg-orange-600 transition-colors"
          >
            {editId ? 'Simpan Perubahan' : 'Tambah Catatan'}
          </button>
        </div>
      </BottomSheet>

      {/* Bottom Sheet: Pay / Mark Partial */}
      <BottomSheet
        open={showPay !== null}
        onClose={() => setShowPay(null)}
        title="Catat Pembayaran"
      >
        <div className="space-y-3">
          {showPay && (() => {
            const debt = allDebts.find(d => d.id === showPay);
            if (!debt) return null;
            const remaining = debt.amount - debt.paidAmount;
            return (
              <>
                <div className="bg-orange-50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{debt.name}</span>
                    <span className="font-semibold text-gray-900">{formatRupiah(debt.amount)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Sisa tagihan</span>
                    <span className="font-semibold text-red-600">{formatRupiah(remaining)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">Jumlah Dibayar (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={payAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      if (raw === '') { setPayAmount(''); return; }
                      setPayAmount(new Intl.NumberFormat('id-ID').format(parseInt(raw)));
                    }}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  {[remaining, Math.round(remaining / 2), Math.round(remaining * 0.25)].map((v) => (
                    <button
                      key={v}
                      onClick={() => setPayAmount(new Intl.NumberFormat('id-ID').format(v))}
                      className="flex-1 h-8 rounded-lg bg-gray-100 text-[10px] font-medium text-gray-600 active:bg-gray-200 transition-colors"
                    >
                      {formatRupiah(v)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handlePay}
                  disabled={!payAmount || parseInt(payAmount.replace(/[^0-9]/g, '')) <= 0}
                  className="w-full h-10 rounded-lg bg-orange-500 text-white font-semibold text-xs disabled:opacity-50 active:bg-orange-600 transition-colors"
                >
                  Catat Pembayaran
                </button>
              </>
            );
          })()}
        </div>
      </BottomSheet>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Hapus Catatan?"
        message="Data hutang/piutang ini akan dihapus permanen."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
