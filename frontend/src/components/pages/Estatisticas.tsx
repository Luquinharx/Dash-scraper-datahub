import { useState } from 'react';
import { useAllClanStats } from '../../hooks/useAllClanStats';
import { RankBadge } from '../RankBadge';
import { Coins, Trophy, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Estatisticas() {
  const { stats, loading, lastUpdated } = useAllClanStats();
  const [activeTab, setActiveTab] = useState<'donations'|'loot'>('donations');

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-red-500" />
          <p className="font-serif tracking-widest uppercase">Loading clan data...</p>
        </div>
      </div>
    );
  }

  // Separate valid stats and order them appropriately. We can have two sections or tables.
  const donationStats = [...stats]
      .sort((a, b) => b.donatedCash - a.donatedCash)
      .filter(s => s.donatedCash > 0 || s.donatedCredits > 0);

  const lootStats = [...stats].sort((a, b) => b.totalLoot - a.totalLoot);

  return (
    <div className="space-y-8 animate-in mt-14">
        <header className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black font-serif tracking-wider uppercase bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
              Clan Statistics
            </h1>
            <p className="text-slate-400 mt-2 tracking-wide">
              Consolidated view of contributions and loot.
            </p>
            {lastUpdated && (
              <p className="text-slate-500 mt-1 font-mono text-sm opacity-80">
                Última atualização do Banco: {lastUpdated}
              </p>
            )}
          </div>

          <div className="flex bg-[#0a0a0a] p-1 border border-white/10 rounded-lg shrink-0">
            <button
              onClick={() => setActiveTab('donations')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold tracking-wide transition-all uppercase font-serif",
                activeTab === 'donations' ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-slate-400 hover:text-white"
              )}
            >
              <Coins className="w-4 h-4" /> Top Donators
            </button>
            <button
              onClick={() => setActiveTab('loot')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold tracking-wide transition-all uppercase font-serif",
                activeTab === 'loot' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-white"
              )}
            >
              <Trophy className="w-4 h-4" /> Total Loot
            </button>
          </div>
        </header>

        <div className="w-full">
          
          {activeTab === 'donations' && (
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl shadow-xl overflow-hidden p-6 relative animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-900" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-950/30 rounded text-red-500">
                  <Coins className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-serif uppercase tracking-widest text-slate-200">
                  Top Doadores do Clã
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="uppercase tracking-widest text-xs bg-black text-slate-500 font-serif border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-bold">Posição</th>
                      <th className="px-6 py-4 font-bold">Nome do Operador</th>
                      <th className="px-6 py-4 font-bold hidden md:table-cell text-right">Rank</th>
                      <th className="px-6 py-4 font-bold text-right">Cash Doado</th>
                      <th className="px-6 py-4 font-bold text-right text-purple-400">Créditos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {donationStats.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-serif tracking-widest uppercase">
                          Nenhuma doação encontrada no registro.
                        </td>
                      </tr>
                    ) : (
                      donationStats.map((stat, i) => (
                        <tr key={stat.username} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4 text-slate-600">{(i + 1).toString().padStart(2, '0')}</td>
                          <td className="px-6 py-4 font-bold text-slate-200 group-hover:text-red-400 transition-colors flex flex-col sm:flex-row gap-2 sm:items-center">
                            {stat.username}
                            <div className="md:hidden">
                                <RankBadge rank={stat.rank} />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right hidden md:table-cell">
                              <RankBadge rank={stat.rank} />
                          </td>
                          <td className="px-6 py-4 text-right text-emerald-400 font-bold">
                            ${stat.donatedCash.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-right text-purple-400 font-bold">
                            {stat.donatedCredits > 0 ? `${stat.donatedCredits.toLocaleString('pt-BR')} CR` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'loot' && (
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl shadow-xl overflow-hidden p-6 relative animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-900" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-950/30 rounded text-blue-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-serif uppercase tracking-widest text-slate-200">
                  Accumulated Loot (Base + Scraper)
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="uppercase tracking-widest text-xs bg-black text-slate-500 font-serif border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-bold">Posição</th>
                      <th className="px-6 py-4 font-bold">Nome do Operador</th>
                      <th className="px-6 py-4 font-bold hidden md:table-cell text-right">Rank</th>
                      <th className="px-6 py-4 font-bold text-right">Daily Loot</th>
                      <th className="px-6 py-4 font-bold text-right hidden sm:table-cell">Weekly Loot</th>
                      <th className="px-6 py-4 font-bold text-right hidden md:table-cell">Clan Weekly</th>
                      <th className="px-6 py-4 font-bold text-right" title="Base Loot + Coletado Scraper">Total Accumulated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {lootStats.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-serif tracking-widest uppercase">
                          No consolidated loot records.
                        </td>
                      </tr>
                    ) : (
                      lootStats.map((stat, i) => {
                        const dailyLootClass = stat.dailyLoot > 0 ? "text-sky-500" : stat.dailyLoot < 0 ? "text-red-500" : "text-stone-600";
                        const dailyLootText = (stat.dailyLoot >= 0 ? '+' : '') + stat.dailyLoot.toLocaleString('pt-BR');
                        const weeklyLootClass = stat.weeklyLoot > 5000 ? "text-emerald-500" : stat.weeklyLoot > 1000 ? "text-blue-500" : "text-stone-400";
                        const clanWeeklyClass = stat.clanWeeklyLoot > 5000 ? "text-emerald-500" : stat.clanWeeklyLoot > 0 ? "text-stone-300" : "text-stone-600";
                        return (
                        <tr key={stat.username} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4 text-slate-600">{(i + 1).toString().padStart(2, '0')}</td>
                          <td className="px-6 py-4 font-bold text-slate-200 group-hover:text-blue-400 transition-colors flex flex-col sm:flex-row gap-2 sm:items-center">
                            {stat.username}
                            {stat.baseLoot > 0 && <span className="text-[10px] uppercase font-sans font-bold bg-blue-950/40 border border-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded" title="Has Base Loot Registered">Base</span>}
                            <div className="md:hidden">
                                <RankBadge rank={stat.rank} />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right hidden md:table-cell">
                              <RankBadge rank={stat.rank} />
                          </td>
                          <td className={cn("px-6 py-4 text-right font-bold", dailyLootClass)}>
                            {dailyLootText}
                          </td>
                          <td className={cn("px-6 py-4 text-right font-bold hidden sm:table-cell", weeklyLootClass)}>
                            {stat.weeklyLoot?.toLocaleString('pt-BR')}
                          </td>
                          <td className={cn("px-6 py-4 text-right font-bold hidden md:table-cell", clanWeeklyClass)}>
                            {stat.clanWeeklyLoot?.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-right text-blue-400 font-bold">
                            {stat.totalLoot.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
    </div>
  );
}
