import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BroadcasterChat({ messages = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const displayMessages = isExpanded ? messages.slice(-10) : messages.slice(-5);

  // Don't render if no messages
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-20 right-4 z-30 w-72 md:w-80">
      <motion.div
        animate={{ height: isExpanded ? 'auto' : '140px' }}
        className="bg-black/70 backdrop-blur-md border border-amber-500/30 rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-amber-500/20 bg-black/50">
          <span className="text-amber-200 text-xs font-semibold">Live Chat</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-amber-400/70 hover:text-amber-300 transition-colors p-1"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Messages */}
        <div className="overflow-y-auto max-h-96 p-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {displayMessages.map((msg, idx) => (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-xs"
              >
                <span className="text-amber-300 font-semibold">{msg.sender_name}: </span>
                <span className="text-white/80">{msg.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </motion.div>
    </div>
  );
}