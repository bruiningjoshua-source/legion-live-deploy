import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Eye, Tv, ChevronRight, Star } from 'lucide-react';
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';

const CATEGORIES = [
  { id: 'all',       label: 'All' },
  { id: 'gaming',    label: 'Gaming' },
  { id: 'music',     label: 'Music' },
  { id: 'talk_show', label: 'Talk Show' },
  { id: 'dance',     label: 'Dance' },
  { id: 'cooking',   label: 'Cooking' },
  { id: 'fitness',   label: 'Fitness' },
  { id: 'education', label: 'Education' },
  { id: 'art',       label: 'Art' },
  { id: 'comedy',    label: 'Comedy' },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: liveStreams = [], isLoading } = useQuery({
    queryKey: ['home-live-streams'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live', platform_type: 'legion_live' }, '-viewer_count', 30),
    staleTime: 30 * 1000,
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['home-top-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 12),
    staleTime: 5 * 60 * 1000,
  });

  // Build a creator lookup map for PremiumStreamCard
  const creatorMap = useMemo(() => {
    const map = {};
    creators.forEach(c => { map[c.email || c.id] = c; });
    return map;
  }, [creators]);

  const filteredStreams = useMemo(() => {
    if (activeCategory === 'all') return liveStreams;
    return liveStreams.filter(s => s.category === activeCategory);
  }, [liveStreams, activeCategory]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pt-14">

      {/* ── Category Chips (horizontal scroll) ── */}
      <div className="sticky top-14 z-30 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-white/[0.04]">
        <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  active
                    ? 'bg-white text-black'
                    : 'bg-white/[0.07] text-white/50 hover:text-white/80'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Top Creators Row ── */}
      {creators.length > 0 && (
        <section className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-2.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-white/80 text-xs font-semibold">Popular</span>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
            {creators.map((creator) => (
              <Link key={creator.id} to={createPageUrl('CreatorProfile') + `?id=${creator.id}`} className="flex-shrink-0">
                <div className="flex flex-col items-center gap-1 w-14">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500/40">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{creator.display_name?.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  {creator.is_live && (
                    <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-px rounded-full -mt-3 relative z-10 border border-[#0a0a0f]">
                      LIVE
                    </span>
                  )}
                  <span className="text-white/50 text-[10px] font-medium truncate w-full text-center">{creator.display_name}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Live Stream Grid ── */}
      <section className="px-3 pt-2 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[9/16] rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : filteredStreams.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredStreams.map((stream) => (
              <PremiumStreamCard
                key={stream.id}
                stream={stream}
                creator={creatorMap[stream.creator_id]}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Tv className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">No live streams right now</p>
            <p className="text-white/20 text-xs mt-1">Check back soon or go live yourself!</p>
          </div>
        )}
      </section>
    </div>
  );
}