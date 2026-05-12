import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Menu } from 'lucide-react';

// BIGO-style bottom bar: [Say Hi...] [😊] [≡] ... [🐰 lotto] [🎁 gift]

const QUICK_EMOJIS = ['❤️', '😂', '😍', '🔥', '👏', '💯', '✨', '🎁', '🥳', '💪', '😭', '🤩'];

export default function BigoStreamBottomBar({
  onSendMessage,
  onEmojiClick,
  onMenuClick,
  onGiftClick,
  onLottoClick,
  isHost,
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      {/* Emoji tray */}
      <AnimatePresence>
        {emojiOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="mx-3 mb-2 p-2.5 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10"
          >
            <div className="grid grid-cols-6 gap-1.5">
              {QUICK_EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => { onEmojiClick?.(em); setEmojiOpen(false); }}
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
      <div className="flex items-center justify-between px-3 py-1.5">
        {/* LEFT: chat pill + emoji + menu */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSendMessage}
            className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/[0.12] rounded-full px-3.5 py-2 text-white/40 text-xs active:scale-95 transition-transform"
            style={{ minWidth: 80 }}
          >
            Say Hi...
          </button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setEmojiOpen(v => !v)}
            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
              emojiOpen ? 'bg-white/15 border-white/20' : 'bg-black/50 border-white/[0.1]'
            }`}
          >
            <Smile className="w-[18px] h-[18px] text-white/60" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onMenuClick}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/[0.1] flex items-center justify-center"
          >
            <Menu className="w-[18px] h-[18px] text-white/60" />
          </motion.button>
        </div>

        {/* RIGHT: lotto + gift */}
        <div className="flex items-center gap-1.5">
          {/* Lotto button */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onLottoClick}
            className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/[0.1] flex items-center justify-center"
          >
            <span className="text-lg">🐰</span>
          </motion.button>

          {/* Gift button - primary CTA */}
          {!isHost && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onGiftClick}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 shadow-xl shadow-pink-500/30 flex items-center justify-center relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
              />
              <span className="text-xl relative z-10">🎁</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}