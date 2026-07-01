'use client';

import { useMemo, useState } from 'react';
import {
  PiggyBank,
  Target,
  Plus,
  Trash2,
  TrendingUp,
  ChevronRight,
  Settings2,
  Loader2,
  Wallet as WalletIcon,
  Sparkles,
  List,
} from 'lucide-react';
import { useAppContext } from '@/lib/context';
import {
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  addContribution,
  getAutoSisih,
  saveAutoSisih,
  syncAllToCloud,
  getExpenses,
} from '@/lib/storage';
import { formatRupiah } from '@/lib/format';
import { useSyncOnMount } from '@/lib/use-sync';
import { getStoredEmail } from '@/lib/cloud';
import { PageHeader } from '@/components/PageHeader';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const GOAL_ICONS = ['PiggyBank', 'Target', 'TrendingUp', 'Sparkles', 'WalletIcon'];
const GOAL_COLORS = ['#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981'];

export default function TabunganPage() {
  const { refreshKey, refreshData } = useAppContext();
  useSyncOnMount([refreshKey]);
  const email = getStoredEmail();

  const goals = useMemo(() => getGoals(), [refreshKey]);
  const autoSisih = useMemo(() => getAutoSisih(), [refreshKey]);

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const overallPct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [detailGoalId, setDetailGoalId] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<'overview' | 'contributions' | null>(null);

  const selectedGoalDetail = goals.find(g => g.id === detailGoalId);
  const allExpenses = getExpenses();
  
  const goalContributions = useMemo(() => {
    if (!selectedGoalDetail) return [];
    // Find contributions that match the goal name in description
    // This includes both manual top-ups and auto-sisih contributions
    const contributions = allExpenses.filter(t => 
      t.description?.includes(selectedGoalDetail.name) && t.category === 'tabungan'
    );
    return contributions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allExpenses, selectedGoalDetail]);
  
  // Format contribution source
  const getContributionSource = (exp: any) => {
    if (exp.description?.includes('Auto-sisih')) return 'Auto-sisih';
    if (exp.description?.includes(selectedGoalDetail?.name || '')) return 'Top-up Manual';
    return 'Lainnya';
  };
  const goalTransactions = useMemo(() => {
    if (!detailGoalId) return [];
    return allExpenses.filter(t => t.category === 'tabungan');
  }, [detailGoalId, refreshKey]);
  const [showTopUp, setShowTopUp] = useState<string | null>(null);
  const [showAutoSisih, setShowAutoSisih] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Add goal form
  const [goalName, setGoalName] = useState('');
  const [goalTargetInput, setGoalTargetInput] = useState('');
  const [goalColor, setGoalColor] = useState('#06B6D4');

  // Top up form
  const [topUpAmountInput, setTopUpAmountInput] = useState('');
  const [topUpNote, setTopUpNote] = useState('');

  // Auto-sisih form
  const [asEnabled, setAsEnabled] = useState(autoSisih.enabled);
  const [asPersen, setAsPersen] = useState(autoSisih.persen);
  const [asGoalId, setAsGoalId] = useState(autoSisih.goalId);

  const handleAddGoal = () => {
    const num = parseInt(goalTargetInput.replace(/[^0-9]/g, '')) || 0;
    if (!goalName || num <= 0) return;
    addGoal({ name: goalName, target: num, saved: 0, color: goalColor });
    setGoalName('');
    setGoalTargetInput('');
    setShowAddGoal(false);
    refreshData();
  };

  const handleTopUp = () => {
    const num = parseInt(topUpAmountInput.replace(/[^0-9]/g, '')) || 0;
    if (!showTopUp || num <= 0) return;
    addContribution(showTopUp, num, topUpNote || undefined, 'manual');
    if (email) syncAllToCloud(email).catch(() => {});
    setTopUpAmountInput('');
    setTopUpNote('');
    setShowTopUp(null);
    refreshData();
  };

  const handleDeleteGoal = () => {
    if (!deleteId) return;
    const returned = deleteGoal(deleteId);
    if (email) syncAllToCloud(email).catch(() => {});
    setDeleteId(null);
    refreshData();
  };

  const handleSaveAutoSisih = () => {
    saveAutoSisih({ enabled: asEnabled, persen: asPersen, goalId: asGoalId });
    if (email) syncAllToCloud(email).catch(() => {});
    setShowAutoSisih(false);
    refreshData();
  };

  return (
    <>
      <PageHeader title="Tabungan" subtitle="Atur tujuan nabungmu" />

      <div className="px-4 pt-6 pb-8 space-y-4">

        {/* Hero Card */}
        <div className="rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-700 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-cyan-100 uppercase tracking-wide">
              Total Tabungan
            </p>
            <PiggyBank className="w-4 h-4 text-cyan-200" />
          </div>
          <p className="text-3xl font-bold tracking-tight tabular-nums mb-2">
            {formatRupiah(totalSaved)}
          </p>
          {totalTarget > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-200">{formatRupiah(totalSaved)} / {formatRupiah(totalTarget)}</span>
                <span className="text-cyan-100 font-semibold">{overallPct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Auto-Sisih Card */}
        <button
          onClick={() => { setAsEnabled(autoSisih.enabled); setAsPersen(autoSisih.persen); setAsGoalId(autoSisih.goalId); setShowAutoSisih(true); }}
          className="w-full flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3.5 active:bg-gray-50 transition-colors"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autoSisih.enabled ? 'bg-violet-50' : 'bg-gray-50'}`}>
            <Settings2 className={`w-5 h-5 ${autoSisih.enabled ? 'text-violet-500' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-800">Auto-Sisih</p>
            <p className="text-xs text-gray-400">
              {autoSisih.enabled
                ? `${autoSisih.persen}% dari pemasukan otomatis ke tabungan`
                : 'Belum diaktifkan'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </button>

        {/* Goal List */}
        <div className="space-y-3">
          {goals.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
              <PiggyBank className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Belum ada goal tabungan</p>
              <p className="text-xs text-gray-400 mt-1">Buat goal pertama untuk mulai nabung</p>
            </div>
          ) : (
            goals.map((goal) => {
              const pct = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
              const remaining = Math.max(goal.target - goal.saved, 0);
              return (
                <div key={goal.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-3 cursor-pointer active:bg-gray-50 transition-colors" onClick={() => { setDetailGoalId(goal.id); setDetailView('contributions'); }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: goal.color + '18' }}>
                        <PiggyBank className="w-5 h-5" style={{ color: goal.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{goal.name}</p>
                        <p className="text-[11px] text-gray-400">Target {formatRupiah(goal.target)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setShowTopUp(goal.id); setTopUpAmountInput(''); setTopUpNote(''); }}
                        className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center active:bg-emerald-100 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-emerald-600" />
                      </button>
                      <button
                        onClick={() => setDeleteId(goal.id)}
                        className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center active:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{formatRupiah(goal.saved)} terkumpul</span>
                      <span className="text-gray-400">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: goal.color }}
                      />
                    </div>
                    {remaining > 0 && (
                      <p className="text-[11px] text-gray-400">
                        Sisa {formatRupiah(remaining)} lagi
                      </p>
                    )}
                    {remaining === 0 && (
                      <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Tercapai!
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Goal Button */}
        <button
          onClick={() => { setGoalName(''); setGoalTargetInput(''); setGoalColor('#06B6D4'); setShowAddGoal(true); }}
          className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 font-medium text-sm flex items-center justify-center gap-2 active:bg-gray-50 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Goal Baru
        </button>

      </div>

      {/* Bottom Sheet: Add Goal */}
      <BottomSheet open={showAddGoal} onClose={() => setShowAddGoal(false)} title="Goal Baru">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Nama Goal</label>
            <input
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="Misal: Dana Darurat, Liburan..."
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Target Nominal</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={goalTargetInput}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (raw === '') { setGoalTargetInput(''); return; }
                  setGoalTargetInput(new Intl.NumberFormat('id-ID').format(parseInt(raw)));
                }}
                placeholder="0"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Warna</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setGoalColor(c)}
                  className={`w-9 h-9 rounded-xl transition-all ${goalColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleAddGoal}
            disabled={!goalName || !goalTargetInput || parseInt(goalTargetInput.replace(/[^0-9]/g, '')) <= 0}
            className="w-full h-11 rounded-xl bg-cyan-500 text-white font-semibold text-sm disabled:opacity-50 active:bg-cyan-600 transition-colors"
          >
            Buat Goal
          </button>
        </div>
      </BottomSheet>

      {/* Bottom Sheet: Top Up */}
      <BottomSheet open={showTopUp !== null} onClose={() => setShowTopUp(null)} title="Isi Tabungan">
        <div className="space-y-4">
          {showTopUp && (() => {
            const g = goals.find((x) => x.id === showTopUp);
            return g ? (
              <div className="bg-cyan-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: g.color + '18' }}>
                  <PiggyBank className="w-4 h-4" style={{ color: g.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{g.name}</p>
                  <p className="text-xs text-gray-500">{formatRupiah(g.saved)} / {formatRupiah(g.target)}</p>
                </div>
              </div>
            ) : null;
          })()}
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

      </div>
      </BottomSheet>

      {/* Bottom Sheet: Goal Detail */}
      <BottomSheet open={detailGoalId !== null && detailView === 'contributions'} onClose={() => { setDetailGoalId(null); setDetailView(null); }} title="Detail Tabungan">
        {selectedGoalDetail && (
          <div className="space-y-4">
            {/* Goal Summary */}
            <div className="bg-cyan-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: selectedGoalDetail.color + '18' }}>
                <PiggyBank className="w-5 h-5" style={{ color: selectedGoalDetail.color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{selectedGoalDetail.name}</p>
                <p className="text-xs text-gray-500">Target {formatRupiah(selectedGoalDetail.target)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-cyan-700 tabular-nums">{formatRupiah(selectedGoalDetail.saved)}</p>
                <p className="text-xs text-gray-400">{selectedGoalDetail.target > 0 ? Math.min((selectedGoalDetail.saved / selectedGoalDetail.target) * 100, 100).toFixed(0) : 0}%</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${selectedGoalDetail.target > 0 ? Math.min((selectedGoalDetail.saved / selectedGoalDetail.target) * 100, 100) : 0}%`, backgroundColor: selectedGoalDetail.color }}
                />
              </div>
              <p className="text-xs text-gray-400 text-right mt-1">
                Sisa {formatRupiah(Math.max(selectedGoalDetail.target - selectedGoalDetail.saved, 0))}
              </p>
            </div>

            {/* Contribution History */}
            {goalContributions.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Riwayat Kontribusi</h4>
                {goalContributions.map((t) => {
                  const isAuto = t.description?.includes('Auto-sisih');
                  return (
                    <div key={t.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAuto ? 'bg-violet-100' : 'bg-emerald-100'}`}>
                          {isAuto ? <TrendingUp className="w-4 h-4 text-violet-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{isAuto ? 'Auto-sisih' : 'Top-up Manual'}</p>
                          <p className="text-[10px] text-gray-400">{t.description || '-'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-700 tabular-nums">{formatRupiah(t.amount)}</p>
                        <p className="text-[10px] text-gray-400">{t.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <PiggyBank className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Belum ada kontribusi</p>
                <p className="text-xs">Tekan + di goal untuk mulai nabung</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => { setShowTopUp(selectedGoalDetail.id); setTopUpAmountInput(''); setTopUpNote(''); setDetailGoalId(null); setDetailView(null); }}
                className="flex-1 h-11 rounded-xl bg-cyan-500 text-white font-semibold text-sm active:bg-cyan-600 transition-colors"
              >
                Top Up
              </button>
              <button
                onClick={() => setDeleteId(selectedGoalDetail.id)}
                className="flex-1 h-11 rounded-xl bg-red-50 text-red-600 font-semibold text-sm border border-red-200 active:bg-red-100 transition-colors"
              >
                Hapus Goal
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Hapus Goal?"
        message="Data tabungan goal ini akan dihapus permanen."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleDeleteGoal}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
