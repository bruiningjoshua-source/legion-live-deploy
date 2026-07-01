import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Home, Tv, Gamepad2, Users, ShoppingBag, Radio,
  Film, BarChart2, Trophy, Mic, Music, Video,
  Wallet, Settings, Zap, Calendar, Heart, Palette, HelpCircle, LogOut
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const sections = [
  {
    title: 'Discover',
    items: [
      { label: 'Home',          path: 'Home',           icon: Home,       color: 'text-amber-400' },
      { label: 'Live Now',      path: 'TheAmphitheatre',icon: Tv,         color: 'text-red-400' },
      { label: 'Explore',       path: 'Explore',        icon: Zap,        color: 'text-yellow-400' },
      { label: 'Following',     path: 'Following',      icon: Heart,      color: 'text-pink-400' },
    ]
  },
  {
    title: 'Platforms',
    items: [
      { label: 'Gaming Arena',  path: 'GamesExpo',      icon: Gamepad2,   color: 'text-violet-400' },
      { label: 'The Senate',    path: 'CommunityForums',icon: Users,      color: 'text-sky-400' },
      { label: 'Marketplace',   path: 'AffiliateHub',   icon: ShoppingBag,color: 'text-emerald-400' },
      { label: 'Events',        path: 'Events',         icon: Calendar,   color: 'text-orange-400' },
    ]
  },
  {
    title: 'Create',
    items: [
      { label: 'Go Live',       path: 'GoLive',         icon: Radio,      color: 'text-red-400' },
      { label: 'Creator Studio',path: 'CreatorStudio',  icon: Film,       color: 'text-amber-400' },
      { label: 'Upload Video',  path: 'VideoUpload',    icon: Video,      color: 'text-blue-400' },
      { label: 'Podcast Studio',path: 'PodcastStudio',  icon: Mic,        color: 'text-purple-400' },
      { label: 'Music Studio',  path: 'MusicStudio',    icon: Music,      color: 'text-pink-400' },
    ]
  },
  {
    title: 'My Account',
    items: [
      { label: 'Wallet',        path: 'Wallet',         icon: Wallet,     color: 'text-amber-400' },
      { label: 'Achievements',  path: 'Achievements',   icon: Trophy,     color: 'text-yellow-400' },
      { label: 'Analytics',     path: 'CreatorAnalytics',icon: BarChart2, color: 'text-cyan-400' },
      { label: 'Settings',      path: 'Settings',       icon: Settings,   color: 'text-white/60' },
    ]
  },
];

export default function ShieldMenu({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 35 }}
            className="fixed top-0 left-0 bottom-0 z-[70] w-72 flex flex-col"
          >
            {/* Panel bg */}
            <div className="absolute inset-0 bg-[#0d0d10]/98 backdrop-blur-2xl border-r border-white/[0.06]" />

            {/* Content */}
            <div className="relative flex flex-col h-full overflow-y-auto scrollbar-hide">

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-12 pb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <span className="text-white text-sm font-black">⚔</span>
                  </div>
                  <div>
                    <p className="text-white font-black text-base tracking-tight">LEGION<span className="text-amber-400">LIVE</span></p>
                    <p className="text-white/30 text-[10px] tracking-widest uppercase">Platform Hub</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sections */}
              <div className="flex-1 px-3 pb-8 space-y-1">
                {sections.map((section) => (
                  <div key={section.title} className="mb-1">
                    <p className="text-white/25 text-[10px] font-semibold tracking-widest uppercase px-3 py-2">
                      {section.title}
                    </p>
                    {section.items.map(({ label, path, icon: Icon, color }) => (
                      <Link
                        key={label}
                        to={createPageUrl(path)}
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/65 hover:text-white hover:bg-white/[0.07] transition-all group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.1] transition-colors">
                          <Icon className={`w-3.5 h-3.5 ${color}`} />
                        </div>
                        <span className="text-sm font-medium">{label}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>

              {/* Footer — Settings + Support + Sign Out */}
              <div className="px-3 py-4 border-t border-white/[0.05] space-y-1">
                <Link to={createPageUrl('Settings')} onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.07] transition-all">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                    <Palette className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <span className="text-sm font-medium">Appearance</span>
                </Link>
                <Link to={createPageUrl('HelpAndInfo')} onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.07] transition-all">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                    <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <span className="text-sm font-medium">Help & Support</span>
                </Link>
                <button onClick={() => { base44.auth.logout('/'); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/[0.07] transition-all">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
                <p className="text-center text-white/10 text-[10px] tracking-[0.2em] uppercase pt-2">
                  Legion Live · v1.0
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}