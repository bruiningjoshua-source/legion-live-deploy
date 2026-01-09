import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
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
  Compass,
  Gamepad2,
  Music,
  Radio,
  Heart,
  Wallet,
  User,
  LogOut,
  Settings,
  Trophy,
  MessageSquare,
  Bell,
  Shield,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ user, wallet }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: createPageUrl('Home'), icon: Home },
    { name: 'Explore', path: createPageUrl('Explore'), icon: Compass },
    { name: 'Gaming', path: createPageUrl('TheGamingHub'), icon: Gamepad2 },
    { name: 'Amphitheatre', path: createPageUrl('TheAmphitheatre'), icon: Music },
    { name: 'Leaderboard', path: createPageUrl('Leaderboard'), icon: Trophy },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-stone-950 via-stone-900/95 to-transparent border-b border-amber-600/20 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to={createPageUrl('Home')} className="flex items-center gap-2">
          <div className="text-2xl">🏛️</div>
          <span className="font-bold text-amber-100 text-lg hidden sm:inline">Legion Live</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive(link.path)
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-300 hover:bg-amber-800/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{link.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Wallet Display */}
          {wallet && (
            <Link to={createPageUrl('Wallet')}>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-amber-800/30 to-stone-800/50 border border-amber-600/30 rounded-full px-4 py-2 hover:border-amber-500/50 transition-all shadow-lg shadow-amber-900/20"
              >
                <span className="text-xl">🪙</span>
                <span className="text-amber-100 font-bold">{(wallet.denarii_balance || 0).toLocaleString()}</span>
                <span className="text-amber-400/70 text-xs">+</span>
              </motion.div>
            </Link>
          )}

          {/* Go Live Button */}
          {user && (
            <Link to={createPageUrl('GoLive')}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="hidden sm:flex bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white gap-2 shadow-lg shadow-red-900/30 font-semibold">
                  <Radio className="w-4 h-4 animate-pulse" />
                  Go Live
                </Button>
              </motion.div>
            </Link>
          )}

          {/* Notifications */}
          {user && (
            <Button variant="ghost" size="icon" className="text-amber-300 hover:bg-amber-800/20">
              <Bell className="w-5 h-5" />
            </Button>
          )}

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-stone-900 border-amber-600/20">
                <div className="px-2 py-1.5 text-xs text-amber-300">
                  {user.full_name}
                </div>
                <DropdownMenuSeparator className="bg-amber-600/20" />
                
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('CreatorMonetization')} className="cursor-pointer">
                    <Wallet className="w-4 h-4 mr-2" />
                    Monetization
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
                      <Link to={createPageUrl('AdminDashboard')} className="cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('ImportYouTubeLibrary')} className="cursor-pointer">
                        <Music className="w-4 h-4 mr-2" />
                        Import YouTube
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
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
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
              {navLinks.map(link => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(link.path)
                        ? 'bg-amber-600 text-white'
                        : 'text-amber-300 hover:bg-amber-800/20'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}