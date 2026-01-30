import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Heart, Share2, UserPlus } from 'lucide-react';

export default function BigoActionBar({ 
  onGiftClick,
  onLikeClick,
  onShareClick,
  onFollowClick,
  isLiked = false,
  isFollowing = false,
  likeCount = 0,
  giftDisabled = false,
  className = ''
}) {
  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const actions = [
    { 
      id: 'gift', 
      icon: Gift, 
      bg: giftDisabled ? 'bg-gray-500/50' : 'bg-gradient-to-br from-amber-500 to-orange-600',
      onClick: onGiftClick, 
      primary: true,
      label: 'Gift',
      disabled: giftDisabled
    },
    { 
      id: 'follow', 
      icon: UserPlus, 
      bg: isFollowing ? 'bg-emerald-500' : 'bg-blue-500',
      onClick: onFollowClick,
      label: isFollowing ? 'Following' : 'Follow'
    },
    { 
      id: 'like', 
      icon: Heart, 
      bg: isLiked ? 'bg-red-500' : 'bg-black/50',
      onClick: onLikeClick, 
      count: likeCount, 
      filled: isLiked,
      label: 'Like'
    },
    { 
      id: 'share', 
      icon: Share2, 
      bg: 'bg-black/50',
      onClick: onShareClick,
      label: 'Share'
    },
  ];

  return (
    <div className={`absolute right-2 bottom-24 z-30 flex flex-col items-center gap-3 ${className}`}>
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.id}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="flex flex-col items-center"
          >
            <motion.button
              onClick={action.onClick}
              disabled={action.disabled}
              className={`${action.primary ? 'w-14 h-14' : 'w-12 h-12'} rounded-full ${action.bg} backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20 active:scale-90 transition-transform ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              whileTap={action.disabled ? {} : { scale: 0.9 }}
            >
              <Icon className={`${action.primary ? 'w-7 h-7' : 'w-6 h-6'} ${action.filled ? 'fill-current' : ''} text-white`} />
            </motion.button>
            {action.count !== undefined && action.count > 0 && (
              <span className="text-white text-xs mt-1 font-bold drop-shadow-lg">
                {formatCount(action.count)}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}