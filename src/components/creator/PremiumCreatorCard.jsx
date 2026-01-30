import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Crown, Users, Radio } from 'lucide-react';
import AvatarWithStatus from '@/components/shared/AvatarWithStatus';
import GlassCard from '@/components/shared/GlassCard';
import { cn } from "@/lib/utils";

const PremiumCreatorCard = memo(function PremiumCreatorCard({ creator, index = 0 }) {
  const formatCount = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n?.toLocaleString() || '0';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
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
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
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