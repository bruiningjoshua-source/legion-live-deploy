import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Sparkles, Play, Wand2, Trophy, Users, Zap, ChevronRight } from 'lucide-react';
import MarioGame from '@/components/games/MarioGame';
import ZeldaGame from '@/components/games/ZeldaGame';
import MetalSlugGame from '@/components/games/MetalSlugGame';
import TetrisGame from '@/components/games/TetrisGame';
import DoubleDragonGame from '@/components/games/DoubleDragonGame';
import AIGameBuilder from '@/components/games/AIGameBuilder';

const GAMES = [
  {
    id: 'mario',
    title: 'Super Legion Bros',
    subtitle: 'Side-scrolling platformer',
    description: 'Jump, run, and defeat enemies across 3 levels',
    gradient: 'from-red-600 to-orange-500',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
    emoji: '🍄',
    component: MarioGame,
    players: '12.4K',
    rating: '4.9',
  },
  {
    id: 'zelda',
    title: 'Legion of Time',
    subtitle: 'Action-adventure quest',
    description: 'Explore dungeons, solve puzzles, defeat bosses',
    gradient: 'from-emerald-600 to-teal-500',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    emoji: '🗡️',
    component: ZeldaGame,
    players: '8.1K',
    rating: '4.8',
  },
  {
    id: 'metalslug',
    title: 'Metal Legion',
    subtitle: 'Run & gun shooter',
    description: 'Blast through enemy hordes with heavy firepower',
    gradient: 'from-yellow-600 to-amber-500',
    border: 'border-yellow-500/30',
    glow: 'shadow-yellow-500/20',
    emoji: '🔫',
    component: MetalSlugGame,
    players: '6.7K',
    rating: '4.7',
  },
  {
    id: 'tetris',
    title: 'Legion Blocks',
    subtitle: 'Puzzle stacker',
    description: 'Stack falling blocks and clear lines to score',
    gradient: 'from-purple-600 to-violet-500',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    emoji: '🟪',
    component: TetrisGame,
    players: '21.3K',
    rating: '5.0',
  },
  {
    id: 'doubledragon',
    title: 'Double Legion',
    subtitle: 'Beat \'em up brawler',
    description: 'Fight waves of street thugs with martial arts',
    gradient: 'from-blue-600 to-cyan-500',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    emoji: '🥊',
    component: DoubleDragonGame,
    players: '4.9K',
    rating: '4.6',
  },
];

const GameCard = memo(function GameCard({ game, onPlay }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-2xl border ${game.border} bg-white/[0.03] backdrop-blur-sm overflow-hidden cursor-pointer group`}
      onClick={() => onPlay(game)}
    >
      {/* Gradient header */}
      <div className={`h-28 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <span className="text-5xl relative z-10 drop-shadow-2xl">{game.emoji}</span>
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
          <span className="text-yellow-400 text-xs">★</span>
          <span className="text-white text-xs font-bold">{game.rating}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-white font-bold text-base leading-tight">{game.title}</h3>
          <motion.div
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            initial={false}
          >
            <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
          </motion.div>
        </div>
        <p className="text-white/40 text-xs mb-2">{game.subtitle}</p>
        <p className="text-white/60 text-xs mb-3 line-clamp-2">{game.description}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-white/30" />
            <span className="text-white/40 text-xs">{game.players}</span>
          </div>
        </div>
      </div>

      {/* Play button overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
        <div className={`px-6 py-2 rounded-full bg-gradient-to-r ${game.gradient} text-white text-sm font-bold shadow-lg flex items-center gap-2`}>
          <Play className="w-3.5 h-3.5 fill-current" />
          Play Now
        </div>
      </div>
    </motion.div>
  );
});

export default function GamesExpo() {
  const [activeGame, setActiveGame] = useState(null);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState('arcade');

  const handlePlay = useCallback((game) => {
    setActiveGame(game);
    setShowAIBuilder(false);
  }, []);

  const handleClose = useCallback(() => {
    setActiveGame(null);
  }, []);

  const GameComponent = activeGame?.component;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center py-8 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4"
          >
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">The Games Expo</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 mb-2"
          >
            Games Expo
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 text-sm sm:text-base"
          >
            Classic arcade games. Powered by AI.
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-6 mt-5"
          >
            {[
              { icon: Trophy, label: '5 Games', value: 'Arcade' },
              { icon: Users, label: '53K+', value: 'Players' },
              { icon: Wand2, label: 'AI Builder', value: 'Create' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <stat.icon className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-white font-bold text-sm">{stat.label}</span>
                </div>
                <span className="text-white/30 text-xs">{stat.value}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Tab Bar */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/[0.04] border border-white/[0.06] p-1 rounded-xl">
            {[
              { id: 'arcade', label: 'Arcade', icon: Gamepad2 },
              { id: 'ai', label: 'AI Builder', icon: Wand2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setActiveGame(null); setShowAIBuilder(tab.id === 'ai'); }}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-black shadow'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Game Fullscreen */}
        <AnimatePresence>
          {activeGame && GameComponent && (
            <motion.div
              key="active-game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8 rounded-2xl overflow-hidden border border-white/10"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-white/[0.04] border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeGame.emoji}</span>
                  <div>
                    <h2 className="text-white font-bold text-sm">{activeGame.title}</h2>
                    <p className="text-white/40 text-xs">{activeGame.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-sm transition-colors"
                >
                  Close
                </button>
              </div>
              <GameComponent />
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Builder Tab */}
        <AnimatePresence>
          {showAIBuilder && (
            <motion.div
              key="ai-builder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AIGameBuilder />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Arcade Grid */}
        {activeTab === 'arcade' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {GAMES.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <GameCard game={game} onPlay={handlePlay} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Controls Guide */}
        {activeTab === 'arcade' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-white/60 text-sm font-medium">Controls</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { keys: '← →', action: 'Move' },
                { keys: '↑ / Space', action: 'Jump / Action' },
                { keys: 'Z / X', action: 'Attack / Special' },
                { keys: 'P', action: 'Pause' },
              ].map((c) => (
                <div key={c.action} className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white text-xs font-mono">{c.keys}</span>
                  <span className="text-white/40 text-xs">{c.action}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}