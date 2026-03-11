import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Eye, Tv, Flame, Search, Grid3x3, List,
  ChevronRight, Crown, Play, Clock, ThumbsUp,
  TrendingUp, Radio, Bookmark, Bell
} from 'lucide-react';

const CATEGORIES = ['All', 'Gaming', 'Music', 'Talk Show', 'Fitness', 'Art', 'Comedy', 'Education', 'Outdoor', 'Cooking'];

// Large YouTube-style featured card
function FeaturedStreamCard({ stream }) {
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`}>
      <div className="group relative w-full rounded-2xl overflow-hidden bg-black border border-white/[0.08] hover:border-white/[0.2] transition-all duration-300 active:scale-[0.99] shadow-2xl">
        <div className="aspect-video relative">
          {stream.thumbnail_url ? (
            <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-950 via-stone-900 to-black flex items-center justify-center">
              <Tv className="w-16 h-16 text-white/10" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

          {/* Play button on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <Play className="w-7 h-7 text-white ml-1" />
            </div>
          </div>

          {/* Live badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>

          {/* Viewer count */}
          {stream.viewer_count > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg">
              <Eye className="w-3 h-3" />
              {stream.viewer_count.toLocaleString()} watching
            </div>
          )}

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-white font-bold text-lg line-clamp-1 mb-1 drop-shadow-lg">{stream.title}</h2>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex-shrink-0 shadow-md" />
              <span className="text-white/70 text-sm font-medium">{stream.creator_id}</span>
              {stream.category && (
                <span className="ml-auto text-white/40 text-xs bg-white/10 px-2 py-0.5 rounded-md">{stream.category}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Standard YouTube-style grid card
function StreamGridCard({ stream }) {
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`}>
      <div className="group cursor-pointer">
        {/* Thumbnail */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] mb-2.5 group-hover:border-white/[0.15] transition-all duration-200">
          {stream.thumbnail_url ? (
            <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-900/20 to-black flex items-center justify-center">
              <Tv className="w-8 h-8 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Live badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-lg">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE
          </div>

          {/* Viewer count */}
          {stream.viewer_count > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/80 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md">
              <Eye className="w-2.5 h-2.5" />{stream.viewer_count.toLocaleString()}
            </div>
          )}

          {/* Play hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-4 h-4 text-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* Info row */}
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold line-clamp-2 leading-tight mb-1">{stream.title}</p>
            <p className="text-white/50 text-xs">{stream.creator_id}</p>
            {stream.viewer_count > 0 && (
              <p className="text-white/35 text-xs">{stream.viewer_count.toLocaleString()} viewers</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// VOD-style card for non-live content
function VODCard({ stream }) {
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`}>
      <div className="group cursor-pointer">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] mb-2.5 group-hover:border-white/[0.15] transition-all duration-200">
          {stream.thumbnail_url ? (
            <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900/20 to-black flex items-center justify-center">
              <Play className="w-8 h-8 text-white/10" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md font-medium">
            {stream.duration_minutes ? `${stream.duration_minutes}m` : 'VOD'}
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold line-clamp-2 leading-tight mb-1">{stream.title}</p>
            <p className="text-white/50 text-xs">{stream.creator_id}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function TheAmphitheatre() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('live');

  const { data: liveStreams = [], isLoading: liveLoading } = useQuery({
    queryKey: ['amphitheatre-live'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 50),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: vodStreams = [], isLoading: vodLoading } = useQuery({
    queryKey: ['amphitheatre-vod'],
    queryFn: () => base44.entities.Stream.filter({ status: 'ended' }, '-created_date', 40),
    staleTime: 5 * 60 * 1000,
  });

  const streams = activeTab === 'live' ? liveStreams : vodStreams;
  const isLoading = activeTab === 'live' ? liveLoading : vodLoading;

  const filtered = streams.filter(s => {
    const matchCat = activeCategory === 'All' || s.category?.toLowerCase() === activeCategory.toLowerCase();
    const matchSearch = !searchQuery || s.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = activeTab === 'live' ? filtered[0] : null;
  const gridItems = activeTab === 'live' ? filtered.slice(1) : filtered;

  return (
    <div className="min-h-screen text-white pt-14 bg-[#09090b]">

      {/* ── Sticky Header — YouTube Premium style ── */}
      <div className="sticky top-14 z-40 bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-screen-xl mx-auto px-4">

          {/* Title + live count */}
          <div className="flex items-center justify-between pt-3 pb-2">
            <div className="flex items-center gap-2.5">
              {activeTab === 'live' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50 animate-pulse" />
                  <h1 className="text-white font-bold text-base">Live Streams</h1>
                  {liveStreams.length > 0 && (
                    <span className="text-red-400 text-xs font-semibold bg-red-500/10 px-2 py-0.5 rounded-full">
                      {liveStreams.length} live
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-violet-400" />
                  <h1 className="text-white font-bold text-base">Videos</h1>
                </>
              )}
            </div>
            <Link to={createPageUrl('GoLive')}>
              <button className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-semibold text-xs px-3.5 h-8 rounded-xl transition-all shadow-lg shadow-red-500/20">
                <Radio className="w-3.5 h-3.5" /> Go Live
              </button>
            </Link>
          </div>

          {/* Live / VOD tabs */}
          <div className="flex gap-1 mb-2.5">
            {[
              { key: 'live', label: '🔴 Live', count: liveStreams.length },
              { key: 'vod', label: '🎬 Videos', count: vodStreams.length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setActiveCategory('All'); }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === key
                    ? 'bg-white text-black'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.07]'
                }`}
              >
                {label}
                {count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-black/10 text-black' : 'bg-white/10'}`}>{count}</span>}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 h-9 mb-2.5">
            <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
            <input
              type="text"
              placeholder={activeTab === 'live' ? 'Search live streams…' : 'Search videos…'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-white text-sm placeholder:text-white/25 outline-none flex-1 min-w-0"
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? 'bg-white text-black'
                    : 'bg-white/[0.07] text-white/50 hover:text-white hover:bg-white/[0.12]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-screen-xl mx-auto px-4 py-5">
        {isLoading ? (
          <div className="space-y-5">
            <div className="aspect-video w-full rounded-2xl bg-white/[0.04] animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-video rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Tv className="w-14 h-14 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium mb-1">
              {activeTab === 'live' ? 'No streams live right now' : 'No videos yet'}
            </p>
            <p className="text-white/25 text-sm">Check back soon or go live yourself!</p>
            <Link to={createPageUrl('GoLive')} className="inline-flex items-center gap-2 mt-4 bg-red-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-red-700 transition-all">
              <Radio className="w-4 h-4" /> Start Streaming
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hero featured stream */}
            {featured && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-white/50 text-xs font-bold tracking-widest uppercase">Featured</span>
                </div>
                <FeaturedStreamCard stream={featured} />
              </div>
            )}

            {/* Grid */}
            {gridItems.length > 0 && (
              <div>
                {featured && (
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-4 h-4 text-red-400" />
                    <span className="text-white/50 text-xs font-bold tracking-widest uppercase">
                      {activeTab === 'live' ? 'All Live Channels' : 'Latest Videos'}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
                  {gridItems.map(stream => (
                    activeTab === 'live'
                      ? <StreamGridCard key={stream.id} stream={stream} />
                      : <VODCard key={stream.id} stream={stream} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}