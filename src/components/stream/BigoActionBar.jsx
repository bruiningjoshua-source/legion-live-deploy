import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Heart, Share2, MessageCircle, MoreVertical, Coins } from 'lucide-react';

export default function BigoActionBar({ 
  onGiftClick,
  onLikeClick,
  onShareClick,
  onCommentClick,
  onMoreClick,
  isLiked = false,
  likeCount = 0,
  className = ''
}) {
  const actions = [
    { id: 'gift', icon: Gift, color: 'from-amber-500 to-orange-500', onClick: onGiftClick, primary: true },
    { id: 'like', icon: Heart, color: isLiked ? 'from-red-500 to-pink-500' : 'from-white/20 to-white/10', onClick: onLikeClick, count: likeCount, filled: isLiked },
    { id: 'share', icon: Share2, color: 'from-white/20 to-white/10', onClick: onShareClick },
    { id: 'comment', icon: MessageCircle, color: 'from-white/20 to-white/10', onClick: onCommentClick },
    { id: 'more', icon: MoreVertical, color: 'from-white/20 to-white/10', onClick: onMoreClick },
  ];

  return (
    <div className={`absolute right-4 bottom-24 z-30 flex flex-col items-center gap-3 ${className}`}>
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.id}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="flex flex-col items-center"
          >
            <motion.button
              onClick={action.onClick}
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${action.color} backdrop-blur-md flex items-center justify-center shadow-lg ${
                action.primary ? 'ring-2 ring-amber-400/50' : ''
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Icon className={`w-5 h-5 ${action.filled ? 'fill-current' : ''} text-white`} />
            </motion.button>
            {action.count !== undefined && action.count > 0 && (
              <span className="text-white text-xs mt-1 font-medium">
                {action.count > 999 ? `${(action.count / 1000).toFixed(1)}k` : action.count}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}