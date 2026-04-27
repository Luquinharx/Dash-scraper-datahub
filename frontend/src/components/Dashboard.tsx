
import { useState, useMemo, useEffect } from 'react';
import { useClanData, type MemberData } from '../hooks/useClanData';
import { useProfilesData } from '../hooks/useProfilesData';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Users, TrendingUp, Flame, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { RankBadge } from './RankBadge';


type SortKey = keyof MemberData | 'clanWeeklyLoot' | `week_`;

export default function Dashboard() {
  const { data, loading, error, latestCollectedAt, updatedCount, totalCount } = useClanData();
  const { profiles } = useProfilesData();

  function formatCollectedAt(iso: string): string {
    if (!iso) return 'â€”';
    try {
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  }

  const allUpdated = updatedCount === totalCount && totalCount > 0;
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive'>('active');
  const [sortKey, setSortKey] = useState<SortKey>('currentAll');
  const [sortDesc, setSortDesc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMode, sortKey, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const dedupedData = useMemo(() => {
    const uniqueMap = new Map<string, MemberData>();
    data.forEach(d => {
      const existing = uniqueMap.get(d.username);
      // Keep the one with the highest dailyLoot (or currentAll as fallback)
      if (!existing || d.dailyLoot > existing.dailyLoot || (d.dailyLoot === existing.dailyLoot && (d.currentAll || 0) > (existing.currentAll || 0))) {
        uniqueMap.set(d.username, d);
      }
    });
    return Array.from(uniqueMap.values());
  }, [data]);

  const filteredAndSortedData = useMemo(() => {
    let result = dedupedData.filter(r => (r.username || '').toLowerCase().includes(search.toLowerCase()));

    if (filterMode === 'active') {
      result = result.filter(r => r.isActive);
    } else if (filterMode === 'inactive') {
      result = result.filter(r => !r.isActive);
    }

    result.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      const profileA = profiles.find(p => (p.username || '').toLowerCase() === (a.username || '').toLowerCase());
      const profileB = profiles.find(p => (p.username || '').toLowerCase() === (b.username || '').toLowerCase());
      
      const aSortKeyStr = String(sortKey);
      
      if (aSortKeyStr === 'username' || aSortKeyStr === 'rank') {
         av = String(a[aSortKeyStr as keyof MemberData] || "").toLowerCase();
         bv = String(b[aSortKeyStr as keyof MemberData] || "").toLowerCase();
         return sortDesc ? (av < bv ? 1 : av > bv ? -1 : 0) : (av > bv ? 1 : av < bv ? -1 : 0);
      } else if (aSortKeyStr === 'currentAll') {
        av = Number(profileA?.all_time_loots || a.currentAll || 0);
        bv = Number(profileB?.all_time_loots || b.currentAll || 0);
      } else if (aSortKeyStr === 'weeklyToDate') {
        av = Number(profileA?.weekly_loots || a.weeklyToDate || 0);
        bv = Number(profileB?.weekly_loots || b.weeklyToDate || 0);
      } else if (aSortKeyStr === 'clanWeeklyLoot') {
        av = Number(profileA?.clan_weekly_loots || 0);
        bv = Number(profileB?.clan_weekly_loots || 0);
      } else if (aSortKeyStr === 'dailyLoot') {
        av = Number(a.dailyLoot || 0);
        bv = Number(b.dailyLoot || 0);
      } else if (aSortKeyStr === 'streak') {
        av = Number(a.streak || 0);
        bv = Number(b.streak || 0);
      } else {
        av = Number(a[aSortKeyStr as keyof MemberData] || 0);
        bv = Number(b[aSortKeyStr as keyof MemberData] || 0);
      }
      return sortDesc ? (Number(bv) - Number(av)) : (Number(av) - Number(bv));
    });

    return result;
  }, [dedupedData, search, sortKey, sortDesc, filterMode, profiles]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const topEarnerData = useMemo(() => {
    // Already deduplicated, just parse weekly values
    const uniqueData = dedupedData.map(m => {
      const weekly = (m.weeklyValues && m.weeklyValues.length) ? m.weeklyValues[m.weeklyValues.length - 1] : 0;
      return { ...m, weekly };
    });

    return uniqueData
      .sort((a, b) => b.weekly - a.weekly)
      .slice(0, 3)
      .map((m, idx) => ({
        rank: idx + 1,
        username: m.username,
        weekly: m.weekly
      }));
  }, [dedupedData]);

  const totalDailyLoot = dedupedData.reduce((acc, curr) => acc + curr.dailyLoot, 0);
  const topEarner = dedupedData.length > 0 ? [...dedupedData].sort((a, b) => b.dailyLoot - a.dailyLoot)[0] : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">  
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-red-500">
        Error loading data: {error}
      </div>
    );
  }

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="w-4 h-4 ml-1 inline-block opacity-30" />;
    return sortDesc ? <ArrowDown className="w-4 h-4 ml-1 inline-block text-red-500" /> : <ArrowUp className="w-4 h-4 ml-1 inline-block text-red-500" />;        
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans">
      <div className="page-shell w-full px-4 sm:px-6 lg:px-8 py-4 md:py-8 space-y-7">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 gap-6">
          <div className="relative">
             <div className="absolute -left-10 top-1 hidden h-12 w-px bg-red-500/70 md:block"></div>
            <h1 className="text-3xl md:text-5xl font-semibold text-white uppercase">
                Dash <span className="text-zinc-300">Loot</span>
            </h1>
            <p className="text-zinc-500 mt-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-30"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Last Update: <span className="text-zinc-300 font-semibold">{formatCollectedAt(latestCollectedAt)}</span>
            </p>
          </div>

           <div className="flex items-center gap-3">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-semibold tracking-[0.12em] uppercase border",
                allUpdated
                  ? "bg-white/[0.04] text-zinc-300 border-white/10"
                  : "bg-amber-950/20 text-amber-500 border-amber-900/40"        
              )}>
                {allUpdated
                  ? <><CheckCircle2 className="w-4 h-4" /> Systems Operational ({updatedCount}/{totalCount})</>
                  : <><RefreshCw className="w-4 h-4 animate-spin" /> Updating ({updatedCount}/{totalCount})</>
                }
              </span>
            </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="soft-card rounded-sm p-6 group">        
            <div className="flex items-center gap-5">
              <div className="p-4 bg-black border border-white/10 rounded-sm text-zinc-400 group-hover:text-white transition-colors">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Tracked Members</p>
                <p className="text-3xl font-semibold text-white mt-1">{data.length}</p>
              </div>
            </div>
          </div>

          <div className="soft-card rounded-sm p-6 group">        
             <div className="flex items-center gap-5">
              <div className="p-4 bg-black border border-white/10 rounded-sm text-zinc-400 group-hover:text-red-500 transition-colors">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Total Daily Loot</p>
                <p className="text-3xl font-semibold text-white mt-1">
                    +{totalDailyLoot.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div className="soft-card rounded-sm p-6 group">        
             <div className="flex items-center gap-5">
              <div className="p-4 bg-black border border-white/10 rounded-sm text-zinc-400 group-hover:text-red-500 transition-colors">
                <Flame className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Top Earner</p>
                <p className="text-3xl font-semibold text-white mt-1 truncate max-w-[200px]" title={topEarner?.username}>
                  {topEarner?.username || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top 3 Weekly Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topEarnerData.map((earner) => (
            <div key={earner.username} className="soft-card rounded-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-sm text-sm font-bold",
                  earner.rank === 1 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                  earner.rank === 2 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                  "bg-orange-600/20 text-orange-400 border border-orange-600/30"
                )}>
                  {earner.rank === 1 ? '🥇' : earner.rank === 2 ? '🥈' : '🥉'}
                </div>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Position {earner.rank}</span>
              </div>
              <p className="text-sm text-zinc-400 truncate mb-2">{earner.username}</p>
              <p className="text-2xl font-mono font-bold text-white">{earner.weekly.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-zinc-600 mt-2">Weekly Loot</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-y border-white/10 bg-black/40 py-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="SEARCH OPERATIVE..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-950/80 border border-white/10 rounded-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all font-mono text-sm uppercase tracking-wider"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setFilterMode('all')}
              className={cn(
                "px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-[0.12em] transition-all",
                filterMode === 'all'
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('active')}
              className={cn(
                "px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-[0.12em] transition-all",
                filterMode === 'active'
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/50"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              Active
            </button>
            <button
              onClick={() => setFilterMode('inactive')}
              className={cn(
                "px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-[0.12em] transition-all",
                filterMode === 'inactive'
                  ? "bg-zinc-200 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="surface-panel rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-black/70 border-b border-white/10 font-sans tracking-[0.12em]">
                <tr>
                  <th className="px-6 py-5 font-bold cursor-pointer hover:text-white transition-colors select-none group focus:outline-none" onClick={() => handleSort('username')}>Username <SortIcon columnKey="username" /></th>
                  <th className="px-6 py-5 font-bold text-center hidden md:table-cell cursor-pointer hover:text-white transition-colors select-none group focus:outline-none" onClick={() => handleSort('rank')}>Rank <SortIcon columnKey="rank" /></th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group focus:outline-none" onClick={() => handleSort('dailyLoot')}>Daily Loot <SortIcon columnKey="dailyLoot" /></th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group focus:outline-none" onClick={() => handleSort('weeklyToDate')}>Weekly Loot <SortIcon columnKey="weeklyToDate" /></th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group focus:outline-none" onClick={() => handleSort('clanWeeklyLoot')}>Clan Weekly Loot <SortIcon columnKey="clanWeeklyLoot" /></th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group focus:outline-none" onClick={() => handleSort('currentAll')}>All Time Loot <SortIcon columnKey="currentAll" /></th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group focus:outline-none" onClick={() => handleSort('streak')}>WK Streak <SortIcon columnKey="streak" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {paginatedData.map((r, idx) => {
                  const absoluteIdx = (currentPage - 1) * itemsPerPage + idx;
                  const profile = profiles.find((p) => (p.username || '').toLowerCase() === (r.username || '').toLowerCase());
                  
                  const username = r.username;
                  const rank = r.rank;
                  const dailyLoot = Number(r.dailyLoot || 0);
                  const rawWeeklyLoot = Number(profile?.weekly_loots || 0);
                  const rawClanWeeklyLoot = Number(profile?.clan_weekly_loots || 0);
                  const weeklyLoot = rawWeeklyLoot;
                  const clanWeeklyLoot = rawClanWeeklyLoot;
                  const allTimeLoot = Number(profile?.all_time_loots || r.currentAll || 0);
                  const streak = Number(r.streak || 0);
                  const rawClanWeeklyTs = Number(profile?.clan_weekly_ts || 0);
                  const rawWeeklyTs = Number(profile?.weekly_ts || 0);
                  const clanWeeklyTs = rawClanWeeklyTs;
                  const weeklyTs = rawWeeklyTs;
                                    const isClanEventHighlight = clanWeeklyLoot >= 5000 || clanWeeklyTs >= 3000000000;
                  
                  const dlText = (dailyLoot >= 0 ? '+' : '') + dailyLoot.toLocaleString('pt-BR');
                  const stText = (streak > 0 ? '+' + streak : streak.toString());

                  const isPowerRaw =
                    (weeklyLoot >= 5000) ||
                    (weeklyTs >= 3_000_000_000);

                  

                  // Cores para as TRs
                  const rowColor = (isClanEventHighlight && isPowerRaw)
                    ? 'bg-gradient-to-r from-zinc-900/40 to-yellow-950/10 hover:from-zinc-900/70 hover:to-yellow-950/20'
                    : isClanEventHighlight
                    ? 'bg-white/[0.035] hover:bg-white/[0.06]'
                    : isPowerRaw
                    ? 'bg-yellow-900/20 hover:bg-yellow-900/30'
                    : '';

                  return (
                    <tr key={username} className={cn(
                        'transition-colors hover:bg-white/5 border-b border-white/5',
                        rowColor
                      )}>
                      <td className="px-6 py-4 font-bold text-white whitespace-nowrap flex items-center gap-3">
                        <span className="text-zinc-600 w-6 text-xs text-right font-mono">{absoluteIdx + 1}.</span>
                        
                        {/* Emojis ficam aqui antes do nome, com title */}
                        {isClanEventHighlight && (
                          <span title="Desempenho no Clã (5k+ Clan Loot / 3B+ Clan TS)" className="cursor-help"><Flame className="w-4 h-4 text-orange-500" /></span>
                        )}
                        {isPowerRaw && (
                          <span 
                            title="Poder Pessoal (5k+ Weekly Loot / 3B+ Weekly TS)" 
                            className="text-yellow-400 text-sm cursor-help"
                          >⚡</span>
                        )}

                        <Link to={`/dashboard?user=${encodeURIComponent(username)}`} className="tracking-wide hover:text-white hover:underline transition-all">
                            {username}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-center text-zinc-300 hidden md:table-cell">
                        <RankBadge rank={rank} />
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-bold w-28",
                        dailyLoot > 0 ? "text-emerald-500" : dailyLoot < 0 ? "text-red-500" : "text-zinc-600"
                      )}>
                        {dlText}
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-400 w-32 hidden sm:table-cell">
                        {weeklyLoot.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-300 font-bold w-32 border-l border-white/5 bg-white/[0.025]">
                        {clanWeeklyLoot.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-300 font-bold">
                        {allTimeLoot.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-xs font-bold min-w-[2.5rem] tracking-wider border",
                          streak > 0 ? "bg-emerald-950/30 text-emerald-500 border-emerald-900/30" : streak < 0 ? "bg-red-950/30 text-red-500 border-red-900/30" : "bg-zinc-900 text-zinc-600 border-zinc-800"
                        )}>
                          {stText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-600 font-sans uppercase tracking-[0.12em]">
                      Não há contas para exibir.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center bg-black/70 border-t border-white/10 px-6 py-4 gap-4">
              <span className="text-xs font-sans uppercase tracking-[0.12em] text-zinc-500">
                PÃ¡gina {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}       
                  disabled={currentPage === 1}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-white/10 rounded-sm text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400 hover:text-white hover:border-white/20 hover:bg-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-white/10 rounded-sm text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400 hover:text-white hover:border-white/20 hover:bg-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

  );
}
