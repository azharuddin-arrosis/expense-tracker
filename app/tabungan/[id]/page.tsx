'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  PiggyBank,
  Target,
  Plus,
  Trash2,
  TrendingUp,
  ArrowLeft,
  List,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getGoals,
  updateGoal,
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
    return allExpenses
      .filter(t => t.description?.includes(goal.name) && t.category === 'tabungan')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allExpenses, goal]);

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
    if (exp.description?.includes('Auto-sisih')) return { label: 'Auto-sisih', color: 'bg-violet-100 text-violet-700', icon: '🔄' };
    if (exp.description?.includes(goal.name)) return { label: 'Top-up Manual', color: 'bg-emerald-100 text-emerald-700', icon: '➕' };
    return { label: 'Lainnya', color: 'bg-gray-100 text-gray-700', icon: '❓' };
  };

  return (
    <>
      <PageHeader 
        title="Detail Tabungan" 
        subtitle={goal.name}
        onBack={() => router.back()}
      />

      <div className="px-4 pt-4 pb-8 space-y-4">

        {/* Goal Header Card */}
        <div className="rounded-2xl shadow-sm p-5 bg-white" style={{ borderLeft: `4px solid ${goal.color}` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: goal.color + '18' }}>
                <PiggyBank className="w-6 h-6" style={{ color: goal.color }} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">{goal.name}</h1>
                <p className="text-sm text-gray-500">Target {formatRupiah(goal.target)}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold tabular-nums" style={{ color: goal.color }}>{formatRupiah(goal.saved)}</p>
              <p className="text-xs text-gray-400">{pct.toFixed(0)}% tercapai</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: goal.color }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-gray-500">Terkumpul {formatRupiah(goal.saved)}</span>
              <span className="text-gray-400 font-medium">Sisa {formatRupiah(remaining)}</span>
            </div>
            {remaining === 0 && (
              <p className="mt-2 text-sm font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Target Tercapai!
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => setShowTopUp(true)}
              className="col-span-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-medium text-sm flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Top Up
            </button>
            <button
              onClick={() => { setAsEnabled(autoSisih.enabled); setAsPersen(autoSisih.persen); setAsGoalId(autoSisih.goalId); setShowAutoSisih(true); }}
              className="col-span-1 py-2.5 rounded-xl bg-violet-50 text-violet-700 font-medium text-sm flex items-center justify-center gap-1"
            >
              <Target className="w-4 h-4" /> Auto-Sisih
            </button>
            <button
              onClick={() => setDeleteId(goal.id)}
              className="col-span-1 py-2.5 rounded-xl bg-red-50 text-red-600 font-medium text-sm flex items-center justify-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Hapus
            </button>
          </div>
        </div>

        {/* Contribution History */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1">
              <List className="w-4 h-4" /> Riwayat Kontribusi ({goalContributions.length})
            </h3>
            {goalContributions.length > 0 && (
              <span className="text-xs text-gray-400">Total: {formatRupiah(goalContributions.reduce((s, t) => s + t.amount, 0))}</span>
            )}
          </div>

          {goalContributions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <PiggyBank className="w-12 h-12 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Belum ada kontribusi</p>
              <p className="text-xs text-gray-400 mt-1">Mulai tabung dengan klik tombol Top Up</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {goalContributions.map((t) => {
                const source = getContributionSource(t);
                return (
                  <div key={t.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${source.color}`}>
                          <span className="text-sm">{source.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.description || '-'}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(t.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${source.color}`}>
                          {source.label}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums text-right whitespace-nowrap">
                          {formatRupiah(t.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {goalContributions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1">
              <Target className="w-4 h-4" /> Ringkasan
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Masuk</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">
                  {formatRupiah(goalContributions.reduce((s, t) => s + t.amount, 0))}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Jumlah Transaksi</p>
                <p className="text-lg font-bold text-cyan-700">{goalContributions.length}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Rata-rata</p>
                <p className="text-lg font-bold text-amber-700 tabular-nums">
                  {formatRupiah(Math.round(goalContributions.reduce((s, t) => s + t.amount, 0) / goalContributions.length))}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Terbesar</p>
                <p className="text-lg font-bold text-violet-700 tabular-nums">
                  {formatRupiah(Math.max(...goalContributions.map(t => t.amount)))}
                </p>
              </div>
            </div>
          </div>
        )}
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