import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Play, Wand2, Trophy, Users, Zap, Sword, ChevronRight } from 'lucide-react';
import MarioGame from '@/components/games/MarioGame';
import ZeldaGame from '@/components/games/ZeldaGame';
import MetalSlugGame from '@/components/games/MetalSlugGame';
import TetrisGame from '@/components/games/TetrisGame';
import DoubleDragonGame from '@/components/games/DoubleDragonGame';
import WolfensteinGame from '@/components/games/WolfensteinGame';
import QuakeGame from '@/components/games/QuakeGame';
import AIGameBuilder from '@/components/games/AIGameBuilder';

const GAMES = [
  { id: 'mario',        title: 'Super Legion Bros',  subtitle: 'Side-scrolling platformer', description: 'Jump, run, and defeat enemies across 3 levels', gradient: 'from-red-700 to-orange-600',     border: 'border-red-600/25',     emoji: '🍄', component: MarioGame,       players: '12.4K', rating: '4.9' },
  { id: 'zelda',        title: 'Legion of Time',      subtitle: 'Action-adventure quest',    description: 'Explore dungeons, solve puzzles, defeat bosses', gradient: 'from-emerald-700 to-teal-600', border: 'border-emerald-600/25', emoji: '🗡️', component: ZeldaGame,       players: '8.1K',  rating: '4.8' },
  { id: 'metalslug',    title: 'Metal Legion',         subtitle: 'Run & gun shooter',         description: 'Blast through enemy hordes with heavy firepower', gradient: 'from-amber-700 to-yellow-600', border: 'border-amber-600/25',   emoji: '🔫', component: MetalSlugGame,   players: '6.7K',  rating: '4.7' },
  { id: 'tetris',       title: 'Legion Blocks',        subtitle: 'Puzzle stacker',            description: 'Stack falling blocks and clear lines to score', gradient: 'from-purple-700 to-violet-600', border: 'border-purple-600/25',  emoji: '🟪', component: TetrisGame,      players: '21.3K', rating: '5.0' },
  { id: 'doubledragon', title: 'Double Legion',        subtitle: "Beat 'em up brawler",       description: 'Fight waves of street thugs with martial arts', gradient: 'from-blue-700 to-cyan-600',    border: 'border-blue-600/25',    emoji: '🥊', component: DoubleDragonGame, players: '4.9K',  rating: '4.6' },
  { id: 'wolfenstein',  title: 'Legion Wolf 3D',       subtitle: 'Classic FPS raycaster',     description: 'Navigate a dungeon — shoot guards, find the exit', gradient: 'from-stone-700 to-zinc-600', border: 'border-stone-600/25',   emoji: '🔦', component: WolfensteinGame, players: '9.2K',  rating: '4.9' },
  { id: 'quake',        title: 'Legion Quake',         subtitle: 'Arena FPS shooter',         description: 'Hunt shamblers with rockets, collect quad damage', gradient: 'from-orange-800 to-red-700', border: 'border-orange-700/25',  emoji: '🚀', component: QuakeGame,       players: '7.6K',  rating: '5.0' },
];

