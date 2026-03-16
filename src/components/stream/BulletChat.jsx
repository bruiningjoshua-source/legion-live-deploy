import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Send, AtSign, Reply, X, Pin, Gift } from 'lucide-react';
import { toast } from 'sonner';

const VIP_CONFIG = {
  0: { color: 'text-white/80', nameBg: '', badge: null },
  1: { color: 'text-amber-300', nameBg: 'bg-amber-500/10', badge: '⭐' },
  2: { color: 'text-cyan-300', nameBg: 'bg-cyan-500/10', badge: '💎' },
  3: { color: 'text-purple-300', nameBg: 'bg-purple-500/10', badge: '👑' },
  4: { color: 'text-orange-300', nameBg: 'bg-orange-500/10', badge: '🔥' },
  5: { color: 'text-yellow-200', nameBg: 'bg-yellow-500/10', badge: '🌟' },
};

function BulletMessage({ message, index }) {
  const vip = VIP_CONFIG[Math.min(message.vip_level || 0, 5)];
  const isGift = message.message_type === 'gift';
  const isSystem = message.message_type === 'system';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className="mb-1"
      >
        <div className="text-amber-400/60 text-xs italic px-2 py-0.5">
          {message.message}
        </div>
      </motion.div>
    );
  }

  if (isGift) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -40, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
        transition={{ type: 'spring', damping: 22, stiffness: 350 }}
        className="mb-1.5"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/25 to-orange-500/15 backdrop-blur-sm border border-amber-400/20">
          {vip.badge && <span className="text-xs">{vip.badge}</span>}
          <span className={`text-xs font-bold ${vip.color}`}>{message.sender_name}</span>
          <span className="text-white/50 text-xs">sent</span>
          <span className="text-base">{message.gift_data?.gift_icon || '🎁'}</span>
          <span className="text-white font-bold text-xs">{message.gift_data?.gift_name}</span>
          {(message.gift_data?.quantity || 1) > 1 && (
            <span className="text-amber-300 font-black text-sm">×{message.gift_data.quantity}</span>
          )}
        </div>
      </motion.div>
    );
  }

  // Regular message - bullet style
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      className="mb-1"
    >
      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/25 backdrop-blur-[6px] max-w-[85%]">
        {vip.badge && <span className="text-xs shrink-0">{vip.badge}</span>}
        <span className={`text-xs font-semibold ${vip.color} shrink-0`}>
          {message.sender_name}
        </span>
        <span className="text-white/80 text-xs leading-tight">
          {renderMentions(message.message)}
        </span>
      </div>
    </motion.div>
  );
}

function renderMentions(text) {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} className="text-amber-400 font-medium">{part}</span>;
    }
    return part;
  });
}

export default function BulletChat({
  messages = [],
  onSendMessage,
  currentUser,
  isAuthenticated = false,
  disabled = false,
  isHost = false,
  recentChatters = [],
  className = ''
}) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const displayMessages = messages.slice(-20);

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [messages.length]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    const lastAt = value.lastIndexOf('@');
    if (lastAt !== -1) {
      const after = value.slice(lastAt + 1);
      setMentionQuery(!after.includes(' ') && after.length > 0 ? after : null);
    } else {
      setMentionQuery(null);
    }
  };

  const handleMentionSelect = (name) => {
    const lastAt = inputValue.lastIndexOf('@');
    setInputValue(inputValue.slice(0, lastAt) + '@' + name + ' ');
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || disabled) return;

    const mentions = (inputValue.match(/@(\w+)/g) || []).map(m => m.slice(1));
    onSendMessage({
      message: inputValue.trim(),
      mentions: mentions.length > 0 ? mentions : undefined,
      message_type: replyingTo ? 'reply' : 'text',
      reply_to_id: replyingTo?.id,
      reply_to_content: replyingTo?.message?.slice(0, 50),
      reply_to_sender: replyingTo?.sender_name
    });
    setInputValue('');
    setReplyingTo(null);
  };

  const filteredMentions = mentionQuery
    ? recentChatters.filter(u => u.sender_name?.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 4)
    : [];

  return (
    <div className={`absolute left-0 z-30 w-full pointer-events-none ${className}`} style={{ maxWidth: '340px', bottom: 80 }}>
      <div className="flex flex-col px-3 pb-3">
        {/* Bullet messages */}
        <div
          ref={scrollRef}
          className="flex flex-col overflow-hidden mb-2 pointer-events-auto scrollbar-hide"
          style={{ maxHeight: '45vh' }}
        >
          <div className="mt-auto">
            <AnimatePresence mode="popLayout">
              {displayMessages.map((msg) => (
                <BulletMessage key={msg.id} message={msg} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Reply bar */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-t-2xl flex items-center justify-between pointer-events-auto mb-0"
            >
              <div className="flex items-center gap-1.5 text-xs text-white/60 truncate">
                <Reply className="w-3 h-3" />
                <span>Replying to <span className="text-amber-300">{replyingTo.sender_name}</span></span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-white/40 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mention suggestions */}
        <AnimatePresence>
          {filteredMentions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-1 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden pointer-events-auto"
            >
              {filteredMentions.map((u, i) => (
                <button
                  key={u.sender_email || i}
                  onClick={() => handleMentionSelect(u.sender_name)}
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2"
                >
                  <AtSign className="w-3 h-3 text-amber-400" />
                  {u.sender_name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className="pointer-events-auto">
          <form onSubmit={handleSubmit}>
            <div className={`flex items-center gap-2 px-3 py-1.5 backdrop-blur-md transition-all ${
              replyingTo ? 'rounded-b-2xl' : 'rounded-full'
            } ${isFocused ? 'bg-black/50 border border-white/15' : 'bg-black/30 border border-white/[0.06]'}`}>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isAuthenticated ? "Say something..." : "Sign in to chat"}
                disabled={disabled || !isAuthenticated}
                className="flex-1 bg-transparent border-0 text-white placeholder:text-white/25 h-7 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
              <motion.button
                type="submit"
                disabled={disabled || !isAuthenticated || !inputValue.trim()}
                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white disabled:opacity-15 shrink-0"
                whileTap={{ scale: 0.85 }}
              >
                <Send className="w-3 h-3" />
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}