import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';
import PremiumCreatorCard from '@/components/creator/PremiumCreatorCard';
import GlassCard from '@/components/shared/GlassCard';

export default function Following() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: follows = [], isLoading: followsLoading } = useQuery({
    queryKey: ['my-follows', user?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: user.email }, '-created_date', 100),
    enabled: !!user?.email
  });

  const creatorIds = follows.map(f => f.following_creator_id);

  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['followed-creators', creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const allCreators = await base44.entities.Creator.list(null, 200);
      return allCreators.filter(c => creatorIds.includes(c.id));
    },
    enabled: creatorIds.length > 0
  });

  const { data: streams = [] } = useQuery({
    queryKey: ['following-streams', creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const allStreams = await base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 100);
      return allStreams.filter(s => creatorIds.includes(s.creator_id));
    },
    enabled: creatorIds.length > 0,
    refetchInterval: 30 * 1000
  });

  const creatorMap = useMemo(() => creators.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {}), [creators]);

  const liveCreators = creators.filter(c => c.is_live);
  const offlineCreators = creators.filter(c => !c.is_live);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="text-center max-w-sm mx-4 py-12">
          <Heart className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Sign in to Follow Creators</h1>
          <p className="text-white/50 mb-6">See streams from your favorite creators</p>
        </GlassCard>
      </div>
    );
  }

  if (followsLoading || creatorsLoading) {
    return (
      <div className="min-h-screen pb-24">
        <div className="max-w-2xl mx-auto px-4">
          <Skeleton className="h-10 w-48 bg-white/5 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-300 mb-2">
              Following
            </h1>
            <p className="text-white/50">Streams from creators you follow</p>
          </div>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-sm px-3 py-1">
            {follows.length} Creators
          </Badge>
        </motion.div>

        {follows.length === 0 ? (
          <GlassCard className="text-center py-20">
            <Heart className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
            <h3 className="text-white font-semibold text-lg mb-2">Not Following Anyone Yet</h3>
            <p className="text-white/50 mb-6">Discover amazing creators to follow</p>
            <Link to={createPageUrl('Explore')}>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl px-6">
                <Users className="w-4 h-4 mr-2" />
                Explore Creators
              </Button>
            </Link>
          </GlassCard>
        ) : (
          <div className="space-y-10">
            {/* Live Now */}
            {streams.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2 bg-red-500/15 backdrop-blur-sm border border-red-500/30 rounded-xl px-4 py-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
                    </span>
                    <span className="text-red-300 font-bold text-sm">Live Now</span>
                    <Badge className="bg-red-500 text-white border-0 text-[10px] ml-1">{streams.length}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {streams.map((stream, i) => (
                    <PremiumStreamCard key={stream.id} stream={stream} creator={creatorMap[stream.creator_id]} index={i} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* All Followed Creators */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                All Followed Creators
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {liveCreators.map((creator, i) => (
                  <PremiumCreatorCard key={creator.id} creator={creator} index={i} />
                ))}
                {offlineCreators.map((creator, i) => (
                  <PremiumCreatorCard key={creator.id} creator={creator} index={liveCreators.length + i} />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}