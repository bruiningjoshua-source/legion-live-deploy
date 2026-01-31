import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  X, 
  Home, 
  Radio, 
  Film, 
  Gamepad2, 
  ShoppingBag, 
  Users, 
  Heart,
  Trophy,
  Target,
  Ticket,
  Sparkles,
  Wallet,
  Gift,
  Zap,
  Star,
  Crown,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const menuSections = [
  {
    title: 'Platforms',
    items: [
      { name: 'Home', path: 'Home', icon: Home, color: 'text-amber-400' },
      { name: 'Live Streams', path: 'Explore', icon: Radio, color: 'text-red-400' },
      { name: 'Videos', path: 'TheAmphitheatre', icon: Film, color: 'text-blue-400' },
      { name: 'Gaming Hub', path: 'TheGamingHub', icon: Gamepad2, color: 'text-purple-400' },
      { name: 'Affiliate Marketplace', path: 'AffiliateMarketplace', icon: ShoppingBag, color: 'text-emerald-400' }
    ]
  },
  {
    title: 'Community',
    items: [
      { name: 'Fan Clubs', path: 'FanClubs', icon: Heart, color: 'text-pink-400' },
      { name: 'Watch Parties', path: 'WatchParties', icon: Users, color: 'text-cyan-400' },
      { name: 'Forums', path: 'CommunityForums', icon: MessageSquare, color: 'text-indigo-400' },
      { name: 'Collab Matching', path: 'CollabMatching', icon: Sparkles, color: 'text-violet-400' }
    ]
  },
  {
    title: 'Rewards & Events',
    items: [
      { name: 'Daily Quests', path: 'Quests', icon: Target, color: 'text-orange-400' },
      { name: 'Achievements', path: 'Achievements', icon: Trophy, color: 'text-yellow-400' },
      { name: 'PPV Events', path: 'PPVEvents', icon: Ticket, color: 'text-purple-400' },
      { name: 'Leaderboard', path: 'Leaderboard', icon: Crown, color: 'text-amber-400' }
    ]
  },
  {
    title: 'Your Stuff',
    items: [
      { name: 'Wallet', path: 'Wallet', icon: Wallet, color: 'text-emerald-400' },
      { name: 'Following', path: 'Following', icon: Heart, color: 'text-red-400' },
      { name: 'Watch Later', path: 'WatchLater', icon: Star, color: 'text-blue-400' },
      { name: 'My Profile', path: 'Profile', icon: Users, color: 'text-amber-400' }
    ]
  }
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
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-80 bg-gradient-to-b from-[#0f0f12] via-[#111114] to-[#0f0f12] border-r border-white/10 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#0f0f12]/90 backdrop-blur-xl p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛡️</span>
                <span className="text-white font-bold text-lg">Legion Live</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Menu Sections */}
            <div className="p-4 space-y-6">
              {menuSections.map((section, sectionIndex) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sectionIndex * 0.1 }}
                >
                  <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 px-2">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item, itemIndex) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={createPageUrl(item.path)}
                          onClick={onClose}
                        >
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: sectionIndex * 0.1 + itemIndex * 0.05 }}
                            whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                          >
                            <div className={`p-2 rounded-lg bg-white/5 ${item.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-white/80 font-medium">{item.name}</span>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="sticky bottom-0 p-4 bg-gradient-to-t from-[#0f0f12] via-[#0f0f12] to-transparent">
              <Link to={createPageUrl('GoLive')} onClick={onClose}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-lg shadow-red-500/30"
                >
                  <Radio className="w-5 h-5" />
                  Go Live
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}