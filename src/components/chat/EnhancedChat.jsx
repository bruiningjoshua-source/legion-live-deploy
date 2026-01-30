import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Gift, 
  Crown, 
  Star, 
  Reply, 
  Smile, 
  AtSign,
  Pin,
  MoreHorizontal,
  X,
  Heart,
  ThumbsUp,
  Laugh,
  Flame,
  Sparkles,
  Shield
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from 'sonner';
import _ from 'lodash';

// VIP level badges and colors
const VIP_STYLES = {
  0: { badge: null, color: 'text-white', bg: 'bg-white/10', name: '' },
  1: { badge: '⭐', color: 'text-amber-300', bg: 'bg-amber-500/20', name: 'Supporter' },
  2: { badge: '💎', color: 'text-cyan-300', bg: 'bg-cyan-500/20', name: 'VIP' },
  3: { badge: '👑', color: 'text-purple-300', bg: 'bg-purple-500/20', name: 'Elite' },
  4: { badge: '🔥', color: 'text-orange-300', bg: 'bg-orange-500/20', name: 'Legend' },
  5: { badge: '🌟', color: 'text-yellow-300', bg: 'bg-yellow-500/20', name: 'Champion' },
};

const REACTIONS = ['❤️', '👍', '😂', '🔥', '😮', '👏', '💯', '🎉'];

function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) return null;
  
  const names = typingUsers.slice(0, 3).map(u => u.user_name || 'Someone');
  const text = names.length === 1 
    ? `${names[0]} is typing...` 
    : names.length === 2 
      ? `${names.join(' and ')} are typing...`
      : `${names.slice(0, 2).join(', ')} and others are typing...`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="px-3 py-1 text-xs text-white/50 flex items-center gap-2"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/40"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span>{text}</span>
    </motion.div>
  );
}

