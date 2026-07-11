import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import VideoFeedCard from '@/components/amphitheatre/VideoFeedCard';
import AmphitheatreSidebar from '@/components/amphitheatre/AmphitheatreSidebar';

export default function WatchHistory() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['watch-history', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const results = await base44.entities.WatchHistory.filter({ user_email: user.email }, '-watched_at', 100);
      return results || [];
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000
  });

  const { data: videos = {} } = useQuery({
    queryKey: ['history-videos'],
    queryFn: async () => {
      const allVideos = await base44.entities.VlogVideo.list('-created_date', 1000);
      return allVideos.reduce((acc, v) => { acc[v.id] = v; return acc; }, {});
    },
    staleTime: 5 * 60 * 1000
  });

  const historyVideos = history.map(h => videos[h.video_id]).filter(Boolean);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 pb-24 flex">
        <AmphitheatreSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 pb-24 flex">
      <AmphitheatreSidebar />
      <div className="flex-1 max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Watch History</h1>
          <p className="text-stone-400">{historyVideos.length} videos</p>
        </div>

        {historyVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {historyVideos.map((video) => (
              <VideoFeedCard key={video.id} content={video} />
            ))}
          </div>
        ) : (
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="py-12 text-center">
              <p className="text-amber-400/70 mb-4">Your watch history is empty</p>
              <p className="text-stone-400 text-sm">Videos you watch will appear here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}