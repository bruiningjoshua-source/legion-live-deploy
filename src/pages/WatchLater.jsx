import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Trash2, Film, Music, ShoppingBag, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function WatchLaterPage() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: watchLaterItems = [], isLoading } = useQuery({
    queryKey: ['watch-later-list', user?.email],
    queryFn: () => base44.entities.WatchLater.filter(
      { user_email: user.email },
      '-created_date',
      100
    ),
    enabled: !!user?.email
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['watch-later-videos', watchLaterItems.map(i => i.video_id)],
    queryFn: async () => {
      const videoIds = watchLaterItems.filter(i => i.video_type === 'vlog').map(i => i.video_id);
      if (videoIds.length === 0) return [];
      
      const vids = await Promise.all(
        videoIds.map(async (id) => {
          const result = await base44.entities.VlogVideo.filter({ id }, null, 1);
          return result[0];
        })
      );
      return vids.filter(Boolean);
    },
    enabled: watchLaterItems.length > 0
  });

  const { data: music = [] } = useQuery({
    queryKey: ['watch-later-music', watchLaterItems.map(i => i.video_id)],
    queryFn: async () => {
      const musicIds = watchLaterItems.filter(i => i.video_type === 'music').map(i => i.video_id);
      if (musicIds.length === 0) return [];
      
      const tracks = await Promise.all(
        musicIds.map(async (id) => {
          const result = await base44.entities.Music.filter({ id }, null, 1);
          return result[0];
        })
      );
      return tracks.filter(Boolean);
    },
    enabled: watchLaterItems.length > 0
  });

  const removeMutation = useMutation({
    mutationFn: (itemId) => base44.entities.WatchLater.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries(['watch-later-list']);
      toast.success('Removed from Watch Later');
    }
  });

  const getContent = (item) => {
    if (item.video_type === 'vlog') {
      return videos.find(v => v?.id === item.video_id);
    } else if (item.video_type === 'music') {
      return music.find(m => m?.id === item.video_id);
    }
    return null;
  };

  const getLink = (item) => {
    if (item.video_type === 'music') {
      return createPageUrl(`WatchVideo?id=${item.video_id}&type=music`);
    }
    return createPageUrl(`WatchVideo?id=${item.video_id}`);
  };

  const getIcon = (type) => {
    const icons = {
      vlog: Film,
      music: Music,
      affiliate: ShoppingBag,
      podcast: Mic
    };
    return icons[type] || Film;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="w-8 h-8 text-amber-400" />
          <h1 className="text-3xl font-bold text-amber-100">Watch Later</h1>
          <Badge className="bg-amber-600/30 text-amber-300">
            {watchLaterItems.length} items
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-stone-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : watchLaterItems.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {watchLaterItems.map((item, index) => {
                const content = getContent(item);
                const Icon = getIcon(item.video_type);

                if (!content) return null;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-stone-800/50 border-amber-600/20 hover:border-amber-500/40 transition-all">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Thumbnail */}
                          <Link to={getLink(item)} className="relative flex-shrink-0">
                            <div className="w-40 h-24 rounded-lg overflow-hidden bg-stone-700">
                              {(content.thumbnail_url || content.cover_url) ? (
                                <img
                                  src={content.thumbnail_url || content.cover_url}
                                  className="w-full h-full object-cover"
                                  alt=""
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Icon className="w-8 h-8 text-amber-400/50" />
                                </div>
                              )}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                              <Play className="w-10 h-10 text-white" />
                            </div>
                            {content.duration_seconds && (
                              <Badge className="absolute bottom-1 right-1 bg-black/80 text-white text-xs">
                                {Math.floor(content.duration_seconds / 60)}:{(content.duration_seconds % 60).toString().padStart(2, '0')}
                              </Badge>
                            )}
                          </Link>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Link to={getLink(item)}>
                              <h3 className="text-amber-100 font-medium hover:text-amber-300 line-clamp-2">
                                {content.title}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-stone-700/50 text-amber-300 capitalize">
                                <Icon className="w-3 h-3 mr-1" />
                                {item.video_type}
                              </Badge>
                              {content.artist && (
                                <span className="text-amber-400/70 text-sm">{content.artist}</span>
                              )}
                            </div>
                            <p className="text-amber-400/50 text-xs mt-2">
                              Added {formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeMutation.mutate(item.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="p-12 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-amber-400/30" />
              <h2 className="text-xl font-semibold text-amber-100 mb-2">Your Watch Later is empty</h2>
              <p className="text-amber-400/70 mb-6">
                Save videos to watch them later. Click the clock icon on any video.
              </p>
              <Link to={createPageUrl('TheAmphitheatre')}>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  Browse Videos
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}