import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Smile, Gift, ShoppingBag, Share2 } from 'lucide-react';

// TikTok/BIGO Live-style bottom action bar
// Layout: [Chat input] [emoji] [share] [more]  ...  [shop] [PK] [gift]

const QUICK_EMOJIS = ['❤️', '😂', '😍', '🔥', '👏', '💯', '✨', '🎁', '🥳', '💪', '😭', '🤩'];

export default function BigoBottomBar({
  onChatToggle,
  onEmojiClick,
  onMenuClick,
  onGiftClick,
  onPKClick,
  onShopClick,
  onInboxClick,
  onShareClick,
  showChat = true,
  giftDisabled = false,
  hasPK = false,
  className = '',
}) {
  const [emojiPop, setEmojiPop] = useState(false);

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 ${className}`}
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      {/* Emoji reaction tray — TikTok style grid */}
      <AnimatePresence>
        {emojiPop && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="mx-3 mb-2 p-2 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10"
          >
            <div className="grid grid-cols-6 gap-1">
              {QUICK_EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => { onEmojiClick?.(em); setEmojiPop(false); }}
                  className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/15 flex items-center justify-center text-xl active:scale-90 transition-all"
                >
                  {em}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main bar */}
      <div className="flex items-end justify-between px-3 py-2">

        {/* LEFT: Chat input + emoji + share */}
        <div className="flex items-center gap-1.5">
          {/* Chat toggle / input opener — TikTok style pill */}
          <button
            onClick={onChatToggle}
            className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/[0.12] rounded-full px-3.5 py-2 text-white/50 text-xs active:scale-95 transition-transform"
            style={{ minWidth: 90 }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Say hi...</span>
          </button>

          {/* Emoji react */}
          <BarButton onClick={() => setEmojiPop(v => !v)} active={emojiPop}>
            <Smile className="w-[18px] h-[18px] text-white/60" />
          </BarButton>

          {/* Share */}
          <BarButton onClick={onShareClick || onMenuClick}>
            <Share2 className="w-[18px] h-[18px] text-white/60" />
          </BarButton>
        </div>

        {/* RIGHT: Shop, PK, Gift */}
        <div className="flex items-center gap-1.5">
          {/* Shop / Affiliate */}
          <BarButton onClick={onShopClick}>
            <ShoppingBag className="w-[18px] h-[18px] text-amber-400" />
          </BarButton>

          {/* PK Battle */}
          {hasPK && (
            <BarButton onClick={onPKClick} highlight>
              <span className="text-amber-300 font-black text-xs leading-none">PK</span>
            </BarButton>
          )}

          {/* Gift — primary CTA like TikTok/BIGO */}
          <motion.button
            onClick={onGiftClick}
            disabled={giftDisabled}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
              giftDisabled
                ? 'bg-white/10 border border-white/10'
                : 'bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 shadow-xl shadow-pink-500/40'
            }`}
            whileTap={giftDisabled ? {} : { scale: 0.85 }}
          >
            {!giftDisabled && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
              />
            )}
            <Gift className={`w-5 h-5 ${giftDisabled ? 'text-white/30' : 'text-white'} relative z-10`} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function BarButton({ children, onClick, active, highlight }) {
  return (
    <motion.button
      onClick={onClick}
      className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
        active
          ? 'bg-white/15 border-white/20'
          : highlight
            ? 'bg-red-500/30 border-red-500/30 shadow-lg shadow-red-500/20'
            : 'bg-black/50 border-white/[0.1]'
      }`}
      whileTap={{ scale: 0.85 }}
    >
      {children}
    </motion.button>
  );
}