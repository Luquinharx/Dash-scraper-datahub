import { Link } from 'react-router-dom';
import { Skull, Users, Shield, Package, Hammer, Calendar } from 'lucide-react';
import Navbar from '../Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans overflow-x-hidden">
      <Navbar />
      
      {/* HERO SECTION */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background Image Source */}
        <div className="absolute inset-0 z-0 bg-black">
             <div 
                className="absolute inset-0 bg-contain bg-center bg-no-repeat animate-in fade-in duration-1000 animate-pulse-slow scale-90 md:scale-75 origin-center"
                style={{ 
                    backgroundImage: `url('/hero_bg.png')`,
                    animation: 'subtle-drift 20s infinite alternate linear' 
                }}
             ></div>
             
             {/* Scanline / CRT Effect Overlay - Reduced opacity */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
             
             {/* Vignette (Darker edges) */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10"></div>
             
             {/* Bottom Fade for content readability */}
             <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent z-10"></div>
        </div>

        {/* Content - Positioned at the bottom */}
        <div className="absolute bottom-16 md:bottom-20 left-0 w-full z-20 px-4">
            <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto flex flex-col items-center gap-7 animate-in slide-in-from-bottom-8 duration-1000 delay-300">
                
                <p className="max-w-2xl text-center text-zinc-300 text-base md:text-lg font-medium leading-relaxed drop-shadow-md bg-black/45 px-5 py-4 rounded-sm backdrop-blur-md border border-white/10">
                    A relaxed clan with shared storage, fair ranks, and weekly progress tracking.
                </p>

                <div className="flex flex-col md:flex-row items-center gap-4 justify-center w-full">
                    <a href="https://discord.gg/SVpgqPtD" target="_blank" className="relative group px-7 py-3 bg-white text-black font-semibold uppercase tracking-[0.12em] border border-white hover:bg-zinc-200 transition-all overflow-hidden backdrop-blur-sm">
                        <span className="relative inline-block">Join The Clan</span>
                    </a>
                    
                    {/* Scroll Indicator - Placed between buttons */}
                    <div className="animate-bounce opacity-50 hidden md:block">
                        <div className="w-5 h-8 border border-stone-500 rounded-full flex justify-center pt-2">
                            <div className="w-0.5 h-2 bg-stone-300 rounded-full"></div>
                        </div>
                    </div>
                    
                    <Link to="/roleta" className="relative group px-7 py-3 bg-black/45 text-white font-semibold uppercase tracking-[0.12em] border border-white/20 hover:border-white/50 hover:bg-white/10 transition-all backdrop-blur-sm">
                        <span className="relative inline-block drop-shadow-md">Test Your Luck</span>
                    </Link>
                </div>
                
                {/* Mobile Scroll Indicator below buttons */}
                <div className="animate-bounce opacity-50 md:hidden mt-2">
                    <div className="w-5 h-8 border border-stone-500 rounded-full flex justify-center pt-2">
                        <div className="w-0.5 h-2 bg-stone-300 rounded-full"></div>
                    </div>
                </div>

            </div>
        </div>
        
        {/* Old Scroll Indicator - Removed as it's now integrated */}
      </section>

      {/* FEATURES SECTION */}
      <section className="py-24 bg-zinc-950 relative border-t border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto text-center">
             <div className="flex justify-center mb-16">
                 <Skull className="w-16 h-16 text-zinc-600" />
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-5 gap-12">
                 {/* Feature 1 */}
                 <div className="flex flex-col items-center gap-4 group cursor-default">
                     <div className="p-6 rounded-sm bg-black border border-white/10 group-hover:border-white/20 transition-colors shadow-2xl">
                         <Users className="w-10 h-10 text-zinc-400 group-hover:text-white transition-colors" />
                     </div>
                     <h3 className="font-semibold uppercase tracking-[0.12em] text-sm text-zinc-300">Members: 70+</h3>
                 </div>

                  {/* Feature 2 */}
                  <div className="flex flex-col items-center gap-4 group cursor-default">
                     <div className="p-6 rounded-sm bg-black border border-white/10 group-hover:border-white/20 transition-colors shadow-2xl">
                         <Shield className="w-10 h-10 text-zinc-400 group-hover:text-white transition-colors" />
                     </div>
                     <h3 className="font-semibold uppercase tracking-[0.12em] text-sm text-zinc-300">Rankings: 6</h3>
                 </div>

                 {/* Feature 3 */}
                  <div className="flex flex-col items-center gap-4 group cursor-default">
                     <div className="p-6 rounded-sm bg-black border border-white/10 group-hover:border-white/20 transition-colors shadow-2xl">
                         <Hammer className="w-10 h-10 text-zinc-400 group-hover:text-white transition-colors" />
                     </div>
                     <h3 className="font-semibold uppercase tracking-[0.12em] text-sm text-zinc-300">Armory: 18</h3>
                 </div>

                  {/* Feature 4 */}
                  <div className="flex flex-col items-center gap-4 group cursor-default">
                     <div className="p-6 rounded-sm bg-black border border-white/10 group-hover:border-white/20 transition-colors shadow-2xl">
                         <Package className="w-10 h-10 text-zinc-400 group-hover:text-white transition-colors" />
                     </div>
                     <h3 className="font-semibold uppercase tracking-[0.12em] text-sm text-zinc-300">Storage: Active</h3>
                 </div>

                  {/* Feature 5 */}
                  <div className="flex flex-col items-center gap-4 group cursor-default">
                     <div className="p-6 rounded-sm bg-black border border-white/10 group-hover:border-white/20 transition-colors shadow-2xl">
                         <Calendar className="w-10 h-10 text-zinc-400 group-hover:text-white transition-colors" />
                     </div>
                     <h3 className="font-semibold uppercase tracking-[0.12em] text-sm text-zinc-300">Weekly Updates</h3>
                 </div>
             </div>
        </div>
      </section>

      {/* ALLIANCE SECTION */}
      <section className="py-24 bg-black relative border-t border-white/5">
         <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto text-center space-y-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-wider text-white">Clan Alliance / Collaborations</h2>
            
            <div className="flex flex-col md:flex-row justify-center gap-16 items-center">
                 {/* Alliance 1 */}
                 <div className="space-y-6 flex flex-col items-center">
                     <div className="w-64 h-64 bg-stone-900 rounded-sm overflow-hidden border border-white/10 relative group">
                         {/* Placeholder for FFR BB Logo */}
                         <div className="absolute inset-0 flex items-center justify-center bg-stone-950 text-stone-700 font-bold text-4xl group-hover:text-stone-500 transition-colors">
                            FFR<br/>BB
                         </div>
                     </div>
                     <div className="space-y-4">
                        <h3 className="text-xl font-serif text-white tracking-wide">Farview Alliance</h3>
                        <a href="https://discord.gg/SVpgqPtD" target="_blank" className="inline-block px-6 py-2 border border-stone-700 text-stone-400 text-xs uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors">
                            Join Discord
                        </a>
                     </div>
                 </div>
            </div>
         </div>
      </section>
      
      {/* Footer minimal */}
      <footer className="py-8 border-t border-white/5 bg-black text-center">
          <p className="text-stone-700 text-xs font-mono tracking-widest">BROTHERLY BLADES // EST. 2024</p>
      </footer>
    </div>
  );
}
