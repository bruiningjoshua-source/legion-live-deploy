import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Sword, Menu, LogOut, User, Settings, Film,
  Wallet, Shield, HelpCircle, TrendingUp
} from 'lucide-react';
import NotificationBell from '@/components/social/NotificationBell';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function Navbar({ user, wallet, currentPageName, onOpenShieldMenu }) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);

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

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[#111112] border-b border-white/[0.08]'
        : 'bg-[#111112] border-b border-white/[0.06]'
    }`}>
      <div className="px-4 h-14 flex items-center justify-between gap-3"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onOpenShieldMenu}
            aria-label="Open navigation menu"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <Sword className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-white text-lg tracking-tight leading-none">
              LEGION<span className="text-amber-400"> LIVE</span>
            </span>
          </Link>
        </div>

        {/* Right: Search + Notifications + Avatar */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 180, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center bg-[#09090a] border border-white/[0.12] rounded-lg px-3 h-8 overflow-hidden"
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
                <button onClick={() => setSearchOpen(false)} className="text-white/30 hover:text-white/60 flex-shrink-0 ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search Legion Live"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
            )}
          </AnimatePresence>

          {user && <NotificationBell user={user} />}

          {/* Avatar / Account dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Open account menu" className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 hover:border-amber-500/40 transition-all active:scale-95 flex-shrink-0">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 bg-[#1a1a1c] border border-white/[0.10] shadow-2xl shadow-black/60 rounded-lg p-1.5 mt-1"
              >
                <div className="px-3 py-2.5 mb-1">
                  <p className="text-white font-semibold text-sm truncate">{user.full_name}</p>
                  <p className="text-white/40 text-xs truncate">{user.email}</p>
                </div>
                <div className="h-px bg-white/[0.06] mb-1" />

                {[
                  { to: 'Profile',           icon: User,       label: 'Profile' },
                  { to: 'EarningsDashboard', icon: TrendingUp, label: 'Earnings Hub' },
                  { to: 'Wallet',            icon: Wallet,     label: 'Wallet' },
                  { to: 'CreatorStudio',     icon: Film,       label: 'Creator Studio' },
                  { to: 'Settings',          icon: Settings,   label: 'Settings' },
                  { to: 'HelpAndInfo',       icon: HelpCircle, label: 'Help & Info' },
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
              className="bg-[#e1a33a] text-black hover:bg-[#f0bb5c] font-semibold text-sm px-4 h-9 rounded-lg transition-all active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}