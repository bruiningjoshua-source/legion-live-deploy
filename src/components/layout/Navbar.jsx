import React from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import {
  Home,
  Gamepad2,
  Radio,
  Film,
  ShoppingBag,
} from 'lucide-react';
import { motion } from 'framer-motion';
import NotificationBell from '@/components/social/NotificationBell';

export default function Navbar({ user, wallet, onOpenShieldMenu }) {
  const location = useLocation();

  const mainNavLinks = [
    { name: 'Home', path: createPageUrl('Home'), icon: Home },
    { name: 'Live', path: createPageUrl('Explore'), icon: Radio },
    { name: 'Videos', path: createPageUrl('TheAmphitheatre'), icon: Film },
    { name: 'Gaming', path: createPageUrl('TheGamingHub'), icon: Gamepad2 },
    { name: 'Shop', path: createPageUrl('AffiliateMarketplace'), icon: ShoppingBag },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo + Shield Menu */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenShieldMenu}
            className="text-2xl hover:scale-110 transition-transform cursor-pointer"
            title="Open Menu"
          >
            🛡️
          </button>
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <span className="font-bold text-amber-100 text-lg hidden sm:inline">Legion Live</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1 bg-white/5 rounded-full p-1">
          {mainNavLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isActive(link.path)
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{link.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
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

          {/* Profile Avatar - Links to Profile */}
          {user ? (
            <Link to={createPageUrl('Profile')}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                <span className="text-sm">👤</span>
              </div>
            </Link>
          ) : (
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-white text-black hover:bg-white/90 rounded-full px-5 font-medium"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>

    </nav>
  );
}