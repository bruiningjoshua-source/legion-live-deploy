import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Send,
  Hash,
  Star,
  Crown,
  Lock,
  Users,
  Settings,
  Plus,
  Image,
  Smile,
  ArrowLeft,
  BadgeCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

const ROOM_ICONS = {
  general: Hash,
  announcements: Star,
  vip: Crown,
  subscribers: Users,
  moderators: Settings
};

const ROOM_COLORS = {
  general: 'text-white/60',
  announcements: 'text-amber-400',
  vip: 'text-purple-400',
  subscribers: 'text-pink-400',
  moderators: 'text-red-400'
};

export default function CreatorCommunity() {
  const urlParams = new URLSearchParams(window.location.search);
  const creatorId = urlParams.get('id');
  
  const [activeRoom, setActiveRoom] = useState(null);
  const [message, setMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const chatEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator, isLoading: creatorLoading } = useQuery({
    queryKey: ['creator', creatorId],
    queryFn: async () => {
      const creators = await base44.entities.Creator.filter({ id: creatorId }, null, 1);
      return creators[0] || null;
    },
    enabled: !!creatorId
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['chat-rooms', creatorId],
    queryFn: async () => {
      const existingRooms = await base44.entities.CreatorChatRoom.filter({ 
        creator_id: creatorId, 
        is_active: true 
      }, 'sort_order');
      
      // Auto-create default rooms if none exist and user is creator
      if (existingRooms.length === 0 && user?.email === creator?.user_email) {
        const defaultRooms = [
          { name: 'general', room_type: 'general', sort_order: 0, min_subscription_tier: 0 },
          { name: 'announcements', room_type: 'announcements', sort_order: 1, min_subscription_tier: 0 },
          { name: 'vip-lounge', room_type: 'vip', sort_order: 2, min_subscription_tier: 2 },
          { name: 'subscribers', room_type: 'subscribers', sort_order: 3, min_subscription_tier: 1 }
        ];
        
        for (const room of defaultRooms) {
          await base44.entities.CreatorChatRoom.create({
            ...room,
            creator_id: creatorId,
            is_active: true,
            member_count: 0
          });
        }
        
        return base44.entities.CreatorChatRoom.filter({ creator_id: creatorId, is_active: true }, 'sort_order');
      }
      
      return existingRooms;
    },
    enabled: !!creatorId && !!creator
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
    queryFn: () => base44.entities.RoomMessage.filter({ room_id: activeRoom.id }, 'created_date', 100),
    enabled: !!activeRoom?.id,
    refetchInterval: 3000
  });

  // Real-time subscription
  useEffect(() => {
    if (!activeRoom?.id) return;
    
    const unsubscribe = base44.entities.RoomMessage.subscribe((event) => {
      if (event.data.room_id === activeRoom.id) {
        queryClient.invalidateQueries({ queryKey: ['room-messages', activeRoom.id] });
      }
    });

    return unsubscribe;
  }, [activeRoom?.id, queryClient]);

  // Set default room
  useEffect(() => {
    if (rooms.length > 0 && !activeRoom) {
      const generalRoom = rooms.find(r => r.room_type === 'general') || rooms[0];
      setActiveRoom(generalRoom);
    }
  }, [rooms, activeRoom]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const canAccessRoom = (room) => {
    if (!room) return false;
    if (user?.email === creator?.user_email) return true; // Creator has access to all
    if (room.room_type === 'general' || room.room_type === 'announcements') return true;
    if (!membership) return false;
    return membership.tier >= room.min_subscription_tier;
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.RoomMessage.create({
        room_id: activeRoom.id,
        user_email: user.email,
        user_name: user.full_name || 'Anonymous',
        user_avatar: user.avatar_url,
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
    if (!message.trim() || !user) return;
    sendMessageMutation.mutate(message);
  };

  if (creatorLoading || roomsLoading) {
    return (
      <div className="min-h-screen pt-16 flex">
        <div className="w-64 bg-black/40 p-4">
          <Skeleton className="h-16 w-full mb-4 bg-white/10" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2 bg-white/10" />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <GlassCard className="text-center">
          <MessageSquare className="w-16 h-16 text-pink-400/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Creator Not Found</h2>
          <Link to={createPageUrl('FanClubs')}>
            <PremiumButton>Browse Fan Clubs</PremiumButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 flex">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -280 }}
        animate={{ x: showSidebar ? 0 : -280 }}
        className="w-64 bg-black/60 backdrop-blur-xl border-r border-white/10 flex flex-col fixed left-0 top-16 bottom-0 z-20"
      >
        {/* Creator Header */}
        <div className="p-4 border-b border-white/10">
          <Link to={createPageUrl(`CreatorProfile?id=${creatorId}`)}>
            <div className="flex items-center gap-3 hover:bg-white/5 rounded-xl p-2 -m-2 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 overflow-hidden">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h2 className="text-white font-bold truncate">{creator.display_name}</h2>
                  {creator.is_verified && <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />}
                </div>
                <p className="text-white/40 text-xs">Community</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wider px-3 py-2">Channels</p>
          
          {rooms.map(room => {
            const RoomIcon = ROOM_ICONS[room.room_type] || Hash;
            const hasAccess = canAccessRoom(room);
            const isActive = activeRoom?.id === room.id;
            const iconColor = ROOM_COLORS[room.room_type] || 'text-white/60';

            return (
              <motion.button
                key={room.id}
                whileHover={{ x: hasAccess ? 2 : 0 }}
                onClick={() => hasAccess && setActiveRoom(room)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-white/10 text-white' 
                    : hasAccess 
                      ? 'text-white/60 hover:text-white hover:bg-white/5' 
                      : 'text-white/30 cursor-not-allowed'
                }`}
              >
                {hasAccess ? (
                  <RoomIcon className={`w-5 h-5 ${isActive ? iconColor : ''}`} />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                <span className="text-sm">{room.name}</span>
                {!hasAccess && (
                  <span className="ml-auto text-xs bg-white/10 px-1.5 py-0.5 rounded">
                    Tier {room.min_subscription_tier}+
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Membership Status */}
        <div className="p-4 border-t border-white/10">
          {membership ? (
            <div className="flex items-center gap-2 text-sm bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl p-3">
              <Crown className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-white font-medium">{membership.tier_name} Member</p>
                <p className="text-white/40 text-xs">Tier {membership.tier}</p>
              </div>
            </div>
          ) : (
            <Link to={createPageUrl('FanClubs')}>
              <PremiumButton className="w-full" size="sm" variant="secondary">
                Join Fan Club
              </PremiumButton>
            </Link>
          )}
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col transition-all ${showSidebar ? 'ml-64' : 'ml-0'}`}>
        {activeRoom ? (
          <>
            {/* Room Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="lg:hidden p-2 rounded-lg bg-white/5 text-white/60 hover:text-white"
                >
                  {showSidebar ? <ArrowLeft className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </button>
                {React.createElement(ROOM_ICONS[activeRoom.room_type] || Hash, {
                  className: `w-6 h-6 ${ROOM_COLORS[activeRoom.room_type] || 'text-white/60'}`
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
                {activeRoom.member_count || 0}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-3 border-pink-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg, i) => {
                  const isOwn = msg.user_email === user?.email;
                  const showAvatar = i === 0 || messages[i - 1]?.user_email !== msg.user_email;
                  const isCreatorMsg = msg.user_email === creator.user_email;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${showAvatar ? 'mt-4' : 'mt-1'}`}
                    >
                      {showAvatar ? (
                        <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold ${
                          isCreatorMsg 
                            ? 'bg-gradient-to-br from-pink-400 to-purple-500' 
                            : 'bg-gradient-to-br from-blue-400 to-cyan-500'
                        }`}>
                          {msg.user_avatar ? (
                            <img src={msg.user_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            msg.user_name?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                      ) : (
                        <div className="w-10" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {showAvatar && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm ${isCreatorMsg ? 'text-pink-300' : 'text-white'}`}>
                              {msg.user_name}
                            </span>
                            {isCreatorMsg && (
                              <span className="bg-pink-500/20 text-pink-300 text-xs px-1.5 py-0.5 rounded">Creator</span>
                            )}
                            <span className="text-white/30 text-xs">
                              {format(new Date(msg.created_date), 'h:mm a')}
                            </span>
                          </div>
                        )}
                        <p className="text-white/90 text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Hash className="w-16 h-16 text-white/10 mb-4" />
                  <h3 className="text-white font-semibold mb-1">Welcome to #{activeRoom.name}</h3>
                  <p className="text-white/40 text-sm">This is the start of the conversation</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            {canAccessRoom(activeRoom) && user && (
              <div className="p-4 border-t border-white/10 bg-black/40">
                <div className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={`Message #${activeRoom.name}...`}
                      className="bg-white/5 border-white/10 text-white pr-20 h-12 rounded-xl"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button className="p-1.5 text-white/40 hover:text-white/60">
                        <Smile className="w-5 h-5" />
                      </button>
                      <button className="p-1.5 text-white/40 hover:text-white/60">
                        <Image className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="h-12 w-12 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white flex items-center justify-center disabled:opacity-50"
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
              <p className="text-white/40">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}