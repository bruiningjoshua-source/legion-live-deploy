import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Search,
  X,
  Check,
  CheckCheck,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function DirectMessaging({ isOpen, onClose, initialRecipient = null }) {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['direct-messages', user?.email],
    queryFn: () => base44.entities.DirectMessage.filter({}, '-created_date', 500),
    enabled: !!user?.email,
    refetchInterval: 5000
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['all-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 200),
    staleTime: 5 * 60 * 1000
  });

  const creatorMap = React.useMemo(() =>
    creators.reduce((acc, c) => { acc[c.user_email] = c; return acc; }, {}),
    [creators]
  );

  // Get conversations list
  const conversations = React.useMemo(() => {
    const convMap = {};
    messages
      .filter(m => m.sender_email === user?.email || m.recipient_email === user?.email)
      .forEach(m => {
        const otherEmail = m.sender_email === user?.email ? m.recipient_email : m.sender_email;
        if (!convMap[otherEmail] || new Date(m.created_date) > new Date(convMap[otherEmail].lastMessage.created_date)) {
          const unreadCount = messages.filter(
            msg => msg.sender_email === otherEmail && msg.recipient_email === user?.email && !msg.is_read
          ).length;
          convMap[otherEmail] = {
            email: otherEmail,
            lastMessage: m,
            unreadCount
          };
        }
      });
    return Object.values(convMap).sort((a, b) => 
      new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
    );
  }, [messages, user?.email]);

  // Get messages for selected conversation
  const conversationMessages = React.useMemo(() => {
    if (!selectedConversation) return [];
    return messages
      .filter(m => 
        (m.sender_email === user?.email && m.recipient_email === selectedConversation) ||
        (m.sender_email === selectedConversation && m.recipient_email === user?.email)
      )
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [messages, selectedConversation, user?.email]);

  // Filter creators for new conversation
  const filteredCreators = React.useMemo(() =>
    creators.filter(c => 
      c.user_email !== user?.email &&
      (c.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       c.user_email?.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
    [creators, user?.email, searchQuery]
  );

  useEffect(() => {
    if (initialRecipient) {
      setSelectedConversation(initialRecipient);
    }
  }, [initialRecipient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  // Mark messages as read — track last-marked to prevent infinite loops
  const lastMarkedConvo = useRef(null);
  useEffect(() => {
    if (!selectedConversation || !user?.email) return;
    const unread = messages.filter(
      m => m.sender_email === selectedConversation && 
           m.recipient_email === user.email && 
           !m.is_read
    );
    if (unread.length === 0) return;
    const key = `${selectedConversation}-${unread.map(m => m.id).join(',')}`;
    if (lastMarkedConvo.current === key) return;
    lastMarkedConvo.current = key;
    Promise.all(unread.map(m => base44.entities.DirectMessage.update(m.id, { is_read: true })))
      .then(() => queryClient.invalidateQueries(['direct-messages']));
  }, [selectedConversation, messages, user?.email]);

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.DirectMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['direct-messages']);
      setNewMessage('');
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    sendMessageMutation.mutate({
      sender_email: user.email,
      recipient_email: selectedConversation,
      content: newMessage.trim(),
      conversation_id: [user.email, selectedConversation].sort().join('_')
    });
  };

  const selectedCreator = creatorMap[selectedConversation];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-stone-900 border-amber-600/30 max-w-4xl h-[80vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className={`w-80 border-r border-amber-600/20 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-amber-600/20">
              <h2 className="text-amber-100 font-semibold text-lg mb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                Messages
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
                <Input
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-stone-800 border-amber-600/20 text-amber-100"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {/* Existing Conversations */}
              {!searchQuery && conversations.map(conv => {
                const creator = creatorMap[conv.email];
                return (
                  <button
                    key={conv.email}
                    onClick={() => setSelectedConversation(conv.email)}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-stone-800/50 transition-colors ${
                      selectedConversation === conv.email ? 'bg-stone-800' : ''
                    }`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={creator?.avatar_url} />
                      <AvatarFallback className="bg-amber-600 text-white">
                        {conv.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-100 font-semibold text-sm truncate">
                          {creator?.display_name || conv.email.split('@')[0]}
                        </span>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white text-xs">{conv.unreadCount}</Badge>
                        )}
                      </div>
                      <p className="text-amber-400/60 text-xs truncate">{conv.lastMessage.content}</p>
                      <span className="text-amber-400/40 text-xs">
                        {formatDistanceToNow(new Date(conv.lastMessage.created_date), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Search Results - New Conversations */}
              {searchQuery && filteredCreators.map(creator => (
                <button
                  key={creator.id}
                  onClick={() => {
                    setSelectedConversation(creator.user_email);
                    setSearchQuery('');
                  }}
                  className="w-full p-3 flex items-center gap-3 hover:bg-stone-800/50 transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={creator.avatar_url} />
                    <AvatarFallback className="bg-amber-600 text-white">
                      {creator.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <span className="text-amber-100 font-semibold text-sm">{creator.display_name}</span>
                    <p className="text-amber-400/60 text-xs capitalize">{creator.category}</p>
                  </div>
                </button>
              ))}

              {searchQuery && filteredCreators.length === 0 && (
                <p className="text-amber-400/60 text-center py-8 text-sm">No creators found</p>
              )}
            </ScrollArea>
          </div>

          {/* Message Thread */}
          <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-amber-600/20 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden text-amber-400"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedCreator?.avatar_url} />
                    <AvatarFallback className="bg-amber-600 text-white">
                      {selectedConversation.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-amber-100 font-semibold">
                      {selectedCreator?.display_name || selectedConversation.split('@')[0]}
                    </p>
                    {selectedCreator?.is_live && (
                      <Badge className="bg-red-500 text-white text-xs">Live</Badge>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {conversationMessages.map((msg, i) => {
                      const isMine = msg.sender_email === user?.email;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isMine ? 'order-2' : ''}`}>
                            <div className={`rounded-2xl px-4 py-2 ${
                              isMine 
                                ? 'bg-amber-600 text-white rounded-br-sm' 
                                : 'bg-stone-800 text-amber-100 rounded-bl-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div className={`flex items-center gap-1 mt-1 text-xs text-amber-400/50 ${isMine ? 'justify-end' : ''}`}>
                              <span>{formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}</span>
                              {isMine && (
                                msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-amber-600/20">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-stone-800 border-amber-600/20 text-amber-100"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button
                      onClick={handleSendMessage}
                      className="bg-amber-600 hover:bg-amber-700"
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
                  <p className="text-amber-400/60">Select a conversation or search for a creator</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}