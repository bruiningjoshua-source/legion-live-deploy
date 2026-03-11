import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Eye, Tv, Flame, Zap, Radio, Filter, Search,
  Grid3x3, List, ChevronRight, Users, Crown
} from 'lucide-react';

const CATEGORIES = ['All', 'Gaming', 'Music', 'Talk Show', 'Fitness', 'Art', 'Comedy', 'Education'];

function StreamCard({ stream, layout = 'grid' }) {
  const isWide = layout === 'featured';
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`}>
      <div className={`group relative rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.15] transition-all duration-300 active:scale-[0.98] ${isWide ? 'aspect-video' : 'aspect-video'}`}>
        {/* Thumbnail */}
        {stream.thumbnail_url ? (
          <img
            src={stream.thumbnail_url}
            alt={stream.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-black to-black flex items-center justify-center">
            <Tv className="w-10 h-10 text-white/10" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Live badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow-lg shadow-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>

        {/* Viewer count */}
        {stream.viewer_count > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] px-2 py-1 rounded-lg">
            <Eye className="w-3 h-3" />
            {stream.viewer_count.toLocaleString()}
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-semibold text-sm line-clamp-1 mb-0.5">{stream.title}</p>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex-shrink-0" />
            <p className="text-white/60 text-xs truncate">{stream.creator_id}</p>
            {stream.category && (
              <span className="text-white/30 text-[10px] ml-auto flex-shrink-0">
                {stream.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function TheAmphitheatre() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState('grid');

  const { data: streams = [], isLoading } = useQuery({
    queryKey: ['amphitheatre-streams'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 50),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const filtered = streams.filter(s => {
    const matchCat = activeCategory === 'All' || s.category?.toLowerCase() === activeCategory.toLowerCase();
    const matchSearch = !searchQuery || s.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen text-white pt-16">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-[#0d0d10]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h1 className="text-white font-bold text-base">The Colosseum</h1>
              {streams.length > 0 && (
                <span className="text-white/30 text-sm">{streams.length} live</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLayout(layout === 'grid' ? 'list' : 'grid')}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-all"
              >
                {layout === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 h-9">
              <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search streams…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-white text-sm placeholder:text-white/30 outline-none flex-1 min-w-0"
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Tv className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No streams live right now</p>
          </div>
        ) : (
          <>
            {/* Featured stream */}
            {featured && (
              <div className="mb-5">
                <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2.5 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Featured Stream
                </p>
                <StreamCard stream={featured} layout="featured" />
              </div>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <>
                <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2.5 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  All Live Channels
                </p>
                <div className={`gap-3 ${
                  layout === 'grid'
                    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {rest.map(stream => (
                    <StreamCard key={stream.id} stream={stream} layout={layout} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}