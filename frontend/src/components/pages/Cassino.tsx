import { useState } from 'react';
import Roleta from './Roleta';
import PowerRoleta from './PowerRoleta';
import { Gift, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Cassino() {
  const [activeTab, setActiveTab] = useState<'slots' | 'power'>('slots');

  return (
    <div className="min-h-screen bg-black text-stone-200 font-serif selection:bg-red-900/30">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* Header Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-4 relative z-10 w-full">
          <button
            onClick={() => setActiveTab('slots')}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-sm font-bold uppercase tracking-widest transition-all",
              activeTab === 'slots'
                ? "bg-red-900/20 text-red-500 border border-red-900/30 shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                : "bg-black text-stone-500 border border-white/5 hover:text-white hover:border-white/20"
            )}
          >
            <Gift className="w-5 h-5" />
            <span className="hidden sm:inline">Blood</span> Slot
          </button>

          <button
            onClick={() => setActiveTab('power')}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-sm font-bold uppercase tracking-widest transition-all",
              activeTab === 'power'
                ? "bg-purple-900/20 text-purple-500 border border-purple-900/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                : "bg-black text-stone-500 border border-white/5 hover:text-white hover:border-white/20"
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