function ChatBubble({ message, index, currentUserEmail, onReply, onReact, onPin, isHost }) {
  const [showActions, setShowActions] = useState(false);
  const vipLevel = message.vip_level || 0;
  const style = VIP_STYLES[Math.min(vipLevel, 5)];
  const isGift = message.message_type === 'gift';
  const isReply = message.message_type === 'reply' || message.reply_to_id;
  const isOwnMessage = message.sender_email === currentUserEmail;
  const hasMentions = message.mentions?.length > 0;
  const isMentioned = message.mentions?.includes(currentUserEmail);

  // Highlight @mentions in message
  const renderMessage = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-amber-400 font-medium">{part}</span>
        );
      }
      return part;
    });
  };

  const reactions = message.reactions || {};
  const totalReactions = Object.values(reactions).flat().length;

  return (
    <motion.div
      initial={{ x: -50, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: -30, opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 20, stiffness: 300, delay: index * 0.02 }}
      className={`mb-1.5 group ${isMentioned ? 'bg-amber-500/10 -mx-2 px-2 py-1 rounded-lg' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Reply Preview */}
      {isReply && message.reply_to_content && (
        <div className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5 ml-1">
          <Reply className="w-2.5 h-2.5" />
          <span className="truncate max-w-[150px]">
            Replying to <span className="text-white/60">{message.reply_to_sender}</span>: {message.reply_to_content}
          </span>
        </div>
      )}

      <div className="flex items-start gap-1">
        {/* Message Bubble */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl ${style.bg} backdrop-blur-md max-w-[280px] relative ${
          message.is_pinned ? 'ring-1 ring-amber-500/50' : ''
        }`}>
          {/* Pin indicator */}
          {message.is_pinned && (
            <Pin className="w-2.5 h-2.5 text-amber-400 absolute -top-1 -right-1" />
          )}
          
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
            <span className="text-white/90 text-xs">
              {renderMessage(message.message)}
            </span>
          )}

          {/* Flagged indicator */}
          {message.is_flagged && (
            <Shield className="w-3 h-3 text-yellow-500" title={message.flag_reason} />
          )}
        </div>

        {/* Quick Actions */}
        <AnimatePresence>
          {showActions && !isGift && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-0.5"
            >
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                    <Smile className="w-3 h-3 text-white/60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1 bg-stone-900 border-white/10" side="top">
                  <div className="flex gap-0.5">
                    {REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => onReact(message.id, emoji)}
                        className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-sm"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <button 
                onClick={() => onReply(message)}
                className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <Reply className="w-3 h-3 text-white/60" />
              </button>

              {isHost && (
                <button 
                  onClick={() => onPin(message.id, !message.is_pinned)}
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                >
                  <Pin className="w-3 h-3 text-white/60" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reactions Display */}
      {totalReactions > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 ml-1">
          {Object.entries(reactions).map(([emoji, users]) => (
            users.length > 0 && (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  users.includes(currentUserEmail) 
                    ? 'bg-amber-500/30 border border-amber-500/50' 
                    : 'bg-white/10'
                }`}
              >
                <span>{emoji}</span>
                <span className="text-white/70">{users.length}</span>
              </button>
            )
          ))}
        </div>
      )}
    </motion.div>
  );
}

function MentionSuggestions({ query, users, onSelect }) {
  const filtered = users.filter(u => 
    u.sender_name?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  if (filtered.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full left-0 mb-1 w-48 bg-stone-900 border border-white/10 rounded-lg overflow-hidden"
    >
      {filtered.map((user, i) => (
        <button
          key={user.sender_email || i}
          onClick={() => onSelect(user.sender_name)}
          className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
        >
          <AtSign className="w-3 h-3 text-amber-400" />
          {user.sender_name}
        </button>
      ))}
    </motion.div>
  );
}

export default function EnhancedChat({ 
  streamId,
  messages = [], 
  onSendMessage, 
  currentUser,
  isAuthenticated = false,
  disabled = false,
  isHost = false,
  recentChatters = []
}) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Show last 15 messages
  const displayMessages = messages.slice(-15);

  // Debounced typing indicator
  const sendTypingIndicator = useCallback(
    _.debounce(async (isTyping) => {
      if (!streamId || !currentUser?.email) return;
      try {
        if (isTyping) {
          await base44.entities.TypingIndicator.create({
            stream_id: streamId,
            user_email: currentUser.email,
            user_name: currentUser.full_name || 'User',
            expires_at: new Date(Date.now() + 5000).toISOString()
          });
        }
      } catch (e) {
        // Ignore errors
      }
    }, 500),
    [streamId, currentUser]
  );

  // Subscribe to typing indicators
  useEffect(() => {
    if (!streamId) return;

    const unsubscribe = base44.entities.TypingIndicator.subscribe((event) => {
      if (event.data?.stream_id === streamId && event.data?.user_email !== currentUser?.email) {
        if (event.type === 'create') {
          setTypingUsers(prev => {
            if (prev.find(u => u.user_email === event.data.user_email)) return prev;
            return [...prev, event.data];
          });
          // Auto-remove after 5 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.user_email !== event.data.user_email));
          }, 5000);
        }
      }
    });

    return unsubscribe;
  }, [streamId, currentUser]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle input change with mention detection
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // Check for @mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ') && afterAt.length > 0) {
        setMentionQuery(afterAt);
      } else {
        setMentionQuery(null);
      }
    } else {
      setMentionQuery(null);
    }

    // Send typing indicator
    if (value.length > 0) {
      sendTypingIndicator(true);
    }
  };

  const handleMentionSelect = (name) => {
    const lastAtIndex = inputValue.lastIndexOf('@');
    const newValue = inputValue.slice(0, lastAtIndex) + '@' + name + ' ';
    setInputValue(newValue);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleReact = async (messageId, emoji) => {
    if (!currentUser?.email) return;
    
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const reactions = message.reactions || {};
      const users = reactions[emoji] || [];
      
      if (users.includes(currentUser.email)) {
        // Remove reaction
        reactions[emoji] = users.filter(u => u !== currentUser.email);
      } else {
        // Add reaction
        reactions[emoji] = [...users, currentUser.email];
      }

      await base44.entities.ChatMessage.update(messageId, { reactions });
    } catch (error) {
      console.error('Failed to react:', error);
    }
  };

  const handlePin = async (messageId, isPinned) => {
    try {
      await base44.entities.ChatMessage.update(messageId, { is_pinned: isPinned });
      toast.success(isPinned ? 'Message pinned' : 'Message unpinned');
    } catch (error) {
      toast.error('Failed to pin message');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || disabled) return;

    // Extract mentions
    const mentionMatches = inputValue.match(/@(\w+)/g) || [];
    const mentions = mentionMatches.map(m => m.slice(1));

    const messageData = {
      message: inputValue.trim(),
      mentions: mentions.length > 0 ? mentions : undefined,
      message_type: replyingTo ? 'reply' : 'text',
      reply_to_id: replyingTo?.id,
      reply_to_content: replyingTo?.message?.slice(0, 50),
      reply_to_sender: replyingTo?.sender_name
    };

    onSendMessage(messageData);
    setInputValue('');
    setReplyingTo(null);
  };

  // Get pinned messages
  const pinnedMessages = messages.filter(m => m.is_pinned).slice(-3);

  return (
    <div className="absolute bottom-4 left-0 z-30 w-full max-w-[320px] pointer-events-none">
      <div className="flex flex-col pl-4 pr-20">
        {/* Pinned Messages */}
        {pinnedMessages.length > 0 && (
          <div className="mb-2 space-y-1">
            {pinnedMessages.map(msg => (
              <div key={msg.id} className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 rounded-lg">
                <Pin className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-amber-300 text-[10px] font-medium">{msg.sender_name}:</span>
                <span className="text-white/80 text-[10px] truncate">{msg.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex flex-col overflow-hidden mb-2 pointer-events-auto"
          style={{ maxHeight: '280px' }}
        >
          <AnimatePresence mode="popLayout">
            {displayMessages.map((msg, idx) => (
              <ChatBubble 
                key={msg.id} 
                message={msg} 
                index={idx}
                currentUserEmail={currentUser?.email}
                onReply={handleReply}
                onReact={handleReact}
                onPin={handlePin}
                isHost={isHost}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Typing Indicator */}
        <AnimatePresence>
          <TypingIndicator typingUsers={typingUsers} />
        </AnimatePresence>

        {/* Reply Preview */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-1.5 bg-white/10 rounded-t-lg flex items-center justify-between pointer-events-auto"
            >
              <div className="flex items-center gap-1.5 text-xs text-white/70 truncate">
                <Reply className="w-3 h-3" />
                <span>Replying to</span>
                <span className="text-amber-300">{replyingTo.sender_name}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-white/50 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="pointer-events-auto relative">
          <AnimatePresence>
            {mentionQuery && (
              <MentionSuggestions
                query={mentionQuery}
                users={recentChatters}
                onSelect={handleMentionSelect}
              />
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit}>
            <motion.div 
              className={`flex items-center gap-2 px-4 py-2 backdrop-blur-md transition-all ${
                replyingTo ? 'rounded-b-full' : 'rounded-full'
              } ${
                isFocused 
                  ? 'bg-white/20 border border-white/30' 
                  : 'bg-black/30 border border-white/10'
              }`}
              animate={{ scale: isFocused ? 1.02 : 1 }}
            >
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isAuthenticated ? "Say something..." : "Sign in to chat"}
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