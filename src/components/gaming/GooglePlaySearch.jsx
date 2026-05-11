import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Star, ExternalLink, Radio } from 'lucide-react';

// Large curated list of popular Google Play games users can browse/search
const GOOGLE_PLAY_CATALOG = [
  // Action
  { title: 'PUBG Mobile', developer: 'Tencent Games', genre: 'action', rating: 4.2, installs: '100M+', playStoreId: 'com.tencent.ig', icon: '🔫' },
  { title: 'Call of Duty: Mobile', developer: 'Activision', genre: 'action', rating: 4.4, installs: '100M+', playStoreId: 'com.activision.callofduty.shooter', icon: '🎯' },
  { title: 'Free Fire', developer: 'Garena', genre: 'action', rating: 4.3, installs: '500M+', playStoreId: 'com.dts.freefireth', icon: '🔥' },
  { title: 'Fortnite', developer: 'Epic Games', genre: 'action', rating: 4.1, installs: '50M+', playStoreId: 'com.epicgames.fortnite', icon: '🏗️' },
  { title: 'Apex Legends Mobile', developer: 'EA', genre: 'action', rating: 4.0, installs: '10M+', playStoreId: 'com.ea.gp.apexlegendsmobilefps', icon: '⚡' },
  { title: 'Genshin Impact', developer: 'miHoYo', genre: 'rpg', rating: 4.3, installs: '50M+', playStoreId: 'com.miHoYo.GenshinImpact', icon: '⚔️' },
  { title: 'Temple Run 2', developer: 'Imangi Studios', genre: 'action', rating: 4.5, installs: '500M+', playStoreId: 'com.imangi.templerun2', icon: '🏃' },
  { title: 'Subway Surfers', developer: 'SYBO Games', genre: 'action', rating: 4.6, installs: '1B+', playStoreId: 'com.kiloo.subwaysurf', icon: '🛹' },
  // Strategy
  { title: 'Clash of Clans', developer: 'Supercell', genre: 'strategy', rating: 4.5, installs: '500M+', playStoreId: 'com.supercell.clashofclans', icon: '⚔️' },
  { title: 'Clash Royale', developer: 'Supercell', genre: 'strategy', rating: 4.4, installs: '500M+', playStoreId: 'com.supercell.clashroyale', icon: '👑' },
  { title: 'Brawl Stars', developer: 'Supercell', genre: 'action', rating: 4.3, installs: '100M+', playStoreId: 'com.supercell.brawlstars', icon: '💥' },
  { title: 'Rise of Kingdoms', developer: 'Lilith Games', genre: 'strategy', rating: 4.4, installs: '50M+', playStoreId: 'com.lilithgame.roc.gp', icon: '🏰' },
  { title: 'Mobile Legends: Bang Bang', developer: 'Moonton', genre: 'strategy', rating: 4.3, installs: '100M+', playStoreId: 'com.mobile.legends', icon: '🗡️' },
  // Puzzle
  { title: 'Candy Crush Saga', developer: 'King', genre: 'puzzle', rating: 4.5, installs: '1B+', playStoreId: 'com.king.candycrushsaga', icon: '🍬' },
  { title: 'Wordle', developer: 'The New York Times', genre: 'puzzle', rating: 4.7, installs: '10M+', playStoreId: 'com.nytimes.wordle', icon: '📝' },
  { title: 'Among Us', developer: 'Innersloth', genre: 'puzzle', rating: 4.3, installs: '100M+', playStoreId: 'com.innersloth.spacemafia', icon: '🚀' },
  { title: '2048', developer: 'Androbaby', genre: 'puzzle', rating: 4.5, installs: '100M+', playStoreId: 'com.androbaby.game2048', icon: '🔢' },
  // Casual
  { title: 'Minecraft', developer: 'Mojang', genre: 'casual', rating: 4.5, installs: '50M+', playStoreId: 'com.mojang.minecraftpe', icon: '⛏️' },
  { title: 'Roblox', developer: 'Roblox Corp', genre: 'casual', rating: 4.4, installs: '500M+', playStoreId: 'com.roblox.client', icon: '🎮' },
  { title: 'Stumble Guys', developer: 'Kitka Games', genre: 'casual', rating: 4.2, installs: '100M+', playStoreId: 'com.kitkagames.fallbuddies', icon: '🏁' },
  { title: 'Crossy Road', developer: 'Hipster Whale', genre: 'casual', rating: 4.5, installs: '100M+', playStoreId: 'com.yodo1.crossyroad', icon: '🐔' },
  // Sports
  { title: 'FIFA Soccer', developer: 'EA Sports', genre: 'sports', rating: 4.2, installs: '100M+', playStoreId: 'com.ea.gp.fifamobile', icon: '⚽' },
  { title: 'NBA 2K Mobile', developer: '2K', genre: 'sports', rating: 4.1, installs: '10M+', playStoreId: 'com.t2ksports.nba2kmobile', icon: '🏀' },
  { title: 'Real Racing 3', developer: 'EA', genre: 'sports', rating: 4.4, installs: '100M+', playStoreId: 'com.ea.games.r3_row', icon: '🏎️' },
  // Arcade
  { title: 'Pac-Man', developer: 'Bandai Namco', genre: 'arcade', rating: 4.3, installs: '100M+', playStoreId: 'com.bandainamcoent.pacman', icon: '👾' },
  { title: 'Fruit Ninja', developer: 'Halfbrick', genre: 'arcade', rating: 4.5, installs: '100M+', playStoreId: 'com.halfbrick.fruitninjafree', icon: '🍉' },
  { title: 'Jetpack Joyride', developer: 'Halfbrick', genre: 'arcade', rating: 4.5, installs: '100M+', playStoreId: 'com.halfbrick.jetpackjoyride', icon: '🚀' },
  // RPG
  { title: 'Honkai: Star Rail', developer: 'miHoYo', genre: 'rpg', rating: 4.5, installs: '10M+', playStoreId: 'com.HoYoverse.hkrpgoversea', icon: '✨' },
  { title: 'Diablo Immortal', developer: 'Blizzard', genre: 'rpg', rating: 4.0, installs: '10M+', playStoreId: 'com.blizzard.diablo.immortal', icon: '😈' },
  { title: 'AFK Arena', developer: 'Lilith Games', genre: 'rpg', rating: 4.5, installs: '50M+', playStoreId: 'com.lilithgame.hgame.gp', icon: '🧙' },
];

