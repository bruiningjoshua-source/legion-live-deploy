import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from 'lucide-react';
import StreamCard from '@/components/stream/StreamCard';
import CreatorCard from '@/components/creator/CreatorCard';

export default function TrendingSection() {
  const { data: trendingData = {}, isLoading } = useQuery({
    queryKey: ['trending-content'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getTrendingContent', { limit: 8 });
        return res.data || { streams: [], creators: [], collaborations: [] };
      } catch (error) {
        console.log('Trending content unavailable:', error.message);
        return { streams: [], creators: [], collaborations: [] };
      }
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 1000
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 50),
    staleTime: 5 * 60 * 1000
  });

  const creatorMap = creators.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trending Streams
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-2xl bg-stone-800" />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trending Creators
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl bg-stone-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Trending Streams */}
      {trendingData.streams?.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/40" />
            Trending Now
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trendingData.streams.map((stream) => (
              <div key={stream.id}>
                <StreamCard stream={stream} creator={creatorMap[stream.creator_id]} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Creators */}
      {trendingData.creators?.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/40" />
            Rising Creators
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {trendingData.creators.map((creator) => (
              <div key={creator.id}>
                <CreatorCard creator={creator} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!trendingData.streams?.length && !trendingData.creators?.length && (
        <div className="text-center py-16 rounded-xl">
          <TrendingUp className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Trending content will appear here</p>
        </div>
      )}
    </div>
  );
}