
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Gift, User, Settings, LogOut, BarChart3, LogIn, Menu, X, Home, Table, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

export default function Navbar() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Check if admin
  const isSuperUser = profile?.email === 'bone.ak103@gmail.com';
  const isAdmin = profile?.cargo === 'Leader' || profile?.cargo === 'Blade Master' || profile?.cargo === 'Sub-Leader' || profile?.cargo === 'Officer' || isSuperUser;

  // Base links visible to everyone
  const publicLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/dashboard-loot', label: 'Dash Loot', icon: BarChart3 },
    { to: '/dashboard-ts', label: 'Dash TS', icon: Activity },
    { to: '/estatisticas', label: 'Statistics', icon: Table },
    { to: '/dashboard', label: 'Dash Member', icon: LayoutDashboard },
  ];

  // Links visible only to logged users
  const protectedLinks = [
    { to: '/cassino', label: 'Cassino', icon: Gift },
    { to: '/perfil', label: 'Profile', icon: User },
  ];
  
  const links = [
    ...publicLinks,
    ...(profile ? protectedLinks : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Settings }] : []),
  ];

  return (
    <nav className="bg-black/95 border-b border-white/10 sticky top-0 z-50 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <h1 className="text-xl sm:text-2xl font-serif font-black tracking-widest text-white uppercase shadow-red-500/50 drop-shadow-sm">
              <span className="text-red-600">Brotherly</span> Blades
            </h1>
          </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-1">
                {links.map(l => {
                  const active = location.pathname === l.to;
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      className={cn(
                        "group relative flex items-center gap-2 px-4 py-2 text-sm font-serif tracking-wide uppercase transition-all duration-300",
                        active
                          ? "text-red-500"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      <l.icon className={cn("w-4 h-4 transition-colors", active ? "text-red-500" : "text-slate-500 group-hover:text-white")} />
                      <span>{l.label}</span>
                      {/* Hover Underline */}
                      <span className={cn(
                          "absolute bottom-0 left-0 w-full h-0.5 bg-red-600 transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100",
                          active && "scale-x-100"
                      )}/>
                    </Link>
                  );
                })}
              </div>

            <div className="h-6 w-px bg-white/10 mx-2" />

            {profile ? (
                <div className="flex items-center gap-4">
                    <span className="text-sm font-serif text-slate-300 hidden lg:block tracking-wider uppercase">
                        {profile?.nick}
                    </span>
                    <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 border border-red-900/50 text-red-500 hover:bg-red-950/30 hover:text-red-400 rounded transition-all uppercase text-xs font-bold tracking-widest"
                    >
                    <LogOut className="w-4 h-4" />
                    <span>Exit</span>
                    </button>
                </div>
            ) : (
                <Link
                    to="/login"
                    className="flex items-center gap-2 px-5 py-2 bg-red-700 hover:bg-red-600 text-white rounded transition-all uppercase text-xs font-bold tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-300 hover:text-white p-2"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-black/95 border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block px-3 py-3 rounded text-base font-serif uppercase tracking-wider",
                  location.pathname === l.to
                    ? "text-red-500 bg-red-950/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                    <l.icon className="w-5 h-5 opacity-70" />
                    {l.label}
                </div>
              </Link>
            ))}
            
            <div className="border-t border-white/10 my-2 pt-2">
                {profile ? (
                    <button
                        onClick={() => { logout(); setIsOpen(false); }}
                        className="w-full text-left px-3 py-3 text-red-500 font-serif uppercase tracking-wider flex items-center gap-3"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                ) : (
                    <Link
                        to="/login"
                        onClick={() => setIsOpen(false)}
                        className="block px-3 py-3 text-white font-serif uppercase tracking-wider flex items-center gap-3"
                    >
                        <LogIn className="w-5 h-5" />
                        Login
                    </Link>
                )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
