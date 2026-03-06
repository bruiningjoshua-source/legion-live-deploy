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
    <div className={`absolute right-3 bottom-20 z-30 flex flex-col items-center gap-3 ${className}`}>
      {/* Gift */}
      <motion.button
        onClick={onGiftClick}
        disabled={giftDisabled}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
          giftDisabled ? 'bg-white/10' : 'bg-gradient-to-br from-amber-400 to-orange-500'
        }`}
        whileTap={giftDisabled ? {} : { scale: 0.85 }}
      >
        <Gift className={`w-6 h-6 ${giftDisabled ? 'text-white/30' : 'text-white'}`} />
      </motion.button>

      {/* Like */}
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onLikeClick}
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isLiked ? 'bg-red-500' : 'bg-black/40 border border-white/10'
          }`}
          whileTap={{ scale: 0.8 }}
        >
          <Heart className={`w-5 h-5 text-white ${isLiked ? 'fill-current' : ''}`} />
        </motion.button>
        {likeCount > 0 && (
          <span className="text-white/70 text-[10px] font-medium mt-0.5">{formatCount(likeCount)}</span>
        )}
      </div>

      {/* Chat */}
      <motion.button
        onClick={onChatToggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          showChat ? 'bg-white/15' : 'bg-black/40 border border-white/10'
        }`}
        whileTap={{ scale: 0.8 }}
      >
        <MessageCircle className="w-5 h-5 text-white" />
      </motion.button>

      {/* Share */}
      <motion.button
        onClick={onShareClick}
        className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center"
        whileTap={{ scale: 0.8 }}
      >
        <Share2 className="w-5 h-5 text-white" />
      </motion.button>
    </div>
  );
}