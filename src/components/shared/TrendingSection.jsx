import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Flame, Radio, Users, Network } from 'lucide-react';
import { motion } from 'framer-motion';
import StreamCard from '@/components/stream/StreamCard';
import CreatorCard from '@/components/creator/CreatorCard';

export default function TrendingSection() {
  const [trendingType, setTrendingType] = useState('streams');

  const { data: trendingData = [], isLoading } = useQuery({
    queryKey: ['trending', trendingType],
    queryFn: () =>
      base44.functions.invoke('getTrendingContent', { type: trendingType, limit: 12 }).then(res => res.data.trending || []),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators-all'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 100)
  });

  const creatorMap = creators.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Flame className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-400" />
            Trending Now
          </h2>
          <p className="text-amber-400/70 text-sm">Hot content from the Legion community</p>
        </div>
      </div>

      <Tabs value={trendingType} onValueChange={setTrendingType} className="w-full">
        <TabsList className="bg-stone-800/50 border border-amber-600/20 w-full grid grid-cols-3">
          <TabsTrigger value="streams" className="data-[state=active]:bg-amber-600">
            <Radio className="w-4 h-4 mr-2" />
            Streams
          </TabsTrigger>
          <TabsTrigger value="collaborations" className="data-[state=active]:bg-amber-600">
            <Network className="w-4 h-4 mr-2" />
            Collabs
          </TabsTrigger>
          <TabsTrigger value="creators" className="data-[state=active]:bg-amber-600">
            <Users className="w-4 h-4 mr-2" />
            Creators
          </TabsTrigger>
        </TabsList>

        {/* Trending Streams */}
        <TabsContent value="streams" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-2xl bg-stone-800" />
              ))}
            </div>
          ) : trendingData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trendingData.map((stream, i) => (
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
            <div className="text-center py-12 bg-stone-800/30 rounded-xl border border-amber-600/20">
              <Radio className="w-12 h-12 text-amber-400/50 mx-auto mb-2" />
              <p className="text-amber-300/70">No trending streams right now</p>
            </div>
          )}
        </TabsContent>

        {/* Trending Collaborations */}
        <TabsContent value="collaborations" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl bg-stone-800" />
              ))}
            </div>
          ) : trendingData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trendingData.map((collab, i) => (
                <motion.div
                  key={collab.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-stone-800/50 border border-amber-600/20 rounded-xl p-4 hover:border-amber-500/40 transition-all"
                >
                  <h3 className="text-amber-100 font-bold mb-1">{collab.title}</h3>
                  <p className="text-amber-400/70 text-sm mb-2">{collab.creator_names?.join(', ')}</p>
                  <div className="flex items-center gap-3 text-xs text-amber-300/60">
                    <span>👥 {collab.total_viewers || 0} viewers</span>
                    <span>💰 ${collab.total_revenue_usd || 0}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-stone-800/30 rounded-xl border border-amber-600/20">
              <Network className="w-12 h-12 text-amber-400/50 mx-auto mb-2" />
              <p className="text-amber-300/70">No trending collaborations</p>
            </div>
          )}
        </TabsContent>

        {/* Trending Creators */}
        <TabsContent value="creators" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl bg-stone-800" />
              ))}
            </div>
          ) : trendingData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {trendingData.map((creator, i) => (
                <motion.div
                  key={creator.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CreatorCard creator={creator} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-stone-800/30 rounded-xl border border-amber-600/20">
              <Users className="w-12 h-12 text-amber-400/50 mx-auto mb-2" />
              <p className="text-amber-300/70">No trending creators</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}