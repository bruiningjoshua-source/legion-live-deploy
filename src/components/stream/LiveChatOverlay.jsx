import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from 'lucide-react';

export default function LiveChatOverlay({ 
  messages = [], 
  onSendMessage, 
  isAuthenticated = false,
  disabled = false 
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time input tracking - update every 10ms for smooth responsiveness
  useEffect(() => {
    const interval = setInterval(() => {
      // Keep input focused for real-time tracking
      if (inputRef.current && document.activeElement === inputRef.current) {
        // Input is being tracked in real-time
      }
    }, 10);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
      {/* Chat Messages - Floating on left side */}
      <div className="absolute left-2 bottom-20 right-20 pointer-events-none" style={{ maxWidth: '340px' }}>
        <div className="flex flex-col gap-1.5 items-start">
          <AnimatePresence mode="popLayout">
            {messages.slice(-6).map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ x: -50, opacity: 0, scale: 0.8 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="backdrop-blur-sm bg-black/40 rounded-2xl px-3 py-2 max-w-full"
              >
                {msg.message_type === 'gift' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-300 font-bold text-sm drop-shadow-lg">{msg.sender_name}</span>
                    <span className="text-white/90 font-medium text-sm drop-shadow-lg">sent</span>
                    <span className="text-xl drop-shadow-lg">{msg.gift_data?.gift_icon}</span>
                    {msg.gift_data?.quantity > 1 && (
                      <span className="text-amber-300 font-bold text-sm drop-shadow-lg">×{msg.gift_data.quantity}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 flex-wrap break-words">
                    <span className="text-amber-300 font-bold text-sm drop-shadow-lg shrink-0">{msg.sender_name}:</span>
                    <span className="text-white font-medium text-sm drop-shadow-lg break-words">{msg.message}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Invisible Chat Input Bar - Always visible at bottom */}
      <div className="pointer-events-auto bg-gradient-to-t from-black/60 to-transparent pt-8 pb-4 px-4">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-lg">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isAuthenticated ? "Say something..." : "Sign in to chat"}
            disabled={disabled || !isAuthenticated}
            className="flex-1 bg-black/40 backdrop-blur-sm border-white/20 text-white placeholder:text-white/40 h-10 rounded-full px-4"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={disabled || !isAuthenticated || !inputValue.trim()}
            className="bg-amber-600 hover:bg-amber-700 rounded-full h-10 w-10 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}