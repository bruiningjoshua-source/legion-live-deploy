import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Heart, Share2, MessageCircle, ShoppingBag } from 'lucide-react';

export default function StreamActionBar({
  onGiftClick,
  onLikeClick,
  onShareClick,
  onChatToggle,
  isLiked = false,
  likeCount = 0,
  giftDisabled = false,
  showChat = true,
  className = ''
}) {
  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className={`absolute right-3 bottom-20 z-30 flex flex-col items-center gap-4 ${className}`}>
      {/* Gift - Primary CTA */}
      <motion.button
        onClick={onGiftClick}
        disabled={giftDisabled}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl ${
          giftDisabled
            ? 'bg-gray-600/50'
            : 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-500'
        } active:scale-90 transition-transform`}
        whileTap={giftDisabled ? {} : { scale: 0.85 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
      >
        <Gift className="w-7 h-7 text-white" />
        {!giftDisabled && (
          <motion.div
            className="absolute -inset-1 rounded-full border-2 border-amber-400/50"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Like */}
      <motion.div className="flex flex-col items-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <motion.button
          onClick={onLikeClick}
          className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${
            isLiked ? 'bg-red-500/80' : 'bg-black/40 border border-white/10'
          }`}
          whileTap={{ scale: 0.8 }}
        >
          <Heart className={`w-5 h-5 text-white ${isLiked ? 'fill-current' : ''}`} />
        </motion.button>
        {likeCount > 0 && (
          <span className="text-white text-[10px] font-bold mt-1 drop-shadow">{formatCount(likeCount)}</span>
        )}
      </motion.div>

      {/* Chat toggle */}
      <motion.button
        onClick={onChatToggle}
        className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm ${
          showChat ? 'bg-white/20 border border-white/20' : 'bg-black/40 border border-white/10'
        }`}
        whileTap={{ scale: 0.8 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <MessageCircle className="w-5 h-5 text-white" />
      </motion.button>

      {/* Share */}
      <motion.button
        onClick={onShareClick}
        className="w-11 h-11 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm flex items-center justify-center"
        whileTap={{ scale: 0.8 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <Share2 className="w-5 h-5 text-white" />
      </motion.button>
    </div>
  );
}