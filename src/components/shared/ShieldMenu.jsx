import React, { useState } from 'react';
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
  X
} from 'lucide-react';

const MENU_SECTIONS = [
  { 
    id: 'live', 
    label: 'Live Arena', 
    icon: Radio, 
    page: 'Explore', 
    color: 'from-red-500 to-red-700',
    description: 'Watch & Go Live'
  },
  { 
    id: 'videos', 
    label: 'Amphitheatre', 
    icon: Film, 
    page: 'TheAmphitheatre', 
    color: 'from-purple-500 to-purple-700',
    description: 'Videos & Shorts'
  },
  { 
    id: 'gaming', 
    label: 'Gaming Hub', 
    icon: Gamepad2, 
    page: 'TheGamingHub', 
    color: 'from-green-500 to-green-700',
    description: 'Games & Streams'
  },
  { 
    id: 'community', 
    label: 'Forum', 
    icon: Users, 
    page: 'CommunityForums', 
    color: 'from-cyan-500 to-cyan-700',
    description: 'Discuss & Connect'
  },
  { 
    id: 'market', 
    label: 'Marketplace', 
    icon: ShoppingBag, 
    page: 'AffiliateHub', 
    color: 'from-amber-500 to-amber-700',
    description: 'Products & Deals'
  },
  { 
    id: 'leaderboard', 
    label: 'Leaderboard', 
    icon: Trophy, 
    page: 'Leaderboard', 
    color: 'from-yellow-500 to-yellow-700',
    description: 'Top Creators'
  },
];

export default function ShieldMenu({ isOpen, onClose, onNavigate }) {
  const [hoveredSection, setHoveredSection] = useState(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-sm flex items-center justify-center"
          onClick={onClose}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-stone-800/80 flex items-center justify-center text-amber-400 hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Shield Container */}
          <motion.div
            initial={{ scale: 0.8, rotateY: -30 }}
            animate={{ scale: 1, rotateY: 0 }}
            exit={{ scale: 0.8, rotateY: 30 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow effect */}
            <div className="absolute -inset-10 bg-amber-500/20 rounded-full blur-3xl" />

            {/* Shield SVG Background */}
            <svg viewBox="0 0 300 360" className="w-80 h-96 md:w-[400px] md:h-[480px]">
              <defs>
                <linearGradient id="shieldMenuGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id="shieldMenuRed" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#991b1b" />
                  <stop offset="100%" stopColor="#450a0a" />
                </linearGradient>
              </defs>
              
              {/* Main shield shape */}
              <path
                d="M150 15 L280 55 L280 150 Q280 300 150 345 Q20 300 20 150 L20 55 Z"
                fill="url(#shieldMenuRed)"
                stroke="url(#shieldMenuGold)"
                strokeWidth="8"
              />
              
              {/* Inner border */}
              <path
                d="M150 35 L260 70 L260 145 Q260 280 150 320 Q40 280 40 145 L40 70 Z"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                opacity="0.4"
              />
            </svg>

            {/* Menu Items Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pb-16 px-8">
              {/* Title */}
              <h2 className="text-amber-400 font-bold text-xl md:text-2xl tracking-wider mb-6"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                LEGION LIVE
              </h2>

              {/* Menu Grid */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 w-full max-w-xs">
                {MENU_SECTIONS.map((section, i) => {
                  const Icon = section.icon;
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Link
                        to={createPageUrl(section.page)}
                        onClick={() => {
                          onNavigate?.(section.page);
                          onClose();
                        }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onHoverStart={() => setHoveredSection(section.id)}
                          onHoverEnd={() => setHoveredSection(null)}
                          className={`relative p-3 md:p-4 rounded-xl bg-gradient-to-br ${section.color} border-2 border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer`}
                        >
                          <div className="flex flex-col items-center text-center">
                            <Icon className="w-6 h-6 md:w-8 md:h-8 text-white mb-1" />
                            <span className="text-white font-semibold text-xs md:text-sm">{section.label}</span>
                          </div>
                          
                          {/* Hover tooltip */}
                          <AnimatePresence>
                            {hoveredSection === section.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-900 px-2 py-1 rounded text-amber-300 text-xs"
                              >
                                {section.description}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Settings link */}
              <Link
                to={createPageUrl('Settings')}
                onClick={onClose}
                className="mt-4 flex items-center gap-2 text-amber-400/70 hover:text-amber-400 text-sm transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}