import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Heart, 
  UserPlus, 
  Gift, 
  AtSign, 
  MessageSquare, 
  Radio, 
  Video, 
  Sword,
  Award,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell({ user }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter(
      { user_email: user.email },
      '-created_date',
      50
    ),
    enabled: !!user?.email,
    refetchInterval: 30000
  });

  useEffect(() => {
    if (!user?.email) return;
    
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_email === user.email) {
        queryClient.invalidateQueries(['notifications']);
      }
    });
    
    return unsubscribe;
  }, [user?.email, queryClient]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.Notification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => 
        base44.entities.Notification.update(n.id, { is_read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const getIcon = (type) => {
    const icons = {
      follow: UserPlus,
      subscribe: Heart,
      gift: Gift,
      mention: AtSign,
      reply: MessageSquare,
      live: Radio,
      video: Video,
      raid: Sword,
      milestone: Award,
      system: Bell
    };
    return icons[type] || Bell;
  };

  const getIconColor = (type) => {
    const colors = {
      follow: 'text-blue-400',
      subscribe: 'text-pink-400',
      gift: 'text-amber-400',
      mention: 'text-cyan-400',
      reply: 'text-green-400',
      live: 'text-red-400',
      video: 'text-purple-400',
      raid: 'text-orange-400',
      milestone: 'text-yellow-400',
      system: 'text-stone-400'
    };
    return colors[type] || 'text-amber-400';
  };

  if (!user) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-amber-400 hover:text-amber-300"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 bg-stone-900 border border-amber-600/30 rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                <h3 className="text-amber-100 font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-amber-400 text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>

              <ScrollArea className="h-96">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-stone-800">
                    {notifications.map(notification => {
                      const Icon = getIcon(notification.type);
                      
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`p-4 hover:bg-stone-800/50 cursor-pointer transition-colors ${
                            !notification.is_read ? 'bg-amber-600/5' : ''
                          }`}
                          onClick={() => {
                            if (!notification.is_read) {
                              markReadMutation.mutate(notification.id);
                            }
                            if (notification.link_url) {
                              setIsOpen(false);
                            }
                          }}
                        >
                          <Link 
                            to={notification.link_url || '#'}
                            className="flex items-start gap-3"
                          >
                            <div className={`p-2 rounded-full bg-stone-800 ${getIconColor(notification.type)}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-amber-100 font-medium text-sm truncate">
                                  {notification.title}
                                </p>
                                {!notification.is_read && (
                                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                                )}
                              </div>
                              <p className="text-amber-400/70 text-xs line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-amber-400/50 text-xs mt-1">
                                {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                              </p>
                            </div>
                            {notification.image_url && (
                              <img 
                                src={notification.image_url} 
                                className="w-10 h-10 rounded-lg object-cover"
                                alt=""
                              />
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-amber-400/50">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}