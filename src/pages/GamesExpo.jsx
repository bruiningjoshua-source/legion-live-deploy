import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Play, Wand2, Trophy, Users, Zap, Sword, X } from 'lucide-react';
import MarioGame from '@/components/games/MarioGame';
import ZeldaGame from '@/components/games/ZeldaGame';
import MetalSlugGame from '@/components/games/MetalSlugGame';
import TetrisGame from '@/components/games/TetrisGame';
import DoubleDragonGame from '@/components/games/DoubleDragonGame';
import WolfensteinGame from '@/components/games/WolfensteinGame';
import QuakeGame from '@/components/games/QuakeGame';
import AIGameBuilder from '@/components/games/AIGameBuilder';

const GAMES = [
  { id: 'mario',        title: 'Super Legion Bros',  subtitle: 'Platformer',      description: 'Jump, run, and defeat enemies across 3 levels',         gradient: 'from-red-600 to-orange-600',     border: 'border-red-500/25',    glow: 'shadow-red-500/15',     emoji: '🍄', component: MarioGame,       players: '12.4K', rating: '4.9' },
  { id: 'zelda',        title: 'Legion of Time',     subtitle: 'Action-Adventure', description: 'Explore dungeons, solve puzzles, defeat bosses',         gradient: 'from-emerald-600 to-teal-600',   border: 'border-emerald-500/25',glow: 'shadow-emerald-500/15', emoji: '🗡️', component: ZeldaGame,       players: '8.1K',  rating: '4.8' },
  { id: 'metalslug',    title: 'Metal Legion',       subtitle: 'Run & Gun',        description: 'Blast through enemy hordes with heavy firepower',        gradient: 'from-yellow-600 to-amber-600',   border: 'border-yellow-500/25', glow: 'shadow-yellow-500/15',  emoji: '🔫', component: MetalSlugGame,   players: '6.7K',  rating: '4.7' },
  { id: 'tetris',       title: 'Legion Blocks',      subtitle: 'Puzzle Stacker',   description: 'Stack falling blocks and clear lines to score',          gradient: 'from-purple-600 to-violet-600',  border: 'border-purple-500/25', glow: 'shadow-purple-500/15',  emoji: '🟪', component: TetrisGame,      players: '21.3K', rating: '5.0' },
  { id: 'doubledragon', title: 'Double Legion',      subtitle: 'Beat \'em Up',     description: 'Fight waves of street thugs with martial arts',          gradient: 'from-blue-600 to-cyan-600',      border: 'border-blue-500/25',   glow: 'shadow-blue-500/15',    emoji: '🥊', component: DoubleDragonGame, players: '4.9K', rating: '4.6' },
  { id: 'wolfenstein',  title: 'Legion Wolf 3D',     subtitle: 'Classic FPS',      description: 'Navigate a dungeon — shoot guards, find the exit',       gradient: 'from-zinc-700 to-stone-700',     border: 'border-zinc-500/25',   glow: 'shadow-zinc-500/15',    emoji: '🔦', component: WolfensteinGame, players: '9.2K',  rating: '4.9' },
  { id: 'quake',        title: 'Legion Quake',       subtitle: 'Arena FPS',        description: 'Hunt shamblers with rockets, collect quad damage',       gradient: 'from-orange-700 to-red-700',     border: 'border-orange-500/25', glow: 'shadow-orange-500/15',  emoji: '🚀', component: QuakeGame,       players: '7.6K',  rating: '5.0' },
];

const GameCard = memo(function GameCard({ game, onPlay }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onPlay(game)}
      className={`relative rounded-2xl border ${game.border} bg-white/[0.03] hover:bg-white/[0.05] overflow-hidden cursor-pointer group shadow-lg ${game.glow} transition-all duration-300`}
    >
      {/* Gradient header */}
      <div className={`h-28 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/25" />
        <span className="text-5xl relative z-10 drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">{game.emoji}</span>
        {/* Rating */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/10">
          <span className="text-amber-400 text-[10px]">★</span>
          <span className="text-white text-[10px] font-bold">{game.rating}</span>
        </div>
      </div>

      <div className="p-3.5">
        <h3 className="text-white font-bold text-sm leading-tight mb-0.5">{game.title}</h3>
        <p className="text-white/35 text-xs mb-2">{game.subtitle}</p>
        <p className="text-white/50 text-xs mb-3 line-clamp-2 leading-relaxed">{game.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-white/25" />
            <span className="text-white/35 text-xs">{game.players}</span>
          </div>
          <div className={`opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 rounded-full bg-gradient-to-r ${game.gradient} text-white text-[10px] font-bold flex items-center gap-1 border border-white/10`}>
            <Play className="w-2.5 h-2.5 fill-current" />
            Play
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default function GamesExpo() {
  const [activeGame, setActiveGame] = useState(null);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState('arcade');

  const handlePlay = useCallback((game) => { setActiveGame(game); setShowAIBuilder(false); }, []);
  const handleClose = useCallback(() => setActiveGame(null), []);

  const GameComponent = activeGame?.component;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Header ── */}
        <div className="pt-8 pb-6 sm:pt-10">
          {/* Roman-style header */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-600/40" />
            <span className="text-amber-600/50 text-[10px] font-bold uppercase tracking-widest">Legion Games Expo</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-600/40" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 text-center mb-2">
            Games Expo
          </h1>
          <p className="text-white/35 text-sm text-center">Classic arcade. Powered by AI.</p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-6">
            {[
              { icon: Trophy, label: '7 Games' },
              { icon: Users,  label: '75K+ Players' },
              { icon: Wand2,  label: 'AI Builder' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <s.icon className="w-3.5 h-3.5 text-amber-500/60" />
                <span className="text-white/50 text-xs font-semibold">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/[0.04] border border-amber-700/20 p-1 rounded-xl gap-1">
            {[
              { id: 'arcade', label: 'Arcade Games', icon: Gamepad2 },
              { id: 'ai',     label: 'AI Builder',   icon: Wand2    },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveGame(null);
                  setShowAIBuilder(tab.id === 'ai');
                }}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                    : 'text-white/35 hover:text-white/70'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Active Game ── */}
        <AnimatePresence>
          {activeGame && GameComponent && (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="mb-8 rounded-2xl overflow-hidden border border-amber-700/20 shadow-2xl shadow-black/50"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-amber-700/15">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeGame.emoji}</span>
                  <div>
                    <h2 className="text-white font-bold text-sm">{activeGame.title}</h2>
                    <p className="text-white/35 text-xs">{activeGame.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/50 hover:text-white text-xs transition-all border border-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
              </div>
              <GameComponent />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── AI Builder ── */}
        <AnimatePresence>
          {showAIBuilder && (
            <motion.div
              key="ai-builder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AIGameBuilder />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Arcade Grid ── */}
        {activeTab === 'arcade' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4"
          >
            {GAMES.map((game, i) => (
              <motion.div key={game.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <GameCard game={game} onPlay={handlePlay} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Controls guide ── */}
        {activeTab === 'arcade' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 rounded-2xl bg-white/[0.02] border border-amber-700/15"
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500/60" />
              <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Controls</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { keys: '← →',     action: 'Move'         },
                { keys: '↑ / Space', action: 'Jump / Action' },
                { keys: 'Z / X',    action: 'Attack / Special' },
                { keys: 'P',        action: 'Pause'        },
              ].map(c => (
                <div key={c.action} className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-700/30 text-amber-400 text-xs font-mono">{c.keys}</span>
                  <span className="text-white/30 text-xs">{c.action}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}