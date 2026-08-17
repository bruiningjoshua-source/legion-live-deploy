import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import {
  Gamepad2, Search, Star, Radio,
  Play,
  ScreenShare, Smartphone, Monitor, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PlayableGameModal, { PLAYABLE_GAMES } from '@/components/gaming/PlayableGameModal';
import ScreenShareSetupModal from '@/components/gaming/ScreenShareSetupModal';
import GooglePlaySearch from '@/components/gaming/GooglePlaySearch';

const GENRE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'action', label: 'Action' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'puzzle', label: 'Puzzle' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'casual', label: 'Casual' },
  { id: 'sports', label: 'Sports' },
  { id: 'arcade', label: 'Arcade' },
  { id: 'rpg', label: 'RPG' },
];

const TAB_FILTERS = [
  { id: 'all', label: 'All Games', icon: Gamepad2 },
  { id: 'playable', label: 'Play Now', icon: Play },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
  { id: 'streamable', label: 'Stream Ready', icon: Radio },
];

function formatInstalls(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function GameCard({ game, onPlay, onStream }) {
  const isPlayable = PLAYABLE_GAMES.some(
    pg => game.title?.toLowerCase().includes(pg.title.toLowerCase()) ||
          pg.title.toLowerCase().includes(game.title?.toLowerCase() || '')
  );

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="bg-white/[0.03] border border-white/[0.07] rounded-xl overflow-hidden hover:border-amber-500/30 transition-all group"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gradient-to-br from-stone-900 to-stone-800 overflow-hidden">
        {game.icon_url ? (
          <img src={game.icon_url} alt={game.title}
            loading="lazy"
            onError={(e) => {
              // Cover failed to load — swap to the placeholder instead of a
              // broken-image box.
              e.currentTarget.style.display = 'none';
              const ph = e.currentTarget.parentElement?.querySelector('[data-cover-fallback]');
              if (ph) ph.style.display = 'flex';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (game._emoji || game.emoji) ? (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-stone-900 to-stone-800">
            {game._emoji || game.emoji}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-10 h-10 text-white/10" />
          </div>
        )}
        {/* Shown only if the cover image fails to load */}
        <div data-cover-fallback style={{ display: 'none' }}
          className="absolute inset-0 w-full h-full items-center justify-center bg-gradient-to-br from-stone-900 to-stone-800">
          <Gamepad2 className="w-10 h-10 text-white/20" />
        </div>

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isPlayable && (
            <span className="flex items-center gap-0.5 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
              <Play className="w-2.5 h-2.5" /> PLAY NOW
            </span>
          )}
          {game._trending && (
            <span className="flex items-center gap-0.5 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
              🔥 TRENDING
            </span>
          )}
          {game._featured && !game._trending && (
            <span className="flex items-center gap-0.5 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
              ⭐ FEATURED
            </span>
          )}
          {game.source === 'google_play' && (
            <span className="flex items-center gap-0.5 bg-black/70 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
              <Globe className="w-2.5 h-2.5" /> Play Store
            </span>
          )}
        </div>
        {/* Live viewer count for seeded games */}
        {game._viewers > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-sm text-white/80 text-[8px] px-1.5 py-0.5 rounded-md">
            👁 {(game._viewers/1000).toFixed(0)}K
          </div>
        )}

        {game.is_featured && (
          <div className="absolute top-2 right-2">
            <span className="bg-amber-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-md">FEATURED</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(game); }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Play className="w-3 h-3" />
            {isPlayable ? 'Play' : 'View'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onStream(game); }}
            className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Radio className="w-3 h-3" />
            Stream
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-white font-semibold text-xs line-clamp-1 mb-0.5">{game.title}</h3>
        {game.developer && (
          <p className="text-white/30 text-[10px] mb-2 line-clamp-1">{game.developer}</p>
        )}

        <div className="flex items-center justify-between">
          {game.rating ? (
            <div className="flex items-center gap-0.5 text-amber-400">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-[10px] font-semibold">{game.rating.toFixed(1)}</span>
            </div>
          ) : <span />}
          {game.install_count ? (
            <span className="text-white/25 text-[10px]">{formatInstalls(game.install_count)}</span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function GamesExpo() {
  const [genreFilter, setGenreFilter] = useState('all');
  const [tabFilter, setTabFilter] = useState('all');

  // When the Mobile tab is active, fetch the mobile catalog directly so the full
  // set is available (not just whichever mobile titles land in the popularity
  // slice).
  const { data: mobileGames = [] } = useQuery({
    queryKey: ['games-mobile-igdb', tabFilter],
    enabled: tabFilter === 'mobile',
    queryFn: async () => {
      const res = await base44.functions.invoke('listGames', { limit: 1000, mobileOnly: true });
      const rows = res?.data?.games ?? res?.games ?? [];
      return rows.map(g => ({
        id: g.id,
        title: g.name,
        icon_url: g.cover_url,
        genre: (g.genres || [])[0] || null,
        platform: (g.platforms || []).join(', '),
        rating: g.rating ? g.rating / 10 : null,
        description: g.summary,
        release_year: g.release_year,
        is_mobile: true,
        is_active: true,
      }));
    },
    staleTime: 10 * 60_000,
  });

  const [search, setSearch] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [showScreenShare, setShowScreenShare] = useState(false);
  const [screenShareGame, setScreenShareGame] = useState(null);
  const [showGoogleSearch, setShowGoogleSearch] = useState(false);

  const { data: games = [] } = useQuery({
    queryKey: ['game-library-igdb-all'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listGames', { limit: 1000 });
      const rows = res?.data?.games ?? res?.games ?? [];
      if (!rows.length) console.warn('[GamesExpo] listGames returned no rows');
      return rows.map(g => ({
        id: g.id,
        title: g.name,
        icon_url: g.cover_url,           // real IGDB cover art
        genre: (g.genres || [])[0] || null,
        platform: (g.platforms || []).join(', '),
        rating: g.rating ? g.rating / 10 : null,
        description: g.summary,
        release_year: g.release_year,
        is_mobile: g.is_mobile,
        is_active: true,
      }));
    },
    staleTime: 10 * 60_000,
  });

  // Merge DB games with built-in playable games and Google Play catalog
  const allGames = useMemo(() => {
    const dbTitles = new Set(games.map(g => g.title?.toLowerCase()));

    // Seeded emoji placeholder games removed — the DB catalog is now real IGDB
    // data with cover art, so the emoji stand-ins are no longer needed.
    const seededAAA = [];
    const builtInGames = PLAYABLE_GAMES
      .filter(pg => !dbTitles.has(pg.title.toLowerCase()))
      .map(pg => ({
        id: `builtin_${pg.id}`,
        title: pg.title,
        description: pg.description,
        genre: pg.genre,
        source: 'freeware',
        is_streamable: true,
        is_active: true,
        _isPlayable: true,
      }));

    // Google Play emoji catalog removed: the IGDB catalog now supplies real
    // mobile games (600+) WITH cover art, so the hardcoded emoji list would only
    // duplicate them and reintroduce emoji cards.
    const googleGames = [];

    return [...games, ...builtInGames, ...googleGames];
  }, [games]);

  const filteredGames = useMemo(() => {
    let result = allGames;

    if (genreFilter !== 'all') {
      result = result.filter(g => g.genre === genreFilter);
    }

    if (tabFilter === 'playable') {
      result = result.filter(g =>
        g._isPlayable || PLAYABLE_GAMES.some(pg =>
          g.title?.toLowerCase().includes(pg.title.toLowerCase()) ||
          pg.title.toLowerCase().includes(g.title?.toLowerCase() || '')
        )
      );
    } else if (tabFilter === 'mobile') {
      // Prefer the dedicated mobile fetch (full 600+); fall back to filtering
      // the general list if it hasn't loaded yet.
      result = mobileGames.length
        ? mobileGames
        : result.filter(g => g.is_mobile === true || g.source === 'google_play' || g.requires_screen_share);
    } else if (tabFilter === 'streamable') {
      result = result.filter(g => g.is_streamable !== false);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(g =>
        g.title?.toLowerCase().includes(q) ||
        g.developer?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allGames, genreFilter, tabFilter, search, mobileGames]);

  const handleStream = (game) => {
    setScreenShareGame(game.title);
    setShowScreenShare(true);
  };

  const handleGooglePlaySelect = (game) => {
    setShowGoogleSearch(false);
    setScreenShareGame(game.title);
    setShowScreenShare(true);
  };

  return (
    <div className="min-h-screen text-white pb-24">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-amber-400" />
              <span className="text-white font-bold text-lg">Games Hub</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Screen Share — standalone setup */}
              <button
                onClick={() => { setScreenShareGame(null); setShowScreenShare(true); }}
                className="flex items-center gap-1 bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-[10px] px-2.5 py-1.5 rounded-lg"
              >
                <ScreenShare className="w-3 h-3" />
                Screen Share
              </button>
              <Link to={createPageUrl('GoLive')}>
                <button className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-[10px] px-2.5 py-1.5 rounded-lg">
                  <Radio className="w-3 h-3" />
                  Go Live
                </button>
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 h-9 flex-1">
              <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search games…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-white text-sm placeholder:text-white/30 outline-none flex-1 min-w-0"
              />
            </div>
            <button
              onClick={() => setShowGoogleSearch(true)}
              className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 h-9 text-white/50 hover:text-white text-xs font-medium whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5 text-green-400" />
              Play Store
            </button>
          </div>

          {/* Tab filters */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2">
            {TAB_FILTERS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabFilter(tab.id)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    tabFilter === tab.id
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                      : 'bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Genre chips */}
        <div className="flex gap-1.5 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
          {GENRE_FILTERS.map(genre => (
            <button
              key={genre.id}
              onClick={() => setGenreFilter(genre.id)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                genreFilter === genre.id
                  ? 'bg-white/[0.12] text-white'
                  : 'bg-white/[0.04] text-white/40 hover:text-white/70'
              }`}
            >
              {genre.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero — How to stream games */}
      <div className="px-4 pt-4 pb-5">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-red-900/40 via-amber-900/20 to-purple-900/30 border border-white/[0.08] p-5">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-white font-black text-xl mb-2 flex items-center gap-2">
              <ScreenShare className="w-5 h-5 text-green-400" />
              Stream Any Game
            </h2>
            <p className="text-white/50 text-sm mb-4">
              Use screen share to broadcast mobile or desktop gameplay directly to your live stream.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setScreenShareGame(null); setShowScreenShare(true); }}
                className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/25 rounded-lg px-3 py-1.5 text-xs text-green-400 font-semibold hover:bg-green-500/25 transition-colors"
              >
                <ScreenShare className="w-3.5 h-3.5" />
                Start Screen Share
              </button>
              <div className="flex items-center gap-1.5 bg-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white/60">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                Mobile Games
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white/60">
                <Monitor className="w-3.5 h-3.5 text-amber-400" />
                PC Games
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white/60">
                <Play className="w-3.5 h-3.5 text-amber-400" />
                HTML5 Games
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Games grid */}
      <div className="px-4">
        {filteredGames.length === 0 ? (
          <div className="text-center py-20">
            <Gamepad2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No games found</p>
          </div>
        ) : (
          <>
            <p className="text-white/30 text-xs mb-3">{filteredGames.length} games</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredGames.map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  onPlay={(g) => setSelectedGame(g)}
                  onStream={handleStream}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Playable game modal */}
      {selectedGame && (
        <PlayableGameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {/* Screen Share Setup Modal */}
      <AnimatePresence>
        {showScreenShare && (
          <ScreenShareSetupModal
            gameTitle={screenShareGame}
            onClose={() => { setShowScreenShare(false); setScreenShareGame(null); }}
          />
        )}
      </AnimatePresence>

      {/* Google Play Search Modal */}
      <AnimatePresence>
        {showGoogleSearch && (
          <GooglePlaySearch
            onSelectGame={handleGooglePlaySelect}
            onClose={() => setShowGoogleSearch(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}