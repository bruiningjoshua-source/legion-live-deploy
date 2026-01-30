import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Music, 
  Play, 
  ListMusic, 
  Globe, 
  Lock,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const GENRES = ['electronic', 'hip_hop', 'pop', 'rock', 'indie', 'r_and_b', 'jazz', 'classical', 'ambient', 'other'];
const MOODS = ['chill', 'energetic', 'focus', 'party', 'relax', 'workout', 'gaming', 'studying'];

export default function Playlists() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ title: '', genre: 'other', is_public: true });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: myPlaylists = [], isLoading } = useQuery({
    queryKey: ['my-playlists', user?.email],
    queryFn: () => base44.entities.Playlist.filter({ creator_id: user.email }, '-created_date', 50),
    enabled: !!user?.email
  });

  const { data: publicPlaylists = [] } = useQuery({
    queryKey: ['public-playlists'],
    queryFn: () => base44.entities.Playlist.filter({ is_public: true, is_featured: true }, '-follower_count', 20),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.Playlist.create({
      ...newPlaylist,
      creator_id: user.email,
      track_count: 0,
      total_duration_seconds: 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-playlists']);
      setShowCreate(false);
      setNewPlaylist({ title: '', genre: 'other', is_public: true });
      toast.success('Playlist created!');
    }
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '0 min';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-amber-100 flex items-center gap-3">
              <ListMusic className="w-7 h-7 text-purple-400" />
              My Playlists
            </h1>
            <p className="text-amber-400/70 text-sm">Create and manage your music playlists</p>
          </div>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Playlist
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-stone-900 border-amber-600/30">
              <DialogHeader>
                <DialogTitle className="text-amber-100">Create Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Playlist name"
                  value={newPlaylist.title}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, title: e.target.value })}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                />
                <Select value={newPlaylist.genre} onValueChange={(v) => setNewPlaylist({ ...newPlaylist, genre: v })}>
                  <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-amber-600/30">
                    {GENRES.map(g => (
                      <SelectItem key={g} value={g} className="text-amber-100 capitalize">
                        {g.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-4">
                  <Button
                    variant={newPlaylist.is_public ? 'default' : 'outline'}
                    onClick={() => setNewPlaylist({ ...newPlaylist, is_public: true })}
                    className={newPlaylist.is_public ? 'bg-green-600' : 'border-amber-600/30 text-amber-300'}
                    size="sm"
                  >
                    <Globe className="w-4 h-4 mr-2" /> Public
                  </Button>
                  <Button
                    variant={!newPlaylist.is_public ? 'default' : 'outline'}
                    onClick={() => setNewPlaylist({ ...newPlaylist, is_public: false })}
                    className={!newPlaylist.is_public ? 'bg-stone-600' : 'border-amber-600/30 text-amber-300'}
                    size="sm"
                  >
                    <Lock className="w-4 h-4 mr-2" /> Private
                  </Button>
                </div>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newPlaylist.title || createMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Create Playlist
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* My Playlists */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl bg-stone-800" />
            ))}
          </div>
        ) : myPlaylists.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
            {myPlaylists.map((playlist, i) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={createPageUrl(`PlaylistView?id=${playlist.id}`)}>
                  <Card className="bg-stone-800/50 border-amber-600/20 hover:border-purple-500/50 transition-all cursor-pointer group overflow-hidden">
                    <div className="aspect-square bg-gradient-to-br from-purple-600/30 to-stone-900 flex items-center justify-center relative">
                      {playlist.thumbnail_url ? (
                        <img src={playlist.thumbnail_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <Music className="w-16 h-16 text-purple-400/50" />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                      {!playlist.is_public && (
                        <Badge className="absolute top-2 right-2 bg-stone-800/80">
                          <Lock className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="text-amber-100 font-semibold truncate">{playlist.title}</h3>
                      <div className="flex items-center gap-2 text-amber-400/60 text-xs mt-1">
                        <span>{playlist.track_count || 0} tracks</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(playlist.total_duration_seconds)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-stone-800/30 rounded-2xl border border-purple-600/20 mb-12">
            <ListMusic className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
            <h3 className="text-amber-100 font-semibold text-lg mb-2">No Playlists Yet</h3>
            <p className="text-amber-400/60 mb-4">Create your first playlist to organize your music</p>
            <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Playlist
            </Button>
          </div>
        )}

        {/* Featured Playlists */}
        {publicPlaylists.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-amber-100 mb-4">Featured Playlists</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {publicPlaylists.map((playlist, i) => (
                <motion.div
                  key={playlist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={createPageUrl(`PlaylistView?id=${playlist.id}`)}>
                    <Card className="bg-stone-800/50 border-amber-600/20 hover:border-purple-500/50 transition-all cursor-pointer group overflow-hidden">
                      <div className="aspect-square bg-gradient-to-br from-purple-600/30 to-stone-900 flex items-center justify-center relative">
                        {playlist.thumbnail_url ? (
                          <img src={playlist.thumbnail_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Music className="w-16 h-16 text-purple-400/50" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="text-amber-100 font-semibold truncate">{playlist.title}</h3>
                        <p className="text-amber-400/60 text-xs">{playlist.track_count || 0} tracks</p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}