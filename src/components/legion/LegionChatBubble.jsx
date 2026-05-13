import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function LegionChatBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser
          ? 'bg-amber-500/20 border border-amber-500/30'
          : 'bg-purple-500/20 border border-purple-500/30'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-amber-400" />
          : <Bot className="w-4 h-4 text-purple-400" />
        }
      </div>

      {/* Message */}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-amber-500/15 border border-amber-500/20 text-amber-50'
          : 'bg-white/[0.05] border border-white/[0.08] text-white/90'
      }`}>
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mt-1 [&_li]:text-white/80">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        <p className="text-[10px] text-white/25 mt-1.5">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}