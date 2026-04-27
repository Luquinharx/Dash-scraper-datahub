import { useState } from 'react';
import Roleta from './Roleta';
import PowerRoleta from './PowerRoleta';
import { Gift, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Cassino() {
  const [activeTab, setActiveTab] = useState<'slots' | 'power'>('slots');

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-red-900/30">
      <div className="page-shell w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mx-auto space-y-6">
        
        {/* Header Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-4 relative z-10 w-full">
          <button
            onClick={() => setActiveTab('slots')}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-sm font-semibold uppercase tracking-[0.12em] transition-all border",
              activeTab === 'slots'
                ? "bg-white text-black border-white"
                : "bg-zinc-950/80 text-zinc-500 border-white/10 hover:text-white hover:border-white/20"
            )}
          >
            <Gift className="w-5 h-5" />
            <span className="hidden sm:inline">Blood</span> Slot
          </button>

          <button
            onClick={() => setActiveTab('power')}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-sm font-semibold uppercase tracking-[0.12em] transition-all border",
              activeTab === 'power'
                ? "bg-white text-black border-white"
                : "bg-zinc-950/80 text-zinc-500 border-white/10 hover:text-white hover:border-white/20"
            )}
          >
            <Zap className="w-5 h-5" />
            <span className="hidden sm:inline">Blood</span> Wheel
          </button>
        </div>

        {/* Tab View Wrapper */}
        <div className="w-full mt-4">
          {activeTab === 'slots' ? <Roleta /> : <PowerRoleta />}
        </div>
      </div>
    </div>
  );
}
