import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Headphones, Search, TrendingUp, Clock, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PodcastCard from '@/components/podcast/PodcastCard';
import PodcastDetailPanel from '@/components/podcast/PodcastDetailPanel';
import PodcastAudioPlayer from '@/components/podcast/PodcastAudioPlayer';

const CATEGORIES = ['all', 'technology', 'business', 'entertainment', 'education', 'health', 'sports', 'news', 'comedy', 'music'];

export default function Podcasts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPodcast, setSelectedPodcast] = useState(null);
  const [playingEpisode, setPlayingEpisode] = useState(null);
  const [playlist, setPlaylist] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: allPodcasts = [], isLoading } = useQuery({
    queryKey: ['all-podcasts'],
    queryFn: () => base44.entities.Podcast.list('-subscriber_count', 100)
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['my-podcast-subs', user?.email],
    queryFn: () => base44.entities.PodcastSubscription.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

  const subscribedIds = new Set(subscriptions.map(s => s.podcast_id));

  const subscribeMutation = useMutation({
    mutationFn: async (podcastId) => {
      if (subscribedIds.has(podcastId)) {
        const sub = subscriptions.find(s => s.podcast_id === podcastId);
        if (sub) await base44.entities.PodcastSubscription.delete(sub.id);
      } else {
        await base44.entities.PodcastSubscription.create({ user_email: user.email, podcast_id: podcastId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-podcast-subs'] });
      toast.success('Updated subscription');
    }
  });

  const filtered = allPodcasts.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const subscribedPodcasts = allPodcasts.filter(p => subscribedIds.has(p.id));
  const trending = [...allPodcasts].sort((a, b) => (b.subscriber_count || 0) - (a.subscriber_count || 0)).slice(0, 6);

  const handlePlayEpisode = (episode, episodes) => {
    setPlayingEpisode(episode);
    setPlaylist(episodes);
    // Track play count
    base44.entities.PodcastEpisode.update(episode.id, { play_count: (episode.play_count || 0) + 1 }).catch(() => {});
  };

  const handleNext = () => {
    if (!playlist.length || !playingEpisode) return;
    const idx = playlist.findIndex(e => e.id === playingEpisode.id);
    if (idx < playlist.length - 1) handlePlayEpisode(playlist[idx + 1], playlist);
  };

  const handlePrev = () => {
    if (!playlist.length || !playingEpisode) return;
    const idx = playlist.findIndex(e => e.id === playingEpisode.id);
    if (idx > 0) handlePlayEpisode(playlist[idx - 1], playlist);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-2">
              <Headphones className="w-8 h-8 text-amber-400" />
              Podcasts
            </h1>
            <p className="text-amber-400/60 mt-1">Discover and listen to amazing podcasts</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/40" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search podcasts..."
            className="pl-10 bg-stone-800/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/30"
          />
        </div>

        {selectedPodcast ? (
          <PodcastDetailPanel
            podcast={selectedPodcast}
            isCreator={false}
            onBack={() => setSelectedPodcast(null)}
            onPlayEpisode={handlePlayEpisode}
            currentEpisodeId={playingEpisode?.id}
          />
        ) : (
          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="bg-stone-800/50 border border-amber-600/20 mb-6">
              <TabsTrigger value="browse" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300">
                <Search className="w-3 h-3 mr-1" /> Browse
              </TabsTrigger>
              <TabsTrigger value="trending" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300">
                <TrendingUp className="w-3 h-3 mr-1" /> Trending
              </TabsTrigger>
              <TabsTrigger value="subscribed" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300">
                <Star className="w-3 h-3 mr-1" /> Subscribed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse">
              {/* Category filters */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      activeCategory === cat
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-800/50 text-amber-400/60 hover:text-amber-300 border border-amber-600/20'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12"><p className="text-amber-400/50">No podcasts found</p></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filtered.map((p, i) => (
                    <PodcastCard key={p.id} podcast={p} index={i} onClick={() => setSelectedPodcast(p)} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="trending">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {trending.map((p, i) => (
                  <PodcastCard key={p.id} podcast={p} index={i} onClick={() => setSelectedPodcast(p)} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="subscribed">
              {subscribedPodcasts.length === 0 ? (
                <div className="text-center py-12">
                  <Headphones className="w-12 h-12 text-amber-400/20 mx-auto mb-3" />
                  <p className="text-amber-400/50">No subscriptions yet. Browse and subscribe to podcasts you love!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {subscribedPodcasts.map((p, i) => (
                    <PodcastCard key={p.id} podcast={p} index={i} onClick={() => setSelectedPodcast(p)} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Audio Player */}
      {playingEpisode && (
        <PodcastAudioPlayer
          episode={playingEpisode}
          coverFallback={selectedPodcast?.cover_art_url || allPodcasts.find(p => p.id === playingEpisode.podcast_id)?.cover_art_url}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={() => setPlayingEpisode(null)}
        />
      )}
    </div>
  );
}