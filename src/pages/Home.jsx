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
  Trophy,
  Film,
  Gamepad2,
  ShoppingBag,
  Compass,
  Play
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header - Centered */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">🏛️ Legion Live</h1>
          <p className="text-white/60">Stream, command, and conquer • 21+ Adult Platform</p>
        </div>

        {/* Platform Quick Access - Centered grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10 max-w-4xl mx-auto">
          <Link to={createPageUrl('Explore')}>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-red-500/50 hover:bg-white/10 transition-all cursor-pointer group h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-red-500/20">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Live Streams</p>
                  <p className="text-white/50 text-xs">Solo • PK • Group</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('TheAmphitheatre')}>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all cursor-pointer group h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                  <Film className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Videos</p>
                  <p className="text-white/50 text-xs">Shorts • Long Form</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('TheGamingHub')}>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all cursor-pointer group h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/20">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Gaming Hub</p>
                  <p className="text-white/50 text-xs">OBS • Streamlabs</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('AffiliateHub')}>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-green-500/50 hover:bg-white/10 transition-all cursor-pointer group h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-green-500/20">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Affiliate Hub</p>
                  <p className="text-white/50 text-xs">Products • Brands</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-full">
              <TabsTrigger value="personalized" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-full px-6 text-white/70">
                <Heart className="w-4 h-4 mr-2" />
                For You
              </TabsTrigger>
              <TabsTrigger value="trending" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-full px-6 text-white/70">
                <TrendingUp className="w-4 h-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="featured" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-full px-6 text-white/70">
                <Trophy className="w-4 h-4 mr-2" />
                Featured
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Personalized For You */}
          <TabsContent value="personalized" className="mt-0">
            {recsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[9/16] w-full rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : personalizedRecs.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
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
              <div className="text-center py-16 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                <Sparkles className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/50">Watch more streams to get personalized recommendations!</p>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[9/16] rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : featuredStreams.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              <div className="text-center py-16 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                <Trophy className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/50">No featured streams right now</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}