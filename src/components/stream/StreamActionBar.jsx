import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Heart, Share2, MessageCircle, Ticket, TrendingUp, ChevronUp } from 'lucide-react';

// ── BigO Live-style Right-side Action Bar ────────────────────────────────
// Vertical stack of action buttons on right side of stream
// Gift (primary, big), Like, Chat toggle, Share, Lotto
// Expandable "More" tray for secondary actions
// ─────────────────────────────────────────────────────────────────────────

export default function StreamActionBar({
  onGiftClick,
  onLikeClick,
  onShareClick,
  onChatToggle,
  onLottoClick,
  onLeaderboardClick,
  isLiked = false,
  likeCount = 0,
  giftDisabled = false,
  showChat = true,
  hasActiveLotto = false,
  className = ''
}) {
  const [showMore, setShowMore] = useState(false);

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className={`absolute right-2 bottom-24 z-30 flex flex-col items-center gap-3 ${className}`}>

      {/* More tray — slides up */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col items-center gap-2 mb-1"
          >
            {/* Leaderboard */}
            {onLeaderboardClick && (
              <ActionButton
                onClick={onLeaderboardClick}
                icon={TrendingUp}
                label="Rank"
                color="bg-amber-500/20 border border-amber-500/30"
                iconColor="text-amber-400"
              />
            )}
            {/* Lotto */}
            {onLottoClick && (
              <ActionButton
                onClick={onLottoClick}
                icon={Ticket}
                label="Lotto"
                color={hasActiveLotto ? "bg-amber-500 shadow-lg shadow-amber-500/40" : "bg-black/50 border border-white/15"}
                iconColor={hasActiveLotto ? "text-white" : "text-amber-400"}
                pulse={hasActiveLotto}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* More toggle */}
      <motion.button
        onClick={() => setShowMore(!showMore)}
        className="w-9 h-9 rounded-full bg-black/50 border border-white/15 flex items-center justify-center"
        whileTap={{ scale: 0.85 }}
        animate={{ rotate: showMore ? 180 : 0 }}
      >
        <ChevronUp className="w-4 h-4 text-white/60" />
      </motion.button>

      {/* Share */}
      <ActionButton
        onClick={onShareClick}
        icon={Share2}
        label="Share"
        color="bg-black/50 border border-white/15"
        iconColor="text-white/70"
      />

      {/* Chat toggle */}
      <ActionButton
        onClick={onChatToggle}
        icon={MessageCircle}
        label={showChat ? 'Hide' : 'Chat'}
        color={showChat ? 'bg-white/15 border border-white/25' : 'bg-black/50 border border-white/15'}
        iconColor="text-white"
      />

      {/* Like */}
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onLikeClick}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            isLiked ? 'bg-red-500 shadow-lg shadow-red-500/40' : 'bg-black/50 border border-white/15'
          }`}
          whileTap={{ scale: 0.8 }}
          animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Heart className={`w-5 h-5 text-white ${isLiked ? 'fill-current' : ''}`} />
        </motion.button>
        {likeCount > 0 && (
          <span className="text-white/60 text-[10px] font-medium mt-0.5">{formatCount(likeCount)}</span>
        )}
      </div>

      {/* Gift — primary action, biggest button */}
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onGiftClick}
          disabled={giftDisabled}
          className={`w-13 h-13 rounded-full flex items-center justify-center shadow-xl relative overflow-hidden ${
            giftDisabled
              ? 'bg-white/10 border border-white/10'
              : 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 shadow-amber-500/40'
          }`}
          style={{ width: 52, height: 52 }}
          whileTap={giftDisabled ? {} : { scale: 0.85 }}
          whileHover={giftDisabled ? {} : { scale: 1.05 }}
        >
          {!giftDisabled && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
          )}
          <Gift className={`w-6 h-6 ${giftDisabled ? 'text-white/30' : 'text-white'} relative z-10`} />
        </motion.button>
        <span className="text-white/50 text-[10px] font-medium mt-0.5">Gift</span>
      </div>
    </div>
  );
}

function ActionButton({ onClick, icon: Icon, label, color, iconColor, pulse = false }) {
  return (
    <div className="flex flex-col items-center">
      <motion.button
        onClick={onClick}
        className={`w-10 h-10 rounded-full flex items-center justify-center relative ${color}`}
        whileTap={{ scale: 0.85 }}
      >
        {pulse && (
          <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-60" />
        )}
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </motion.button>
      {label && <span className="text-white/50 text-[9px] font-medium mt-0.5">{label}</span>}
    </div>
  );
}