import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Crown, Users, Heart, Plus, Check, X, Eye } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ViewerTopBar({
  creator,
  stream,
  isFollowing = false,
  onFollowClick,
  onClose,
  viewerCount = 0,
  className = ''
}) {
  if (!creator) return null;

  return (
    <div className={`absolute top-0 left-0 right-0 z-30 ${className}`}>
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        {/* Left: Close + Creator info */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 active:scale-90 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>

          <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)}>
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full pl-0.5 pr-2.5 py-0.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-red-500/50">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                      {creator.display_name?.[0] || '?'}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-[1.5px] border-black" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-white font-semibold text-xs max-w-[80px] truncate">
                    {creator.display_name}
                  </span>
                  {creator.is_verified && <Crown className="w-3 h-3 text-amber-400" />}
                </div>
              </div>
            </div>
          </Link>

          <motion.button
            onClick={onFollowClick}
            className={`h-7 px-3 rounded-full flex items-center gap-1 text-[11px] font-semibold ${
              isFollowing
                ? 'bg-white/10 text-white/60'
                : 'bg-red-500 text-white'
            }`}
            whileTap={{ scale: 0.9 }}
          >
            {isFollowing ? (
              <><Check className="w-3 h-3" /> Following</>
            ) : (
              <><Plus className="w-3 h-3" /> Follow</>
            )}
          </motion.button>
        </div>

        {/* Right: Viewer count */}
        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1">
          <Eye className="w-3 h-3 text-white/50" />
          <span className="text-white text-[11px] font-medium">{viewerCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}