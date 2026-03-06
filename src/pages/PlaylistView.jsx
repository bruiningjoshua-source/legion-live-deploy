import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  Music, 
  Plus,
  Trash2,
  Clock,
  Shuffle,
  Repeat,
  Search,
  Volume2,
  ListMusic,
  GripVertical
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Slider } from "@/components/ui/slider";

export default function PlaylistView() {
  const queryClient = useQueryClient();
  const audioRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const playlistId = urlParams.get('id');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // off, all, one
  const [showAddTracks, setShowAddTracks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: playlist } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      const playlists = await base44.entities.Playlist.filter({ id: playlistId }, null, 1);
      return playlists[0];
    },
    enabled: !!playlistId
  });

  const { data: playlistTracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ['playlist-tracks', playlistId],
    queryFn: () => base44.entities.PlaylistTrack.filter({ playlist_id: playlistId }, 'position', 500),
    enabled: !!playlistId
  });

  const { data: musicLibrary = [] } = useQuery({
    queryKey: ['music-library'],
    queryFn: () => base44.entities.Music.filter({ is_published: true }, '-created_date', 200),
    staleTime: 5 * 60 * 1000
  });

  // Map track IDs to music data
  const tracksWithData = playlistTracks.map(track => {
    const music = musicLibrary.find(m => m.id === track.music_id);
    return { ...track, music };
  }).filter(t => t.music);

  const currentTrack = tracksWithData[currentTrackIndex]?.music;

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (currentTrackIndex < tracksWithData.length - 1) {
        playNext();
      } else if (repeat === 'all') {
        setCurrentTrackIndex(0);
        setTimeout(() => audio.play(), 100);
      } else {
        setIsPlaying(false);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [currentTrackIndex, tracksWithData.length, repeat]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Play track when index changes
  useEffect(() => {
    if (currentTrack && audioRef.current && isPlaying) {
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
    }
  }, [currentTrackIndex, currentTrack?.id]);

  const togglePlay = () => {
    if (!currentTrack) {
      if (tracksWithData.length > 0) {
        setCurrentTrackIndex(0);
        setIsPlaying(true);
        setTimeout(() => audioRef.current?.play(), 100);
      }
      return;
    }
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
  };

  const playTrack = (index) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setTimeout(() => audioRef.current?.play(), 100);
  };

  const playNext = () => {
    if (shuffle) {
      const nextIndex = Math.floor(Math.random() * tracksWithData.length);
      setCurrentTrackIndex(nextIndex);
    } else {
      setCurrentTrackIndex(prev => (prev + 1) % tracksWithData.length);
    }
  };

  const playPrev = () => {
    if (currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else {
      setCurrentTrackIndex(prev => prev === 0 ? tracksWithData.length - 1 : prev - 1);
    }
  };

  const handleSeek = (value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const addTrackMutation = useMutation({
    mutationFn: async (musicId) => {
      const music = musicLibrary.find(m => m.id === musicId);
      await base44.entities.PlaylistTrack.create({
        playlist_id: playlistId,
        music_id: musicId,
        position: playlistTracks.length,
        added_by: user.email,
        duration_seconds: music?.duration_seconds || 0
      });
      // Update playlist stats
      await base44.entities.Playlist.update(playlistId, {
        track_count: playlistTracks.length + 1,
        total_duration_seconds: (playlist?.total_duration_seconds || 0) + (music?.duration_seconds || 0)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playlist-tracks', playlistId]);
      queryClient.invalidateQueries(['playlist', playlistId]);
      toast.success('Track added!');
    }
  });

  const removeTrackMutation = useMutation({
    mutationFn: async (trackId) => {
      const track = playlistTracks.find(t => t.id === trackId);
      await base44.entities.PlaylistTrack.delete(trackId);
      await base44.entities.Playlist.update(playlistId, {
        track_count: Math.max((playlist?.track_count || 1) - 1, 0),
        total_duration_seconds: Math.max((playlist?.total_duration_seconds || 0) - (track?.duration_seconds || 0), 0)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playlist-tracks', playlistId]);
      queryClient.invalidateQueries(['playlist', playlistId]);
      toast.success('Track removed');
    }
  });

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isOwner = user?.email === playlist?.creator_id;

  const filteredLibrary = musicLibrary.filter(m => 
    !playlistTracks.some(t => t.music_id === m.id) &&
    (m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     m.artist?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!playlist) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 flex items-center justify-center">
        <Skeleton className="w-64 h-64 rounded-xl bg-stone-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-40">
      <audio ref={audioRef} src={currentTrack?.audio_url || currentTrack?.video_url} />

      <div className="max-w-5xl mx-auto px-4">
        {/* Playlist Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-48 h-48 bg-gradient-to-br from-purple-600/30 to-stone-900 rounded-xl flex items-center justify-center flex-shrink-0">
            {playlist.thumbnail_url ? (
              <img src={playlist.thumbnail_url} className="w-full h-full object-cover rounded-xl" alt="" />
            ) : (
              <ListMusic className="w-20 h-20 text-purple-400/50" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-amber-400/60 text-sm uppercase tracking-wide mb-1">Playlist</p>
            <h1 className="text-3xl font-bold text-amber-100 mb-2">{playlist.title}</h1>
            {playlist.description && (
              <p className="text-amber-400/70 mb-3">{playlist.description}</p>
            )}
            <div className="flex items-center gap-3 text-amber-400/60 text-sm mb-4">
              <Badge className="bg-purple-600/20 text-purple-300 capitalize">{playlist.genre?.replace('_', ' ')}</Badge>
              <span>{playlist.track_count || 0} tracks</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(playlist.total_duration_seconds)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={togglePlay} size="lg" className="bg-purple-600 hover:bg-purple-700 rounded-full px-8">
                {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                onClick={() => setShuffle(!shuffle)}
                variant="outline"
                size="icon"
                className={`rounded-full ${shuffle ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'border-amber-600/30 text-amber-300'}`}
              >
                <Shuffle className="w-4 h-4" />
              </Button>
              {isOwner && (
                <Button onClick={() => setShowAddTracks(true)} variant="outline" className="border-amber-600/30 text-amber-300">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tracks
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Track List */}
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardContent className="p-0">
            {tracksLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 bg-stone-800" />
                ))}
              </div>
            ) : tracksWithData.length > 0 ? (
              <div className="divide-y divide-amber-600/10">
                {tracksWithData.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`flex items-center gap-4 p-4 hover:bg-stone-800/50 transition-colors cursor-pointer group ${
                      currentTrackIndex === index ? 'bg-purple-600/20' : ''
                    }`}
                    onClick={() => playTrack(index)}
                  >
                    <span className="w-6 text-amber-400/50 text-sm text-center">
                      {currentTrackIndex === index && isPlaying ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="w-1 h-3 bg-purple-400 animate-pulse" />
                          <span className="w-1 h-4 bg-purple-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <span className="w-1 h-2 bg-purple-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="w-12 h-12 bg-stone-900 rounded flex-shrink-0 overflow-hidden">
                      {track.music?.cover_url ? (
                        <img src={track.music.cover_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-5 h-5 text-amber-400/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${currentTrackIndex === index ? 'text-purple-300' : 'text-amber-100'}`}>
                        {track.music?.title}
                      </p>
                      <p className="text-amber-400/60 text-sm truncate">{track.music?.artist || 'Unknown Artist'}</p>
                    </div>
                    <span className="text-amber-400/50 text-sm">{formatTime(track.music?.duration_seconds)}</span>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); removeTrackMutation.mutate(track.id); }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-600/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Music className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                <p className="text-amber-100 font-semibold mb-2">No tracks yet</p>
                <p className="text-amber-400/60 text-sm mb-4">Add music to this playlist</p>
                {isOwner && (
                  <Button onClick={() => setShowAddTracks(true)} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tracks
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="fixed bottom-16 left-0 right-0 bg-stone-900/95 backdrop-blur-lg border-t border-amber-600/20 p-3 z-40">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <div className="w-12 h-12 bg-stone-800 rounded flex-shrink-0 overflow-hidden">
              {currentTrack.cover_url ? (
                <img src={currentTrack.cover_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-5 h-5 text-amber-400/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-amber-100 font-medium truncate text-sm">{currentTrack.title}</p>
              <p className="text-amber-400/60 text-xs truncate">{currentTrack.artist}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={playPrev} className="text-amber-200 hover:text-white h-8 w-8">
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button onClick={togglePlay} size="icon" className="bg-purple-600 hover:bg-purple-700 rounded-full h-10 w-10">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={playNext} className="text-amber-200 hover:text-white h-8 w-8">
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
              <span className="text-amber-400/60 text-xs w-10 text-right">{formatTime(currentTime)}</span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-amber-400/60 text-xs w-10">{formatTime(duration)}</span>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
                className={`h-8 w-8 ${repeat !== 'off' ? 'text-purple-400' : 'text-amber-400/60'}`}
              >
                <Repeat className="w-4 h-4" />
                {repeat === 'one' && <span className="absolute text-[8px] font-bold">1</span>}
              </Button>
              <Volume2 className="w-4 h-4 text-amber-400/60" />
              <Slider
                value={[volume]}
                max={1}
                step={0.01}
                onValueChange={(v) => setVolume(v[0])}
                className="w-20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Tracks Dialog */}
      <Dialog open={showAddTracks} onOpenChange={setShowAddTracks}>
        <DialogContent className="bg-stone-900 border-amber-600/30 max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Add Tracks</DialogTitle>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
            <Input
              placeholder="Search music..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-stone-800 border-amber-600/20 text-amber-100"
            />
          </div>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredLibrary.map(music => (
                <div
                  key={music.id}
                  className="flex items-center gap-3 p-3 bg-stone-800/50 rounded-lg hover:bg-stone-800 transition-colors"
                >
                  <div className="w-10 h-10 bg-stone-900 rounded flex-shrink-0 overflow-hidden">
                    {music.cover_url ? (
                      <img src={music.cover_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-4 h-4 text-amber-400/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-100 font-medium text-sm truncate">{music.title}</p>
                    <p className="text-amber-400/60 text-xs truncate">{music.artist}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addTrackMutation.mutate(music.id)}
                    disabled={addTrackMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {filteredLibrary.length === 0 && (
                <p className="text-amber-400/60 text-center py-8">No tracks found</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}