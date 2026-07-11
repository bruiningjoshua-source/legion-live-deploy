import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Crown, Swords, Users } from 'lucide-react';
import LiveBadge from '@/components/shared/LiveBadge';
import ViewerCount from '@/components/shared/ViewerCount';
import AvatarWithStatus from '@/components/shared/AvatarWithStatus';
import { cn } from "@/lib/utils";

const STREAM_TYPES = {
  solo: { badge: 'live', glow: 'shadow-red-500/30' },
  multi_panel: { badge: 'panel', glow: 'shadow-purple-500/30' },
  pk_battle: { badge: 'pk', glow: 'shadow-orange-500/30' }
};

const CATEGORY_COLORS = {
  gaming: 'bg-amber-500/80 text-white',
  music: 'bg-amber-500/80 text-white',
  talk_show: 'bg-amber-500/80 text-white',
  dance: 'bg-pink-500/80 text-white',
  cooking: 'bg-orange-500/80 text-white',
  fitness: 'bg-green-500/80 text-white',
  education: 'bg-cyan-500/80 text-white',
  art: 'bg-rose-500/80 text-white',
  comedy: 'bg-yellow-500/80 text-black',
  other: 'bg-white/20 text-white',
};

const PremiumStreamCard = memo(function PremiumStreamCard({ stream, creator, index = 0 }) {
  const config = STREAM_TYPES[stream.stream_type] || STREAM_TYPES.solo;
  // Disable hover scale on mobile to prevent scroll jank
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, []);

  return (
    <div className="group transition-transform duration-200">
      <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
        <div className={cn(
          'relative overflow-hidden rounded-xl',
          'bg-white/[0.03]',
          'border border-white/[0.05]',
          'transition-all duration-200',
          !isMobile && 'group-hover:border-white/[0.12] group-hover:-translate-y-0.5'
        )}>
          {/* Thumbnail Container - Portrait 9:16 */}
          <div className="relative aspect-[9/16] overflow-hidden">
            {/* Background Image */}
            {stream.thumbnail_url ? (
              <img 
                src={stream.thumbnail_url} 
                alt={stream.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-900 to-black flex items-center justify-center relative">
                <span className="text-6xl opacity-20">🏛️</span>
                <div className="absolute bottom-16 left-0 right-0 px-4">
                  <p className="text-white/40 text-sm font-medium text-center line-clamp-2">{stream.title}</p>
                </div>
              </div>
            )}

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />

            {/* Top Bar - Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                <LiveBadge type={config.badge} size="default" />
                {stream.stream_type === 'pk_battle' && (
                  <span className="flex items-center gap-1 bg-orange-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">⚔ PK</span>
                )}
                {stream.stream_type === 'multi_panel' && (
                  <span className="flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"><Users className="w-2.5 h-2.5" /> Panel</span>
                )}
                {stream.is_featured && (
                  <LiveBadge type="featured" size="sm" pulse={false} />
                )}
              </div>
              <ViewerCount count={stream.viewer_count || 0} variant="default" />
            </div>

            {/* Category badge - bottom left */}
            {stream.category && (
              <div className="absolute bottom-28 left-3 z-10">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[stream.category] || CATEGORY_COLORS.other}`}>
                  {stream.category.replace('_', ' ')}
                </span>
              </div>
            )}

            {/* PK Battle Icon */}
            {stream.stream_type === 'pk_battle' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="p-3 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-xl shadow-orange-500/40 animate-pulse">
                  <Swords className="w-6 h-6 text-white" />
                </div>
              </div>
            )}

            {/* Bottom Info */}
            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
              <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">
                {stream.title}
              </h3>
              <div className="flex items-center gap-2">
                <AvatarWithStatus
                  src={creator?.avatar_url}
                  alt={creator?.display_name}
                  size="sm"
                  status="live"
                  verified={creator?.is_verified}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-white/80 text-xs truncate">
                      {creator?.display_name || 'Legionnaire'}
                    </span>
                    {creator?.is_verified && (
                      <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
});

export default PremiumStreamCard;