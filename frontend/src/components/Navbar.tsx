import { Link, useLocation } from 'react-router-dom';
import type { ComponentType } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Activity,
  BarChart3,
  ChevronDown,
  Gift,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  Table,
  User,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

type NavLink = {
  to: string;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
};

export default function Navbar() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isSuperUser = profile?.email === 'bone.ak103@gmail.com';
  const isAdmin = profile?.cargo === 'Leader' || profile?.cargo === 'Blade Master' || profile?.cargo === 'Sub-Leader' || profile?.cargo === 'Officer' || isSuperUser;

  const primaryLinks: NavLink[] = [
    { to: '/', label: 'Home', shortLabel: 'Home', icon: Home },
    { to: '/dashboard-loot', label: 'Loot Dashboard', shortLabel: 'Loot', icon: BarChart3 },
    { to: '/dashboard-ts', label: 'TS Dashboard', shortLabel: 'TS', icon: Activity },
    { to: '/dashboard', label: 'Member Dashboard', shortLabel: 'Member', icon: LayoutDashboard },
  ];

  const secondaryLinks: NavLink[] = [
    { to: '/estatisticas', label: 'Statistics', shortLabel: 'Stats', icon: Table },
    ...(profile ? [
      { to: '/cassino', label: 'Cassino', shortLabel: 'Cassino', icon: Gift },
      { to: '/perfil', label: 'Profile', shortLabel: 'Profile', icon: User },
    ] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', shortLabel: 'Admin', icon: Settings }] : []),
  ];

  const allLinks = [...primaryLinks, ...secondaryLinks];
  const isActive = (to: string) => location.pathname === to;
  const hasMoreActive = secondaryLinks.some((link) => isActive(link.to));

  const navLinkClass = (active: boolean) => cn(
    'group relative inline-flex h-10 items-center gap-2 rounded-sm px-3 text-sm font-medium text-zinc-400 transition-all duration-200',
    'hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
    active && 'bg-white/[0.08] text-white shadow-inner shadow-white/5'
  );

  const renderNavLink = (link: NavLink, mobile = false) => {
    const Icon = link.icon;
    const active = isActive(link.to);

    return (
      <Link
        key={link.to}
        to={link.to}
        onClick={() => {
          setIsOpen(false);
          setMoreOpen(false);
        }}
        className={mobile
          ? cn(
            'flex items-center gap-3 rounded-sm px-3 py-3 text-sm font-medium transition-colors',
            active ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
          )
          : navLinkClass(active)
        }
      >
        <Icon className={cn('h-4 w-4 transition-colors', active ? 'text-red-500' : 'text-zinc-500 group-hover:text-zinc-200')} />
        <span>{mobile ? link.label : link.shortLabel}</span>
        {active && !mobile && <span className="absolute inset-x-3 -bottom-px h-px bg-red-500/80" />}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/76 backdrop-blur-xl supports-[backdrop-filter]:bg-black/62">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            onClick={() => {
              setIsOpen(false);
              setMoreOpen(false);
            }}
            className="group flex min-w-0 items-center gap-3"
          >
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-sm border border-white/10 bg-white/[0.04] text-sm font-black text-white transition-colors group-hover:border-red-500/40">
              BB
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold uppercase tracking-[0.16em] text-white">
                Brotherly Blades
              </span>
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500 sm:block">
                Clan Operations
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-1 rounded-sm border border-white/10 bg-white/[0.03] p-1">
              {primaryLinks.map((link) => renderNavLink(link))}

              {secondaryLinks.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((open) => !open)}
                    className={cn(navLinkClass(hasMoreActive), 'pr-2')}
                    aria-expanded={moreOpen}
                  >
                    <Table className={cn('h-4 w-4', hasMoreActive ? 'text-red-500' : 'text-zinc-500')} />
                    <span>More</span>
                    <ChevronDown className={cn('h-4 w-4 text-zinc-500 transition-transform', moreOpen && 'rotate-180')} />
                    {hasMoreActive && <span className="absolute inset-x-3 -bottom-px h-px bg-red-500/80" />}
                  </button>

                  {moreOpen && (
                    <div className="absolute right-0 top-12 w-56 rounded-sm border border-white/10 bg-zinc-950/96 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
                      {secondaryLinks.map((link) => renderNavLink(link, true))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-white/10" />

            {profile ? (
              <div className="flex items-center gap-2">
                <span className="hidden max-w-36 truncate text-sm font-medium text-zinc-300 xl:block">
                  {profile.nick}
                </span>
                <button
                  onClick={logout}
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-white/10 px-3 text-sm font-medium text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Exit</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-10 items-center gap-2 rounded-sm bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
            aria-label="Open navigation"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-white/10 bg-black/94 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="grid gap-1">
            {allLinks.map((link) => renderNavLink(link, true))}
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            {profile ? (
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-sm bg-white px-3 py-3 text-sm font-semibold text-black"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
