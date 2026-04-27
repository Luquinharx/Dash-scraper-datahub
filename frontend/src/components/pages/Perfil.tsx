import { useState, useEffect } from 'react';
import { get, ref, update } from 'firebase/database';
import { rtdb } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useClanMemberData } from '../../hooks/useClanMemberData';
import { useFirestoreClanData } from '../../hooks/useFirestoreClanData';
import { useProfilesData } from '../../hooks/useProfilesData';
import { RankBadge } from '../RankBadge';
import { User, Edit3, Save, X, Check, Dna } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDatePtBR } from '../../lib/date';

interface RoletaEntry {
  id: string;
  premio: string;
  data: string;
  entregue: boolean;
}

export default function Perfil() {
  const { profile, refreshProfile } = useAuth();
  const { profiles } = useProfilesData();
  const { stats } = useClanMemberData(profile?.nickJogo || undefined);
  const { data: firestoreData } = useFirestoreClanData(profile?.nickJogo || undefined);
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState('');
  const [discord, setDiscord] = useState('');
  const [saving, setSaving] = useState(false);
  const [roletas, setRoletas] = useState<RoletaEntry[]>([]);

  useEffect(() => {
    if (!profile) return;
    setNick(profile.nick);
    setDiscord(profile.discord);
  }, [profile]);

  useEffect(() => {
    if (!profile?.userId) return;
    const userId = profile.userId;
    async function load() {
      const snap = await get(ref(rtdb, 'roletas'));
      const roletasData = (snap.val() || {}) as Record<string, { userId?: string; premio?: string; data?: unknown; entregue?: boolean }>;
      const list: RoletaEntry[] = [];

      Object.entries(roletasData).forEach(([id, data]) => {
        if (data.userId !== userId) return;
        list.push({
          id,
          premio: data.premio || '-',
          data: formatDatePtBR(data.data),
          entregue: !!data.entregue,
        });
      });

      list.reverse();
      setRoletas(list);
    }
    void load();
  }, [profile]);

  async function handleSave() {
    if (!profile?.userId) return;
    setSaving(true);
    try {
      await update(ref(rtdb, `usuarios/${profile.userId}`), { nick, discord });
      await refreshProfile();
      setEditing(false);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    } finally {
      setSaving(false);
    }
  }

  async function marcarEntregue(roletaId: string) {
    try {
      await update(ref(rtdb, `roletas/${roletaId}`), { entregue: true });
      setRoletas(prev => prev.map(r => (r.id === roletaId ? { ...r, entregue: true } : r)));
    } catch (err) {
      console.error('Erro ao marcar como entregue:', err);
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black font-sans">
        <div className="flex items-center justify-center h-[80vh] text-red-900 animate-pulse uppercase tracking-widest">Loading Profile...</div>
      </div>
    );
  }

  const dataEntrada = formatDatePtBR(profile.dataEntrada);

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-red-900/30">
      <div className="page-shell w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mx-auto space-y-8">

        <header className="flex items-center gap-4 border-b border-white/10 pb-6">
          <div className="p-3 bg-white/[0.04] rounded-sm border border-white/10 text-zinc-300">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-white uppercase">
              Operative <span className="text-zinc-300">Profile</span>
            </h1>
            <p className="text-zinc-500 text-sm font-mono mt-1">{profile.email}</p>
          </div>
        </header>

        <div className="surface-panel rounded-sm p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Dna className="w-40 h-40 text-red-600" />
          </div>

          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-xl font-semibold text-white uppercase flex items-center gap-2">
              <span className="w-1 h-6 bg-red-600 block"></span>
              Personal Data
            </h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-zinc-300 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded-sm hover:bg-white/[0.06]">
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors border border-emerald-900/30 px-3 py-1.5 rounded-sm hover:bg-emerald-950/20">
                  <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setNick(profile.nick); setDiscord(profile.discord); }} className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-500 hover:text-stone-400 transition-colors border border-stone-800 px-3 py-1.5 rounded-sm hover:bg-stone-900">
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase tracking-[0.12em] font-bold">Codename (Nick)</label>
              {editing ? (
                <input value={nick} onChange={e => setNick(e.target.value)} className="w-full px-4 py-2 bg-black border border-white/10 text-white focus:outline-none focus:border-white/30 transition-colors font-mono" />
              ) : (
                <p className="text-xl text-white font-semibold border-b border-white/5 pb-1">{profile.nick}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase tracking-[0.12em] font-bold">Comms (Discord)</label>
              {editing ? (
                <input value={discord} onChange={e => setDiscord(e.target.value)} className="w-full px-4 py-2 bg-black border border-white/10 text-white focus:outline-none focus:border-white/30 transition-colors font-mono" />
              ) : (
                <p className="text-xl text-white font-semibold border-b border-white/5 pb-1">{profile.discord}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-600 uppercase tracking-[0.12em] font-bold flex items-center gap-2">Access</label>
              <p className="text-lg text-zinc-300 font-semibold border-b border-white/5 pb-1">{profile.cargo}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-600 uppercase tracking-[0.12em] font-bold">Scrap Rank</label>
              <div className="border-b border-white/5 pb-1">
                <RankBadge rank={profiles.find(p => p.username === profile.nickJogo)?.rank || 'Street Cleaner'} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-600 uppercase tracking-[0.12em] font-bold">Linked Operative</label>
              <p className="text-lg text-zinc-300 font-semibold border-b border-white/5 pb-1">{profile.nickJogo || <span className="text-zinc-600 italic">Not Linked</span>}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-600 uppercase tracking-[0.12em] font-bold">Enlistment Date</label>
              <p className="text-lg text-zinc-300 font-mono border-b border-white/5 pb-1">{dataEntrada}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5 relative z-10">
            <div className="text-center p-4 bg-black/40 border border-white/10 rounded-sm">
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.16em] mb-2">Total Loot</p>
              <p className="text-2xl font-bold text-white font-mono">
                {(firestoreData.baseLoot + (stats ? stats.weeklyValues.reduce((a, b) => a + b, 0) + stats.weeklyToDate : 0)).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-center p-4 bg-black/40 border border-white/10 rounded-sm">
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.16em] mb-2">Donated</p>
              <p className="text-2xl font-bold text-emerald-500 font-mono">
                ${firestoreData.donatedCash.toLocaleString('pt-BR')}
              </p>
              {firestoreData.donatedCredits > 0 && <p className="text-sm font-bold text-purple-400 mt-1">{firestoreData.donatedCredits} CR</p>}
            </div>
            <div className="text-center p-4 bg-black/40 border border-white/10 rounded-sm">
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.16em] mb-2">Weekly Loot</p>
              <p className="text-2xl font-bold text-white font-mono">
                {(stats?.weeklyToDate || 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-center p-4 bg-black/40 border border-white/10 rounded-sm">
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.16em] mb-2">Daily Loot</p>
              <p className="text-2xl font-bold text-zinc-300 font-mono">
                +{(stats?.dailyLoot || 0).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {stats && stats.dailyHistory.length > 0 && (
          <div className="surface-panel rounded-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-black/40 flex items-center gap-2">
              <span className="w-1 h-5 bg-stone-600 block"></span>
              <h2 className="text-sm font-semibold text-white uppercase tracking-[0.12em]">Loot History</h2>
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-black">
              <table className="w-full text-sm font-mono">
                <thead className="text-[10px] text-stone-500 uppercase bg-black border-b border-white/5 sticky top-0 tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left font-normal">Date</th>
                    <th className="px-6 py-3 text-right font-normal">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[...stats.dailyHistory].reverse().map((l, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3 text-stone-400">{l.data}</td>
                      <td className="px-6 py-3 text-right text-emerald-500 font-bold">+{l.valor.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="surface-panel rounded-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-black/40 flex items-center gap-2">
            <span className="w-1 h-5 bg-red-600 block"></span>
            <h2 className="text-sm font-semibold text-white uppercase tracking-[0.12em]">Slot History</h2>
          </div>
          {roletas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-serif">
                <thead className="text-[10px] text-stone-500 uppercase bg-black border-b border-white/5 tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left font-normal">Date</th>
                    <th className="px-6 py-3 text-left font-normal">Prize</th>
                    <th className="px-6 py-3 text-center font-normal">Status</th>
                    <th className="px-6 py-3 text-center font-normal">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {roletas.map(r => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3 text-stone-400 font-mono text-xs">{r.data}</td>
                      <td className="px-6 py-3 text-white font-bold tracking-wide">{r.premio}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold tracking-widest border',
                          r.entregue ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/30' : 'bg-red-950/30 text-amber-500 border-red-900/30 animate-pulse'
                        )}>
                          {r.entregue ? 'Claimed' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {!r.entregue && (
                          <button
                            onClick={() => marcarEntregue(r.id)}
                            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest border px-2 py-1 rounded-sm transition-colors text-emerald-500 hover:text-emerald-400 border-emerald-900/30 hover:bg-emerald-950/20"
                          >
                            <Check className="w-3 h-3" /> Mark Claimed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-stone-600 font-serif uppercase tracking-widest">No prizes found. Spin the wheel!</div>
          )}
        </div>
      </div>
    </div>
  );
}
