import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import AmphitheatreSidebar from '@/components/amphitheatre/AmphitheatreSidebar';

export default function WatchLater() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: watchLater = [], isLoading } = useQuery({
    queryKey: ['watch-later', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const results = await base44.entities.WatchLater.filter({ user_email: user.email }, '-added_at', 100);
      return results || [];
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000
  });

  const { data: videos = {} } = useQuery({
    queryKey: ['watch-later-videos'],
    queryFn: async () => {
      const allVideos = await base44.entities.VlogVideo.list('-created_date', 1000);
      return allVideos.reduce((acc, v) => { acc[v.id] = v; return acc; }, {});
    },
    staleTime: 5 * 60 * 1000
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.WatchLater.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-later'] });
      toast.success('Removed from Watch Later');
    }
  });

  const laterVideos = watchLater.map(w => videos[w.video_id]).filter(Boolean);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 pt-16 pb-24 flex">
        <AmphitheatreSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 pt-16 pb-24 flex">
      <AmphitheatreSidebar />
      <div className="flex-1 max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Watch Later</h1>
          <p className="text-stone-400">{laterVideos.length} videos saved</p>
        </div>

        {laterVideos.length > 0 ? (
          <div className="space-y-4">
            {laterVideos.map((video, i) => (
              <div key={video.id} className="flex gap-4 bg-stone-800/30 rounded-lg p-4 border border-stone-700">
                <div className="w-40 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-stone-900">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium line-clamp-2 hover:text-amber-300">{video.title}</h3>
                  <p className="text-stone-400 text-sm mt-1">{video.creator?.display_name || 'Creator'}</p>
                  <p className="text-stone-500 text-xs mt-1">{video.view_count || 0} views</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMutation.mutate(watchLater[i].id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="py-12 text-center">
              <p className="text-amber-400/70 mb-4">Your Watch Later list is empty</p>
              <p className="text-stone-400 text-sm">Save videos to watch them later</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}