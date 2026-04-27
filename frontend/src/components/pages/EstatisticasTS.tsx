import { useState, useMemo, useEffect } from 'react';
import { useProfilesData, type MemberProfile } from '../../hooks/useProfilesData';
import { useClanData } from '../../hooks/useClanData';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Users, TrendingUp, Flame, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { RankBadge } from '../RankBadge';
import { formatCompactPtBR, formatSignedCompactPtBR } from '../../lib/format';

type SortKey = keyof MemberProfile | 'daily_ts_calc' | 'rank';

function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default function EstatisticasTS() {
  const { profiles, loading: profilesLoading } = useProfilesData();
  const { data: clanData, loading: clanLoading } = useClanData();

  const loading = profilesLoading || clanLoading;

  function formatCollectedAt(iso: string): string {
    if (!iso) return '–';
    try {
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  }

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('all_time_ts');
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

  const dedupedProfiles = useMemo(() => {
    const uniqueMap = new Map<string, MemberProfile>();
    profiles.forEach(p => {
      const existing = uniqueMap.get(p.username);
      if (!existing || p.weekly_ts > existing.weekly_ts || (p.weekly_ts === existing.weekly_ts && p.all_time_ts > existing.all_time_ts)) {
        uniqueMap.set(p.username, p);
      }
    });
    return Array.from(uniqueMap.values());
  }, [profiles]);

  const filteredAndSortedData = useMemo(() => {
    let result = dedupedProfiles.filter(p => p.username.toLowerCase().includes(search.toLowerCase()));

    if (filterMode === 'active') {
      result = result.filter(p => p.weekly_ts > 0);
    } else if (filterMode === 'inactive') {
      result = result.filter(p => p.weekly_ts <= 0);
    }

    result.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
        
        const cA = clanData.find(d => d.username.toLowerCase() === a.username.toLowerCase());
        const cB = clanData.find(d => d.username.toLowerCase() === b.username.toLowerCase());

        if (sortKey === 'username') {
          av = a.username.toLowerCase();
          bv = b.username.toLowerCase();
          return sortDesc ? (av < bv ? 1 : av > bv ? -1 : 0) : (av > bv ? 1 : av < bv ? -1 : 0);
        } else if (sortKey === 'daily_ts_calc') {
          av = cA?.dailyTS || 0;
          bv = cB?.dailyTS || 0;
        } else if (sortKey === 'rank') {
          av = cA?.rank || '';
          bv = cB?.rank || '';
          return sortDesc ? (av < bv ? 1 : av > bv ? -1 : 0) : (av > bv ? 1 : av < bv ? -1 : 0);
        } else {
          av = Number(a[sortKey as keyof MemberProfile] ?? 0);
          bv = Number(b[sortKey as keyof MemberProfile] ?? 0);
        }
        return sortDesc ? (Number(bv) - Number(av)) : (Number(av) - Number(bv));
      });

      return result;
    }, [dedupedProfiles, search, sortKey, sortDesc, filterMode, clanData]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedProfiles = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const topEarnerData = useMemo(() => {
    // Already deduplicated
    return [...dedupedProfiles]
      .sort((a, b) => b.weekly_ts - a.weekly_ts)
      .slice(0, 3)
      .map((m, idx) => ({
        rank: idx + 1,
        username: m.username,
        weekly_ts: m.weekly_ts
      }));
  }, [dedupedProfiles]);

  const totalWeeklyTS = dedupedProfiles.reduce((acc, curr) => acc + curr.weekly_ts, 0);
  const totalDailyTS = dedupedProfiles.reduce((acc, curr) => {
    const clanMember = clanData.find(d => d.username.toLowerCase() === curr.username.toLowerCase());
    return acc + (clanMember?.dailyTS || 0);
  }, 0);
  const totalAllTimeTS = dedupedProfiles.reduce((acc, curr) => acc + curr.all_time_ts, 0);
  const topEarner = dedupedProfiles.length > 0 ? [...dedupedProfiles].sort((a, b) => b.weekly_ts - a.weekly_ts)[0] : null;

  const latestCollectedAt = useMemo(() => {
    let latestIso = '';
    let latestTs = 0;
    profiles.forEach((profile) => {
      const raw = profile.collected_at;
      const ts = raw ? Date.parse(raw) : NaN;
      if (Number.isFinite(ts) && ts > latestTs) {
        latestTs = ts;
        latestIso = raw;
      }
    });
    return latestIso;
  }, [profiles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
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
                Dash <span className="text-zinc-300">TS</span>
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
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-semibold tracking-[0.12em] uppercase border bg-white/[0.04] text-zinc-300 border-white/10">
                <CheckCircle2 className="w-4 h-4" /> Systems Operational ({profiles.length}/{profiles.length})
              </span>
            </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="soft-card rounded-sm p-6 group">        
            <div className="flex items-center gap-5">
              <div className="p-4 bg-black border border-white/10 rounded-sm text-zinc-400 group-hover:text-white transition-colors">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Tracked Members</p>
                <p className="text-3xl font-semibold text-white mt-1">{profiles.length}</p>
              </div>
            </div>
          </div>

          <div className="soft-card rounded-sm p-6 group">        
             <div className="flex items-center gap-5">
              <div className="p-4 bg-black border border-white/10 rounded-sm text-zinc-400 group-hover:text-sky-500 transition-colors">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Total Daily TS</p>
                <p className="text-2xl font-semibold text-sky-400 mt-1">
                    {formatSignedCompactPtBR(totalDailyTS > 0 ? totalDailyTS : 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="soft-card rounded-sm p-6 group">        
             <div className="flex items-center gap-5">
              <div className="p-4 bg-black border border-white/10 rounded-sm text-zinc-400 group-hover:text-red-500 transition-colors">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Total Weekly TS</p>
                <p className="text-2xl font-semibold text-white mt-1">
                    {formatSignedCompactPtBR(totalWeeklyTS)}
                </p>
              </div>
            </div>
          </div>

          <div className="soft-card rounded-sm p-6 group">        
             <div className="flex items-center gap-5">
              <div className="p-4 bg-black border border-white/10 rounded-sm text-zinc-400 group-hover:text-emerald-500 transition-colors">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Total All Time TS</p>
                <p className="text-2xl font-semibold text-emerald-400 mt-1">
                    {formatSignedCompactPtBR(totalAllTimeTS)}
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
                <p className="text-2xl font-semibold text-white mt-1 truncate max-w-[120px]" title={topEarner?.username}>
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
              <p className="text-2xl font-mono font-bold text-white">{earner.weekly_ts.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-zinc-600 mt-2">Weekly TS</p>
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
                  <th className="px-6 py-5 font-bold">Username</th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group hidden md:table-cell" onClick={() => handleSort('rank')}>
                    Rank <SortIcon columnKey="rank" />
                  </th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group" onClick={() => handleSort('daily_ts_calc')}>
                    Daily TS <SortIcon columnKey="daily_ts_calc" />
                  </th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group" onClick={() => handleSort('weekly_ts')}>
                    Weekly TS <SortIcon columnKey="weekly_ts" />
                  </th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group hidden sm:table-cell" onClick={() => handleSort('clan_weekly_ts')}>
                    Clan Weekly <SortIcon columnKey="clan_weekly_ts" />
                  </th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group hidden lg:table-cell" onClick={() => handleSort('all_time_ts')}>
                    All Time TS <SortIcon columnKey="all_time_ts" />
                  </th>
                  <th className="px-6 py-5 font-bold text-right cursor-pointer hover:text-white transition-colors select-none group hidden xl:table-cell" onClick={() => handleSort('total_exp')}>
                    Total Exp <SortIcon columnKey="total_exp" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {paginatedProfiles.map((p, idx) => {
                  const absoluteIdx = (currentPage - 1) * itemsPerPage + idx;   
                  const isHighlight = (p.weekly_ts > 5000);

                  const weeklyTSClass = p.weekly_ts > 10000 ? "text-emerald-500" : p.weekly_ts > 5000 ? "text-zinc-100" : "text-zinc-600";
                  const clanWeeklyClass = p.clan_weekly_ts > 5000 ? "text-emerald-500" : p.clan_weekly_ts > 0 ? "text-zinc-300" : "text-zinc-600";
                  const allTimeTSClass = p.all_time_ts > 50000000 ? "text-emerald-400" : "text-zinc-300";

                  const clanMember = clanData.find(d => d.username.toLowerCase() === p.username.toLowerCase());
                  const rank = clanMember?.rank || 'Street Cleaner';

                  const dailyTS = clanMember?.dailyTS || 0;
                  const dailyTSClass = dailyTS > 0 ? "text-sky-500" : dailyTS < 0 ? "text-red-500" : "text-zinc-600";
                  const dailyTSText = formatSignedCompactPtBR(dailyTS);

                  return (
                    <tr
                      key={p.username}
                      className={cn(
                        "transition-colors hover:bg-white/5",
                        isHighlight && "bg-white/[0.035] hover:bg-white/[0.06]"
                      )}
                    >
                      <td className="px-6 py-4 font-bold text-white whitespace-nowrap flex items-center gap-3">
                        <span className="text-zinc-600 w-6 text-xs text-right font-mono">{absoluteIdx + 1}.</span>
                        <span className={cn(
                          "inline-block w-1.5 h-1.5 rotate-45 flex-shrink-0",
                          "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.7)]"
                        )} title="Updated" />
                        <Link to={`/dashboard?user=${encodeURIComponent(p.username)}`} className="tracking-wide hover:text-white hover:underline transition-all">
                            {toTitleCase(p.username)}
                        </Link>
                        {isHighlight && <Flame className="w-3.5 h-3.5 text-red-600" />}
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-300 hidden md:table-cell">
                        <RankBadge rank={rank} />
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-bold",
                        dailyTSClass
                      )}>
                        {dailyTSText}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-bold",
                        weeklyTSClass
                      )}>
                        <span className="font-mono font-bold bg-white/[0.04] px-3 py-1 rounded-sm border border-white/10">
                          {formatCompactPtBR(p.weekly_ts)}
                        </span>
                      </td>

                      <td className={cn(
                        "px-6 py-4 text-right font-mono hidden sm:table-cell",
                        clanWeeklyClass
                      )}>
                        {formatCompactPtBR(p.clan_weekly_ts)}
                      </td>

                      <td className={cn(
                        "px-6 py-4 text-right font-mono hidden lg:table-cell",
                        allTimeTSClass
                      )}>
                        {formatCompactPtBR(p.all_time_ts)}
                      </td>

                      <td className="px-6 py-4 text-right font-mono text-zinc-400 font-bold hidden xl:table-cell text-sm">
                        {formatCompactPtBR(p.total_exp)}
                      </td>
                    </tr>
                  );
                })}
                {paginatedProfiles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-600 font-sans uppercase tracking-[0.12em]">
                      No operatives found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center bg-black/70 border-t border-white/10 px-6 py-4 gap-4">
              <span className="text-xs font-sans uppercase tracking-[0.12em] text-zinc-500">
                Página {currentPage} de {totalPages}
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
