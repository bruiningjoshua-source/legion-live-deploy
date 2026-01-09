import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Radio, 
  TrendingUp, 
  Heart,
  Sparkles,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StreamCard from '@/components/stream/StreamCard';
import TrendingSection from '@/components/shared/TrendingSection';

export default function Home() {
  const [activeTab, setActiveTab] = useState('personalized');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: personalizedRecs = [], isLoading: recsLoading } = useQuery({
    queryKey: ['recommendations', user?.email],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getPersonalizedRecommendations', { limit: 16 });
        return res.data?.recommendations || [];
      } catch (error) {
        console.log('Recommendations unavailable:', error.message);
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: streams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['streams'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 50),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    retry: 1
  });

  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 50),
    staleTime: 5 * 60 * 1000
  });

  const creatorMap = creators.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  const featuredStreams = streams.filter(s => s.is_featured);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Legion Live</h1>
          <p className="text-amber-400/70">Stream, command, and conquer</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20 w-full grid grid-cols-3">
            <TabsTrigger value="personalized" className="data-[state=active]:bg-amber-600">
              <Heart className="w-4 h-4 mr-2" />
              For You
            </TabsTrigger>
            <TabsTrigger value="trending" className="data-[state=active]:bg-amber-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="featured" className="data-[state=active]:bg-amber-600">
              <Trophy className="w-4 h-4 mr-2" />
              Featured
            </TabsTrigger>
          </TabsList>

          {/* Personalized For You */}
          <TabsContent value="personalized" className="mt-0 space-y-6">
            {recsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-2xl bg-stone-800" />
                ))}
              </div>
            ) : personalizedRecs.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                <AnimatePresence>
                  {personalizedRecs.map((stream, i) => (
                    <motion.div
                      key={stream.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <StreamCard stream={stream} creator={creatorMap[stream.creator_id]} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="text-center py-12 bg-stone-800/30 rounded-xl">
                <Sparkles className="w-12 h-12 text-amber-400/50 mx-auto mb-2" />
                <p className="text-amber-300/70">Watch more streams to get personalized recommendations!</p>
              </div>
            )}
          </TabsContent>

          {/* Trending */}
          <TabsContent value="trending" className="mt-0">
            <TrendingSection />
          </TabsContent>

          {/* Featured */}
          <TabsContent value="featured" className="mt-0">
            {streamsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-video rounded-2xl bg-stone-800" />
                ))}
              </div>
            ) : featuredStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {featuredStreams.map((stream, i) => (
                    <motion.div
                      key={stream.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <StreamCard stream={stream} creator={creatorMap[stream.creator_id]} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-12 bg-stone-800/30 rounded-xl">
                <Trophy className="w-12 h-12 text-amber-400/50 mx-auto mb-2" />
                <p className="text-amber-300/70">No featured streams right now</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}