import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Crown, Users, Heart, Plus, Check } from 'lucide-react';

export default function BigoCreatorInfo({ 
  creator, 
  stream,
  isFollowing = false,
  onFollowClick,
  viewerCount = 0,
  className = ''
}) {
  if (!creator) return null;

  return (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`absolute top-4 left-4 z-30 ${className}`}
    >
      <div className="flex items-center gap-2">
        {/* Avatar with LIVE ring */}
        <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)}>
          <div className="relative">
            <motion.div 
              className="w-12 h-12 rounded-full p-[2px]"
              style={{ 
                background: 'linear-gradient(135deg, #f43f5e, #ec4899, #a855f7)' 
              }}
              animate={{ 
                boxShadow: [
                  '0 0 0px rgba(244, 63, 94, 0)',
                  '0 0 15px rgba(244, 63, 94, 0.5)',
                  '0 0 0px rgba(244, 63, 94, 0)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-black">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-amber-500 to-orange-600">
                    {creator.display_name?.[0] || '?'}
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* Level badge */}
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shadow-lg">
              Lv.{creator.level || 1}
            </div>
          </div>
        </Link>

        {/* Info card */}
        <div className="bg-black/40 backdrop-blur-md rounded-full pl-2 pr-1 py-1 flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-white font-semibold text-sm max-w-[100px] truncate">
                {creator.display_name}
              </span>
              {creator.is_verified && (
                <Crown className="w-3 h-3 text-amber-400" />
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/70">
              <span className="flex items-center gap-0.5">
                <Users className="w-2.5 h-2.5" />
                {viewerCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-0.5">
                <Heart className="w-2.5 h-2.5" />
                {(creator.follower_count || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Follow button */}
          <motion.button
            onClick={onFollowClick}
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isFollowing 
                ? 'bg-white/20' 
                : 'bg-gradient-to-r from-pink-500 to-rose-500'
            }`}
            whileTap={{ scale: 0.9 }}
          >
            {isFollowing ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Plus className="w-3.5 h-3.5 text-white" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Stream title */}
      {stream?.title && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-2 ml-1"
        >
          <div className="inline-flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
            <Badge className="bg-red-500 text-white border-0 text-[10px] h-4 px-1.5">
              LIVE
            </Badge>
            <span className="text-white/90 text-xs max-w-[200px] truncate">
              {stream.title}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}