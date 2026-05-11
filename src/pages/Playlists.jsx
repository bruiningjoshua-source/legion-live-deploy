import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import AmphitheatreSidebar from '@/components/amphitheatre/AmphitheatreSidebar';

export default function Playlists() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ['playlists', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const results = await base44.entities.Playlist.filter({ user_email: user.email }, '-created_date', 100);
      return results || [];
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (name) => base44.entities.Playlist.create({
      user_email: user.email,
      name: name,
      description: '',
      is_public: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setNewPlaylistName('');
      setShowCreate(false);
      toast.success('Playlist created');
    }
  });

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Playlists</h1>
            <p className="text-stone-400">{playlists.length} playlists</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                New Playlist
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-stone-900 border-stone-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Playlist name"
                  className="bg-stone-800 border-stone-700 text-white"
                  autoFocus
                />
                <Button
                  onClick={() => createMutation.mutate(newPlaylistName)}
                  disabled={!newPlaylistName || createMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {playlists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <Card key={playlist.id} className="bg-stone-800/30 border-stone-700 hover:border-amber-600/30 cursor-pointer transition-colors">
                <CardContent className="p-6">
                  <div className="w-full aspect-video bg-stone-900 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-4xl">📋</span>
                  </div>
                  <h3 className="text-white font-medium mb-2">{playlist.name}</h3>
                  <p className="text-stone-400 text-sm">{playlist.video_count || 0} videos</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="py-12 text-center">
              <p className="text-amber-400/70 mb-4">No playlists yet</p>
              <p className="text-stone-400 text-sm mb-6">Create a playlist to organize your videos</p>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Playlist
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}