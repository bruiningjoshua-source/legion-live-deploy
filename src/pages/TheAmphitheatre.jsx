import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Music, 
  Search, 
  Lock,
  Play,
  Heart,
  Share2,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MusicPlayer from '@/components/music/MusicPlayer';
import MusicCard from '@/components/music/MusicCard';

const genres = [
  { value: 'all', label: 'All Genres' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'hip_hop', label: 'Hip Hop' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'indie', label: 'Indie' },
  { value: 'r_and_b', label: 'R&B' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'classical', label: 'Classical' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'other', label: 'Other' }
];

export default function TheAmphitheatre() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [currentTrack, setCurrentTrack] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: subscription } = useQuery({
    queryKey: ['creator-subscription', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      try {
        const result = await base44.functions.invoke('checkSubscription', { userEmail: user.email });
        return result.data;
      } catch (error) {
        return null;
      }
    },
    enabled: !!user?.email
  });

  const { data: music = [], isLoading } = useQuery({
    queryKey: ['published-music'],
    queryFn: () => base44.entities.Music.filter({ is_published: true }, '-created_date', 100),
    enabled: !!subscription?.has_access
  });

  const filteredMusic = useMemo(() => {
    return music.filter(track => {
      const matchesSearch = !searchQuery ||
        track.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === 'all' || track.genre === selectedGenre;
      return matchesSearch && matchesGenre;
    });
  }, [music, searchQuery, selectedGenre]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">The Amphitheatre</h1>
          <p className="text-amber-400/70 mb-6">Please log in to access</p>
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-amber-600 hover:bg-amber-700">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!subscription?.has_access) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 flex items-center justify-center">
        <div className="max-w-md text-center">
          <Lock className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">The Amphitheatre</h1>
          <p className="text-amber-400/70 mb-6">Premium music & video streaming for creators</p>
          <p className="text-sm text-amber-300/70 mb-6">Subscribe to monetization ($5 or $12/year) to unlock</p>
          <Button 
            onClick={() => navigate(createPageUrl('CreatorMonetization'))}
            className="bg-amber-600 hover:bg-amber-700 w-full"
          >
            Subscribe Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-amber-100">The Amphitheatre</h1>
              <p className="text-amber-400/70">Music & videos from creators</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player */}
            {currentTrack && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-stone-800/50 border border-amber-600/20 rounded-2xl p-4"
              >
                <MusicPlayer track={currentTrack} onClose={() => setCurrentTrack(null)} />
              </motion.div>
            )}

            {/* Search & Filter */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400/50" />
                <Input
                  placeholder="Search songs, artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-stone-800/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40 rounded-xl"
                />
              </div>

              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="bg-stone-800/50 border-amber-600/20 text-amber-100">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-600/30">
                  {genres.map(genre => (
                    <SelectItem key={genre.value} value={genre.value} className="text-amber-100 focus:bg-amber-800/30">
                      {genre.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Music Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl bg-stone-800" />
                ))}
              </div>
            ) : filteredMusic.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filteredMusic.map((track, i) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <MusicCard 
                        track={track} 
                        onPlay={() => setCurrentTrack(track)}
                        isNowPlaying={currentTrack?.id === track.id}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-amber-600/20">
                <Music className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                <h3 className="text-amber-100 font-semibold text-lg mb-2">No music found</h3>
                <p className="text-amber-400/60">Try adjusting your search</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Uploads Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-amber-600/20 to-amber-700/10 border border-amber-600/30 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-5 h-5 text-amber-400" />
                <h3 className="text-amber-100 font-semibold">Upload Music</h3>
              </div>
              <p className="text-amber-400/70 text-sm mb-4">Share your music & videos with the community</p>
              <Button 
                onClick={() => navigate(createPageUrl('MusicStudio'))}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                Upload Now
              </Button>
            </motion.div>

            {/* Stats */}
            <div className="bg-stone-800/50 border border-amber-600/20 rounded-2xl p-4 space-y-3">
              <div>
                <div className="text-2xl font-bold text-amber-100">{filteredMusic.length}</div>
                <div className="text-xs text-amber-400/70">Tracks Available</div>
              </div>
              <div className="h-px bg-amber-600/20" />
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-600/20 text-amber-200 border-amber-500/30">Premium</Badge>
              </div>
            </div>

            {/* Genre Distribution */}
            <div className="bg-stone-800/50 border border-amber-600/20 rounded-2xl p-4">
              <h4 className="text-amber-100 font-semibold text-sm mb-3">Popular Genres</h4>
              <div className="space-y-2">
                {genres.slice(1).map(genre => {
                  const count = music.filter(t => t.genre === genre.value).length;
                  return (
                    <div key={genre.value} className="flex items-center justify-between text-xs">
                      <span className="text-amber-400/70">{genre.label}</span>
                      <Badge variant="outline" className="border-amber-500/30 text-amber-300">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}