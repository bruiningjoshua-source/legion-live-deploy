import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Crown, Plus, Check, X, Share2, Flag, UserPlus, MoreHorizontal } from 'lucide-react';
import VIPBadge from '@/components/stream/VIPBadge';

export default function ViewerTopBar({
  creator,
  stream,
  isFollowing = false,
  onFollowClick,
  onClose,
  viewerCount = 0,
  userVipPoints = 0,
  className = ''
}) {
  const [showMenu, setShowMenu] = useState(false);

  if (!creator) return null;

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: stream?.title, url });
    else navigator.clipboard.writeText(url).then(() => {});
    setShowMenu(false);
  };

  return (
    <div className={`absolute top-0 left-0 right-0 z-30 ${className}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Row 1: Close + creator + follow | viewer count + menu */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">

        {/* LEFT */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="w-9 h-9 bg-black/50 backdrop-blur-md border border-white/15 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shrink-0"
          >
            <X className="w-4 h-4" />
          </button>

          <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)}>
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full pl-0.5 pr-2.5 py-0.5 border border-white/10">
              <div className="relative">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-red-500/70">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                      {creator.display_name?.[0] || '?'}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-[1.5px] border-black animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-white font-semibold text-[11px] max-w-[72px] truncate">{creator.display_name}</span>
                  {creator.is_verified && <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                </div>
                {userVipPoints > 0 && <VIPBadge vipPoints={userVipPoints} size="xs" />}
              </div>
            </div>
          </Link>

          <motion.button
            onClick={onFollowClick}
            className={`h-7 px-3 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all ${
              isFollowing
                ? 'bg-white/10 text-white/60 border border-white/20'
                : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
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

        {/* RIGHT: viewer count pill + more menu */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-bold text-xs tabular-nums">{viewerCount.toLocaleString()}</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 bg-black/50 backdrop-blur-md border border-white/15 rounded-full flex items-center justify-center text-white/70"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 z-50 bg-black/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden min-w-[160px]"
                  >
                    {[
                      { icon: Share2, label: 'Share Stream', action: handleShare },
                      { icon: UserPlus, label: 'View Profile', action: () => { setShowMenu(false); window.location.href = createPageUrl(`CreatorProfile?id=${creator.id}`); } },
                      { icon: Flag, label: 'Report', action: () => setShowMenu(false), danger: true },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={item.action}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5 ${
                          item.danger ? 'text-red-400' : 'text-white/80'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Row 2: Room Rank chip + stream title + avatar stack */}
      <div className="flex items-center justify-between px-3 mt-1 pb-1">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1 border border-white/[0.08]">
            <span className="text-[10px]">🏠</span>
            <span className="text-white/70 text-[10px] font-medium">Room Rank</span>
          </div>
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1 border border-white/[0.08]">
            <span className="text-[10px]">⭐</span>
            <span className="text-white/70 text-[10px] font-medium truncate max-w-[80px]">
              {stream?.title ? stream.title.slice(0, 14) : "Today's task"}
            </span>
          </div>
        </div>

        <div className="flex items-center">
          <div className="flex -space-x-2 mr-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-[1.5px] border-black bg-gradient-to-br from-slate-500 to-slate-700 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-amber-400/60 to-amber-600/60" />
              </div>
            ))}
          </div>
          <span className="text-white/60 text-[11px] font-semibold">{viewerCount.toLocaleString()}</span>
        </div>
      </div>

    </div>
  );
}