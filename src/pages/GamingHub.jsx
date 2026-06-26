  const gameLibrary = getGamesByCategory(selectedCategory || 'all');
  const trendingGames = getTrendingGames(8);import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import {
  Gamepad2, Search, Flame, Trophy, Users, Eye, Play,
  Zap, ChevronRight, Radio, TrendingUp
} from 'lucide-react';
import GamingStreamCard from '@/components/gaming/GamingStreamCard';
import { GAME_CATEGORIES, getGamesByCategory, getTrendingGames } from '@/components/gaming/SeededGameLibrary';

const GAMING_CATEGORIES = [
  { id: 'all', label: 'All Games', icon: Gamepad2 },
  { id: 'action', label: 'Action', icon: Zap },
  { id: 'puzzle', label: 'Puzzle', icon: Trophy },
  { id: 'strategy', label: 'Strategy', icon: TrendingUp },
  { id: 'casual', label: 'Casual', icon: Play },
  { id: 'sports', label: 'Sports', icon: Users },
];

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function FeaturedGameCard({ stream }) {
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`} className="block group">
      <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {stream.thumbnail_url && (
          <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Live badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>

        {/* Category badge */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
          {stream.category}
        </div>

        {/* Overlay content */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-lg line-clamp-2 mb-2">{stream.title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <div className="text-white/90 text-sm font-semibold">{stream.creator_id}</div>
            </div>
            {stream.viewer_count > 0 && (
              <div className="flex items-center gap-1 text-white/70 text-sm">
                <Eye className="w-3.5 h-3.5" />
                {formatCount(stream.viewer_count)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function GamingHub() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Live gaming streams
  const { data: liveStreams = [] } = useQuery({
    queryKey: ['gaming-streams-live'],
    queryFn: () => base44.entities.Stream.filter(
      { status: 'live', category: 'gaming' },
      '-viewer_count',
      50
    ),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Featured game library
  const { data: gameLibrary = [] } = useQuery({
    queryKey: ['game-library-featured'],
    queryFn: () => base44.entities.GameLibrary.filter(
      { is_streamable: true, is_active: true },
      '-rating',
      100
    ),
    staleTime: 5 * 60_000,
  });

  // Top streamers
  const { data: topGamingCreators = [] } = useQuery({
    queryKey: ['top-gaming-creators'],
    queryFn: () => base44.entities.Creator.filter(
      { category: 'gaming', is_verified: true },
      '-follower_count',
      20
    ),
    staleTime: 10 * 60_000,
  });

  const filteredStreams = useMemo(() => {
    let result = liveStreams;
    if (selectedCategory !== 'all') {
      result = result.filter(s => s.category?.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.title?.toLowerCase().includes(q) || s.creator_id?.toLowerCase().includes(q));
    }
    return result;
  }, [liveStreams, selectedCategory, search]);

  const featuredStream = filteredStreams[0];

  return (
    <div className="min-h-screen text-white pt-14 pb-24">
      {/* Header with search */}
      <div className="sticky top-14 z-40 bigo-overlay border-b border-white/10">
        <div className="px-4 pt-3 pb-2">
          {showSearch ? (
            <div className="flex items-center gap-2 bigo-card px-3 h-10 border-purple-400/30">
              <Search className="w-4 h-4 text-white/40 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search streams, games, creators…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
              />
              <button onClick={() => { setShowSearch(false); setSearch(''); }} className="text-white/40 hover:text-white text-xs font-bold">✕</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-purple-400" />
                <span className="text-white font-bold text-lg">Gaming Hub</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowSearch(true)} className="text-white/60 hover:text-white transition-colors">
                  <Search className="w-5 h-5" />
                </button>
                <Link to={createPageUrl('GoLive')}>
                  <button className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 h-9 rounded-lg">
                    <Radio className="w-3.5 h-3.5" />
                    Go Live
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide items-center">
          {GAME_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/[0.08] text-white/80 hover:bg-white/[0.15] border border-white/10'
              }`}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Featured stream */}
        {featuredStream && (
          <section>
            <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              Now Playing
            </h2>
            <FeaturedGameCard stream={featuredStream} />
          </section>
        )}

        {/* Live streams grid */}
        {filteredStreams.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-400" />
                Watching Now
              </h2>
              <Link to={createPageUrl('Explore')} className="text-purple-400 hover:text-purple-300 text-xs font-semibold flex items-center gap-1">
                See All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredStreams.slice(0, 6).map(stream => (
                <GamingStreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          </section>
        )}

        {/* Popular games library */}
        {gameLibrary.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Popular Games
              </h2>
              <Link to={createPageUrl('GamesExpo')} className="text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center gap-1">
                Browse More <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {gameLibrary.slice(0, 9).map(game => (
                <Link key={game.id} to={createPageUrl('GamesExpo')} className="block">
                  <div className="relative rounded-xl overflow-hidden bg-white/[0.05] border border-white/[0.08] hover:border-purple-400/30 transition-all" style={{ aspectRatio: '1/1' }}>
                    {game.icon_url && (
                      <img src={game.icon_url} alt={game.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-2">
                      <p className="text-white text-xs font-semibold line-clamp-2">{game.title}</p>
                      {game.rating && (
                        <p className="text-yellow-400 text-[10px] mt-1">⭐ {game.rating.toFixed(1)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Top gaming creators */}
        {topGamingCreators.length > 0 && (
          <section>
            <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Top Gaming Streamers
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {topGamingCreators.slice(0, 6).map(creator => (
                <Link key={creator.id} to={createPageUrl(`CreatorProfile?id=${creator.user_email}`)} className="block group">
                  <div className="bigo-card p-3 text-center hover:border-purple-400/50 transition-all">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-2" />
                    <p className="text-white text-xs font-semibold line-clamp-1">{creator.display_name}</p>
                    <p className="text-white/40 text-[10px] mt-1">{formatCount(creator.follower_count)} followers</p>
                    {creator.is_live && (
                      <div className="mt-2 flex items-center justify-center gap-1 text-red-400 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {filteredStreams.length === 0 && gameLibrary.length === 0 && (
          <div className="text-center py-20">
            <Gamepad2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No games found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}