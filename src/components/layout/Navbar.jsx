import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Home, 
  Compass, 
  Trophy, 
  Wallet, 
  User, 
  Settings, 
  LogOut,
  Radio,
  Plus,
  Search,
  Bell,
  Menu,
  X,
  Coins,
  Sparkles
} from 'lucide-react';

export default function Navbar({ user, wallet }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const formatCurrency = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount?.toLocaleString() || '0';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-900/95 via-stone-900/95 to-amber-900/95 backdrop-blur-lg border-b border-amber-600/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={createPageUrl('Home')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-2xl">🏛️</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-amber-100 tracking-wide">LEGION LIVE</h1>
              <p className="text-[10px] text-amber-400/70 -mt-1 tracking-widest">STREAM • CONQUER • THRIVE</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" className="text-amber-100 hover:bg-amber-800/50 hover:text-amber-50">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link to={createPageUrl('Explore')}>
              <Button variant="ghost" className="text-amber-100 hover:bg-amber-800/50 hover:text-amber-50">
                <Compass className="w-4 h-4 mr-2" />
                Explore
              </Button>
            </Link>
            <Link to={createPageUrl('Events')}>
              <Button variant="ghost" className="text-amber-100 hover:bg-amber-800/50 hover:text-amber-50">
                <Trophy className="w-4 h-4 mr-2" />
                Events
              </Button>
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Currency Display */}
            {wallet && (
              <Link to={createPageUrl('Wallet')}>
                <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-amber-800/50 to-amber-700/50 rounded-full px-4 py-2 border border-amber-500/30 hover:border-amber-400/50 transition-all cursor-pointer">
                  <div className="flex items-center gap-1">
                    <span className="text-amber-300 text-lg">🪙</span>
                    <span className="text-amber-100 font-semibold text-sm">{formatCurrency(wallet.denarii_balance || 0)}</span>
                  </div>
                  <div className="w-px h-4 bg-amber-500/30" />
                  <Plus className="w-4 h-4 text-amber-400" />
                </div>
              </Link>
            )}

            {/* Go Live Button */}
            <Link to={createPageUrl('GoLive')}>
              <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-lg shadow-red-500/30">
                <Radio className="w-4 h-4 mr-2 animate-pulse" />
                <span className="hidden sm:inline">Go Live</span>
              </Button>
            </Link>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="text-amber-100 hover:bg-amber-800/50 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-amber-100 hover:bg-amber-800/50 rounded-full w-10 h-10 overflow-hidden border-2 border-amber-500/30">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-stone-900 border-amber-600/30">
                <div className="px-3 py-2 border-b border-amber-600/20">
                  <p className="text-amber-100 font-medium">{user?.full_name || 'Legionnaire'}</p>
                  <p className="text-amber-400/70 text-xs">{user?.email}</p>
                </div>
                <DropdownMenuItem asChild className="text-amber-100 focus:bg-amber-800/50 focus:text-amber-50">
                  <Link to={createPageUrl('Profile')}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-amber-100 focus:bg-amber-800/50 focus:text-amber-50">
                  <Link to={createPageUrl('Wallet')}>
                    <Wallet className="w-4 h-4 mr-2" />
                    Treasury
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-amber-100 focus:bg-amber-800/50 focus:text-amber-50">
                  <Link to={createPageUrl('Settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-amber-600/20" />
                <DropdownMenuItem 
                  onClick={() => base44.auth.logout()}
                  className="text-red-400 focus:bg-red-900/30 focus:text-red-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-amber-100"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-amber-600/20">
            <div className="flex flex-col gap-2">
              <Link to={createPageUrl('Home')} onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-amber-100 hover:bg-amber-800/50">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Link to={createPageUrl('Explore')} onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-amber-100 hover:bg-amber-800/50">
                  <Compass className="w-4 h-4 mr-2" />
                  Explore
                </Button>
              </Link>
              <Link to={createPageUrl('Events')} onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-amber-100 hover:bg-amber-800/50">
                  <Trophy className="w-4 h-4 mr-2" />
                  Events
                </Button>
              </Link>
              <Link to={createPageUrl('Wallet')} onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-amber-100 hover:bg-amber-800/50">
                  <Wallet className="w-4 h-4 mr-2" />
                  Treasury
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}