import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Send,
  Hash,
  Star,
  Crown,
  Lock,
  Users,
  Settings,
  Pin,
  Smile,
  Image,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

const ROOM_ICONS = {
  general: Hash,
  announcements: Star,
  vip: Crown,
  subscribers: Users,
  moderators: Settings
};

export default function CreatorCommunity() {
  const urlParams = new URLSearchParams(window.location.search);
  const creatorId = urlParams.get('id');
  
  const [activeRoom, setActiveRoom] = useState(null);
  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator } = useQuery({
    queryKey: ['creator', creatorId],
    queryFn: async () => {
      const creators = await base44.entities.Creator.filter({ id: creatorId }, null, 1);
      return creators[0] || null;
    },
    enabled: !!creatorId
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['chat-rooms', creatorId],
    queryFn: () => base44.entities.CreatorChatRoom.filter({ creator_id: creatorId, is_active: true }, 'sort_order'),
    enabled: !!creatorId
  });

  const { data: membership } = useQuery({
    queryKey: ['my-membership', creatorId, user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const memberships = await base44.entities.FanClubMembership.filter({
        creator_id: creatorId,
        user_email: user.email,
        status: 'active'
      }, null, 1);
      return memberships[0] || null;
    },
    enabled: !!creatorId && !!user?.email
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['room-messages', activeRoom?.id],
    queryFn: () => base44.entities.RoomMessage.filter({ room_id: activeRoom.id }, '-created_date', 100),
    enabled: !!activeRoom?.id,
    refetchInterval: 3000
  });

  // Set default room
  useEffect(() => {
    if (rooms.length > 0 && !activeRoom) {
      const generalRoom = rooms.find(r => r.room_type === 'general') || rooms[0];
      setActiveRoom(generalRoom);
    }
  }, [rooms, activeRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const canAccessRoom = (room) => {
    if (!room) return false;
    if (room.room_type === 'general' || room.room_type === 'announcements') return true;
    if (!membership) return false;
    return membership.tier >= room.min_subscription_tier;
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.RoomMessage.create({
        room_id: activeRoom.id,
        user_email: user.email,
        user_name: user.full_name,
        content,
        message_type: 'text'
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['room-messages'] });
    }
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  const sortedMessages = useMemo(() => 
    [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
    [messages]
  );

  return (
    <div className="min-h-screen pt-16 pb-4 flex">
      {/* Sidebar - Rooms */}
      <div className="w-64 bg-black/40 border-r border-white/10 flex flex-col">
        {/* Creator Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 overflow-hidden">
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
              )}
            </div>
            <div>
              <h2 className="text-white font-bold">{creator?.display_name}</h2>
              <p className="text-white/40 text-xs">Community</p>
            </div>
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {rooms.map(room => {
            const RoomIcon = ROOM_ICONS[room.room_type] || Hash;
            const hasAccess = canAccessRoom(room);
            const isActive = activeRoom?.id === room.id;

            return (
              <motion.button
                key={room.id}
                whileHover={{ x: 4 }}
                onClick={() => hasAccess && setActiveRoom(room)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-white/10 text-white' 
                    : hasAccess 
                      ? 'text-white/60 hover:text-white hover:bg-white/5' 
                      : 'text-white/30 cursor-not-allowed'
                }`}
              >
                {hasAccess ? (
                  <RoomIcon className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{room.name}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Membership Status */}
        <div className="p-4 border-t border-white/10">
          {membership ? (
            <div className="flex items-center gap-2 text-sm">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300">{membership.tier_name} Member</span>
            </div>
          ) : (
            <p className="text-white/40 text-xs">Join the fan club to unlock more rooms!</p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeRoom ? (
          <>
            {/* Room Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {React.createElement(ROOM_ICONS[activeRoom.room_type] || Hash, {
                  className: 'w-6 h-6 text-white/60'
                })}
                <div>
                  <h3 className="text-white font-semibold">{activeRoom.name}</h3>
                  {activeRoom.description && (
                    <p className="text-white/40 text-sm">{activeRoom.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <Users className="w-4 h-4" />
                {activeRoom.member_count || 0} members
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {sortedMessages.map((msg, i) => {
                const isOwn = msg.user_email === user?.email;
                const showAvatar = i === 0 || sortedMessages[i - 1]?.user_email !== msg.user_email;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    {showAvatar && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 shrink-0 flex items-center justify-center text-white font-bold">
                        {msg.user_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    {!showAvatar && <div className="w-10" />}
                    
                    <div className={`max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
                      {showAvatar && (
                        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          <span className="text-white font-medium text-sm">{msg.user_name}</span>
                          <span className="text-white/30 text-xs">
                            {format(new Date(msg.created_date), 'h:mm a')}
                          </span>
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-2 ${
                        isOwn 
                          ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 border border-pink-500/30' 
                          : 'bg-white/10'
                      }`}>
                        <p className="text-white text-sm">{msg.content}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            {canAccessRoom(activeRoom) && (
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-3">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={`Message #${activeRoom.name}...`}
                    className="flex-1 bg-white/5 border-white/10 text-white"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">Select a room to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}