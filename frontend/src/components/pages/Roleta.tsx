
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClanMemberData } from '../../hooks/useClanMemberData';
import { useCasinoConfig } from '../../hooks/useCasinoConfig';
import { get, push, ref, runTransaction } from 'firebase/database';
import { rtdb } from '../../lib/firebase';
import { Gift } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDatePtBR, toMillis } from '../../lib/date';

export default function Roleta() {
  const { profile, refreshProfile } = useAuth();
  const { stats } = useClanMemberData(profile?.nickJogo || undefined);
  const { config } = useCasinoConfig();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<typeof config.prizes[0] | null>(null);
  const [slots, setSlots] = useState(['🩸', '🩸', '🩸']);
  
  const [girosUsados, setGirosUsados] = useState(0);
  const [historico, setHistorico] = useState<{ premio: string; data: string; entregue: boolean }[]>([]);

  const getPreviousWeekRange = useCallback(() => {
    const now = new Date();
    const currentDay = now.getDay(); 
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    let daysToSubtract = (currentDay + 6) % 7; 
    if (currentDay === 1 && (currentHour < 7 || (currentHour === 7 && currentMin < 53))) {
      daysToSubtract = 7;
    }

    const startOfPrizeWeek = new Date(now);
    startOfPrizeWeek.setDate(now.getDate() - daysToSubtract);
    startOfPrizeWeek.setHours(7, 53, 0, 0);

      return { startOfPrizeWeek };
    }, []);

    const { startOfPrizeWeek } = getPreviousWeekRange();
    const clanWeeklyLoot = Number(stats?.clan_weekly_loots || 0);

  // Rule: Score at least 5k clan weekly loots to qualify. Max 1 spin per week.
  const isQualified = clanWeeklyLoot >= 5000;
  const weeklyTotal = isQualified ? 1 : 0; // Quantos giros semanais (gr├ítis) s├úo poss├¡veis
  const extraSpins = profile?.extraSpins || 0; // Giros manuais extras

  // carregar giros j├í usados NESTA semana de premia├º├úo
  useEffect(() => {
    if (!profile?.userId) return;
    const userId = profile.userId;
    async function load() {
      try {
        const snap = await get(ref(rtdb, 'roletas'));
        const roletasData = (snap.val() || {}) as Record<string, { userId?: string; premio?: string; data?: unknown; entregue?: boolean }>;

        let count = 0;
        const list: { premio: string; data: string; entregue: boolean }[] = [];
        const startTs = startOfPrizeWeek.getTime();

        Object.values(roletasData).forEach((entry) => {
          if (entry.userId !== userId) return;
          const dataMillis = toMillis(entry.data);

          if (dataMillis >= startTs) {
            count++;
          }

          list.push({
            premio: entry.premio || '-',
            data: formatDatePtBR(entry.data),
            entregue: !!entry.entregue,
          });
        });

        list.reverse();

        setGirosUsados(count);
        setHistorico(list);
      } catch (err) {
        console.error("Error loading spins:", err);
      }
    }
    load();
  }, [profile, spinning, startOfPrizeWeek]);

    const girosRestantesSemanais = Math.max(0, weeklyTotal - girosUsados);
    const girosDisponiveis = Math.min(3, girosRestantesSemanais + extraSpins);

    const girar = useCallback(async () => {
      if (spinning || girosDisponiveis <= 0 || !profile?.userId) return;
    setSpinning(true);
    setResult(null);
    setSlots(['🩸', '🩸', '🩸']);

    // Weighted Random Selection
    const rand = Math.random() * 100;
    let accumulated = 0;
    let selected = config.prizes[0];
    
    for (const p of config.prizes) {
        accumulated += p.chance;
        if (rand <= accumulated) {
            selected = p;
            break;
        }
    }

    // Animation 3s
    const interval = setInterval(() => {
        setSlots([
            config.prizes[Math.floor(Math.random() * config.prizes.length)].icon,
            config.prizes[Math.floor(Math.random() * config.prizes.length)].icon,
            config.prizes[Math.floor(Math.random() * config.prizes.length)].icon
        ]);
    }, 100);

    await new Promise(r => setTimeout(r, 3000));
    clearInterval(interval);
    
    // Set final slots to winner icon
    setSlots([selected.icon, selected.icon, selected.icon]);

    // Save to Realtime Database
    try {
      await push(ref(rtdb, 'roletas'), {
        userId: profile.userId,
        premio: selected.name,
        data: Date.now(),
        entregue: false,
      });

      // Se usou um giro extra (porque nao tinha mais semanais ou nao era qualificado), debitar
      const hasWeeklyAvailable = weeklyTotal > girosUsados;
      if (!hasWeeklyAvailable && extraSpins > 0) {
        await runTransaction(ref(rtdb, `usuarios/${profile.userId}/extraSpins`), (current) => {
          const nowValue = Number(current || 0);
          return nowValue > 0 ? nowValue - 1 : 0;
        });
      }

    } catch (err) {
      console.error('Erro ao salvar:', err);
    }
    
    setResult(selected);
    setGirosUsados(prev => prev + 1);
    await refreshProfile();
    setSpinning(false);
  }, [spinning, girosDisponiveis, profile, refreshProfile, config.prizes, girosUsados, extraSpins, weeklyTotal]);

  return (
    <div className="w-full text-stone-200 font-serif selection:bg-red-900/30">
      <div className="w-full mx-auto space-y-8 animate-in fade-in duration-500">

        <header className="flex flex-col sm:flex-row items-center justify-between border-b border-white/10 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-900/20 rounded-lg text-red-500 border border-red-900/30 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              <Gift className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-widest uppercase">
                <span className="text-red-600">Blood</span> Slot
              </h1>
              <p className="text-stone-500 text-sm font-serif tracking-wide uppercase mt-1">
                One spin per week ÔÇó Qualification: 5k+ Clan Weekly Loot
              </p>
            </div>
          </div>
        </header>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black border border-white/10 rounded-sm p-6 text-center shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-900/50"></div>
            <p className="text-xs text-stone-500 uppercase tracking-widest font-serif">Clan Weekly Loot</p>
            <p className="text-3xl font-serif font-bold text-white mt-2 drop-shadow-md group-hover:text-red-500 transition-colors">
                {clanWeeklyLoot.toLocaleString('pt-BR')}
            </p>
          </div>
          
          <div className="bg-black border border-white/10 rounded-sm p-6 text-center shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-red-900/50"></div>
            <p className="text-xs text-stone-500 uppercase tracking-widest font-serif">Status</p>
            <p className={cn(
                "text-xl font-serif font-bold mt-2 uppercase tracking-wide", 
                isQualified ? "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "text-red-600 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]"
            )}>
                {isQualified ? "QUALIFIED" : "NOT QUALIFIED"}
            </p>
          </div>
          
          <div className="bg-black border border-white/10 rounded-sm p-6 text-center shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-red-900/50"></div>
            <p className="text-xs text-stone-500 uppercase tracking-widest font-serif">Spins Available</p>
            <p className={cn(
                "text-3xl font-serif font-bold mt-2",
                girosDisponiveis > 0 ? "text-red-500 animate-pulse" : "text-stone-600"
            )}>
                {girosDisponiveis}
            </p>
          </div>

          <div className="bg-black border border-white/10 rounded-sm p-6 text-center shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-900/50"></div>
            <p className="text-xs text-stone-500 uppercase tracking-widest font-serif">Goal</p>
            <p className="text-2xl font-serif font-bold text-stone-300 mt-2 drop-shadow-md">
                5,000
            </p>
          </div>
        </div>

        {/* Slot Machine UI */}
        <div className="flex flex-col items-center gap-10 py-12 bg-zinc-950/80 rounded-sm border border-white/5 relative overflow-hidden">
            
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black pointer-events-none"></div>

            {/* Turn Count Display */}
            <div className="z-10 bg-black/50 px-6 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                <span className="text-stone-400 uppercase tracking-widest text-xs font-serif">
                    Weekly Prize Pool
                </span>
            </div>

            {/* Machine Display */}
            <div className="flex gap-2 sm:gap-6 p-6 sm:p-8 bg-black rounded-lg border-4 border-red-900/40 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 w-full max-w-2xl justify-center">
                {/* Decorative Lights */}
                <div className="absolute -top-3 left-10 w-3 h-3 rounded-full bg-red-600 shadow-[0_0_10px_red] animate-pulse"></div>
                <div className="absolute -top-3 right-10 w-3 h-3 rounded-full bg-red-600 shadow-[0_0_10px_red] animate-pulse delay-75"></div>

                {slots.map((s, i) => (
                    <div key={i} className="w-24 h-32 sm:w-32 sm:h-40 flex items-center justify-center bg-gradient-to-b from-stone-200 to-stone-400 rounded-sm border-4 border-stone-800 text-6xl shadow-inner overflow-hidden relative">
                         <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                        <span className={cn("transform transition-all drop-shadow-md", spinning && "animate-bounce blur-sm")}>{s}</span>
                    </div>
                ))}
            </div>

            {/* Controls */}
             <button
                onClick={girar}
                disabled={spinning || girosDisponiveis <= 0}
                className={cn(
                  "relative z-10 px-12 py-5 rounded-sm font-serif font-black text-2xl uppercase tracking-[0.2em] shadow-2xl transform transition-all active:scale-95 border border-white/10",
                  spinning
                    ? "bg-stone-900 text-stone-600 cursor-wait border-stone-800"
                    : girosDisponiveis > 0
                      ? "bg-red-800 text-white hover:bg-red-700 hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] border-red-600"
                      : "bg-stone-900 text-stone-700 cursor-not-allowed border-stone-800"
                )}
              >
                {spinning ? 'SPINNING...' : 'SPIN'}
            </button>

             {/* Result Display */}
             {result && (
                <div className="z-10 animate-in fade-in zoom-in duration-300 mt-4 text-center">
                    <p className="text-red-500 font-serif uppercase text-sm tracking-widest mb-2">P R I Z E  A C Q U I R E D</p>
                    <p className={cn("text-5xl font-serif font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]", result.color)}>{result.name}</p>
                </div>
             )}

            {/* Prize Table */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 w-full max-w-4xl px-8 opacity-80 z-10">
                {config.prizes.map(p => (
                    <div key={p.id} className="text-center p-4 rounded-sm bg-black/40 border border-white/5 backdrop-blur-sm group hover:border-red-900/30 transition-colors">
                        <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{p.icon}</div>
                        <div className={cn("font-serif font-bold text-sm tracking-wider uppercase", p.color)}>{p.name}</div>
                        <div className="text-xs text-stone-500 mt-1 font-mono">{p.chance}% Probability</div>
                    </div>
                ))}
            </div>
        </div>

        {/* Hist├│rico */}
        {historico.length > 0 && (
          <div className="bg-black/80 border border-white/10 rounded-sm overflow-hidden backdrop-blur-md">
            <div className="px-6 py-5 border-b border-white/10 bg-red-950/10">
              <h2 className="text-lg font-serif font-bold text-white tracking-widest uppercase">Spin History</h2>
            </div>
            <table className="w-full text-sm font-serif">
              <thead className="text-xs text-stone-500 uppercase bg-black border-b border-white/5 tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left font-normal">Date</th>
                  <th className="px-6 py-4 text-left font-normal">Prize</th>
                  <th className="px-6 py-4 text-center font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historico.map((h, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-stone-400 tracking-wide font-mono text-xs">{h.data}</td>
                    <td className="px-6 py-4 text-white font-bold tracking-wide">{h.premio}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex px-3 py-1 rounded-sm text-[10px] uppercase font-bold tracking-widest border",
                        h.entregue ? "bg-emerald-950/30 text-emerald-500 border-emerald-900/30" : "bg-amber-950/30 text-amber-500 border-amber-900/30"
                      )}>
                        {h.entregue ? 'Claimed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      
      </div>
    </div>
  );
}
