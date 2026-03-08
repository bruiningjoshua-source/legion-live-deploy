import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Volume2, VolumeX, Maximize2 } from 'lucide-react';

const INTEGRATED_GAMES = [
  { id: 'mario', title: 'Super Mario Bros', category: 'retro', emoji: '🍄' },
  { id: 'tetris', title: 'Tetris', category: 'retro', emoji: '🟦' },
  { id: 'zelda', title: 'Legend of Zelda', category: 'retro', emoji: '🗡️' },
  { id: 'pacman', title: 'Pac-Man', category: 'retro', emoji: '👻' },
  { id: 'donkey', title: 'Donkey Kong', category: 'retro', emoji: '🐵' },
  { id: 'mortal', title: 'Mortal Kombat', category: 'fighting', emoji: '👊' },
  { id: 'sf', title: 'Street Fighter', category: 'fighting', emoji: '🥋' },
  { id: 'wolf', title: 'Wolfenstein 3D', category: 'shooter', emoji: '🔫' },
  { id: 'doom', title: 'DOOM', category: 'shooter', emoji: '😈' },
  { id: 'quake', title: 'Quake Arena', category: 'shooter', emoji: '⚡' },
  { id: 'sc', title: 'StarCraft', category: 'strategy', emoji: '🌟' },
  { id: 'rts', title: 'Command & Conquer', category: 'strategy', emoji: '🚁' }
];

export default function IntegratedGameLibrary({ gameCategory = 'retro', onGameSelect }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const filteredGames = gameCategory === 'all' 
    ? INTEGRATED_GAMES 
    : INTEGRATED_GAMES.filter(g => g.category === gameCategory);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredGames.map((game, idx) => (
          <motion.button
            key={game.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => {
              setSelectedGame(game);
              onGameSelect?.(game);
            }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 aspect-square group hover:shadow-xl hover:shadow-amber-500/40 transition-all"
          >
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex flex-col items-center justify-center gap-2">
              <span className="text-4xl group-hover:scale-125 transition-transform">{game.emoji}</span>
              <p className="text-white text-xs font-bold text-center px-2">{game.title}</p>
            </div>
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-amber-500/0 to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-5 h-5 text-amber-400 fill-current" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Game Player Modal */}
      <AnimatePresence>
        {selectedGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedGame(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl border border-white/10"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-600 to-orange-600">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedGame.emoji}</span>
                  <h2 className="text-white font-bold text-lg">{selectedGame.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white"
                >
                  ✕
                </button>
              </div>

              {/* Game Canvas (placeholder) */}
              <div className="bg-black aspect-video flex items-center justify-center relative">
                <div className="text-center">
                  <p className="text-white/60 mb-4">Game loaded: {selectedGame.title}</p>
                  <p className="text-white/40 text-sm">Emulated game window</p>
                </div>

                {/* Controls */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 space-y-3">
                <p className="text-white/60 text-sm">Stream this game to earn tips from viewers or host tournaments!</p>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors">
                    Stream Game
                  </button>
                  <button className="flex-1 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-bold transition-colors">
                    Host Tournament
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}