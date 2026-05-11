import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Crown, Users, Radio } from 'lucide-react';
import AvatarWithStatus from '@/components/shared/AvatarWithStatus';
import GlassCard from '@/components/shared/GlassCard';
import formatCount from '@/components/shared/FormatCount';

const PremiumCreatorCard = memo(function PremiumCreatorCard({ creator, index = 0 }) {
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: Math.min(index * 0.03, 0.2),
        ease: 'easeOut'
      }}
      className={isMobile ? '' : 'hover:-translate-y-1 transition-transform duration-200'}
    >
      <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)}>
        <GlassCard 
          padding="p-0" 
          className="group overflow-hidden"
          animate={false}
          glowColor={creator.is_live ? 'red' : 'amber'}
        >
          {/* Banner/Background */}
          <div className="relative h-24 overflow-hidden">
            {creator.avatar_url ? (
              <img 
                src={creator.avatar_url}
                alt=""
                className="w-full h-full object-cover blur-md scale-110 opacity-50"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-600/30 to-purple-600/30" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            
            {/* Live indicator */}
            {creator.is_live && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 rounded-md text-[10px] font-bold text-white flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                LIVE
              </div>
            )}
          </div>

          {/* Content */}
          <div className="relative px-4 pb-4 -mt-10">
            {/* Avatar */}
            <div className="flex justify-center mb-3">
              <AvatarWithStatus
                src={creator.avatar_url}
                alt={creator.display_name}
                size="xl"
                status={creator.is_live ? 'live' : undefined}
                verified={creator.is_verified}
                vip={creator.level >= 10}
                borderColor={creator.is_live ? 'red' : 'amber'}
              />
            </div>

            {/* Name */}
            <div className="text-center mb-3">
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="text-white font-semibold truncate">
                  {creator.display_name}
                </h3>
                {creator.is_verified && (
                  <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
              </div>
              <p className="text-white/50 text-xs capitalize mt-0.5">
                {creator.category?.replace('_', ' ') || 'Creator'}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-white/70">
                <Users className="w-3.5 h-3.5" />
                <span className="font-medium">{formatCount(creator.follower_count)}</span>
              </div>
              {creator.is_live && (
                <div className="flex items-center gap-1 text-red-400">
                  <Radio className="w-3.5 h-3.5" />
                  <span className="font-medium">Live Now</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  );
});

export default PremiumCreatorCard;