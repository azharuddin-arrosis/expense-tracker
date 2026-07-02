'use client';

import { useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  CheckCircle2,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import { getDebts, updateDebt, deleteDebt, syncAllToCloud } from '@/lib/storage';
import { formatRupiah, formatDateFull, getTodayString } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { getStoredEmail } from '@/lib/cloud';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DatePicker } from '@/components/DatePicker';
import type { Debt } from '@/lib/types';

function getDaysUntil(dueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG: Record<Debt['status'], { label: string; color: string; bg: string }> = {
  unpaid: { label: 'Belum Dibayar', color: '#EF4444', bg: '#FEF2F2' },
  partial: { label: 'Sebagian', color: '#F59E0B', bg: '#FFFBEB' },
  paid: { label: 'Lunas', color: '#10B981', bg: '#ECFDF5' },
};

export default function DebtDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { refreshKey, refreshData } = useAppContext();
  useSyncOnMount([refreshKey]);
  const email = getStoredEmail();

  const allDebts = useMemo(() => getDebts(), [refreshKey]);
  const debt = useMemo(() => allDebts.find((d) => d.id === id), [allDebts, id]);

  // Bottom sheet states
  const [showPay, setShowPay] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Pay form
  const [payAmount, setPayAmount] = useState('');
  const [, setPayDate] = useState(getTodayString());

  // Edit form
  const [editType, setEditType] = useState<Debt['type']>('hutang');
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // ---------- handlers ----------

  const openPayForm = () => {
    setPayAmount('');
    setPayDate(getTodayString());
    setShowPay(true);
  };

  const handlePay = () => {
    if (!debt) return;
    const payValue = parseInt(payAmount.replace(/[^0-9]/g, '')) || 0;
    if (payValue <= 0) return;

    const newPaid = debt.paidAmount + payValue;
    const newStatus: Debt['status'] = newPaid >= debt.amount ? 'paid' : 'partial';

    updateDebt(id, { paidAmount: newPaid, status: newStatus });
    if (email) syncAllToCloud(email).catch(() => {});
    setShowPay(false);
    setPayAmount('');
    refreshData();
  };

  const openEditForm = () => {
    if (!debt) return;
    setEditType(debt.type);
    setEditName(debt.name);
    setEditAmount(new Intl.NumberFormat('id-ID').format(debt.amount));
    setEditDueDate(debt.dueDate);
    setEditNotes(debt.notes || '');
    setShowEdit(true);
  };

  const handleEditSave = () => {
    if (!debt) return;
    const amount = parseInt(editAmount.replace(/[^0-9]/g, '')) || 0;
    if (!editName || amount <= 0) return;

    let paidAmount = debt.paidAmount;
    let status: Debt['status'] = debt.status;

    // Recalculate if amount changed
    if (paidAmount > amount) {
      paidAmount = amount;
      status = 'paid';
    } else if (paidAmount === amount) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partial';
    } else {
      status = 'unpaid';
    }

    updateDebt(id, {
      type: editType,
      name: editName,
      amount,
      paidAmount,
      status,
      dueDate: editDueDate,
      notes: editNotes || undefined,
    });

    if (email) syncAllToCloud(email).catch(() => {});
    setShowEdit(false);
    refreshData();
  };

  const handleDelete = () => {
    deleteDebt(id);
    if (email) syncAllToCloud(email).catch(() => {});
    router.push('/hutang');
  };

  // ---------- not found state ----------

  if (!debt) {
    return (
      <div className="px-3 pt-3 space-y-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:bg-gray-100 transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Catatan tidak ditemukan</p>
          <button
            onClick={() => router.push('/hutang')}
            className="mt-3 h-8 px-5 rounded-lg bg-orange-500 text-white text-xs font-semibold active:bg-orange-600 transition-colors"
          >
            Kembali ke Hutang
          </button>
        </div>
      </div>
    );
  }

  // ---------- computed ----------

  const remaining = debt.amount - debt.paidAmount;
  const daysUntil = debt.dueDate ? getDaysUntil(debt.dueDate) : null;
  const isOverdue = daysUntil !== null && daysUntil < 0 && debt.status !== 'paid';
  const statusConf = STATUS_CONFIG[debt.status];

  // ---------- render ----------

  return (
    <>
      <div className="px-3 pt-3 pb-8 space-y-3">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:bg-gray-100 transition-colors -ml-1"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* Info Card */}
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {/* Header: name + badges */}
          <div className="px-3 pt-3 pb-2">
            <h1 className="text-sm font-bold text-gray-900">{debt.name}</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  debt.type === 'hutang'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {debt.type === 'hutang' ? 'Hutang' : 'Piutang'}
              </span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
              >
                {statusConf.label}
              </span>
            </div>
          </div>

          {/* Amount grid */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 text-center">
            <div className="py-3 px-2">
              <p className="text-[10px] text-gray-400">Total</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums mt-0.5">
                {formatRupiah(debt.amount)}
              </p>
            </div>
            <div className="py-3 px-2">
              <p className="text-[10px] text-gray-400">Terbayar</p>
              <p className="text-sm font-bold text-emerald-600 tabular-nums mt-0.5">
                {formatRupiah(debt.paidAmount)}
              </p>
            </div>
            <div className="py-3 px-2">
              <p className="text-[10px] text-gray-400">Sisa</p>
              <p
                className={`text-sm font-bold tabular-nums mt-0.5 ${
                  remaining > 0 ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {formatRupiah(remaining)}
              </p>
            </div>
          </div>

          {/* Due date & Notes */}
          <div className="border-t border-gray-100 px-3 py-2.5 space-y-2">
            {debt.dueDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span
                  className={`text-xs tabular-nums ${
                    isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'
                  }`}
                >
                  Jatuh tempo: {formatDateFull(debt.dueDate)}
                  {isOverdue && ` (telat ${Math.abs(daysUntil)} hr)`}
                  {daysUntil !== null &&
                    daysUntil >= 0 &&
                    daysUntil <= 7 &&
                    debt.status !== 'paid' && (
                      <span className="text-amber-600"> ({daysUntil} hr lagi)</span>
                    )}
                </span>
              </div>
            )}
            {debt.notes && (
              <div className="flex items-start gap-1.5">
                <span className="text-[9px] text-gray-400 font-medium mt-0.5">Catatan:</span>
                <span className="text-xs text-gray-600">{debt.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {debt.status !== 'paid' && (
            <button
              onClick={openPayForm}
              className="flex-1 h-10 rounded-lg bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:bg-emerald-600 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Bayar
            </button>
          )}
          <button
            onClick={openEditForm}
            className="flex-1 h-10 rounded-lg bg-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:bg-orange-600 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="flex-1 h-10 rounded-lg bg-red-50 text-red-600 font-semibold text-xs flex items-center justify-center gap-1.5 active:bg-red-100 transition-colors border border-red-200"
          >
            <Trash2 className="w-4 h-4" />
            Hapus
          </button>
        </div>
      </div>

      {/* ── Pay BottomSheet ── */}
      <BottomSheet open={showPay} onClose={() => setShowPay(false)} title="Catat Pembayaran">
        <div className="space-y-2">
          {/* Debt summary */}
          <div className="bg-orange-50 rounded-lg p-2.5 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{debt.name}</span>
              <span className="font-semibold text-gray-900">{formatRupiah(debt.amount)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-400">Sisa tagihan</span>
              <span className="font-semibold text-red-600">{formatRupiah(remaining)}</span>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
              Jumlah Dibayar (Rp)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={payAmount}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                if (raw === '') {
                  setPayAmount('');
                  return;
                }
                setPayAmount(new Intl.NumberFormat('id-ID').format(parseInt(raw)));
              }}
              placeholder="0"
              className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent focus:ring-orange-500"
            />
          </div>

          {/* Quick amount buttons */}
          {remaining > 0 && (
            <div className="flex gap-2">
              {[remaining, Math.round(remaining / 2), Math.round(remaining * 0.25)].map((v) => (
                <button
                  key={v}
                  onClick={() =>
                    setPayAmount(new Intl.NumberFormat('id-ID').format(v))
                  }
                  className="flex-1 h-7 rounded-lg bg-gray-100 text-[9px] font-medium text-gray-600 active:bg-gray-200 transition-colors"
                  type="button"
                >
                  {formatRupiah(v)}
                </button>
              ))}
            </div>
          )}

          {/* Payment date (UI only — not persisted) */}
          <div>
            <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
              Tanggal Pembayaran
            </label>
            <DatePicker value={getTodayString()} onChange={() => {}} flow="out" />
          </div>

          {/* Submit */}
          <button
            onClick={handlePay}
            disabled={
              !payAmount || parseInt(payAmount.replace(/[^0-9]/g, '')) <= 0
            }
            className="w-full h-8 rounded-lg bg-orange-500 text-white font-semibold text-xs disabled:opacity-50 active:bg-orange-600 transition-colors"
          >
            Catat Pembayaran
          </button>
        </div>
      </BottomSheet>

      {/* ── Edit BottomSheet ── */}
      <BottomSheet open={showEdit} onClose={() => setShowEdit(false)} title="Edit Catatan">
        <div className="space-y-2">
          {/* Type toggle */}
          <div>
            <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Tipe</label>
            <div className="flex gap-2">
              <button
                onClick={() => setEditType('hutang')}
                className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${
                  editType === 'hutang' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}
                type="button"
              >
                Hutang
              </button>
              <button
                onClick={() => setEditType('piutang')}
                className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${
                  editType === 'piutang' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}
                type="button"
              >
                Piutang
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Nama</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nama orang / keterangan"
              className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent focus:ring-orange-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Jumlah (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={editAmount}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                if (raw === '') {
                  setEditAmount('');
                  return;
                }
                setEditAmount(new Intl.NumberFormat('id-ID').format(parseInt(raw)));
              }}
              placeholder="0"
              className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent focus:ring-orange-500"
            />
          </div>

          {/* Due date */}
          <div>
            <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
              Jatuh Tempo (opsional)
            </label>
            <DatePicker value={editDueDate} onChange={setEditDueDate} flow="out" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
              Catatan (opsional)
            </label>
            <input
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Keterangan tambahan"
              className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent focus:ring-orange-500"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleEditSave}
            disabled={!editName || !editAmount}
            className="w-full h-8 rounded-lg bg-orange-500 text-white font-semibold text-xs disabled:opacity-50 active:bg-orange-600 transition-colors"
          >
            Simpan Perubahan
          </button>
        </div>
      </BottomSheet>

      {/* ── Delete ConfirmDialog ── */}
      <ConfirmDialog
        open={showDelete}
        title="Hapus Catatan?"
        message="Data hutang/piutang ini akan dihapus permanen."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}
