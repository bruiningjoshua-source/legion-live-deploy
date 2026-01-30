import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Heart, Share2, MessageCircle, MoreHorizontal, Flag, UserPlus } from 'lucide-react';

export default function BigoActionBar({ 
  onGiftClick,
  onLikeClick,
  onShareClick,
  onCommentClick,
  onMoreClick,
  onFollowClick,
  isLiked = false,
  isFollowing = false,
  likeCount = 0,
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
      gradient: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/40',
      onClick: onGiftClick, 
      primary: true,
      label: 'Gift'
    },
    { 
      id: 'follow', 
      icon: UserPlus, 
      gradient: isFollowing ? 'from-emerald-500 to-green-500' : 'from-blue-500 to-indigo-500',
      shadow: isFollowing ? 'shadow-emerald-500/30' : 'shadow-blue-500/30',
      onClick: onFollowClick,
      label: isFollowing ? 'Following' : 'Follow'
    },
    { 
      id: 'like', 
      icon: Heart, 
      gradient: isLiked ? 'from-red-500 to-pink-500' : 'from-white/10 to-white/5',
      shadow: isLiked ? 'shadow-red-500/30' : 'shadow-black/20',
      onClick: onLikeClick, 
      count: likeCount, 
      filled: isLiked,
      label: 'Like'
    },
    { 
      id: 'comment', 
      icon: MessageCircle, 
      gradient: 'from-white/10 to-white/5',
      shadow: 'shadow-black/20',
      onClick: onCommentClick,
      label: 'Chat'
    },
    { 
      id: 'share', 
      icon: Share2, 
      gradient: 'from-white/10 to-white/5',
      shadow: 'shadow-black/20',
      onClick: onShareClick,
      label: 'Share'
    },
    { 
      id: 'more', 
      icon: MoreHorizontal, 
      gradient: 'from-white/10 to-white/5',
      shadow: 'shadow-black/20',
      onClick: onMoreClick,
      label: 'More'
    },
  ];

  return (
    <div className={`absolute right-3 bottom-28 z-30 flex flex-col items-center gap-2.5 ${className}`}>
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.id}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
            className="flex flex-col items-center"
          >
            <motion.button
              onClick={action.onClick}
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} backdrop-blur-md flex items-center justify-center shadow-lg ${action.shadow} ${
                action.primary ? 'ring-2 ring-amber-400/50 w-12 h-12' : ''
              } border border-white/10 active:scale-90 transition-transform`}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              <Icon className={`${action.primary ? 'w-6 h-6' : 'w-5 h-5'} ${action.filled ? 'fill-current' : ''} text-white`} />
            </motion.button>
            {action.count !== undefined && action.count > 0 && (
              <span className="text-white text-[10px] mt-0.5 font-semibold drop-shadow-lg">
                {formatCount(action.count)}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}