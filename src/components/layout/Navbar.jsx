import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  Radio,
  Search,
  Wallet,
  User,
  LogOut,
  Settings,
  Shield,
  Film,
  Gamepad2,
  ShoppingBag,
  MessageSquare,
  ChevronDown,
  Home,
  Sword,
  Trophy,
  Mic,
  Video,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import NotificationBell from '@/components/social/NotificationBell';

// ── Platform hub definitions ─────────────────────────────────────────────────
const PLATFORMS = [
  {
    label: 'Colosseum',
    desc: 'Videos & Shorts',
    icon: Film,
    color: 'text-blue-400',
    bg: 'from-blue-500/20 to-blue-600/10',
    path: 'TheAmphitheatre',
  },
  {
    label: 'Gaming Arena',
    desc: 'Live Gaming Streams',
    icon: Gamepad2,
    color: 'text-purple-400',
    bg: 'from-purple-500/20 to-purple-600/10',
    path: 'TheGamingHub',
  },
  {
    label: 'Games Expo',
    desc: 'Arcade & AI Builder',
    icon: Sword,
    color: 'text-amber-400',
    bg: 'from-amber-500/20 to-amber-600/10',
    path: 'GamesExpo',
  },
  {
    label: 'Forum',
    desc: 'Community Discussions',
    icon: MessageSquare,
    color: 'text-cyan-400',
    bg: 'from-cyan-500/20 to-cyan-600/10',
    path: 'CommunityForums',
  },
  {
    label: 'Affiliate Hub',
    desc: 'Brand Campaigns',
    icon: ShoppingBag,
    color: 'text-emerald-400',
    bg: 'from-emerald-500/20 to-emerald-600/10',
    path: 'AffiliateHub',
  },
];

const CORE_NAV = [
  { name: 'Home', path: 'Home', icon: Home },
  { name: 'Live', path: 'Explore', icon: Radio },
  { name: 'Events', path: 'Events', icon: Trophy },
];

