import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Eye, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const POPULAR_GAMES = [
  { name: 'Fortnite', icon: '🎯', viewers: 245000, streams: 1200, color: 'from-blue-600 to-purple-600' },
  { name: 'Valorant', icon: '🔫', viewers: 189000, streams: 890, color: 'from-red-500 to-pink-500' },
  { name: 'Minecraft', icon: '⛏️', viewers: 156000, streams: 2100, color: 'from-green-600 to-emerald-500' },
  { name: 'League of Legends', icon: '⚔️', viewers: 142000, streams: 780, color: 'from-yellow-500 to-orange-500' },
  { name: 'GTA V', icon: '🚗', viewers: 134000, streams: 650, color: 'from-purple-600 to-violet-600' },
  { name: 'Apex Legends', icon: '🎮', viewers: 98000, streams: 420, color: 'from-red-600 to-orange-500' },
  { name: 'Call of Duty', icon: '🪖', viewers: 87000, streams: 380, color: 'from-green-700 to-teal-600' },
  { name: 'Rocket League', icon: '⚽', viewers: 65000, streams: 290, color: 'from-blue-500 to-cyan-500' },
  { name: 'FIFA 24', icon: '⚽', viewers: 54000, streams: 210, color: 'from-emerald-600 to-green-500' },
  { name: 'Overwatch 2', icon: '🦸', viewers: 48000, streams: 180, color: 'from-orange-500 to-amber-500' },
  { name: 'CS2', icon: '💣', viewers: 112000, streams: 540, color: 'from-yellow-600 to-orange-600' },
  { name: 'Elden Ring', icon: '🗡️', viewers: 42000, streams: 150, color: 'from-amber-700 to-yellow-600' }
];

export default function GameCategoryGrid({ onSelectGame, selectedGame }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          Browse by Game
        </h2>
        <button className="text-purple-400 hover:text-purple-300 text-sm">View All</button>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {POPULAR_GAMES.map((game, i) => (
          <motion.button
            key={game.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ scale: 1.05, y: -4 }}
            onClick={() => onSelectGame?.(game.name === selectedGame ? null : game.name)}
            className={`relative group ${selectedGame === game.name ? 'ring-2 ring-purple-500' : ''}`}
          >
            <div className={`aspect-[3/4] rounded-lg bg-gradient-to-br ${game.color} p-3 flex flex-col items-center justify-center transition-all shadow-lg hover:shadow-xl`}>
              <span className="text-3xl mb-2">{game.icon}</span>
              <span className="text-white text-xs font-medium text-center line-clamp-2 leading-tight">{game.name}</span>
            </div>
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
              <div className="flex items-center gap-1 text-xs mb-1">
                <Eye className="w-3 h-3" />
                {(game.viewers / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-white/70">{game.streams} live</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}