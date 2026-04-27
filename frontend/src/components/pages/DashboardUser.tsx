
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useClanMemberData, useScrapedUsernames } from '../../hooks/useClanMemberData';
import { useFirestoreClanData } from '../../hooks/useFirestoreClanData';
import { useProfilesData } from '../../hooks/useProfilesData';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Search } from 'lucide-react';
import { Tooltip as RechartsTooltip } from 'recharts';
import { formatCompactPtBR, formatSignedCompactPtBR } from '../../lib/format';



export default function DashboardUser() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlUser = searchParams.get('user');

  const { usernames, loading: loadingNames } = useScrapedUsernames();
  const [selectedNickJogo, setSelectedNickJogo] = useState('');

  // Initial selection logic
  useEffect(() => {
    if (loadingNames) return;

    if (urlUser && usernames.includes(urlUser)) {
      setSelectedNickJogo(urlUser);
    } else if (profile?.nickJogo && usernames.includes(profile.nickJogo)) {
      setSelectedNickJogo(profile.nickJogo);
    } else if (usernames.length > 0 && !selectedNickJogo) {
      setSelectedNickJogo(usernames[0]);
    }
  }, [loadingNames, usernames, profile, urlUser]);

  // Update URL when selection changes
  const handleSelect = (nick: string) => {
      setSelectedNickJogo(nick);
      setSearchParams({ user: nick });
  };

  const { stats, loading: statsLoading } = useClanMemberData(selectedNickJogo || undefined);
  const { data: firestoreData, loading: firestoreLoading } = useFirestoreClanData(selectedNickJogo || undefined);
  const { profiles } = useProfilesData();

  const formatCollectedAt = (iso?: string) => {
    if (!iso) return '-';
    const parsed = Date.parse(iso);
    if (!Number.isFinite(parsed)) return '-';
    return new Date(parsed).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Buscar dados de TS do membro selecionado
    const memberTSData = profiles.find(p => {
       try {
          return p.username.toLowerCase() === decodeURIComponent(selectedNickJogo)?.toLowerCase();
       } catch {
          return p.username.toLowerCase() === selectedNickJogo?.toLowerCase();
       }
    });
  const clanWeeklyLoot = Number(stats?.clan_weekly_loots || memberTSData?.clan_weekly_loots || 0);
  const girosDisponiveis = clanWeeklyLoot >= 5000 ? 1 : 0;

  // Calculo Unificado de Loot
  const dbClanLoot = firestoreData.baseLoot || 0;
  const farmedLoot = stats ? stats.weeklyValues.reduce((a, b) => a + b, 0) + (stats.weeklyToDate || memberTSData?.weekly_loots || 0) : 0;
  const totalLoot = dbClanLoot + farmedLoot; // Base (se houver) + Apenas o que foi farmado

  // Calculo de Meses no Cla
  let monthsInClan = 0;
  let formattedJoinDate = 'Not found';
  if (firestoreData.joinDate && !isNaN(firestoreData.joinDate.getTime())) {
      const now = new Date();
      const join = firestoreData.joinDate;
      const diffTime = Math.abs(now.getTime() - join.getTime());
      monthsInClan = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
      formattedJoinDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(join).toUpperCase();
  }

  // Calculo do Colateral
    const donatedCash = firestoreData.donatedCash || 0;
    const donatedCredits = firestoreData.donatedCredits || 0;
    const collateralMonthsVal = monthsInClan * 7000000;
    const collateralLootVal = totalLoot * 500;
    const collateralDonationsVal = donatedCash * 2; // Credits omitted from collateral math unless specified
    const collateralTotal = collateralMonthsVal + collateralLootVal + collateralDonationsVal;

    const tooltipText = `${monthsInClan} meses = ${collateralMonthsVal.toLocaleString('pt-BR')}
${~~(donatedCash / 1000000)}M doados = ${collateralDonationsVal.toLocaleString('pt-BR')}
${~~(totalLoot / 1000)}K loot = ${collateralLootVal.toLocaleString('pt-BR')}
-------------------
Total = ${collateralTotal.toLocaleString('pt-BR')}`;
  const chartTooltipStyle = {
    backgroundColor: '#09090b',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '2px',
    color: '#e4e4e7',
    fontFamily: 'monospace',
  };
  const compactTooltipFormatter = (value: unknown) => [
    formatCompactPtBR(Number(value || 0)),
    'Total',
  ];
  const isLoading = loadingNames;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <div className="page-shell w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mx-auto space-y-7">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 gap-6">
          <div className="relative">
            <div className="absolute -left-10 top-1 hidden h-12 w-px bg-red-500/70 md:block"></div>
            <h1 className="text-3xl md:text-5xl font-semibold text-white uppercase flex items-center gap-3">
                Member <span className="text-zinc-300">Dash</span>
            </h1>
            <p className="text-zinc-500 mt-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-30"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live Performance Data | Last Update: {formatCollectedAt(stats?.collected_at || memberTSData?.collected_at)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-[0.12em]">Select Member</label>
            <div className="relative group">
                <select
                value={selectedNickJogo}
                onChange={e => handleSelect(e.target.value)}
                className="px-4 py-3 bg-zinc-950/80 border border-white/10 rounded-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all min-w-[250px] font-mono text-sm uppercase appearance-none cursor-pointer hover:border-white/30"
                style={{ colorScheme: 'dark' }}
                >
                {usernames.map(u => {
                  let displayName = u;
                  try {
                    displayName = decodeURIComponent(u);
                  } catch (e) {}
                  return (
                    <option key={u} value={u} className="bg-zinc-950 text-white">{displayName}</option>
                  );
                })}
                </select>
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none group-hover:text-white transition-colors" />
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        {statsLoading || firestoreLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600" />
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="soft-card rounded-sm p-6 flex items-center gap-4">

                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Member</p>
                    <p className="text-xl font-semibold text-white truncate max-w-[150px]" title={stats.username}>{stats.username}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase">Join: {formattedJoinDate}</p>
                    {memberTSData && <p className="text-[10px] text-purple-400 mt-1 uppercase font-bold">{memberTSData.rank}</p>}
                  </div>
              </div>

              <div className="soft-card rounded-sm p-6 flex items-center gap-4">

                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Donated</p>
                      <p className="text-xl font-semibold text-white">
                        ${donatedCash.toLocaleString('pt-BR')}
                        {donatedCredits > 0 && <span className="text-sm font-bold text-purple-400 ml-2">({donatedCredits.toLocaleString('pt-BR')} CR)</span>}
                      </p>
                  </div>
              </div>

              <div className="soft-card rounded-sm p-6 flex items-center gap-4" title={tooltipText}>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Collateral</p>
                    <p className="text-xl font-semibold text-white">{collateralTotal.toLocaleString('pt-BR')}</p>
                  </div>
              </div>

              <div className="soft-card rounded-sm p-6 flex items-center gap-4">

                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Spins</p>
                    <p className="text-xl font-semibold text-white">{girosDisponiveis}</p>
                  </div>
                </div>
            </div>

            {/* Métricas de Loot */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="soft-card rounded-sm p-6 relative overflow-hidden">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">DAILY LOOT</h3>
                  <p className="text-3xl font-semibold text-emerald-500">
                    +{stats.dailyLoot.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="soft-card rounded-sm p-6 relative overflow-hidden">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">WEEK LOOT</h3>
                  <p className="text-3xl font-semibold text-white">
                    {(memberTSData?.weekly_loots || 0).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="soft-card rounded-sm p-6 relative overflow-hidden">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">GANG LOOT</h3>
                  <p className="text-3xl font-semibold text-white">
                    {(memberTSData?.all_time_clan_loots || 0).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="soft-card rounded-sm p-6 relative overflow-hidden">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">ALL TIME LOOTS</h3>
                  <p className="text-3xl font-semibold text-zinc-300">
                    {stats.currentAll.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Loot Diário - Area Chart */}
              <div className="surface-panel rounded-sm p-6">
                <h2 className="text-lg font-semibold text-zinc-300 mb-6 uppercase">Activity Log (Daily)</h2>
                {stats.dailyHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats.dailyHistory}>
                      <defs>
                        <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" />
                      <XAxis dataKey="data" stroke="#44403c" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <YAxis stroke="#52525b" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(value) => formatCompactPtBR(Number(value))} />
                      <RechartsTooltip
                        contentStyle={chartTooltipStyle}
                        formatter={compactTooltipFormatter}
                        itemStyle={{ color: '#ef4444' }}
                        labelStyle={{ color: '#a1a1aa' }}
                      />
                      <Area type="monotone" dataKey="valor" stroke="#dc2626" fillOpacity={1} fill="url(#colorValor)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-stone-600 font-serif uppercase tracking-widest">No Data</div>
                )}
              </div>

              {/* Loot Semanal - Bar Chart */}
              <div className="surface-panel rounded-sm p-6">
                <h2 className="text-lg font-semibold text-zinc-300 mb-6 uppercase">Weekly Performance</h2>
                {stats.weeklyHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.weeklyHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" />
                      <XAxis dataKey="semana" stroke="#44403c" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                      <YAxis stroke="#52525b" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(value) => formatCompactPtBR(Number(value))} />
                      <RechartsTooltip
                        cursor={{fill: '#1c1917'}}
                        contentStyle={chartTooltipStyle}
                        formatter={compactTooltipFormatter}
                        itemStyle={{ color: '#ef4444' }}
                        labelStyle={{ color: '#a1a1aa' }}
                      />
                      <Bar dataKey="total" fill="#7f1d1d" radius={[2, 2, 0, 0]} activeBar={{ fill: '#dc2626' }} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-stone-600 font-serif uppercase tracking-widest">No Data</div>
                )}
              </div>
            </div>

            {/* Gráficos de TS */}
            {memberTSData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* TS Diário - Area Chart */}
                <div className="surface-panel rounded-sm p-6">
                  <h2 className="text-lg font-semibold text-zinc-300 mb-6 uppercase">TS Daily Activity</h2>
                  <div className="flex items-center justify-center h-[300px] bg-black rounded-sm">
                    <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats.dailyTSHistory || []}>
                        <defs>
                          <linearGradient id="colorTSDaily" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.22}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" />
                        <XAxis dataKey="data" stroke="#52525b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                        <YAxis stroke="#52525b" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(value) => formatCompactPtBR(Number(value))} />
                        <RechartsTooltip
                          contentStyle={chartTooltipStyle}
                          formatter={compactTooltipFormatter}
                          itemStyle={{ color: '#e4e4e7' }}
                          labelStyle={{ color: '#a1a1aa' }}
                        />
                        <Area type="monotone" dataKey="valor" stroke="#ef4444" fillOpacity={1} fill="url(#colorTSDaily)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* TS Semanal - Bar Chart */}
                <div className="surface-panel rounded-sm p-6">
                  <h2 className="text-lg font-semibold text-zinc-300 mb-6 uppercase">TS Weekly Summary</h2>
                  <div className="flex items-center justify-center h-[300px] bg-black rounded-sm">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.weeklyTSHistory && stats.weeklyTSHistory.length > 0 ? stats.weeklyTSHistory : [{ semana: "Atual", total: memberTSData.weekly_ts }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" />
                        <XAxis dataKey="semana" stroke="#52525b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                        <YAxis stroke="#52525b" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(value) => formatCompactPtBR(Number(value))} />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                          contentStyle={chartTooltipStyle}
                          formatter={compactTooltipFormatter}
                          itemStyle={{ color: '#e4e4e7' }}
                          labelStyle={{ color: '#a1a1aa' }}
                        />
                        <Bar dataKey="total" fill="#ef4444" radius={[2, 2, 0, 0]} activeBar={{ fill: '#f4f4f5' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Métricas de TS */}
            {memberTSData && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="soft-card rounded-sm p-6 relative overflow-hidden">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">DAILY TS</h3>
                    <p className="text-3xl font-semibold text-red-500" title={(stats.daily_ts_calc || 0).toLocaleString('pt-BR')}>
                      {formatSignedCompactPtBR(stats.daily_ts_calc || 0)}
                    </p>
                  </div>
                </div>

                <div className="soft-card rounded-sm p-6 relative overflow-hidden">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">WEEKLY TS</h3>
                    <p className="text-3xl font-semibold text-white" title={memberTSData.weekly_ts.toLocaleString('pt-BR')}>
                      {formatCompactPtBR(memberTSData.weekly_ts)}
                    </p>
                  </div>
                </div>

                <div className="soft-card rounded-sm p-6 relative overflow-hidden">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">GANG WEEKLY TS</h3>
                    <p className="text-3xl font-semibold text-white" title={memberTSData.clan_weekly_ts.toLocaleString('pt-BR')}>
                      {formatCompactPtBR(memberTSData.clan_weekly_ts)}
                    </p>
                  </div>
                </div>

                <div className="soft-card rounded-sm p-6 relative overflow-hidden">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">ALL TIME TS</h3>
                    <p className="text-3xl font-semibold text-zinc-300" title={memberTSData.all_time_ts.toLocaleString('pt-BR')}>
                      {formatCompactPtBR(memberTSData.all_time_ts)}
                    </p>
                  </div>
                </div>

                <div className="soft-card rounded-sm p-6 relative overflow-hidden">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">TOTAL EXP</h3>
                    <p className="text-3xl font-semibold text-emerald-500" title={(memberTSData.total_exp || 0).toLocaleString('pt-BR')}>
                      {formatCompactPtBR(memberTSData.total_exp || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-40 text-stone-600 font-serif uppercase tracking-widest">
            {selectedNickJogo ? 'No data for this member.' : 'Select member to view data.'}
          </div>
        )}
      </div>
    </div>
  );
}