const GameCard = memo(function GameCard({ game, onPlay, isActive }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      className={`relative rounded-2xl border ${game.border} overflow-hidden cursor-pointer group ${
        isActive ? 'ring-2 ring-amber-400/50' : ''
      }`}
      style={{ background: 'rgba(15,12,6,0.7)' }}
      onClick={() => onPlay(game)}
    >
      {/* Gradient header */}
      <div className={`h-24 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/30" />
        {/* Stone texture */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' }} />
        <span className="text-4xl relative z-10 drop-shadow-xl">{game.emoji}</span>
        <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/50 rounded-full px-2 py-0.5">
          <span className="text-amber-400 text-[10px]">★</span>
          <span className="text-white text-[10px] font-bold">{game.rating}</span>
        </div>
        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-0.5">
          <h3 className="text-white font-bold text-sm leading-tight pr-1">{game.title}</h3>
          <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-amber-400/60 shrink-0 mt-0.5 transition-colors" />
        </div>
        <p className="text-amber-500/50 text-[10px] mb-1.5">{game.subtitle}</p>
        <p className="text-white/40 text-[10px] mb-2 line-clamp-2">{game.description}</p>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-white/25" />
          <span className="text-white/30 text-[10px]">{game.players}</span>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
        <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${game.gradient} text-white text-xs font-bold shadow-lg flex items-center gap-1.5 border border-white/10`}>
          <Play className="w-3 h-3 fill-current" />
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

  const handlePlay = useCallback((game) => { setActiveGame(game); setShowAIBuilder(false); }, []);
  const handleClose = useCallback(() => setActiveGame(null), []);

  const GameComponent = activeGame?.component;

  return (
    <div className="min-h-screen pt-16 pb-24" style={{ background: 'linear-gradient(180deg, #0c0906 0%, #0f0c08 40%, #0a0804 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Page Header ── */}
        <div className="pt-8 pb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4">
            <Sword className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400/80 text-[10px] font-black uppercase tracking-[0.2em]">Games Expo · MMXXVI</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-1">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600">GAMES</span>
            <span className="text-white/80 ml-3">EXPO</span>
          </h1>
          <p className="text-amber-600/50 text-xs font-bold tracking-[0.25em] uppercase mb-5">Classic Arcade · AI-Powered Creation</p>

          {/* Stats */}
          <div className="inline-flex items-center gap-6 px-5 py-2.5 bg-amber-900/15 border border-amber-700/20 rounded-xl">
            {[
              { icon: Trophy, value: '7 Games', label: 'Arcade' },
              { icon: Users,  value: '75K+',    label: 'Players' },
              { icon: Wand2,  value: 'AI',       label: 'Builder' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <stat.icon className="w-3 h-3 text-amber-400/60" />
                  <span className="text-white font-bold text-sm">{stat.value}</span>
                </div>
                <span className="text-amber-600/50 text-[9px] uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-amber-900/20 border border-amber-700/25 p-1 rounded-xl gap-0.5">
            {[
              { id: 'arcade', label: 'Arcade Games', icon: Gamepad2 },
              { id: 'ai',     label: 'AI Builder',   icon: Wand2    },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setActiveGame(null); setShowAIBuilder(tab.id === 'ai'); }}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-white/35 hover:text-white/70'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Roman divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/25" />
          <span className="text-amber-700/40 text-[9px] tracking-[0.3em] uppercase font-bold">⚔ Arena Classica ⚔</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/25" />
        </div>

        {/* ── Active Game ── */}
        <AnimatePresence>
          {activeGame && GameComponent && (
            <motion.div
              key="active-game"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="mb-8 rounded-2xl overflow-hidden border border-amber-700/25"
              style={{ background: 'rgba(15,12,6,0.9)' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-amber-700/20">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeGame.emoji}</span>
                  <div>
                    <h2 className="text-white font-bold text-sm">{activeGame.title}</h2>
                    <p className="text-amber-500/50 text-xs">{activeGame.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white text-xs font-medium transition-all"
                >
                  Close Arena
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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <AIGameBuilder />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Arcade Grid ── */}
        {activeTab === 'arcade' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4"
          >
            {GAMES.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <GameCard game={game} onPlay={handlePlay} isActive={activeGame?.id === game.id} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Controls guide */}
        {activeTab === 'arcade' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 rounded-2xl border border-amber-700/20"
            style={{ background: 'rgba(15,12,6,0.6)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400/60" />
              <span className="text-amber-400/60 text-xs font-bold uppercase tracking-widest">Controls</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { keys: '← →',      action: 'Move'         },
                { keys: '↑ / Space', action: 'Jump / Action'},
                { keys: 'Z / X',     action: 'Attack / Special'},
                { keys: 'P',         action: 'Pause'        },
              ].map(c => (
                <div key={c.action} className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-900/30 border border-amber-700/30 text-amber-300/80 text-[10px] font-mono">{c.keys}</span>
                  <span className="text-white/30 text-[10px]">{c.action}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}