import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
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

const PremiumStreamCard = memo(function PremiumStreamCard({ stream, creator, index = 0 }) {
  const config = STREAM_TYPES[stream.stream_type] || STREAM_TYPES.solo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: Math.min(index * 0.03, 0.2), // Cap delay
        ease: 'easeOut'
      }}
      className="group hover:-translate-y-1 hover:scale-[1.02] transition-transform duration-200"
    >
      <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
        <div className={cn(
          'relative overflow-hidden rounded-2xl',
          'bg-gradient-to-br from-white/[0.08] to-white/[0.02]',
          'border border-white/10',
          'shadow-xl transition-all duration-300',
          'group-hover:border-white/20',
          `group-hover:${config.glow}`
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
              <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-900 to-black flex items-center justify-center">
                <span className="text-6xl opacity-30">🏛️</span>
              </div>
            )}

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
            
            {/* Ambient glow effect on hover */}
            <div className={cn(
              'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
              'bg-gradient-to-t from-red-500/20 via-transparent to-transparent'
            )} />

            {/* Top Bar - Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <LiveBadge type={config.badge} size="default" />
                {stream.is_featured && (
                  <LiveBadge type="featured" size="sm" pulse={false} />
                )}
              </div>
              <ViewerCount count={stream.viewer_count || 0} variant="default" />
            </div>

            {/* PK Battle Icon */}
            {stream.stream_type === 'pk_battle' && (
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="p-4 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-2xl shadow-orange-500/50">
                  <Swords className="w-8 h-8 text-white" />
                </div>
              </motion.div>
            )}

            {/* Bottom Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
              {/* Title */}
              <h3 className="text-white font-semibold text-lg leading-tight line-clamp-2 drop-shadow-lg">
                {stream.title}
              </h3>

              {/* Creator Info */}
              <div className="flex items-center gap-3">
                <AvatarWithStatus
                  src={creator?.avatar_url}
                  alt={creator?.display_name}
                  size="sm"
                  status="live"
                  verified={creator?.is_verified}
                  vip={creator?.level >= 10}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-medium text-sm truncate">
                      {creator?.display_name || 'Legionnaire'}
                    </span>
                    {creator?.is_verified && (
                      <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-white/50 text-xs capitalize">
                    {stream.category?.replace('_', ' ') || 'Live'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

export default PremiumStreamCard;