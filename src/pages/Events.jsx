import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  Calendar, 
  Sparkles,
  Star,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isAfter, isBefore, parseISO } from 'date-fns';
import EventCard from '@/components/events/EventCard';

export default function Events() {
  const [activeTab, setActiveTab] = useState('active');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['all-events'],
    queryFn: () => base44.entities.Event.list('-start_date', 50)
  });

  const now = new Date();

  const activeEvents = events.filter(e => {
    const start = e.start_date ? parseISO(e.start_date) : null;
    const end = e.end_date ? parseISO(e.end_date) : null;
    return start && end && isBefore(start, now) && isAfter(end, now);
  });

  const upcomingEvents = events.filter(e => {
    const start = e.start_date ? parseISO(e.start_date) : null;
    return start && isAfter(start, now);
  });

  const pastEvents = events.filter(e => {
    const end = e.end_date ? parseISO(e.end_date) : null;
    return end && isBefore(end, now);
  });

  const renderEvents = (eventList) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl bg-stone-800" />
          ))}
        </div>
      );
    }

    if (eventList.length === 0) {
      return (
        <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-amber-600/20">
          <Calendar className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
          <h3 className="text-amber-100 font-semibold text-lg mb-2">No Events Found</h3>
          <p className="text-amber-400/60">Check back later for exciting events!</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {eventList.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 rounded-full px-4 py-2 mb-4">
            <Trophy className="w-4 h-4 text-purple-400" />
            <span className="text-purple-200 text-sm font-medium">Events & Tournaments</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-amber-100 mb-4">Compete for Glory</h1>
          <p className="text-amber-400/70 text-lg max-w-2xl mx-auto">
            Join epic tournaments, special streams, and challenges. Prove your worth and claim legendary prizes!
          </p>
        </div>

        {/* Featured Banner */}
        {activeEvents.length > 0 && (
          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-3xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-amber-900 to-red-900 opacity-80" />
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200')] bg-cover bg-center opacity-30" />
              
              <div className="relative p-8 md:p-12">
                <Badge className="bg-green-500 text-white border-0 mb-4 animate-pulse">
                  🔴 LIVE NOW
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{activeEvents[0].title}</h2>
                <p className="text-white/80 text-lg mb-6 max-w-2xl">{activeEvents[0].description}</p>
                <div className="flex items-center gap-4">
                  <Button className="bg-white text-stone-900 hover:bg-white/90">
                    Join Now
                  </Button>
                  <Button variant="outline" className="border-white text-white hover:bg-white/10">
                    View Details
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1 rounded-xl">
            <TabsTrigger 
              value="active"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-amber-300 rounded-lg px-6"
            >
              <Star className="w-4 h-4 mr-2" />
              Active
              {activeEvents.length > 0 && (
                <Badge className="ml-2 bg-green-500/50 text-white border-0">{activeEvents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg px-6"
            >
              <Clock className="w-4 h-4 mr-2" />
              Upcoming
              <Badge className="ml-2 bg-amber-500/50 text-amber-100 border-0">{upcomingEvents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="past"
              className="data-[state=active]:bg-stone-600 data-[state=active]:text-white text-amber-300 rounded-lg px-6"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0">
            {renderEvents(activeEvents)}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-0">
            {renderEvents(upcomingEvents)}
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            {renderEvents(pastEvents)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}