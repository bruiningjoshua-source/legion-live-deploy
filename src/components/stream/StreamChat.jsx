import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Gift, Crown, Star, Sparkles, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatModeration } from '@/components/moderation/useChatModeration';
import { toast } from 'sonner';

const vipColors = [
  'text-gray-300',    // 0
  'text-green-400',   // 1
  'text-blue-400',    // 2
  'text-purple-400',  // 3
  'text-pink-400',    // 4
  'text-amber-400',   // 5
  'text-orange-400',  // 6
  'text-red-400',     // 7
  'text-rose-400',    // 8
  'text-yellow-300',  // 9
  'text-amber-300',   // 10
];

const vipBadges = {
  0: null,
  1: { icon: '🥉', label: 'Bronze' },
  2: { icon: '🥈', label: 'Silver' },
  3: { icon: '🥇', label: 'Gold' },
  4: { icon: '💎', label: 'Diamond' },
  5: { icon: '👑', label: 'Royal' },
  6: { icon: '⚔️', label: 'Centurion' },
  7: { icon: '🦅', label: 'Praetor' },
  8: { icon: '🏛️', label: 'Senator' },
  9: { icon: '⚡', label: 'Augustus' },
  10: { icon: '✨', label: 'Divine' },
};

export default function StreamChat({ messages, onSendMessage, onOpenGifts, currentUser, streamId }) {
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef(null);
  const { moderateMessage } = useChatModeration(streamId);
  const [isCheckingMessage, setIsCheckingMessage] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setIsCheckingMessage(true);

    try {
      const modResult = await moderateMessage.mutateAsync({
        message: messageText,
        senderEmail: currentUser?.email || 'anonymous',
        senderName: currentUser?.full_name || 'Guest'
      });

      if (modResult.should_block) {
        toast.error(`Message blocked: ${modResult.reason}`, {
          description: 'Please follow community guidelines',
          icon: <Shield className="w-4 h-4" />
        });
        setNewMessage('');
      } else {
        onSendMessage(messageText);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Moderation check failed:', error);
      onSendMessage(messageText);
      setNewMessage('');
    } finally {
      setIsCheckingMessage(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (msg, index) => {
    const isGift = msg.message_type === 'gift';
    const isSystem = msg.message_type === 'system';
    const vipLevel = msg.vip_level || 0;
    const nameColor = vipColors[Math.min(vipLevel, 10)];
    const badge = vipBadges[Math.min(vipLevel, 10)];

    if (isSystem) {
      return (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-2"
        >
          <Badge className="bg-amber-600/30 text-amber-200 border-amber-500/30">
            {msg.message}
          </Badge>
        </motion.div>
      );
    }

    if (isGift) {
      return (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-r from-amber-900/40 to-amber-800/20 rounded-lg p-2 my-1 border border-amber-500/20"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{msg.gift_data?.gift_icon}</span>
            <div className="flex-1 min-w-0">
              <span className={`font-semibold ${nameColor}`}>{msg.sender_name}</span>
              <span className="text-amber-100/70 text-sm ml-2">
                sent {msg.gift_data?.quantity > 1 && `${msg.gift_data.quantity}x `}
                <span className="text-amber-300 font-medium">{msg.gift_data?.gift_name}</span>
              </span>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-1 px-2 hover:bg-stone-800/30 rounded group"
      >
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex-shrink-0 overflow-hidden">
            {msg.sender_avatar ? (
              <img src={msg.sender_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs">
                {msg.sender_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* VIP Badge */}
              {badge && (
                <span className="text-sm" title={badge.label}>{badge.icon}</span>
              )}
              
              {/* Username */}
              <span className={`font-semibold text-sm ${nameColor}`}>
                {msg.sender_name}
              </span>
              
              <span className="text-amber-100/60 text-sm">:</span>
            </div>
            
            {/* Message */}
            <p className="text-amber-100/90 text-sm break-words">{msg.message}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-stone-900/95 to-stone-950/95 rounded-xl border border-amber-600/20">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-amber-600/20 flex items-center justify-between">
        <h3 className="text-amber-100 font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Live Chat
        </h3>
        <Badge variant="outline" className="text-amber-300 border-amber-500/30">
          {messages?.length || 0} messages
        </Badge>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-1"
      >
        <AnimatePresence>
          {messages?.map((msg, i) => renderMessage(msg, i))}
        </AnimatePresence>
        
        {(!messages || messages.length === 0) && (
          <div className="text-center py-8 text-amber-400/50">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Be the first to send a message!</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-amber-600/20">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenGifts}
            className="text-amber-400 hover:bg-amber-800/30 hover:text-amber-300"
          >
            <Gift className="w-5 h-5" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Send a message..."
            className="bg-stone-800/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40 focus:border-amber-500"
          />
          
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isCheckingMessage}
            className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
          >
            {isCheckingMessage ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}