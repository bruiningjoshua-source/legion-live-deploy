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
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        {/* Left: Close + Creator info */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-9 h-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>

          <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)}>
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full pl-1 pr-3 py-1">
              {/* Avatar */}
              <div className="relative">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-pink-500/60">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                      {creator.display_name?.[0] || '?'}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border border-black" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-white font-semibold text-xs max-w-[90px] truncate">
                    {creator.display_name}
                  </span>
                  {creator.is_verified && <Crown className="w-3 h-3 text-amber-400" />}
                </div>
                <span className="text-white/50 text-[10px]">
                  Lv.{creator.level || 1}
                </span>
              </div>
            </div>
          </Link>

          {/* Follow button */}
          <motion.button
            onClick={onFollowClick}
            className={`h-7 px-3 rounded-full flex items-center justify-center gap-1 text-xs font-semibold transition-colors ${
              isFollowing
                ? 'bg-white/15 text-white/70'
                : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
            }`}
            whileTap={{ scale: 0.9 }}
          >
            {isFollowing ? (
              <>
                <Check className="w-3 h-3" />
                <span>Following</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>Follow</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Right: Viewer count */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5">
            <Eye className="w-3.5 h-3.5 text-white/60" />
            <span className="text-white text-xs font-medium">{viewerCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Stream title marquee */}
      {stream?.title && (
        <div className="px-3 pb-1">
          <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-sm rounded-full px-2.5 py-0.5">
            <Badge className="bg-red-500 text-white border-0 text-[9px] h-3.5 px-1.5 rounded-full">
              LIVE
            </Badge>
            <span className="text-white/70 text-[11px] max-w-[220px] truncate">
              {stream.title}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}