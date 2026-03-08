import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Flame, Trophy, Zap } from 'lucide-react';

const GAME_CATEGORIES = [
  { id: 'all', name: 'All Games', icon: Gamepad2, color: 'from-slate-600 to-slate-700' },
  { id: 'retro', name: 'Retro Classics', icon: Flame, color: 'from-orange-600 to-red-700' },
  { id: 'fighting', name: 'Fighting', icon: Zap, color: 'from-red-600 to-pink-700' },
  { id: 'shooter', name: 'Shooters', icon: Trophy, color: 'from-blue-600 to-cyan-700' },
  { id: 'strategy', name: 'Strategy', icon: Gamepad2, color: 'from-purple-600 to-indigo-700' }
];

export default function GamingCategoryFilters({ activeCategory, onCategoryChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {GAME_CATEGORIES.map((cat) => (
        <motion.button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-4 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-all flex items-center gap-2 ${
            activeCategory === cat.id
              ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
              : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
          }`}
        >
          <cat.icon className="w-4 h-4" />
          {cat.name}
        </motion.button>
      ))}
    </div>
  );
}