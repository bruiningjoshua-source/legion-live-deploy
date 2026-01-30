import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  Film, 
  Gamepad2, 
  Users, 
  ShoppingBag, 
  Trophy,
  Settings,
  X,
  Wallet,
  BarChart3,
  Calendar,
  HelpCircle
} from 'lucide-react';

const MENU_SECTIONS = [
  { 
    id: 'live', 
    label: 'Live', 
    icon: Radio, 
    page: 'Explore', 
    color: 'from-red-500 to-rose-600',
    description: 'Watch streams'
  },
  { 
    id: 'videos', 
    label: 'Videos', 
    icon: Film, 
    page: 'TheAmphitheatre', 
    color: 'from-violet-500 to-purple-600',
    description: 'On-demand content'
  },
  { 
    id: 'gaming', 
    label: 'Gaming', 
    icon: Gamepad2, 
    page: 'TheGamingHub', 
    color: 'from-emerald-500 to-green-600',
    description: 'Game streams'
  },
  { 
    id: 'community', 
    label: 'Community', 
    icon: Users, 
    page: 'CommunityForums', 
    color: 'from-cyan-500 to-blue-600',
    description: 'Forums & chat'
  },
  { 
    id: 'market', 
    label: 'Shop', 
    icon: ShoppingBag, 
    page: 'AffiliateHub', 
    color: 'from-amber-500 to-orange-600',
    description: 'Affiliate deals'
  },
  { 
    id: 'leaderboard', 
    label: 'Rankings', 
    icon: Trophy, 
    page: 'Leaderboard', 
    color: 'from-yellow-500 to-amber-600',
    description: 'Top creators'
  },
];

const SECONDARY_LINKS = [
  { label: 'Wallet', icon: Wallet, page: 'Wallet' },
  { label: 'Analytics', icon: BarChart3, page: 'CreatorAnalytics' },
  { label: 'Events', icon: Calendar, page: 'Events' },
  { label: 'Help', icon: HelpCircle, page: 'CommunityGuidelines' },
];

export default function ShieldMenu({ isOpen, onClose, onNavigate }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg"
          onClick={onClose}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-white font-bold text-lg">Menu</h2>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Main Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-140px)]" onClick={(e) => e.stopPropagation()}>
            {/* Primary Navigation Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {MENU_SECTIONS.map((section, i) => {
                const Icon = section.icon;
                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={createPageUrl(section.page)}
                      onClick={() => {
                        onNavigate?.(section.page);
                        onClose();
                      }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={`p-4 rounded-2xl bg-gradient-to-br ${section.color} shadow-lg active:scale-95 transition-transform`}
                      >
                        <div className="flex flex-col items-center text-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-white font-semibold text-sm">{section.label}</span>
                          <span className="text-white/60 text-[10px] leading-tight">{section.description}</span>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-4" />

            {/* Secondary Links */}
            <div className="space-y-1">
              {SECONDARY_LINKS.map((link, i) => {
                const Icon = link.icon;
                return (
                  <motion.div
                    key={link.page}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.03 }}
                  >
                    <Link
                      to={createPageUrl(link.page)}
                      onClick={onClose}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white/70" />
                      </div>
                      <span className="text-white/80 font-medium">{link.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-4" />

            {/* Settings */}
            <Link
              to={createPageUrl('Settings')}
              onClick={onClose}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Settings className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-white/80 font-medium">Settings</span>
            </Link>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black/50 backdrop-blur-sm">
            <p className="text-center text-white/30 text-xs">Legion Live v1.0</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}