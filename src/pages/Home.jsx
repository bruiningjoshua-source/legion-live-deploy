import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Radio, 
  TrendingUp, 
  Swords, 
  Star, 
  Users, 
  ChevronRight,
  Sparkles,
  Trophy,
  Crown
} from 'lucide-react';
import { motion } from 'framer-motion';
import StreamCard from '@/components/stream/StreamCard';
import CreatorCard from '@/components/creator/CreatorCard';
import EventCard from '@/components/events/EventCard';

export default function Home() {
  const { data: streams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['streams'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 20),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000 // Refetch every minute
  });

  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 12),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.filter({ is_active: true }, '-start_date', 4),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  const featuredStreams = streams.filter(s => s.is_featured);
  const pkBattles = streams.filter(s => s.stream_type === 'pk_battle');
  const regularStreams = streams.filter(s => !s.is_featured && s.stream_type !== 'pk_battle');

  // Get creator data for streams
  const creatorMap = creators.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/30 via-stone-950/80 to-stone-950" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-amber-600/20 border border-amber-500/30 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-amber-200 text-sm font-medium">The Arena Awaits</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 mb-6">
              Stream Like a Legend
            </h1>
            
            <p className="text-amber-100/70 text-lg md:text-xl max-w-2xl mx-auto mb-8">
              Join the Legion. Build your empire. Conquer the arena with epic live streams, 
              animated gifts, and PK battles.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={createPageUrl('GoLive')}>
                <Button size="lg" className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-lg px-8 py-6 rounded-full shadow-xl shadow-red-500/30">
                  <Radio className="w-5 h-5 mr-2 animate-pulse" />
                  Start Streaming
                </Button>
              </Link>
              <Link to={createPageUrl('Explore')}>
                <Button size="lg" variant="outline" className="border-amber-500/50 text-amber-200 hover:bg-amber-900/30 text-lg px-8 py-6 rounded-full">
                  Explore Streams
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 md:gap-16 mt-12 pt-12 border-t border-amber-600/20">
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-amber-100">{streams.length}+</p>
                <p className="text-amber-400/60 text-sm">Live Now</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-amber-100">{creators.length}+</p>
                <p className="text-amber-400/60 text-sm">Creators</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-amber-100">24/7</p>
                <p className="text-amber-400/60 text-sm">Content</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 pb-20 space-y-16">
        {/* Featured Streams */}
        {featuredStreams.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-amber-100">Featured Streams</h2>
                  <p className="text-amber-400/60 text-sm">Hand-picked by the Legion</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredStreams.slice(0, 3).map((stream, i) => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <StreamCard stream={stream} creator={creatorMap[stream.creator_id]} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* PK Battles */}
        {pkBattles.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-amber-100">PK Battles</h2>
                  <p className="text-amber-400/60 text-sm">Gladiators clash for glory</p>
                </div>
              </div>
              <Link to={createPageUrl('Explore?filter=pk_battle')}>
                <Button variant="ghost" className="text-amber-400 hover:text-amber-300">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pkBattles.slice(0, 3).map((stream, i) => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <StreamCard stream={stream} creator={creatorMap[stream.creator_id]} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Live Now */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-amber-100">Live Now</h2>
                <p className="text-amber-400/60 text-sm">Happening in the arena</p>
              </div>
            </div>
            <Link to={createPageUrl('Explore')}>
              <Button variant="ghost" className="text-amber-400 hover:text-amber-300">
                See All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {streamsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-2xl bg-stone-800" />
              ))}
            </div>
          ) : regularStreams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {regularStreams.slice(0, 8).map((stream, i) => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <StreamCard stream={stream} creator={creatorMap[stream.creator_id]} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-stone-800/30 rounded-2xl border border-amber-600/20">
              <Radio className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
              <h3 className="text-amber-100 font-semibold text-lg mb-2">No Active Streams</h3>
              <p className="text-amber-400/60 mb-4">Be the first to start streaming!</p>
              <Link to={createPageUrl('GoLive')}>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  Go Live Now
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Featured Events */}
        {events.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-amber-100">Events & Tournaments</h2>
                  <p className="text-amber-400/60 text-sm">Compete for glory and prizes</p>
                </div>
              </div>
              <Link to={createPageUrl('Events')}>
                <Button variant="ghost" className="text-amber-400 hover:text-amber-300">
                  All Events <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {events.slice(0, 4).map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Rising Creators */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-amber-100">Rising Legends</h2>
                <p className="text-amber-400/60 text-sm">Discover new creators</p>
              </div>
            </div>
            <Link to={createPageUrl('Explore?tab=creators')}>
              <Button variant="ghost" className="text-amber-400 hover:text-amber-300">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {creatorsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl bg-stone-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {creators.slice(0, 6).map((creator, i) => (
                <motion.div
                  key={creator.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CreatorCard creator={creator} />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}