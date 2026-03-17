import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import {
  Gamepad2, Search, Download, Star, Users, TrendingUp,
  Play, Zap, Trophy, ChevronRight, Package, Cloud
} from 'lucide-react';

const GENRE_FILTERS = [
  { id: 'all', label: 'All Games' },
  { id: 'action', label: 'Action' },
  { id: 'puzzle', label: 'Puzzle' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'casual', label: 'Casual' },
  { id: 'sports', label: 'Sports' },
  { id: 'arcade', label: 'Arcade' },
];

const SOURCE_FILTERS = [
  { id: 'all', label: 'All Sources' },
  { id: 'google_play', label: 'Google Play' },
  { id: 'freeware', label: 'Freeware' },
  { id: 'open_source', label: 'Open Source' },
];

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function GameCard({ game }) {
  return (
    <div className="bigo-card p-3 hover:border-purple-400/50 transition-all group">
      {/* Game icon */}
      <div className="relative rounded-lg overflow-hidden mb-3 bg-white/[0.05]" style={{ aspectRatio: '1/1' }}>
        {game.icon_url && (
          <img src={game.icon_url} alt={game.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-md">
          {game.source === 'google_play' && <Cloud className="w-3 h-3" />}
          {game.source === 'freeware' && <Package className="w-3 h-3" />}
          {game.source.replace('_', ' ')}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2">
        <div>
          <h3 className="text-white font-bold text-sm line-clamp-2">{game.title}</h3>
          {game.developer && (
            <p className="text-white/40 text-xs mt-0.5">{game.developer}</p>
          )}
        </div>

        {/* Rating & installs */}
        <div className="flex items-center justify-between text-xs">
          {game.rating && (
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-3 h-3 fill-current" />
              <span className="font-semibold">{game.rating.toFixed(1)}</span>
            </div>
          )}
          {game.install_count && (
            <span className="text-white/40">{formatCount(game.install_count)}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {game.play_store_url && (
            <a href={game.play_store_url} target="_blank" rel="noopener noreferrer" className="flex-1">
              <button className="w-full text-xs font-bold text-white bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/30 rounded-lg py-2 transition-colors flex items-center justify-center gap-1">
                <Download className="w-3 h-3" />
                Get
              </button>
            </a>
          )}
          <button className="flex-1 text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/20 rounded-lg py-2 transition-all active:scale-95">
            Stream
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GamesExpo() {
  const [genreFilter, setGenreFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Game library
  const { data: games = [] } = useQuery({
    queryKey: ['game-library-all'],
    queryFn: () => base44.entities.GameLibrary.filter(
      { is_active: true },
      '-rating',
      500
    ),
    staleTime: 10 * 60_000,
  });

  const filteredGames = useMemo(() => {
    let result = games;

    if (genreFilter !== 'all') {
      result = result.filter(g => g.genre === genreFilter);
    }

    if (sourceFilter !== 'all') {
      result = result.filter(g => g.source === sourceFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(g =>
        g.title?.toLowerCase().includes(q) ||
        g.developer?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [games, genreFilter, sourceFilter, search]);

  return (
    <div className="min-h-screen text-white pt-14 pb-24">
      {/* Header */}
      <div className="sticky top-14 z-40 bigo-overlay border-b border-white/10">
        <div className="px-4 pt-3 pb-2">
          {showSearch ? (
            <div className="flex items-center gap-2 bigo-card px-3 h-10 border-purple-400/30">
              <Search className="w-4 h-4 text-white/40 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search games, developers…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
              />
              <button onClick={() => { setShowSearch(false); setSearch(''); }} className="text-white/40 hover:text-white text-xs font-bold">✕</button>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-amber-400" />
                <span className="text-white font-bold text-lg">Games Expo</span>
              </div>
              <button onClick={() => setShowSearch(true)} className="text-white/60 hover:text-white transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Genre filters */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide items-center">
          {GENRE_FILTERS.map(genre => (
            <button
              key={genre.id}
              onClick={() => setGenreFilter(genre.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                genreFilter === genre.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12]'
              }`}
            >
              {genre.label}
            </button>
          ))}
        </div>

        {/* Source filters */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide items-center">
          {SOURCE_FILTERS.map(source => (
            <button
              key={source.id}
              onClick={() => setSourceFilter(source.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                sourceFilter === source.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                  : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12]'
              }`}
            >
              {source.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero banner */}
      <div className="px-4 pt-4 pb-6">
        <div className="relative p-6 rounded-2xl bg-gradient-to-br from-purple-900/40 to-pink-900/20 border border-purple-500/20 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-white font-black text-2xl mb-2">Discover & Stream</h2>
            <p className="text-white/60 text-sm">Browse hundreds of games from Google Play, freeware, and more. Stream directly to your audience.</p>
          </div>
        </div>
      </div>

      {/* Games grid */}
      <div className="px-4 pb-4">
        {filteredGames.length === 0 ? (
          <div className="text-center py-20">
            <Gamepad2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No games found matching your filters</p>
          </div>
        ) : (
          <>
            <p className="text-white/40 text-xs mb-3">{filteredGames.length} games available</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredGames.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}