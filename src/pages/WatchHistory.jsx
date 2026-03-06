import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { History, Play, Trash2, Search, Film, Music, Radio, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function WatchHistoryPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: historyItems = [], isLoading } = useQuery({
    queryKey: ['watch-history', user?.email],
    queryFn: () => base44.entities.WatchHistory.filter(
      { user_email: user.email },
      '-watched_at',
      200
    ),
    enabled: !!user?.email
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['history-videos', historyItems.map(i => i.video_id)],
    queryFn: async () => {
      const videoIds = historyItems.filter(i => i.video_type === 'vlog').map(i => i.video_id);
      if (videoIds.length === 0) return [];
      
      const vids = await Promise.all(
        videoIds.map(async (id) => {
          const result = await base44.entities.VlogVideo.filter({ id }, null, 1);
          return result[0];
        })
      );
      return vids.filter(Boolean);
    },
    enabled: historyItems.length > 0
  });

  const { data: musicItems = [] } = useQuery({
    queryKey: ['history-music', historyItems.map(i => i.video_id)],
    queryFn: async () => {
      const musicIds = historyItems.filter(i => i.video_type === 'music').map(i => i.video_id);
      if (musicIds.length === 0) return [];
      
      const tracks = await Promise.all(
        musicIds.map(async (id) => {
          const result = await base44.entities.Music.filter({ id }, null, 1);
          return result[0];
        })
      );
      return tracks.filter(Boolean);
    },
    enabled: historyItems.length > 0
  });

  const removeMutation = useMutation({
    mutationFn: (itemId) => base44.entities.WatchHistory.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries(['watch-history']);
      toast.success('Removed from history');
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(historyItems.map(item => 
        base44.entities.WatchHistory.delete(item.id)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['watch-history']);
      toast.success('History cleared');
    }
  });

  const getContent = (item) => {
    if (item.video_type === 'vlog') {
      return videos.find(v => v?.id === item.video_id);
    } else if (item.video_type === 'music') {
      return musicItems.find(m => m?.id === item.video_id);
    }
    return null;
  };

  const getLink = (item) => {
    if (item.video_type === 'music') {
      return createPageUrl(`WatchVideo?id=${item.video_id}&type=music`);
    } else if (item.video_type === 'stream') {
      return createPageUrl(`WatchStream?id=${item.video_id}`);
    }
    return createPageUrl(`WatchVideo?id=${item.video_id}`);
  };

  const getIcon = (type) => {
    const icons = {
      vlog: Film,
      music: Music,
      stream: Radio
    };
    return icons[type] || Film;
  };

  // Group by date
  const groupedHistory = historyItems.reduce((groups, item) => {
    const content = getContent(item);
    if (!content) return groups;
    
    // Filter by search
    if (searchQuery && !content.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return groups;
    }

    const date = new Date(item.watched_at || item.created_date);
    let groupKey;
    
    if (isToday(date)) {
      groupKey = 'Today';
    } else if (isYesterday(date)) {
      groupKey = 'Yesterday';
    } else if (isThisWeek(date)) {
      groupKey = 'This Week';
    } else {
      groupKey = format(date, 'MMMM yyyy');
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push({ ...item, content });
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-amber-400" />
            <h1 className="text-3xl font-bold text-amber-100">Watch History</h1>
          </div>
          {historyItems.length > 0 && (
            <Button
              variant="outline"
              onClick={() => clearAllMutation.mutate()}
              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
          <Input
            placeholder="Search watch history..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-stone-800/50 border-amber-600/30 text-amber-100"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-stone-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : Object.keys(groupedHistory).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedHistory).map(([group, items]) => (
              <div key={group}>
                <h2 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {group}
                </h2>
                <div className="space-y-2">
                    {items.map((item, index) => {
                      const Icon = getIcon(item.video_type);

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
                        >
                          <Card className="bg-stone-800/30 border-amber-600/10 hover:border-amber-500/30 transition-all">
                            <CardContent className="p-3">
                              <div className="flex gap-3">
                                {/* Thumbnail */}
                                <Link to={getLink(item)} className="relative flex-shrink-0">
                                  <div className="w-32 h-20 rounded-lg overflow-hidden bg-stone-700">
                                    {(item.content.thumbnail_url || item.content.cover_url) ? (
                                      <img
                                        src={item.content.thumbnail_url || item.content.cover_url}
                                        className="w-full h-full object-cover"
                                        alt=""
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Icon className="w-6 h-6 text-amber-400/50" />
                                      </div>
                                    )}
                                  </div>
                                  {/* Progress bar */}
                                  {item.progress_percent > 0 && item.progress_percent < 95 && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-900">
                                      <div 
                                        className="h-full bg-red-500"
                                        style={{ width: `${item.progress_percent}%` }}
                                      />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                                    <Play className="w-8 h-8 text-white" />
                                  </div>
                                </Link>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <Link to={getLink(item)}>
                                    <h3 className="text-amber-100 font-medium text-sm hover:text-amber-300 line-clamp-2">
                                      {item.content.title}
                                    </h3>
                                  </Link>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className="bg-stone-700/50 text-amber-300/70 text-xs capitalize">
                                      <Icon className="w-2.5 h-2.5 mr-1" />
                                      {item.video_type}
                                    </Badge>
                                    {item.completed && (
                                      <Badge className="bg-green-600/20 text-green-400 text-xs">
                                        Watched
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-amber-400/40 text-xs mt-1">
                                    {format(new Date(item.watched_at || item.created_date), 'h:mm a')}
                                  </p>
                                </div>

                                {/* Actions */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeMutation.mutate(item.id)}
                                  className="text-stone-500 hover:text-red-400 h-8 w-8"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="p-12 text-center">
              <History className="w-16 h-16 mx-auto mb-4 text-amber-400/30" />
              <h2 className="text-xl font-semibold text-amber-100 mb-2">
                {searchQuery ? 'No results found' : 'No watch history yet'}
              </h2>
              <p className="text-amber-400/70 mb-6">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Videos you watch will appear here'}
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