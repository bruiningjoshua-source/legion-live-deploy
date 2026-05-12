import React from 'react';
import { motion } from 'framer-motion';
import { Flag, MessageCircle, Plus, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HostProfileSheet({ creator, isFollowing, onFollowClick, onClose }) {
  if (!creator) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="fixed bottom-0 left-0 right-0 z-[101] bg-[#1a1a22] rounded-t-3xl"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Report link */}
        <button className="flex items-center gap-2 px-5 pb-3 text-white/40 text-xs">
          <Flag className="w-3.5 h-3.5" />
          REPORT
        </button>

        {/* Avatar */}
        <div className="flex flex-col items-center pb-3">
          <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-amber-500/50 mb-3">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-2xl">
                {creator.display_name?.[0] || '?'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-0.5">
            {creator.is_verified && <span className="text-sm">👑</span>}
            <span className="text-white font-bold text-lg">{creator.display_name || 'Creator'}</span>
          </div>
          <span className="text-white/30 text-xs">ID:{creator.display_name?.replace(/\s/g, '') || 'user'}</span>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center px-8">
            {creator.is_verified && (
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">Verified</span>
            )}
            <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30">Creator</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 py-3 border-t border-b border-white/[0.06] mx-5">
          <div className="text-center">
            <p className="text-white font-bold text-base">{formatCount(creator.follower_count || 0)}</p>
            <p className="text-white/40 text-[10px]">Fans</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">{formatCount(creator.following_count || 0)}</p>
            <p className="text-white/40 text-[10px]">Following</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">{formatCount(creator.total_denarii_earned || 0)}</p>
            <p className="text-white/40 text-[10px]">Denarii</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 px-5 pt-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onFollowClick}
            className={`flex-1 h-11 rounded-full flex items-center justify-center gap-2 font-bold text-sm transition-all ${
              isFollowing
                ? 'bg-white/10 border border-white/20 text-white/60'
                : 'bg-[#00d4aa] text-white shadow-lg shadow-[#00d4aa]/30'
            }`}
          >
            {isFollowing ? (
              <><Check className="w-4 h-4" /> Following</>
            ) : (
              <><Plus className="w-4 h-4" /> Follow</>
            )}
          </motion.button>

          <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)} className="flex-1">
            <button className="w-full h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center gap-2 text-white/70 font-bold text-sm active:scale-95 transition-transform">
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
          </Link>
        </div>
      </motion.div>
    </>
  );
}

function formatCount(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}