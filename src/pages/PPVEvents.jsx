import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Ticket, 
  Calendar, 
  Clock, 
  Play, 
  Star,
  Users,
  DollarSign,
  Sparkles,
  CheckCircle,
  Lock,
  Film,
  Mic,
  Trophy,
  Gamepad2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { toast } from 'sonner';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

const CATEGORY_ICONS = {
  concert: '🎵',
  masterclass: '🎓',
  exclusive_stream: '⭐',
  meet_greet: '🤝',
  tournament: '🏆',
  premiere: '🎬',
  other: '✨'
};

const CATEGORY_COLORS = {
  concert: 'from-pink-500 to-purple-600',
  masterclass: 'from-blue-500 to-cyan-600',
  exclusive_stream: 'from-amber-500 to-orange-600',
  meet_greet: 'from-green-500 to-emerald-600',
  tournament: 'from-red-500 to-rose-600',
  premiere: 'from-violet-500 to-purple-600',
  other: 'from-gray-500 to-slate-600'
};

function EventCard({ event, creator, ticket, onBuyTicket }) {
  const isUpcoming = event.status === 'upcoming' && isFuture(new Date(event.scheduled_at));
  const isLive = event.status === 'live';
  const hasTicket = !!ticket;
  const isSoldOut = event.max_tickets && event.ticket_count >= event.max_tickets;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="group"
    >
      <GlassCard className="overflow-hidden" padding="p-0" glowColor="purple" hover>
        {/* Thumbnail */}
        <div className="relative aspect-video">
          {event.thumbnail_url ? (
            <img src={event.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${CATEGORY_COLORS[event.category]} flex items-center justify-center`}>
              <span className="text-6xl">{CATEGORY_ICONS[event.category]}</span>
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

          {/* Status badge */}
          <div className="absolute top-4 left-4">
            {isLive ? (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-xl shadow-lg shadow-red-500/50"
              >
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-bold">LIVE NOW</span>
              </motion.div>
            ) : isUpcoming ? (
              <div className="flex items-center gap-2 bg-purple-500/90 px-3 py-1.5 rounded-xl">
                <Clock className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">
                  {formatDistanceToNow(new Date(event.scheduled_at), { addSuffix: true })}
                </span>
              </div>
            ) : (
              <div className="bg-white/20 px-3 py-1.5 rounded-xl text-white text-sm">
                Ended
              </div>
            )}
          </div>

          {/* Category */}
          <div className="absolute top-4 right-4">
            <span className="text-2xl">{CATEGORY_ICONS[event.category]}</span>
          </div>

          {/* Ticket status */}
          {hasTicket && (
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-emerald-500 px-3 py-1.5 rounded-xl">
              <CheckCircle className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">Ticket Owned</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg line-clamp-1 mb-1">{event.title}</h3>
              <p className="text-white/50 text-sm line-clamp-2">{event.description}</p>
            </div>
          </div>

          {/* Creator */}
          {creator && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 overflow-hidden">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                )}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{creator.display_name}</p>
                <p className="text-white/40 text-xs">Host</p>
              </div>
            </div>
          )}

          {/* Event details */}
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            <div className="flex items-center gap-1.5 text-white/60">
              <Calendar className="w-4 h-4" />
              {format(new Date(event.scheduled_at), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1.5 text-white/60">
              <Clock className="w-4 h-4" />
              {format(new Date(event.scheduled_at), 'h:mm a')}
            </div>
            {event.duration_minutes && (
              <div className="flex items-center gap-1.5 text-white/60">
                <Play className="w-4 h-4" />
                {event.duration_minutes} min
              </div>
            )}
            <div className="flex items-center gap-1.5 text-white/60">
              <Ticket className="w-4 h-4" />
              {event.ticket_count || 0} sold
            </div>
          </div>

          {/* Price & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">${event.price_usd}</span>
              {event.price_denarii && (
                <span className="text-white/40 text-sm">or {event.price_denarii.toLocaleString()} 🪙</span>
              )}
            </div>

            {hasTicket ? (
              isLive || event.replay_available ? (
                <Link to={createPageUrl(`WatchPPV?id=${event.id}`)}>
                  <PremiumButton leftIcon={<Play className="w-4 h-4" />}>
                    {isLive ? 'Watch Live' : 'Watch Replay'}
                  </PremiumButton>
                </Link>
              ) : (
                <span className="text-emerald-400 text-sm">Access Granted</span>
              )
            ) : isSoldOut ? (
              <span className="text-red-400 text-sm font-medium">Sold Out</span>
            ) : event.status === 'ended' && !event.replay_available ? (
              <span className="text-white/40 text-sm">Event Ended</span>
            ) : (
              <PremiumButton
                onClick={() => onBuyTicket(event)}
                leftIcon={<Ticket className="w-4 h-4" />}
                variant="premium"
              >
                Get Ticket
              </PremiumButton>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function PPVEvents() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['ppv-events'],
    queryFn: () => base44.entities.PPVEvent.filter({}, '-scheduled_at', 100)
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators-for-events'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 100)
  });

  const { data: myTickets = [] } = useQuery({
    queryKey: ['my-ppv-tickets', user?.email],
    queryFn: () => base44.entities.PPVTicket.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

  const { data: wallet } = useQuery({
    queryKey: ['user-wallet', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
      return wallets[0] || null;
    },
    enabled: !!user?.email
  });

  const creatorMap = useMemo(() => 
    creators.reduce((acc, c) => { acc[c.user_email] = c; return acc; }, {}),
    [creators]
  );

  const ticketMap = useMemo(() => 
    myTickets.reduce((acc, t) => { acc[t.event_id] = t; return acc; }, {}),
    [myTickets]
  );

  const buyTicketMutation = useMutation({
    mutationFn: async (event) => {
      // Check if in iframe
      if (window.self !== window.top) {
        throw new Error('Please open the app in a new window to purchase tickets.');
      }

      // For now, create with Denarii if available
      if (event.price_denarii && wallet && wallet.denarii_balance >= event.price_denarii) {
        // Deduct Denarii
        await base44.entities.Wallet.update(wallet.id, {
          denarii_balance: wallet.denarii_balance - event.price_denarii
        });

        // Create ticket
        const ticket = await base44.entities.PPVTicket.create({
          user_email: user.email,
          event_id: event.id,
          purchase_type: 'denarii',
          amount_paid_denarii: event.price_denarii,
          access_code: Math.random().toString(36).substring(2, 10).toUpperCase()
        });

        // Update event ticket count
        await base44.entities.PPVEvent.update(event.id, {
          ticket_count: (event.ticket_count || 0) + 1
        });

        return ticket;
      }

      // Otherwise use Stripe (simplified - in production use proper checkout)
      const response = await base44.functions.invoke('createPPVCheckout', {
        event_id: event.id,
        user_email: user.email
      });
      
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    },
    onSuccess: () => {
      toast.success('🎉 Ticket purchased! You now have access.');
      queryClient.invalidateQueries({ queryKey: ['my-ppv-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['ppv-events'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to purchase ticket');
    }
  });

  const filteredEvents = useMemo(() => {
    const now = new Date();
    switch (activeTab) {
      case 'upcoming':
        return events.filter(e => e.status === 'upcoming' || e.status === 'live');
      case 'my-tickets':
        return events.filter(e => ticketMap[e.id]);
      case 'past':
        return events.filter(e => e.status === 'ended');
      default:
        return events;
    }
  }, [events, activeTab, ticketMap]);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block mb-4"
          >
            <Ticket className="w-16 h-16 text-purple-400" />
          </motion.div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-purple-400 to-pink-400 mb-2">
            Premium Events
          </h1>
          <p className="text-white/50">Exclusive pay-per-view experiences from top creators</p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl mb-6 w-full max-w-md mx-auto">
            <TabsList className="bg-transparent p-0 gap-1 w-full grid grid-cols-3">
              <TabsTrigger 
                value="upcoming" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-xl px-4 py-2 text-white/60"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger 
                value="my-tickets" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-xl px-4 py-2 text-white/60"
              >
                My Tickets
              </TabsTrigger>
              <TabsTrigger 
                value="past" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-xl px-4 py-2 text-white/60"
              >
                Past
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-2xl bg-white/10" />
                ))}
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <EventCard
                        event={event}
                        creator={creatorMap[event.creator_id]}
                        ticket={ticketMap[event.id]}
                        onBuyTicket={(e) => buyTicketMutation.mutate(e)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <GlassCard className="text-center py-16" glowColor="purple">
                <Ticket className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-xl mb-2">
                  {activeTab === 'my-tickets' ? 'No Tickets Yet' : 'No Events'}
                </h3>
                <p className="text-white/50">
                  {activeTab === 'my-tickets' 
                    ? 'Purchase tickets to exclusive events to see them here.'
                    : 'Check back soon for premium events!'}
                </p>
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}