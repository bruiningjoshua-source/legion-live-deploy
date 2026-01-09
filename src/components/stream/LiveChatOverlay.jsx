import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ChevronUp, ChevronDown } from 'lucide-react';

export default function LiveChatOverlay({ 
  messages = [], 
  onSendMessage, 
  isAuthenticated = false,
  disabled = false 
}) {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // Keep last 30 messages only
  const visibleMessages = messages.slice(-30);
  
  // Show 5 lines by default, 10 when expanded
  const displayCount = isExpanded ? 10 : 5;
  const displayMessages = visibleMessages.slice(-displayCount);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="absolute bottom-0 left-0 z-30 pointer-events-none" style={{ maxWidth: '320px' }}>
      {/* Chat Container - Bottom Left */}
      <div className="flex flex-col pb-4 pl-3">
        {/* Expand/Collapse Toggle - minimal */}
        {visibleMessages.length > 5 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="pointer-events-auto self-start mb-1 flex items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </button>
        )}

        {/* Messages Area - Scrolls upward */}
        <div 
          ref={scrollRef}
          className={`flex flex-col gap-1.5 overflow-y-auto scrollbar-hide ${isExpanded ? 'max-h-[280px]' : 'max-h-[140px]'}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <AnimatePresence mode="popLayout">
            {displayMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ y: 20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                className="px-1 py-0.5 max-w-full"
              >
                {msg.message_type === 'gift' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-300 font-bold text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{msg.sender_name}</span>
                    <span className="text-white/90 font-medium text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">sent</span>
                    <span className="text-base drop-shadow-lg">{msg.gift_data?.gift_icon}</span>
                    {msg.gift_data?.quantity > 1 && (
                      <span className="text-amber-300 font-bold text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">×{msg.gift_data.quantity}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 flex-wrap break-words">
                    <span className="text-amber-300 font-bold text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] shrink-0">{msg.sender_name}:</span>
                    <span className="text-white font-medium text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] break-words">{msg.message}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Chat Input - Bottom, minimal/invisible */}
        <div className="pointer-events-auto mt-2">
          <form onSubmit={handleSubmit} className="flex gap-1.5">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isAuthenticated ? "Say something..." : "Sign in"}
              disabled={disabled || !isAuthenticated}
              className="flex-1 bg-transparent border-0 border-b border-white/20 focus:border-white/40 text-white placeholder:text-white/30 h-8 rounded-none px-1 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={disabled || !isAuthenticated || !inputValue.trim()}
              className="bg-transparent hover:bg-white/10 text-white/60 hover:text-white rounded-full h-8 w-8 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}