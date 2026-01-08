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
  Swords, 
  Star, 
  Users, 
  ChevronRight,
  Sparkles,
  Trophy,
  Crown
} from 'lucide-react';
import { motion } from 'framer-motion';
import StreamCard from '@/components/stream/StreamCard';
import CreatorCard from '@/components/creator/CreatorCard';
import EventCard from '@/components/events/EventCard';

export default function Home() {
  const [activeTab, setActiveTab] = useState('nearby');
  const [sortBy, setSortBy] = useState('viewers');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: streams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['streams'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 50),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000
  });

  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 12),
    staleTime: 5 * 60 * 1000
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.filter({ is_active: true }, '-start_date', 4),
    staleTime: 10 * 60 * 1000
  });

  const featuredStreams = streams.filter(s => s.is_featured);
  const pkBattles = streams.filter(s => s.stream_type === 'pk_battle');
  const regularStreams = streams.filter(s => !s.is_featured && s.stream_type !== 'pk_battle');

  // Get creator data for streams
  const creatorMap = creators.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  // Sort streams based on selection
  const getSortedStreams = (streamList) => {
    const list = [...streamList];
    switch (sortBy) {
      case 'viewers':
        return list.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
      case 'gifts':
        return list.sort((a, b) => (b.total_gifts_received || 0) - (a.total_gifts_received || 0));
      case 'new':
        return list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      default:
        return list;
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 pt-16">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-stone-950/95 backdrop-blur-lg border-b border-amber-600/20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="bg-transparent border-0 p-0 gap-4 overflow-x-auto">
                <TabsTrigger 
                  value="nearby"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-amber-100 data-[state=active]:border-b-2 data-[state=active]:border-amber-500 text-amber-400/70 rounded-none pb-2 px-4"
                >
                  Nearby
                </TabsTrigger>
                <TabsTrigger 
                  value="popular"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-amber-100 data-[state=active]:border-b-2 data-[state=active]:border-amber-500 text-amber-400/70 rounded-none pb-2 px-4"
                >
                  Popular
                </TabsTrigger>
                <TabsTrigger 
                  value="featured"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-amber-100 data-[state=active]:border-b-2 data-[state=active]:border-amber-500 text-amber-400/70 rounded-none pb-2 px-4"
                >
                  Featured
                </TabsTrigger>
                <TabsTrigger 
                  value="explore"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-amber-100 data-[state=active]:border-b-2 data-[state=active]:border-amber-500 text-amber-400/70 rounded-none pb-2 px-4"
                >
                  Explore
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {streamsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl bg-stone-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {getSortedStreams(streams).map((stream, i) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
                  <div className="relative rounded-2xl overflow-hidden bg-stone-900 group cursor-pointer">
                    <div className="aspect-[3/4] relative">
                      {stream.thumbnail_url ? (
                        <img src={stream.thumbnail_url} className="w-full h-full object-cover" alt={stream.title} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-900/30 to-stone-900 flex items-center justify-center">
                          <Radio className="w-12 h-12 text-amber-400/30" />
                        </div>
                      )}
                      
                      {/* Live badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-red-500 text-white border-0 text-xs animate-pulse">
                          ● LIVE
                        </Badge>
                      </div>

                      {/* Viewer count */}
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                        <Users className="w-3 h-3 text-white" />
                        <span className="text-white text-xs font-semibold">{stream.viewer_count || 0}</span>
                      </div>

                      {/* Creator info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5">
                            <div className="w-full h-full rounded-full overflow-hidden bg-stone-800">
                              {creatorMap[stream.creator_id]?.avatar_url ? (
                                <img src={creatorMap[stream.creator_id].avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate">{creatorMap[stream.creator_id]?.display_name || 'Creator'}</p>
                            <p className="text-white/70 text-xs truncate">{stream.title}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!streamsLoading && streams.length === 0 && (
          <div className="text-center py-20">
            <Radio className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
            <h3 className="text-amber-100 text-lg font-semibold mb-2">No Live Streams</h3>
            <p className="text-amber-400/60 mb-6">Be the first to go live!</p>
            <Link to={createPageUrl('GoLive')}>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Radio className="w-4 h-4 mr-2" />
                Go Live Now
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}