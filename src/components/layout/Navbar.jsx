import React, { useState } from 'react';
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
  Menu,
  X,
  Home,
  Gamepad2,
  Radio,
  Wallet,
  User,
  LogOut,
  Settings,
  Shield,
  Film,
  ShoppingBag,
  BarChart3,
  DollarSign,
  ChevronLeft,
  Headphones,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '@/components/social/NotificationBell';

export default function Navbar({ user, wallet, onOpenShieldMenu }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const mainNavLinks = [
    { name: 'Home', path: createPageUrl('Home'), icon: Home },
    { name: 'Live', path: createPageUrl('Explore'), icon: Radio },
    { name: 'Videos', path: createPageUrl('TheAmphitheatre'), icon: Film },
    { name: 'Gaming', path: createPageUrl('TheGamingHub'), icon: Gamepad2 },
    { name: 'Shop', path: createPageUrl('AffiliateMarketplace'), icon: ShoppingBag },
    { name: 'Podcasts', path: createPageUrl('Podcasts'), icon: Headphones },
  ];

  const isActive = (path) => location.pathname === path;

  // Show back button on child routes (not main tabs)
  const mainPaths = [createPageUrl('Home'), createPageUrl('Explore'), createPageUrl('Profile')];
  const showBackButton = !mainPaths.includes(location.pathname);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo + Shield Menu + Back Button */}
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors lg:hidden"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={onOpenShieldMenu}
            className="text-xl hover:scale-110 transition-transform cursor-pointer"
            title="Open Menu"
          >
            🛡️
          </button>
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <span className="font-bold text-white text-base hidden sm:inline tracking-tight">Legion Live</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-0.5 bg-white/[0.04] rounded-full p-1">
          {mainNavLinks.map(link => {
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all text-sm font-medium ${
                  isActive(link.path)
                    ? 'bg-white text-black'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.name}
              </button>
            );
          })}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Search — navigates to Explore on Enter */}
          <div className="hidden md:flex items-center bg-white/10 rounded-full px-3 py-1.5 border border-white/10 focus-within:border-amber-500/40 transition-colors">
            <Search className="w-4 h-4 text-white/40 mr-2" />
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
              className="bg-transparent text-white text-sm placeholder:text-white/40 outline-none w-32 lg:w-48"
            />
          </div>

          {/* Wallet */}
          {wallet && (
            <Link to={createPageUrl('Wallet')}>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 hover:bg-white/15 transition-all"
              >
                <span className="text-lg">🪙</span>
                <span className="text-white font-semibold text-sm">{(wallet.denarii_balance || 0).toLocaleString()}</span>
              </motion.div>
            </Link>
          )}

          {/* Go Live */}
          {user && (
            <Link to={createPageUrl('GoLive')}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="hidden sm:flex bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white gap-2 rounded-full px-5 font-medium shadow-lg shadow-red-500/20">
                  <Radio className="w-4 h-4" />
                  Go Live
                </Button>
              </motion.div>
            </Link>
          )}

          {/* Notifications */}
          {user && <NotificationBell user={user} />}

          {/* User Menu - Simplified */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1f] border-white/10 shadow-2xl">
                <div className="px-3 py-2.5 border-b border-white/[0.06]">
                  <p className="text-white font-semibold text-sm">{user.full_name}</p>
                  <p className="text-white/40 text-xs">{user.email}</p>
                </div>
                
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Wallet')} className="cursor-pointer">
                    <Wallet className="w-4 h-4 mr-2" />
                    Wallet
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('CreatorStudio')} className="cursor-pointer">
                    <Film className="w-4 h-4 mr-2" />
                    Creator Studio
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('CreatorMonetization')} className="cursor-pointer">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Monetization
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('ChannelAnalytics')} className="cursor-pointer">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Settings')} className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                {user.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator className="bg-amber-600/20" />
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('AdminDashboard')} className="cursor-pointer text-amber-400">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator className="bg-amber-600/20" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
              className="bg-white text-black hover:bg-white/90 rounded-full px-5 font-medium"
            >
              Sign In
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-amber-300 hover:bg-amber-800/20 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden bg-stone-900 border-t border-amber-600/20"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
              {mainNavLinks.map(link => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.path}
                    onClick={() => { setMobileMenuOpen(false); navigate(link.path); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      isActive(link.path)
                        ? 'bg-amber-600 text-white'
                        : 'text-amber-300 hover:bg-amber-800/20'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.name}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}