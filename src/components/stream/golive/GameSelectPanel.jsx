import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Monitor, Smartphone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const RECOMMENDED_GAMES = [
  { id: 'cod_mobile', title: 'Call of Duty: Mobile', icon: '🔫', category: 'action' },
  { id: 'mobile_legends', title: 'Mobile Legends', icon: '⚔️', category: 'action' },
  { id: 'pubg', title: 'PUBG Mobile', icon: '🎯', category: 'action' },
  { id: 'free_fire', title: 'Free Fire', icon: '🔥', category: 'action' },
  { id: 'genshin', title: 'Genshin Impact', icon: '⭐', category: 'rpg' },
  { id: 'among_us', title: 'Among Us', icon: '🚀', category: 'casual' },
  { id: 'roblox', title: 'Roblox', icon: '🧱', category: 'casual' },
  { id: 'minecraft', title: 'Minecraft', icon: '⛏️', category: 'simulation' },
  { id: 'clash_royale', title: 'Clash Royale', icon: '👑', category: 'strategy' },
  { id: 'fortnite', title: 'Fortnite', icon: '🏗️', category: 'action' },
  { id: 'apex_legends', title: 'Apex Legends Mobile', icon: '🎖️', category: 'action' },
  { id: 'angry_birds', title: 'Angry Birds', icon: '🐦', category: 'casual' },
];

const QUICK_CATEGORIES = [
  { id: 'mobile_game', label: 'Mobile Game', icon: '📱' },
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'music', label: 'Music', icon: '🎵' },
];

export default function GameSelectPanel({ onGameSelect, onClose, deviceMode, onDeviceModeChange }) {
  const [search, setSearch] = useState('');

  const { data: libraryGames = [] } = useQuery({
    queryKey: ['game-library-active'],
    queryFn: () => base44.entities.GameLibrary.filter({ is_active: true }, 'title', 50),
    staleTime: 5 * 60 * 1000,
  });

  // Merge library games with recommended defaults
  const allGames = useMemo(() => {
    const merged = [...RECOMMENDED_GAMES];
    libraryGames.forEach(g => {
      if (!merged.find(m => m.title.toLowerCase() === g.title.toLowerCase())) {
        merged.push({ id: g.id, title: g.title, icon: g.icon_url || '🎮', category: g.genre || 'other', isFromLibrary: true });
      }
    });
    return merged.sort((a, b) => a.title.localeCompare(b.title));
  }, [libraryGames]);

  const filtered = search.trim()
    ? allGames.filter(g => g.title.toLowerCase().includes(search.toLowerCase()))
    : null;

  // Group alphabetically
  const grouped = useMemo(() => {
    const source = filtered || allGames;
    const groups = {};
    source.forEach(g => {
      const letter = g.title[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(g);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, allGames]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 350 }}
      className="fixed inset-0 z-50 bg-[#0d1117] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center px-4 h-14 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>
        <h2 className="flex-1 text-center text-white font-bold text-lg">Select Game</h2>
        <div className="w-8" />
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-white/[0.08] border border-white/[0.1] rounded-full px-3 py-2">
          <Search className="w-4 h-4 text-white/40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Enter game name to search"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none"
          />
        </div>
      </div>

      {/* Device mode toggle */}
      <div className="px-4 pb-3 flex justify-center">
        <div className="flex bg-white/[0.06] rounded-full p-0.5 border border-white/[0.1]">
          <button
            onClick={() => onDeviceModeChange?.('mobile')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              deviceMode === 'mobile' ? 'bg-white text-black' : 'text-white/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Mobile
          </button>
          <button
            onClick={() => onDeviceModeChange?.('pc')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              deviceMode === 'pc' ? 'bg-white text-black' : 'text-white/50'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> PC
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 relative">
        {/* Recommended */}
        {!search.trim() && (
          <div className="mb-4">
            <p className="text-white/40 text-xs font-semibold mb-2">Recommend</p>
            <div className="grid grid-cols-2 gap-2">
              {RECOMMENDED_GAMES.slice(0, 8).map(game => (
                <GameButton key={game.id} game={game} onSelect={onGameSelect} />
              ))}
            </div>
          </div>
        )}

        {/* Quick categories */}
        {!search.trim() && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {QUICK_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => onGameSelect?.({ id: cat.id, title: cat.label })}
                className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5"
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-white/70 text-xs font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Alphabetical list */}
        {grouped.map(([letter, games]) => (
          <div key={letter} id={`game-letter-${letter}`}>
            <p className="text-white/30 text-xs font-bold mb-1.5 mt-3">{letter}</p>
            <div className="grid grid-cols-2 gap-2">
              {games.map(game => (
                <GameButton key={game.id} game={game} onSelect={onGameSelect} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Alphabet sidebar */}
      <div className="absolute right-0.5 top-36 bottom-4 flex flex-col justify-center z-10">
        {alphabet.map(letter => (
          <button
            key={letter}
            onClick={() => {
              const el = document.getElementById(`game-letter-${letter}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="text-[9px] text-white/30 hover:text-cyan-400 leading-[14px] font-medium"
          >
            {letter}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function GameButton({ game, onSelect }) {
  return (
    <button
      onClick={() => onSelect?.(game)}
      className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 hover:bg-white/[0.08] active:scale-[0.97] transition-all text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
        {game.isFromLibrary && game.icon?.startsWith('http') ? (
          <img src={game.icon} alt="" className="w-full h-full rounded-lg object-cover" />
        ) : (
          <span className="text-lg">{game.icon || '🎮'}</span>
        )}
      </div>
      <span className="text-white/80 text-xs font-medium truncate">{game.title}</span>
    </button>
  );
}