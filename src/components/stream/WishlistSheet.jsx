import React from 'react';
import { motion } from 'framer-motion';
import { X, Send } from 'lucide-react';

// "Wishes of HOST" panel — shows creator's wish gifts with progress

export default function WishlistSheet({ creator, gifts = [], onClose, onSendGift }) {
  // Pick 3 random gifts as wish items (in production this would be creator-configured)
  const wishGifts = gifts
    .filter(g => g.is_active !== false && g.cost_denarii >= 50)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

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
        <div className="flex justify-center pt-3 pb-3">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="text-center pb-4">
          <h3 className="text-white font-bold text-base">
            Wishes of {creator?.display_name || 'Host'} 👑
          </h3>
          <p className="text-white/30 text-xs mt-0.5">The wishlist will expire after the broadcast ends</p>
        </div>

        {/* Wish gift cards */}
        <div className="flex gap-3 px-4 pb-5 overflow-x-auto scrollbar-hide">
          {wishGifts.map(gift => (
            <div key={gift.id} className="flex-shrink-0 w-28 bg-white/[0.05] border border-white/10 rounded-2xl p-3 flex flex-col items-center">
              <span className="text-3xl mb-1">{gift.icon}</span>
              <p className="text-white text-xs font-semibold text-center line-clamp-1 mb-0.5">{gift.name}</p>
              <p className="text-amber-400 text-[10px] mb-2">❤️ {gift.cost_denarii}</p>
              <div className="text-white/30 text-[10px] mb-2">0/10</div>
              <button
                onClick={() => onSendGift?.(gift)}
                className="w-full py-1.5 rounded-lg bg-[#00d4aa] text-white text-xs font-bold active:scale-95 transition-transform"
              >
                Send
              </button>
            </div>
          ))}
        </div>

        {/* Supporter icons */}
        <div className="flex items-center justify-center gap-3 pb-3">
          {[
            { ring: 'border-gray-400', icon: '🥈' },
            { ring: 'border-amber-400', icon: '🥇' },
            { ring: 'border-orange-400', icon: '🥉' },
          ].map((s, i) => (
            <div key={i} className={`w-10 h-10 rounded-full border-2 ${s.ring} bg-white/5 flex items-center justify-center`}>
              <span className="text-sm opacity-40">?</span>
            </div>
          ))}
        </div>
        <p className="text-center text-white/25 text-[10px] pb-2">Send a wish gift so that I can see you on the list</p>
      </motion.div>
    </>
  );
}