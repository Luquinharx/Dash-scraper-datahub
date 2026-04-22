import { useState } from 'react';
import { useEventStats } from '../../hooks/useEventStats';
import { RankBadge } from '../RankBadge';
import { Gem, Loader2, Search } from 'lucide-react';

export default function Evento() {
  const { stats, loading, lastUpdated } = useEventStats();
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-red-500" />
          <p className="font-serif tracking-widest uppercase">Loading event data...</p>
        </div>
      </div>
    );
  }

  // Users to exclude from event stats
  const excludedUsers = ['porkchopo', 'oinkmeats', 'SGT EASY PICKINS', 'MGS Green Cake', 'MGS Green Haze'];

  const eventStats = [...stats]
    .filter(s => !excludedUsers.includes(s.username))
    .filter(s => s.username.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.donatedCash - a.donatedCash)
    .filter(s => s.donatedCash > 0 || s.donatedCredits > 0);

  return (
    <div className="space-y-8 animate-in mt-14 px-4 sm:px-6 lg:px-8 w-full">
        <header className="mb-10 text-center md:text-left flex flex-col gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black font-serif tracking-wider uppercase bg-gradient-to-r from-white to-red-600 bg-clip-text text-transparent drop-shadow-sm">
              Donation Event
            </h1>
            <p className="text-slate-400 mt-2 tracking-wide font-serif text-lg">
              April 09 to April 12
            </p>
            {lastUpdated && (
              <p className="text-slate-500 mt-1 font-mono text-sm opacity-80">
                Última atualização do Banco: {lastUpdated}
              </p>
            )}
          </div>
        </header>

        <div className="w-full">
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl shadow-xl overflow-hidden p-6 relative animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-900" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-950/30 rounded text-red-500">
                    <Gem className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-serif uppercase tracking-widest text-slate-200">
                    Event Participants
                  </h2>
                </div>
                
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/10 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="uppercase tracking-widest text-xs bg-black text-slate-500 font-serif border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-bold">Position</th>
                      <th className="px-6 py-4 font-bold">Operator Name</th>
                      <th className="px-6 py-4 font-bold hidden md:table-cell text-right">Rank</th>
                      <th className="px-6 py-4 font-bold text-right">Donated Cash</th>
                      <th className="px-6 py-4 font-bold text-right text-red-400">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {eventStats.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-serif tracking-widest uppercase">
                          No donations found for this search.
                        </td>
                      </tr>
                    ) : (
                      eventStats.map((stat, i) => (
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
                            ${stat.donatedCash.toLocaleString('en-US')}
                          </td>
                          <td className="px-6 py-4 text-right text-red-400 font-bold">
                            {stat.donatedCredits > 0 ? `${stat.donatedCredits.toLocaleString('en-US')} CR` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        </div>
    </div>
  );
}
