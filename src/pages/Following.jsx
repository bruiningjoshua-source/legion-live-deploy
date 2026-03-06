import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Radio, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';
import PremiumCreatorCard from '@/components/creator/PremiumCreatorCard';

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

  const { data: streams = [], isLoading: streamsLoading } = useQuery({
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
      <div className="min-h-screen bg-stone-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Sign in to Follow Creators</h1>
          <p className="text-amber-400/70 mb-6">See streams from your favorite creators</p>
        </div>
      </div>
    );
  }

  if (followsLoading || creatorsLoading) {
    return (
      <div className="min-h-screen bg-stone-950 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <Skeleton className="h-10 w-48 bg-stone-800 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl bg-stone-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-100 mb-2">Following</h1>
            <p className="text-amber-400/70">Streams from creators you follow</p>
          </div>
          <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30">
            {follows.length} Creators
          </Badge>
        </div>

        {follows.length === 0 ? (
          <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-amber-600/20">
            <Heart className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
            <h3 className="text-amber-100 font-semibold text-lg mb-2">Not Following Anyone Yet</h3>
            <p className="text-amber-400/60 mb-6">Discover amazing creators to follow</p>
            <Link to={createPageUrl('Explore')}>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Users className="w-4 h-4 mr-2" />
                Explore Creators
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Live Now */}
            {streams.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                  <Radio className="w-6 h-6 text-red-500" />
                  Live Now
                  <Badge className="bg-red-500 text-white border-0 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-100" />
                    </span>
                    {streams.length}
                  </Badge>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {streams.map((stream, i) => (
                    <PremiumStreamCard key={stream.id} stream={stream} creator={creatorMap[stream.creator_id]} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* All Followed Creators */}
            <div>
              <h2 className="text-2xl font-bold text-amber-100 mb-4">All Followed Creators</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {liveCreators.map((creator, i) => (
                  <PremiumCreatorCard key={creator.id} creator={creator} index={i} />
                ))}
                {offlineCreators.map((creator, i) => (
                  <PremiumCreatorCard key={creator.id} creator={creator} index={liveCreators.length + i} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}