export default function GooglePlaySearch({ onSelectGame, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');

  const genres = ['all', 'action', 'strategy', 'puzzle', 'casual', 'sports', 'arcade', 'rpg'];

  const filtered = useMemo(() => {
    let results = GOOGLE_PLAY_CATALOG;
    if (selectedGenre !== 'all') {
      results = results.filter(g => g.genre === selectedGenre);
    }
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.developer.toLowerCase().includes(q)
      );
    }
    return results;
  }, [query, selectedGenre]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-[#111114] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-white font-bold text-base">Find Google Play Games</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 h-10 mb-3">
            <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search games…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="bg-transparent text-white text-sm placeholder:text-white/30 outline-none flex-1 min-w-0"
              autoFocus
            />
          </div>

          {/* Genre chips */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-3">
            {genres.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-all ${
                  selectedGenre === g
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-white/[0.04] text-white/40 hover:text-white/70'
                }`}
              >
                {g === 'all' ? 'All' : g}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">No games found</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(game => (
                <div
                  key={game.playStoreId}
                  className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:border-amber-500/20 transition-colors"
                >
                  <span className="text-2xl w-10 h-10 flex items-center justify-center bg-white/[0.05] rounded-xl flex-shrink-0">
                    {game.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{game.title}</p>
                    <p className="text-white/30 text-[10px]">{game.developer} · {game.installs}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-current" />
                      <span className="text-amber-400 text-[10px] font-semibold">{game.rating}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <a
                      href={`https://play.google.com/store/apps/details?id=${game.playStoreId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => onSelectGame(game)}
                      className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:bg-amber-500/30 transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export { GOOGLE_PLAY_CATALOG };