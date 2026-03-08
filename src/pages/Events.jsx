import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, Calendar, Sparkles, Star, Clock, 
  Coins, Zap, Users, ArrowRight, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isAfter, isBefore, parseISO, formatDistanceToNow, format } from 'date-fns';
import EventCard from '@/components/events/EventCard';

// ── Denarii incentive tiers: displayed on the page as a driver for engagement ──
const INCENTIVE_TIERS = [
  { label: 'Daily Login', denarii: 50,    icon: '🌅', desc: 'Just show up' },
  { label: 'Watch 1 hr',  denarii: 100,   icon: '👁️',  desc: 'Passive earner' },
  { label: 'Send a Gift', denarii: 25,    icon: '🎁',  desc: 'Per gift sent' },
  { label: 'Tournament',  denarii: 5000,  icon: '⚔️',  desc: '1st place prize' },
  { label: 'PK Winner',   denarii: 500,   icon: '🥊',  desc: 'Per PK battle win' },
  { label: 'Refer Friend',denarii: 250,   icon: '🔗',  desc: 'Successful referral' },
];

const COUNTDOWN_INTERVAL = 1000;

function LiveCountdown({ endDate }) {
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), COUNTDOWN_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const ms = parseISO(endDate) - now;
  if (ms <= 0) return <span className="text-red-400 font-mono text-sm">Ending…</span>;

  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  return (
    <span className="font-mono text-sm tabular-nums text-green-300">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')} left
    </span>
  );
}

function FeaturedEventHero({ event }) {
  const typeGradients = {
    tournament:     'from-red-900/80 via-orange-900/60 to-black/80',
    special_stream: 'from-purple-900/80 via-pink-900/60 to-black/80',
    holiday:        'from-green-900/80 via-emerald-900/60 to-black/80',
    collab:         'from-blue-900/80 via-cyan-900/60 to-black/80',
    challenge:      'from-amber-900/80 via-yellow-900/60 to-black/80',
  };
  const gradient = typeGradients[event.event_type] || typeGradients.tournament;
  const topPrize = event.prizes?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-3xl overflow-hidden mb-12 group"
    >
      {/* BG image */}
      <div className="absolute inset-0">
        {event.banner_url ? (
          <img src={event.banner_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-900 to-stone-950" />
        )}
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative p-8 md:p-14 min-h-[340px] flex flex-col justify-end">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge className="bg-green-500/90 text-white border-0 text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            Live Event
          </Badge>
          <Badge className="bg-white/10 backdrop-blur border border-white/20 text-white text-xs capitalize px-3 py-1">
            {event.event_type?.replace('_', ' ')}
          </Badge>
          {event.end_date && <LiveCountdown endDate={event.end_date} />}
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3 tracking-tight">
          {event.title}
        </h2>
        <p className="text-white/70 text-base md:text-lg max-w-2xl mb-6 leading-relaxed">
          {event.description}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          {topPrize && (
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-2xl px-4 py-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-bold text-sm">
                {topPrize.denarii_value?.toLocaleString()} Denarii Prize Pool
              </span>
            </div>
          )}
          {event.participating_creators?.length > 0 && (
            <div className="flex items-center gap-1.5 text-white/50 text-sm">
              <Users className="w-4 h-4" />
              {event.participating_creators.length} creators competing
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-80 rounded-2xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

function EmptyState({ tab }) {
  const msg = {
    active:   { icon: <Sparkles className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />, text: 'No active events right now.', sub: 'Check back soon — challenges and tournaments run throughout the week.' },
    upcoming: { icon: <Clock className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />,    text: 'Nothing scheduled yet.',       sub: 'Upcoming events will appear here as they are announced.' },
    past:     { icon: <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />,      text: 'No past events.',              sub: 'Completed events and their results will be archived here.' },
  }[tab] || {};

  return (
    <div className="text-center py-20 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
      {msg.icon}
      <h3 className="text-white font-semibold text-lg mb-2">{msg.text}</h3>
      <p className="text-white/40 text-sm max-w-xs mx-auto">{msg.sub}</p>
    </div>
  );
}

export default function Events() {
  const [activeTab, setActiveTab] = useState('active');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['all-events'],
    queryFn: () => base44.entities.Event.list('-start_date', 50),
    staleTime: 2 * 60 * 1000,
  });

  const now = useMemo(() => new Date(), []);

  const { activeEvents, upcomingEvents, pastEvents } = useMemo(() => {
    const active   = [];
    const upcoming = [];
    const past     = [];

    for (const e of events) {
      const start = e.start_date ? parseISO(e.start_date) : null;
      const end   = e.end_date   ? parseISO(e.end_date)   : null;
      if (start && end && isBefore(start, now) && isAfter(end, now)) active.push(e);
      else if (start && isAfter(start, now)) upcoming.push(e);
      else past.push(e);
    }

    return { activeEvents: active, upcomingEvents: upcoming, pastEvents: past };
  }, [events, now]);

  const renderGrid = (list, tab) => {
    if (isLoading) return <SkeletonGrid />;
    if (!list.length) return <EmptyState tab={tab} />;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.06, 0.35), duration: 0.35 }}
          >
            <EventCard event={event} />
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-20 pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Page Header ── */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-5">
            <Trophy className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-300 text-xs font-semibold tracking-wider uppercase">Events & Tournaments</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 leading-tight mb-3">
            Compete for Glory
          </h1>
          <p className="text-white/50 text-base md:text-lg max-w-2xl leading-relaxed">
            Prove your worth in live battles, tournaments, and creator challenges.
            Every event pays out real Denarii — the currency that converts to cash.
          </p>
        </div>

        {/* ── Denarii Incentive Strip ── */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-4 h-4 text-amber-400" />
            <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider">Earn Denarii For</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {INCENTIVE_TIERS.map((tier, i) => (
              <motion.div
                key={tier.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl p-4 transition-all duration-200 text-center group"
              >
                <div className="text-2xl mb-2">{tier.icon}</div>
                <p className="text-amber-400 font-black text-lg leading-none mb-1">
                  +{tier.denarii.toLocaleString()}
                </p>
                <p className="text-white text-xs font-semibold mb-1">{tier.label}</p>
                <p className="text-white/30 text-[10px]">{tier.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Featured / Active Event Hero ── */}
        {activeEvents.length > 0 && <FeaturedEventHero event={activeEvents[0]} />}

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="inline-flex bg-white/[0.04] border border-white/[0.06] p-1 rounded-2xl">
            <TabsList className="bg-transparent p-0 gap-1">
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-xl px-5 py-2 text-white/50 hover:text-white transition-all text-sm font-medium"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Active
                {activeEvents.length > 0 && (
                  <span className="ml-2 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {activeEvents.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-xl px-5 py-2 text-white/50 hover:text-white transition-all text-sm font-medium"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Upcoming
                {upcomingEvents.length > 0 && (
                  <span className="ml-2 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {upcomingEvents.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-xl px-5 py-2 text-white/50 hover:text-white transition-all text-sm font-medium"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Past
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active"   className="mt-0">{renderGrid(activeEvents,   'active')}</TabsContent>
          <TabsContent value="upcoming" className="mt-0">{renderGrid(upcomingEvents, 'upcoming')}</TabsContent>
          <TabsContent value="past"     className="mt-0">{renderGrid(pastEvents,     'past')}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}