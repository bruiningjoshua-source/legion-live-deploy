import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Search, X, ChevronDown, Shield, LogOut,
  User, Settings, Film, Wallet, Menu, Bell, Sword, Tv,
  Gamepad2, Users, ShoppingBag, Home, Mic
} from 'lucide-react';
import NotificationBell from '@/components/social/NotificationBell';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const platformLinks = [
  { name: 'Home',        path: createPageUrl('Home'),              icon: Home,      color: 'text-amber-400' },
  { name: 'Live',        path: createPageUrl('TheAmphitheatre'),   icon: Tv,        color: 'text-red-400' },
  { name: 'Gaming',      path: createPageUrl('GamesExpo'),         icon: Gamepad2,  color: 'text-violet-400' },
  { name: 'Senate',      path: createPageUrl('CommunityForums'),   icon: Users,     color: 'text-sky-400' },
  { name: 'Marketplace', path: createPageUrl('AffiliateHub'),      icon: ShoppingBag, color: 'text-emerald-400' },
];

export default function Navbar({ user, wallet, currentPageName, onOpenShieldMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);

  const isActive = (path) => location.pathname === path || location.search.includes(path.split('?')[1] || '___');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleLogout = () => base44.auth.logout('/');

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(createPageUrl('Explore') + '?q=' + encodeURIComponent(searchQuery.trim()));
      setSearchQuery('');
      setSearchOpen(false);
    }
    if (e.key === 'Escape') setSearchOpen(false);
  };

  const balance = wallet?.denarii_balance || 0;
  const usdValue = (balance / 65).toFixed(2);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[#0a0a0d]/95 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-black/40'
        : 'bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm'
    }`}>
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Left: Logo + Shield */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Shield menu (mobile hamburger) */}
          <button
            onClick={onOpenShieldMenu}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-amber-400 hover:bg-white/[0.07] transition-all active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link to={createPageUrl('Home')} className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-all">
              <Sword className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:block font-black text-white text-lg tracking-tight leading-none">
              LEGION<span className="text-amber-400">LIVE</span>
            </span>
          </Link>
        </div>

        {/* Center: Nav pills (desktop) */}
        <div className="hidden lg:flex items-center gap-1">
          {platformLinks.map(({ name, path, icon: Icon, color }) => (
            <Link
              key={name}
              to={path}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(path)
                  ? 'bg-white/[0.1] text-white shadow-inner'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive(path) ? color : ''}`} />
              {name}
            </Link>
          ))}
        </div>

        {/* Right: Search + Wallet + GoLive + Avatar */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Search */}
          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center bg-white/[0.08] border border-white/[0.1] rounded-xl px-3 h-9 overflow-hidden"
              >
                <Search className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  className="bg-transparent text-white text-sm placeholder:text-white/30 outline-none ml-2 w-full min-w-0"
                />
                <button onClick={() => setSearchOpen(false)} className="text-white/30 hover:text-white/60 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.07] transition-all"
              >
                <Search className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Wallet chip */}
          {wallet && (
            <Link to={createPageUrl('Wallet')}>
              <div className="hidden sm:flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-amber-500/20 hover:border-amber-500/40 rounded-xl px-3 h-9 transition-all">
                <span className="text-sm leading-none">🪙</span>
                <span className="text-white font-semibold text-sm tabular-nums">{balance.toLocaleString()}</span>
                <span className="text-white/35 text-xs hidden md:block">${usdValue}</span>
              </div>
            </Link>
          )}

          {/* Go Live */}
          {user && (
            <Link to={createPageUrl('GoLive')}>
              <button className="hidden sm:flex items-center gap-1.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold text-sm px-4 h-9 rounded-xl transition-all active:scale-95 shadow-lg shadow-red-500/25">
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden md:block">Go Live</span>
              </button>
            </Link>
          )}

          {/* Notifications */}
          {user && <NotificationBell user={user} />}

          {/* Avatar / User menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 hover:border-amber-500/40 transition-all active:scale-95 flex-shrink-0">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 bg-[#131316]/98 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/60 rounded-2xl p-1.5 mt-1"
              >
                {/* User info header */}
                <div className="px-3 py-2.5 mb-1">
                  <p className="text-white font-semibold text-sm truncate">{user.full_name}</p>
                  <p className="text-white/40 text-xs truncate">{user.email}</p>
                </div>
                <div className="h-px bg-white/[0.06] mb-1" />

                {[
                  { to: 'Profile',       icon: User,      label: 'Profile' },
                  { to: 'Wallet',        icon: Wallet,    label: 'Wallet' },
                  { to: 'CreatorStudio', icon: Film,      label: 'Creator Studio' },
                  { to: 'Settings',      icon: Settings,  label: 'Settings' },
                ].map(({ to, icon: Icon, label }) => (
                  <DropdownMenuItem key={to} asChild>
                    <Link
                      to={createPageUrl(to)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.07] cursor-pointer text-sm transition-colors"
                    >
                      <Icon className="w-4 h-4 text-white/40" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}

                {user.role === 'admin' && (
                  <>
                    <div className="h-px bg-white/[0.06] my-1" />
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('AdminDashboard')} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-amber-400 hover:bg-amber-500/10 cursor-pointer text-sm transition-colors">
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                <div className="h-px bg-white/[0.06] my-1" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 cursor-pointer text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
              className="bg-white text-black hover:bg-white/90 font-semibold text-sm px-4 h-9 rounded-xl transition-all active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}