import React from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

export default function LegionTypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
        <Bot className="w-4 h-4 text-purple-400" />
      </div>
      <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-purple-400/60"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}