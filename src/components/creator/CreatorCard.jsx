import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import formatCount from '@/components/shared/FormatCount';

export default function CreatorCard({ creator, onFollow, isFollowing }) {
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, []);
  const levelBadges = {
    1: { label: 'Recruit', color: 'bg-stone-500' },
    5: { label: 'Legionary', color: 'bg-green-600' },
    10: { label: 'Decanus', color: 'bg-blue-600' },
    20: { label: 'Centurion', color: 'bg-purple-600' },
    35: { label: 'Praetor', color: 'bg-amber-500' },
    50: { label: 'Consul', color: 'bg-rose-500' },
    75: { label: 'Imperator', color: 'bg-gradient-to-r from-amber-400 to-rose-500' }
  };

  const getLevelBadge = (level) => {
    const thresholds = Object.keys(levelBadges).map(Number).sort((a, b) => b - a);
    const threshold = thresholds.find(t => level >= t) || 1;
    return levelBadges[threshold];
  };

  const badge = getLevelBadge(creator.level || 1);

  return (
    <motion.div
      whileHover={isMobile ? {} : { y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)}>
        <div className="relative group cursor-pointer bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl border border-amber-600/20 overflow-hidden hover:border-amber-500/50 transition-all">
          {/* Live indicator - pulsing red overlaid on avatar */}
          {creator.is_live && (
            <div className="absolute top-3 right-3 z-10">
              <Badge className="bg-red-500 text-white border-0 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-100" />
                </span>
                LIVE
              </Badge>
            </div>
          )}

          {/* Avatar Section */}
          <div className="relative h-32 bg-gradient-to-br from-amber-900/50 to-stone-900 flex items-center justify-center">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
            </div>
            
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1">
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-800">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                  )}
                </div>
              </div>
              
              {/* Level Badge */}
              <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${badge.color} rounded-full px-2.5 py-0.5`}>
                <span className="text-white text-[10px] font-bold">Lv.{creator.level || 1}</span>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-amber-100 font-bold text-lg truncate">{creator.display_name}</h3>
              {creator.is_verified && (
                <Crown className="w-4 h-4 text-amber-400" />
              )}
            </div>

            <p className="text-amber-400/70 text-xs text-center capitalize mb-3">
              {creator.category?.replace('_', ' ') || 'Content Creator'}
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 text-sm mb-4">
              <div className="text-center">
                <p className="text-amber-100 font-bold">{formatCount(creator.follower_count)}</p>
                <p className="text-amber-400/60 text-xs">Followers</p>
              </div>
              <div className="w-px h-8 bg-amber-600/20" />
              <div className="text-center">
                <p className="text-amber-100 font-bold">{formatCount(creator.pk_wins)}</p>
                <p className="text-amber-400/60 text-xs">PK Wins</p>
              </div>
              {(creator.total_earnings_denarii || 0) > 0 && (
                <>
                  <div className="w-px h-8 bg-amber-600/20" />
                  <div className="text-center">
                    <p className="text-amber-100 font-bold">{formatCount(creator.total_earnings_denarii)}</p>
                    <p className="text-amber-400/60 text-xs">Denarii</p>
                  </div>
                </>
              )}
            </div>

            {/* Follow Button */}
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFollow?.(creator);
              }}
              variant={isFollowing ? "outline" : "default"}
              className={isFollowing 
                ? "w-full border-amber-500 text-amber-400 hover:bg-amber-900/30" 
                : "w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}