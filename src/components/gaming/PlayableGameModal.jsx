import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, Maximize, Minimize, Radio, Download, ExternalLink, Star, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Curated HTML5 games that can be embedded and played in-browser
const PLAYABLE_GAMES = [
  {
    id: 'tetris',
    title: 'Tetris Classic',
    embedUrl: 'https://poki.com/embed/tetris-classic',
    genre: 'puzzle',
    icon: '🟦',
    description: 'The classic block-stacking puzzle game',
  },
  {
    id: '2048',
    title: '2048',
    embedUrl: 'https://play2048.co/',
    genre: 'puzzle',
    icon: '🔢',
    description: 'Slide tiles to combine and reach 2048',
  },
  {
    id: 'flappy',
    title: 'Flappy Bird',
    embedUrl: 'https://flappybird.io/',
    genre: 'arcade',
    icon: '🐦',
    description: 'Navigate through pipes without crashing',
  },
  {
    id: 'snake',
    title: 'Snake',
    embedUrl: 'https://playsnake.org/',
    genre: 'arcade',
    icon: '🐍',
    description: 'Classic snake game — eat and grow',
  },
  {
    id: 'pacman',
    title: 'Pac-Man',
    embedUrl: 'https://www.google.com/logos/2010/pacman10-i.html',
    genre: 'arcade',
    icon: '👻',
    description: 'Eat dots, avoid ghosts',
  },
];

export default function PlayableGameModal({ game, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!game) return null;

  const playableMatch = PLAYABLE_GAMES.find(
    pg => game.title?.toLowerCase().includes(pg.title.toLowerCase()) ||
          pg.title.toLowerCase().includes(game.title?.toLowerCase() || '')
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {game.icon_url ? (
              <img src={game.icon_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-white font-bold text-sm">{game.title}</h2>
              <p className="text-white/40 text-xs">{game.developer || game.genre}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stream this game */}
            <Link to={createPageUrl('GoLive') + `?gameTitle=${encodeURIComponent(game.title)}`}>
              <button className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors">
                <Radio className="w-3.5 h-3.5" />
                Stream This
              </button>
            </Link>

            {game.play_store_url && (
              <a href={game.play_store_url} target="_blank" rel="noopener noreferrer">
                <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-lg transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  Get App
                </button>
              </a>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Game area */}
        <div className={`flex-1 flex items-center justify-center p-4 ${isFullscreen ? 'p-0' : ''}`}>
          {playableMatch ? (
            <iframe
              src={playableMatch.embedUrl}
              className={`bg-black rounded-lg border border-white/[0.08] ${
                isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-2xl aspect-[4/3]'
              }`}
              allow="autoplay; fullscreen; gamepad"
              sandbox="allow-scripts allow-same-origin allow-popups"
              title={game.title}
            />
          ) : (
            <div className="text-center max-w-md">
              {game.icon_url && (
                <img src={game.icon_url} alt="" className="w-24 h-24 rounded-2xl object-cover mx-auto mb-6 shadow-2xl" />
              )}
              <h3 className="text-white font-bold text-xl mb-2">{game.title}</h3>
              <p className="text-white/50 text-sm mb-6">{game.description || 'This game requires a mobile device or external app to play.'}</p>

              <div className="flex flex-col gap-3 items-center">
                {game.play_store_url && (
                  <a href={game.play_store_url} target="_blank" rel="noopener noreferrer" className="w-full max-w-xs">
                    <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors">
                      <Download className="w-4 h-4" />
                      Download from Play Store
                    </button>
                  </a>
                )}

                <Link to={createPageUrl('GoLive') + `?gameTitle=${encodeURIComponent(game.title)}`} className="w-full max-w-xs">
                  <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors">
                    <Radio className="w-4 h-4" />
                    Go Live with This Game
                  </button>
                </Link>

                <p className="text-white/30 text-xs mt-2">
                  Once live, use the screen share button to broadcast your gameplay
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export { PLAYABLE_GAMES };