export default function Navbar({ user, wallet, onOpenShieldMenu }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlatforms, setShowPlatforms] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const platformRef = useRef(null);

  const isActive = (pageName) =>
    location.pathname === createPageUrl(pageName);

  const showBackButton = location.pathname !== createPageUrl('Home');

  const handleLogout = () => base44.auth.logout();

  // Close platform menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (platformRef.current && !platformRef.current.contains(e.target)) {
        setShowPlatforms(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Roman-styled gradient bar with gold border bottom */}
      <div className="bg-gradient-to-b from-[#0a0804]/98 via-[#0d0b06]/95 to-[#0d0b06]/90 backdrop-blur-2xl border-b border-amber-700/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

          {/* Left: Logo + Shield + Back */}
          <div className="flex items-center gap-2 shrink-0">
            {showBackButton && (
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400/80 hover:text-amber-300 transition-all border border-amber-500/20"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onOpenShieldMenu}
              className="text-xl hover:scale-110 transition-transform"
              title="Legion Menu"
            >
              🛡️
            </button>
            <Link to={createPageUrl('Home')} className="hidden sm:flex items-center gap-1.5">
              <span className="font-black text-white text-sm tracking-tight">
                LEGION <span className="text-amber-400">LIVE</span>
              </span>
            </Link>
          </div>

          {/* Center: Core Nav + Platforms Hub */}
          <div className="hidden lg:flex items-center gap-1">
            {CORE_NAV.map(({ name, path, icon: NavIcon }) => (
              <button
                key={path}
                onClick={() => navigate(createPageUrl(path))}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive(path)
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {name}
              </button>
            ))}

            {/* Platforms dropdown */}
            <div className="relative" ref={platformRef}>
              <button
                onClick={() => setShowPlatforms(!showPlatforms)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                  showPlatforms
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                Platforms
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPlatforms ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showPlatforms && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-72 bg-[#0f0d08]/98 backdrop-blur-2xl border border-amber-700/30 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-amber-700/20">
                      <p className="text-amber-400/70 text-[10px] font-bold uppercase tracking-widest">Legion Platforms</p>
                    </div>
                    <div className="p-2">
                      {PLATFORMS.map(({ label, desc, icon: Icon, color, bg, path }) => (
                        <button
                          key={path}
                          onClick={() => { navigate(createPageUrl(path)); setShowPlatforms(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/[0.05] group`}
                        >
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${bg} border border-white/10 flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div>
                            <p className="text-white/90 text-sm font-semibold group-hover:text-white transition-colors">{label}</p>
                            <p className="text-white/35 text-xs">{desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Roman ornament divider */}
                    <div className="px-4 py-2 border-t border-amber-700/20 flex items-center justify-center">
                      <span className="text-amber-700/50 text-xs tracking-widest">⚔ · · · ⚔</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Search + Wallet + Go Live + Notifications + User */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <div className="hidden md:flex items-center bg-white/[0.06] hover:bg-white/[0.09] rounded-xl px-3 py-1.5 border border-white/[0.08] focus-within:border-amber-500/40 transition-all gap-2">
              <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(createPageUrl('Explore') + '?q=' + encodeURIComponent(searchQuery.trim()));
                    setSearchQuery('');
                  }
                }}
                className="bg-transparent text-white text-xs placeholder:text-white/30 outline-none w-28 lg:w-40"
              />
            </div>

            {/* Wallet */}
            {wallet && (
              <Link to={createPageUrl('Wallet')}>
                <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/15 rounded-xl px-3 py-1.5 border border-amber-500/20 transition-all">
                  <span className="text-sm">🪙</span>
                  <span className="text-amber-300 font-bold text-xs">{(wallet.denarii_balance || 0).toLocaleString()}</span>
                </div>
              </Link>
            )}

            {/* Go Live */}
            {user && (
              <Link to={createPageUrl('GoLive')}>
                <button className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 border border-red-500/30">
                  <Radio className="w-3.5 h-3.5" />
                  Go Live
                </button>
              </Link>
            )}

            {user && <NotificationBell user={user} />}

            {/* User menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 overflow-hidden flex items-center justify-center border-2 border-amber-500/30 hover:border-amber-400/50 transition-all">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-black text-white">{user.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-[#0f0d08]/98 backdrop-blur-2xl border border-amber-700/30 shadow-2xl rounded-2xl">
                  <div className="px-3 py-2.5 border-b border-amber-700/20">
                    <p className="text-white font-semibold text-sm truncate">{user.full_name}</p>
                    <p className="text-amber-400/50 text-xs truncate">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Profile')} className="cursor-pointer text-white/70 hover:text-white flex items-center gap-2 rounded-xl px-3 py-2">
                        <User className="w-4 h-4 text-amber-400/60" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Wallet')} className="cursor-pointer text-white/70 hover:text-white flex items-center gap-2 rounded-xl px-3 py-2">
                        <Wallet className="w-4 h-4 text-amber-400/60" /> Wallet
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('CreatorStudio')} className="cursor-pointer text-white/70 hover:text-white flex items-center gap-2 rounded-xl px-3 py-2">
                        <Video className="w-4 h-4 text-amber-400/60" /> Creator Studio
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Settings')} className="cursor-pointer text-white/70 hover:text-white flex items-center gap-2 rounded-xl px-3 py-2">
                        <Settings className="w-4 h-4 text-amber-400/60" /> Settings
                      </Link>
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator className="bg-amber-700/20 my-1" />
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('AdminDashboard')} className="cursor-pointer text-amber-400 flex items-center gap-2 rounded-xl px-3 py-2">
                            <Shield className="w-4 h-4" /> Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator className="bg-amber-700/20 my-1" />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 hover:text-red-300 flex items-center gap-2 rounded-xl px-3 py-2">
                      <LogOut className="w-4 h-4" /> Logout
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="bg-amber-500 hover:bg-amber-400 text-black rounded-xl px-4 py-1.5 text-xs font-bold transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Bottom gold shimmer line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-600/30 to-transparent" />
    </nav>
  );
}