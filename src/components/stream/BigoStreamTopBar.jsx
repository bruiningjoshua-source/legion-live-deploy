import React from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Check } from 'lucide-react';

// Row 1: [avatar+name+badges+follow] ... [viewer avatars + count + X]
// Row 2: [⭐ 0/50] ... [ID:username]

export default function BigoStreamTopBar({
  creator,
  stream,
  user,
  isHost,
  isFollowing,
  onFollowClick,
  onClose,
  viewerCount = 0,
  onAvatarClick,
}) {
  if (!creator) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-30" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
      {/* Row 1 */}
      <div className="flex items-center justify-between px-3 pb-1">
        {/* Left: avatar + name + follow */}
        <div className="flex items-center gap-1.5">
          <button onClick={onAvatarClick} className="relative shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-amber-500/70 bg-black">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                  {creator.display_name?.[0] || '?'}
                </div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-xs max-w-[80px] truncate">{creator.display_name || 'Creator'}</span>
              {creator.is_verified && <span className="text-[10px]">👑</span>}
            </div>
            <span className="text-green-400 text-[9px] leading-none">● {creator.follower_count || 0}</span>
          </div>

          {!isHost && (
            <motion.button
              onClick={onFollowClick}
              whileTap={{ scale: 0.9 }}
              className={`h-7 rounded-full flex items-center justify-center transition-all ${
                isFollowing
                  ? 'w-7 bg-white/10 border border-white/20'
                  : 'px-2 bg-[#00d4aa] shadow-lg shadow-[#00d4aa]/30'
              }`}
            >
              {isFollowing ? (
                <Check className="w-3.5 h-3.5 text-white/60" />
              ) : (
                <Plus className="w-4 h-4 text-white" />
              )}
            </motion.button>
          )}
        </div>

        {/* Right: viewer avatars + count + X */}
        <div className="flex items-center gap-1.5">
          {/* Viewer avatar stack */}
          <div className="flex -space-x-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border border-black bg-gradient-to-br from-slate-500 to-slate-700 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-amber-400/60 to-pink-500/60" />
              </div>
            ))}
          </div>
          <span className="text-white font-bold text-xs tabular-nums min-w-[20px]">{viewerCount}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur border border-white/15 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Row 2 */}
      <div className="flex items-center justify-between px-3 mt-0.5">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/[0.08]">
            <span className="text-[10px]">⭐</span>
            <span className="text-white/70 text-[10px] font-medium">0/50</span>
          </div>
          {stream?.category && (
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/[0.08]">
              <span className="text-amber-400 text-[10px] font-medium uppercase">{stream.category}</span>
            </div>
          )}
        </div>
        <span className="text-white/30 text-[10px] font-mono">ID:{creator.display_name?.replace(/\s/g, '') || 'user'}</span>
      </div>
    </div>
  );
}