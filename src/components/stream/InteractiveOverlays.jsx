import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  ExternalLink, 
  X,
  Sparkles,
  Zap,
  Star,
  ChevronRight
} from 'lucide-react';

// Clickable Product Overlay
export function ProductOverlay({ product, position = 'bottom-right', onClose }) {
  const [expanded, setExpanded] = useState(false);

  if (!product) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`absolute ${
          position === 'bottom-right' ? 'bottom-24 right-4' :
          position === 'bottom-left' ? 'bottom-24 left-4' :
          position === 'top-right' ? 'top-24 right-4' : 'top-24 left-4'
        } z-30`}
      >
        <motion.div
          className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden cursor-pointer"
          whileHover={{ scale: 1.02 }}
          onClick={() => setExpanded(!expanded)}
        >
          {/* Compact View */}
          <div className="flex items-center gap-3 p-3">
            <div className="w-14 h-14 rounded-xl bg-white/10 overflow-hidden shrink-0">
              {product.image_url ? (
                <img src={product.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white/40" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{product.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">${product.price}</span>
                {product.original_price && (
                  <span className="text-white/40 line-through text-xs">${product.original_price}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-pink-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium">Featured</span>
            </div>
          </div>

          {/* Expanded View */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/10"
              >
                <div className="p-3 space-y-3">
                  <p className="text-white/60 text-xs line-clamp-2">{product.description}</p>
                  <a 
                    href={product.affiliate_link || product.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-white text-sm font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Buy Now
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Quick Reaction Overlay
export function QuickReactionOverlay({ onReact, reactions = [] }) {
  const [showAll, setShowAll] = useState(false);
  const defaultReactions = ['❤️', '🔥', '😂', '👏', '💀', '😮'];
  const displayReactions = showAll ? [...defaultReactions, '🎉', '💯', '🙌', '💕', '⚡', '🌟'] : defaultReactions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 bg-black/60 backdrop-blur-xl rounded-full px-2 py-1.5"
    >
      {displayReactions.map((emoji) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.3, y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onReact(emoji)}
          className="text-xl p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          {emoji}
        </motion.button>
      ))}
      <button 
        onClick={() => setShowAll(!showAll)}
        className="p-1 text-white/40 hover:text-white"
      >
        <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
      </button>
    </motion.div>
  );
}

// Floating Reaction Animation
export function FloatingReaction({ emoji, onComplete }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ 
        opacity: 0, 
        y: -200 + Math.random() * 100,
        x: Math.random() * 100 - 50,
        scale: 1.5 
      }}
      transition={{ duration: 2, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
      className="absolute bottom-32 right-20 text-4xl pointer-events-none z-50"
    >
      {emoji}
    </motion.div>
  );
}

// Goal Progress Overlay
export function GoalProgressOverlay({ goal, onContribute }) {
  if (!goal) return null;
  
  const progress = Math.min((goal.current_amount / goal.goal_amount) * 100, 100);
  const isComplete = progress >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-24 left-4 z-20 w-72"
    >
      <div className={`bg-black/70 backdrop-blur-xl rounded-xl border ${
        isComplete ? 'border-emerald-500/50' : 'border-amber-500/30'
      } p-3`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isComplete ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
              {isComplete ? (
                <Star className="w-4 h-4 text-emerald-400" />
              ) : (
                <Zap className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <span className="text-white text-sm font-medium">{goal.title}</span>
          </div>
          {isComplete && (
            <span className="text-emerald-400 text-xs font-bold">COMPLETE!</span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${
              isComplete 
                ? 'bg-gradient-to-r from-emerald-400 to-green-500' 
                : 'bg-gradient-to-r from-amber-400 to-orange-500'
            }`}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60">
            🪙 {goal.current_amount?.toLocaleString()} / {goal.goal_amount?.toLocaleString()}
          </span>
          <span className="text-amber-400 font-medium">{Math.round(progress)}%</span>
        </div>

        {goal.reward_description && (
          <p className="text-white/40 text-xs mt-2 line-clamp-1">
            🎁 {goal.reward_description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// Co-Stream Invite Overlay
export function CoStreamInviteOverlay({ invites = [], onAccept, onDecline }) {
  if (invites.length === 0) return null;

  return (
    <AnimatePresence>
      {invites.map((invite) => (
        <motion.div
          key={invite.id}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-gradient-to-r from-purple-500/90 to-pink-500/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 overflow-hidden">
                {invite.creator_avatar ? (
                  <img src={invite.creator_avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xl">👤</div>
                )}
              </div>
              <div>
                <p className="text-white font-semibold">{invite.creator_name}</p>
                <p className="text-white/70 text-sm">Invites you to co-stream!</p>
              </div>
              <div className="flex gap-2 ml-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onAccept(invite)}
                  className="px-4 py-2 bg-white text-purple-600 rounded-xl font-medium"
                >
                  Join
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onDecline(invite)}
                  className="px-4 py-2 bg-white/20 text-white rounded-xl"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

export default {
  ProductOverlay,
  QuickReactionOverlay,
  FloatingReaction,
  GoalProgressOverlay,
  CoStreamInviteOverlay
};