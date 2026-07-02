'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  PiggyBank,
  Target,
  Plus,
  Trash2,
  ArrowLeft,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getGoals,
  deleteGoal,
  addContribution,
  getAutoSisih,
  saveAutoSisih,
  syncAllToCloud,
  getExpenses,
} from '@/lib/storage';
import { formatRupiah, formatDate } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { getStoredEmail } from '@/lib/cloud';
import { PageHeader } from '@/components/PageHeader';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const GOAL_COLORS = ['#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981'];

export default function TabunganDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;
  const { refreshKey, refreshData } = useAppContext();
  useSyncOnMount([refreshKey]);
  const email = getStoredEmail();

  const goals = useMemo(() => getGoals(), [refreshKey]);
  const autoSisih = useMemo(() => getAutoSisih(), [refreshKey]);
  const allExpenses = getExpenses();

  const goal = goals.find(g => g.id === goalId);

  const goalContributions = useMemo(() => {
    if (!goal) return [];
    const otherGoalNames = goals.filter(g => g.id !== goal.id).map(g => g.name.toLowerCase());
    return allExpenses
      .filter(t => {
        if (t.category !== 'tabungan') return false;
        if (t.description?.includes(goal.name)) return true;
        const desc = (t.description || '').toLowerCase();
        return !otherGoalNames.some(n => desc.includes(n));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allExpenses, goal, goals]);

  const [showTopUp, setShowTopUp] = useState(false);
  const [showAutoSisih, setShowAutoSisih] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Top up form
  const [topUpAmountInput, setTopUpAmountInput] = useState('');
  const [topUpNote, setTopUpNote] = useState('');

  // Auto-sisih form
  const [asEnabled, setAsEnabled] = useState(autoSisih.enabled);
  const [asPersen, setAsPersen] = useState(autoSisih.persen);
  const [asGoalId, setAsGoalId] = useState(autoSisih.goalId);

  if (!goal) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <PiggyBank className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700">Goal tidak ditemukan</h2>
          <p className="text-gray-400 mt-1">Goal ini mungkin sudah dihapus</p>
          <button
            onClick={() => router.push('/tabungan')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-xl font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        </div>
      </div>
    );
  }

  const pct = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
  const remaining = Math.max(goal.target - goal.saved, 0);

  const handleTopUp = () => {
    const num = parseInt(topUpAmountInput.replace(/[^0-9]/g, '')) || 0;
    if (num <= 0) return;
    addContribution(goal.id, num, topUpNote || undefined, 'manual');
    if (email) syncAllToCloud(email).catch(() => {});
    setTopUpAmountInput('');
    setTopUpNote('');
    setShowTopUp(false);
    refreshData();
  };

  const handleDeleteGoal = () => {
    if (!deleteId) return;
    const returned = deleteGoal(deleteId);
    if (email) syncAllToCloud(email).catch(() => {});
    setDeleteId(null);
    router.push('/tabungan');
    refreshData();
  };

  const handleSaveAutoSisih = () => {
    saveAutoSisih({ enabled: asEnabled, persen: asPersen, goalId: asGoalId });
    if (email) syncAllToCloud(email).catch(() => {});
    setShowAutoSisih(false);
    refreshData();
  };

  const getContributionSource = (exp: any) => {
    if (exp.description?.includes('Auto-sisih')) return { label: 'Auto-sisih' };
    if (exp.description?.includes(goal.name)) return { label: 'Manual' };
    return { label: 'Lainnya' };
  };

  const totalContributions = goalContributions.reduce((s, t) => s + t.amount, 0);
  const avgAmount = goalContributions.length > 0 ? Math.round(totalContributions / goalContributions.length) : 0;
  const maxAmount = goalContributions.length > 0 ? Math.max(...goalContributions.map(t => t.amount)) : 0;

  return (
    <>
      <PageHeader
        title="Detail Tabungan"
        subtitle={goal.name}
        onBack={() => router.back()}
      />

      <div className="px-3 pt-3 pb-8 space-y-3">

        {/* Goal Header Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: goal.color + '18' }}>
                <PiggyBank className="w-4 h-4" style={{ color: goal.color }} />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-gray-900 truncate">{goal.name}</h1>
                <p className="text-[11px] text-gray-500">Target {formatRupiah(goal.target)}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold tabular-nums" style={{ color: goal.color }}>{formatRupiah(goal.saved)}</p>
              <p className="text-[10px] text-gray-400">{pct.toFixed(0)}%</p>
            </div>
          </div>

          <div className="mt-2.5">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px]">
              <span className="text-gray-500">Terkumpul {formatRupiah(goal.saved)}</span>
              <span className="text-gray-400">Sisa {formatRupiah(remaining)}</span>
            </div>
            {remaining === 0 && (
              <p className="mt-1.5 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Target Tercapai!
              </p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <button onClick={() => setShowTopUp(true)} className="py-2 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-xs flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Top Up
            </button>
            <button onClick={() => { setAsEnabled(autoSisih.enabled); setAsPersen(autoSisih.persen); setAsGoalId(autoSisih.goalId); setShowAutoSisih(true); }} className="py-2 rounded-lg bg-violet-50 text-violet-700 font-medium text-xs flex items-center justify-center gap-1">
              <Target className="w-3.5 h-3.5" /> Auto-Sisih
            </button>
            <button onClick={() => setDeleteId(goal.id)} className="py-2 rounded-lg bg-red-50 text-red-600 font-medium text-xs flex items-center justify-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {goalContributions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between text-[10px] text-gray-500">
            <span><strong className="text-gray-700">{goalContributions.length}</strong> transaksi</span>
            <span>Rata-rata <strong className="text-gray-700">{formatRupiah(avgAmount)}</strong></span>
            <span>Tertinggi <strong className="text-gray-700">{formatRupiah(maxAmount)}</strong></span>
            <span>Total <strong className="text-gray-900">{formatRupiah(totalContributions)}</strong></span>
          </div>
        )}

        {/* Contribution Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {goalContributions.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <PiggyBank className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Belum ada kontribusi</p>
              <p className="text-xs text-gray-400 mt-1">Mulai tabung dengan klik tombol Top Up</p>
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div className="grid grid-cols-[90px_1fr_60px_90px] gap-0 border-b border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                <div className="px-2.5 py-1.5 border-r border-gray-200">Tanggal</div>
                <div className="px-2.5 py-1.5 border-r border-gray-200">Keterangan</div>
                <div className="px-2.5 py-1.5 border-r border-gray-200 text-center">Sumber</div>
                <div className="px-2.5 py-1.5 text-right">Nominal</div>
              </div>
              {/* Table Rows */}
              {goalContributions.map((t, i) => {
                const source = getContributionSource(t);
                return (
                  <div key={t.id} className={`grid grid-cols-[90px_1fr_60px_90px] gap-0 text-xs border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <div className="px-2.5 py-2 border-r border-gray-100 text-gray-500 tabular-nums flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-300 flex-shrink-0" />
                      {formatDate(t.date)}
                    </div>
                    <div className="px-2.5 py-2 border-r border-gray-100 text-gray-700 truncate">
                      {t.description || '-'}
                    </div>
                    <div className="px-2.5 py-2 border-r border-gray-100 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${
                        source.label === 'Auto-sisih' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {source.label}
                      </span>
                    </div>
                    <div className="px-2.5 py-2 text-right font-semibold text-gray-900 tabular-nums">
                      {formatRupiah(t.amount)}
                    </div>
                  </div>
                );
              })}
              {/* Table Footer */}
              <div className="grid grid-cols-[90px_1fr_60px_90px] gap-0 border-t border-gray-200 bg-gray-50 text-xs font-bold text-gray-900">
                <div className="px-2.5 py-1.5 border-r border-gray-200" />
                <div className="px-2.5 py-1.5 border-r border-gray-200 text-gray-500 font-medium">Total</div>
                <div className="px-2.5 py-1.5 border-r border-gray-200" />
                <div className="px-2.5 py-1.5 text-right tabular-nums">{formatRupiah(totalContributions)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet: Top Up */}
      <BottomSheet open={showTopUp} onClose={() => setShowTopUp(false)} title="Isi Tabungan">
        <div className="space-y-4">
          <div className="bg-cyan-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: goal.color + '18' }}>
              <PiggyBank className="w-4 h-4" style={{ color: goal.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{goal.name}</p>
              <p className="text-xs text-gray-500">{formatRupiah(goal.saved)} / {formatRupiah(goal.target)}</p>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Nominal</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={topUpAmountInput}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (raw === '') { setTopUpAmountInput(''); return; }
                  setTopUpAmountInput(new Intl.NumberFormat('id-ID').format(parseInt(raw)));
                }}
                placeholder="0"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Catatan (opsional)</label>
            <input
              value={topUpNote}
              onChange={(e) => setTopUpNote(e.target.value)}
              placeholder="Misal: Nabung dari gaji Juni"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
            />
          </div>
          <p className="text-xs text-gray-400">
            Setoran akan tercatat di <strong>Buku Kas</strong> sebagai Debit.
          </p>
          <button
            onClick={handleTopUp}
            disabled={!topUpAmountInput || parseInt(topUpAmountInput.replace(/[^0-9]/g, '')) <= 0}
            className="w-full h-11 rounded-xl bg-cyan-500 text-white font-semibold text-sm disabled:opacity-50 active:bg-cyan-600 transition-colors"
          >
            Simpan ke Tabungan
          </button>
        </div>
      </BottomSheet>

      {/* Bottom Sheet: Auto-Sisih */}
      <BottomSheet open={showAutoSisih} onClose={() => setShowAutoSisih(false)} title="Auto-Sisih">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Aktifkan Auto-Sisih</p>
              <p className="text-xs text-gray-400">Otomatis sisihkan saat catat pemasukan</p>
            </div>
            <button
              onClick={() => setAsEnabled(!asEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${asEnabled ? 'bg-cyan-500' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${asEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {asEnabled && (
            <>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Persentase ({asPersen}%)</label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={asPersen}
                  onChange={(e) => setAsPersen(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>1%</span>
                  <span>50%</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Masuk ke Goal</label>
                <select
                  value={asGoalId || ''}
                  onChange={(e) => setAsGoalId(e.target.value || null)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                >
                  <option value="">Pilih goal...</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button
            onClick={handleSaveAutoSisih}
            className="w-full h-11 rounded-xl bg-cyan-500 text-white font-semibold text-sm active:bg-cyan-600 transition-colors"
          >
            Simpan
          </button>
        </div>
      </BottomSheet>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Hapus Goal?"
        message={goalContributions.length > 0 
          ? `Goal ini memiliki ${goalContributions.length} kontribusi. Jika dihapus, saldo ${formatRupiah(goal.saved)} akan dikembalikan ke Buku Kas sebagai pemasukan.`
          : "Goal ini akan dihapus permanen."
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDeleteGoal}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}