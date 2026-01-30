import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Send, Gift, Crown, Star } from 'lucide-react';

// VIP level badges and colors
const VIP_STYLES = {
  0: { badge: null, color: 'text-white', bg: 'bg-white/10' },
  1: { badge: '⭐', color: 'text-amber-300', bg: 'bg-amber-500/20' },
  2: { badge: '💎', color: 'text-cyan-300', bg: 'bg-cyan-500/20' },
  3: { badge: '👑', color: 'text-purple-300', bg: 'bg-purple-500/20' },
  4: { badge: '🔥', color: 'text-orange-300', bg: 'bg-orange-500/20' },
  5: { badge: '🌟', color: 'text-yellow-300', bg: 'bg-yellow-500/20' },
};

function ChatBubble({ message, index }) {
  const vipLevel = message.vip_level || 0;
  const style = VIP_STYLES[Math.min(vipLevel, 5)];
  const isGift = message.message_type === 'gift';

  return (
    <motion.div
      initial={{ x: -50, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: -30, opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 20, stiffness: 300, delay: index * 0.02 }}
      className="mb-1.5"
    >
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${style.bg} backdrop-blur-md max-w-[280px]`}>
        {/* VIP Badge */}
        {style.badge && (
          <span className="text-sm shrink-0">{style.badge}</span>
        )}
        
        {/* Username */}
        <span className={`text-xs font-bold ${style.color} shrink-0`}>
          {message.sender_name}
        </span>
        
        {/* Message or Gift */}
        {isGift ? (
          <div className="flex items-center gap-1">
            <span className="text-white/80 text-xs">sent</span>
            <span className="text-lg">{message.gift_data?.gift_icon}</span>
            {message.gift_data?.quantity > 1 && (
              <span className="text-amber-300 font-bold text-xs">×{message.gift_data.quantity}</span>
            )}
          </div>
        ) : (
          <span className="text-white/90 text-xs truncate">
            {message.message}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function BigoStyleChat({ 
  messages = [], 
  onSendMessage, 
  isAuthenticated = false,
  disabled = false 
}) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const scrollRef = useRef(null);

  // Show last 10 messages
  const displayMessages = messages.slice(-10);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="absolute bottom-4 left-0 z-30 w-full max-w-[320px] pointer-events-none">
      <div className="flex flex-col pl-3 pr-16">
        {/* Messages - Floating bubbles */}
        <div 
          ref={scrollRef}
          className="flex flex-col overflow-hidden mb-2"
          style={{ maxHeight: '240px' }}
        >
          <AnimatePresence mode="popLayout">
            {displayMessages.map((msg, idx) => (
              <ChatBubble key={msg.id} message={msg} index={idx} />
            ))}
          </AnimatePresence>
        </div>

        {/* Input - Bigo style pill */}
        <div className="pointer-events-auto">
          <form onSubmit={handleSubmit}>
            <motion.div 
              className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md transition-all ${
                isFocused 
                  ? 'bg-white/20 border border-white/30' 
                  : 'bg-black/30 border border-white/10'
              }`}
              animate={{ scale: isFocused ? 1.02 : 1 }}
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isAuthenticated ? "Say hi..." : "Sign in to chat"}
                disabled={disabled || !isAuthenticated}
                className="flex-1 bg-transparent border-0 text-white placeholder:text-white/40 h-7 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
              />
              <motion.button 
                type="submit"
                disabled={disabled || !isAuthenticated || !inputValue.trim()}
                className="w-7 h-7 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white disabled:opacity-30"
                whileTap={{ scale: 0.9 }}
              >
                <Send className="w-3.5 h-3.5" />
              </motion.button>
            </motion.div>
          </form>
        </div>
      </div>
    </div>
  );
}