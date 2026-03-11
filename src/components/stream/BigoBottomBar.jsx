import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Smile, MoreHorizontal, Gift, Swords, ShoppingBag, Mail } from 'lucide-react';

// BIGO Live-style bottom action bar
// Left: chat emoji btn, emoji react, menu (3 lines)
// Right: inbox/DM, PK battle, gift bag, gift box

export default function BigoBottomBar({
  onChatToggle,
  onEmojiClick,
  onMenuClick,
  onGiftClick,
  onPKClick,
  onShopClick,
  onInboxClick,
  showChat = true,
  giftDisabled = false,
  hasPK = false,
  className = '',
}) {
  const [emojiPop, setEmojiPop] = useState(false);

  const QUICK_EMOJIS = ['❤️', '😂', '😍', '🔥', '👏', '💯', '✨', '🎁'];

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 ${className}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Emoji tray */}
      <AnimatePresence>
        {emojiPop && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="flex gap-2 px-4 pb-2 pointer-events-auto"
          >
            {QUICK_EMOJIS.map(em => (
              <button
                key={em}
                onClick={() => { onEmojiClick?.(em); setEmojiPop(false); }}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-lg active:scale-90 transition-transform"
              >
                {em}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40 backdrop-blur-md border-t border-white/[0.06]">

        {/* LEFT: Chat input trigger + emoji + menu */}
        <div className="flex items-center gap-2">
          {/* Chat toggle / input opener */}
          <button
            onClick={onChatToggle}
            className="flex items-center gap-1.5 bg-black/40 border border-white/15 rounded-full px-3 py-1.5 text-white/60 text-xs backdrop-blur-md active:scale-95 transition-transform"
            style={{ minWidth: 80 }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Say hi...</span>
          </button>

          {/* Emoji react */}
          <motion.button
            onClick={() => setEmojiPop(v => !v)}
            className="w-9 h-9 bg-black/40 border border-white/15 rounded-full flex items-center justify-center backdrop-blur-md"
            whileTap={{ scale: 0.85 }}
          >
            <Smile className="w-4.5 h-4.5 text-white/60" />
          </motion.button>

          {/* More menu */}
          <motion.button
            onClick={onMenuClick}
            className="w-9 h-9 bg-black/40 border border-white/15 rounded-full flex items-center justify-center backdrop-blur-md"
            whileTap={{ scale: 0.85 }}
          >
            <MoreHorizontal className="w-4.5 h-4.5 text-white/60" />
          </motion.button>
        </div>

        {/* RIGHT: Inbox, PK, Shop, Gift */}
        <div className="flex items-center gap-2">
          {/* Inbox / DM */}
          <BottomBarButton
            onClick={onInboxClick}
            label="Inbox"
            color="bg-black/40"
          >
            <Mail className="w-5 h-5 text-white/70" />
          </BottomBarButton>

          {/* PK Battle */}
          <BottomBarButton
            onClick={onPKClick}
            label="PK"
            color={hasPK ? "bg-red-500/80" : "bg-black/40"}
            highlight={hasPK}
          >
            <span className="text-amber-300 font-black text-sm leading-none">PK</span>
          </BottomBarButton>

          {/* Shop / Affiliate */}
          <BottomBarButton
            onClick={onShopClick}
            label="Shop"
            color="bg-black/40"
          >
            <ShoppingBag className="w-5 h-5 text-amber-400" />
          </BottomBarButton>

          {/* Gift — primary action */}
          <motion.button
            onClick={onGiftClick}
            disabled={giftDisabled}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-xl relative overflow-hidden ${
              giftDisabled
                ? 'bg-white/10 border border-white/10'
                : 'bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 shadow-pink-500/40'
            }`}
            whileTap={giftDisabled ? {} : { scale: 0.85 }}
            whileHover={giftDisabled ? {} : { scale: 1.05 }}
          >
            {!giftDisabled && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
              />
            )}
            <Gift className={`w-5 h-5 ${giftDisabled ? 'text-white/30' : 'text-white'} relative z-10`} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function BottomBarButton({ children, onClick, color, highlight, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <motion.button
        onClick={onClick}
        className={`w-9 h-9 rounded-full flex items-center justify-center border border-white/15 backdrop-blur-md ${color} ${highlight ? 'shadow-lg' : ''}`}
        whileTap={{ scale: 0.85 }}
      >
        {children}
      </motion.button>
      {label && <span className="text-white/35 text-[9px] font-medium">{label}</span>}
    </div>
  );
}