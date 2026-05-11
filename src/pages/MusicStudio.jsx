import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Music,
  X,
  Trash2,
  Film,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import RemixStudio from '@/components/music/RemixStudio';
import StudioAudioEditor from '@/components/podcast/StudioAudioEditor';
import { Globe } from 'lucide-react';

const genres = [
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

export default function MusicStudio() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('upload');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isMusicVideo, setIsMusicVideo] = useState(false);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: myMusic = [], isLoading } = useQuery({
    queryKey: ['my-music', user?.email],
    queryFn: () => base44.entities.Music.filter({ creator_id: user?.email }, '-created_date', 50),
    enabled: !!user?.email
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      return result.file_url;
    }
  });

  const createMusicMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Music.create({
        creator_id: user.email,
        title,
        artist: artist || user.full_name,
        description,
        genre,
        audio_url: audioUrl,
        cover_url: coverUrl,
        video_url: videoUrl || null,
        is_music_video: isMusicVideo,
        tags,
        is_published: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-music'] });
      resetForm();
    }
  });

  const publishMutation = useMutation({
    mutationFn: (musicId) => base44.entities.Music.update(musicId, { is_published: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-music'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (musicId) => base44.entities.Music.delete(musicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-music'] })
  });

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadMutation.mutateAsync(file);
      setAudioUrl(url);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadMutation.mutateAsync(file);
      setCoverUrl(url);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadMutation.mutateAsync(file);
      setVideoUrl(url);
    }
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag) && tags.length < 5) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setDescription('');
    setGenre('');
    setAudioUrl('');
    setCoverUrl('');
    setVideoUrl('');
    setIsMusicVideo(false);
    setTags([]);
  };

  const isFormValid = title.trim() && audioUrl && genre;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-600/20 border border-amber-500/30 rounded-full px-4 py-2 mb-4">
            <Music className="w-4 h-4 text-amber-400" />
            <span className="text-amber-200 text-sm font-medium">Music Studio</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Upload Your Music</h1>
          <p className="text-amber-400/70">Share your tracks with The Amphitheatre</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-stone-800/50 border border-amber-600/20 w-full grid grid-cols-4">
            <TabsTrigger value="upload" className="data-[state=active]:bg-amber-600">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-amber-600">
              <Music className="w-4 h-4 mr-2" />
              My Library
            </TabsTrigger>
            <TabsTrigger value="remix" className="data-[state=active]:bg-amber-600">
              <Zap className="w-4 h-4 mr-2" />
              Remix Studio
            </TabsTrigger>
            <TabsTrigger value="daw" className="data-[state=active]:bg-amber-600">
              <Music className="w-4 h-4 mr-2" />
              DAW Editor
            </TabsTrigger>
            <TabsTrigger value="distribute" className="data-[state=active]:bg-amber-600">
              <Globe className="w-4 h-4 mr-2" />
              Distribute
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Upload Music</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-2">
                  <Label className="text-amber-200">Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Song title..."
                    className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-amber-200">Artist</Label>
                    <Input
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      placeholder="Your name or stage name"
                      className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-amber-200">Genre *</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger className="bg-stone-900/50 border-amber-600/20 text-amber-100">
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent className="bg-stone-900 border-amber-600/30">
                        {genres.map(g => (
                          <SelectItem key={g.value} value={g.value} className="text-amber-100 focus:bg-amber-800/30">
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-200">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell people about your song..."
                    className="bg-stone-900/50 border-amber-600/20 text-amber-100 min-h-[100px]"
                  />
                </div>

                {/* Audio Upload */}
                <div className="space-y-2">
                  <Label className="text-amber-200">Audio File *</Label>
                  {audioUrl ? (
                    <div className="flex items-center justify-between bg-stone-900/50 border border-amber-600/20 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Music className="w-5 h-5 text-amber-400" />
                        <span className="text-amber-100 text-sm">Audio uploaded</span>
                      </div>
                      <button
                        onClick={() => setAudioUrl('')}
                        className="text-amber-400 hover:text-amber-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-amber-600/30 rounded-lg cursor-pointer hover:border-amber-500/50 transition-colors">
                      <div className="text-center">
                        <Music className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
                        <span className="text-amber-400/70 text-sm">Upload audio</span>
                      </div>
                      <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} disabled={uploadMutation.isPending} />
                    </label>
                  )}
                </div>

                {/* Cover Upload */}
                <div className="space-y-2">
                  <Label className="text-amber-200">Cover Art</Label>
                  {coverUrl ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                      <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setCoverUrl('')}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-amber-600/30 rounded-lg cursor-pointer hover:border-amber-500/50 transition-colors">
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-amber-400/50 mx-auto" />
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadMutation.isPending} />
                    </label>
                  )}
                </div>

                {/* Music Video Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-amber-200">This is a Music Video</Label>
                    <input
                      type="checkbox"
                      checked={isMusicVideo}
                      onChange={(e) => setIsMusicVideo(e.target.checked)}
                      className="w-5 h-5"
                    />
                  </div>

                  {isMusicVideo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Label className="text-amber-200 flex items-center gap-2">
                        <Film className="w-4 h-4" />
                        Video File
                      </Label>
                      {videoUrl ? (
                        <div className="flex items-center justify-between bg-stone-900/50 border border-amber-600/20 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <Film className="w-5 h-5 text-amber-400" />
                            <span className="text-amber-100 text-sm">Video uploaded</span>
                          </div>
                          <button
                            onClick={() => setVideoUrl('')}
                            className="text-amber-400 hover:text-amber-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-amber-600/30 rounded-lg cursor-pointer hover:border-amber-500/50 transition-colors">
                          <div className="text-center">
                            <Film className="w-6 h-6 text-amber-400/50 mx-auto mb-1" />
                            <span className="text-amber-400/70 text-sm">Upload video</span>
                          </div>
                          <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadMutation.isPending} />
                        </label>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-amber-200">Tags (up to 5)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button onClick={addTag} disabled={!newTag || tags.length >= 5} className="bg-amber-600 hover:bg-amber-700">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map(tag => (
                        <Badge key={tag} className="bg-amber-600/20 text-amber-200 border-amber-500/30">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => createMusicMutation.mutate()}
                  disabled={!isFormValid || createMusicMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 font-semibold disabled:opacity-50"
                >
                  {createMusicMutation.isPending ? 'Uploading...' : 'Upload to Studio'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library" className="mt-6">
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <Music className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                  <p className="text-amber-400/70">Loading...</p>
                </div>
              ) : myMusic.length > 0 ? (
                myMusic.map((track) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-stone-800/50 border border-amber-600/20 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {track.cover_url && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-amber-100 font-semibold truncate">{track.title}</h3>
                        <p className="text-amber-400/70 text-sm truncate">{track.artist}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={track.is_published ? 'border-green-500 text-green-400' : 'border-yellow-500 text-yellow-400'}>
                          {track.is_published ? '✓ Published' : 'Draft'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!track.is_published && (
                        <Button
                          size="sm"
                          onClick={() => publishMutation.mutate(track.id)}
                          disabled={publishMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Publish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm('Delete this track?')) {
                            deleteMutation.mutate(track.id);
                          }
                        }}
                        className="text-red-400 hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 bg-stone-800/30 rounded-lg border border-amber-600/20">
                  <Music className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                  <h3 className="text-amber-100 font-semibold text-lg mb-2">No tracks yet</h3>
                  <p className="text-amber-400/60">Upload your first track to get started</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="remix" className="mt-6">
            <RemixStudio onRecordingComplete={(recording) => {
              console.log('Recording complete:', recording);
            }} />
          </TabsContent>

          <TabsContent value="daw" className="mt-6">
            {myMusic.length > 0 ? (
              <div className="space-y-4">
                <p className="text-amber-200/60 text-sm">Select a track from your library to edit in the DAW</p>
                {myMusic.map(track => (
                  <div key={track.id} className="bg-stone-800/30 border border-amber-600/20 rounded-xl p-4">
                    <p className="text-amber-100 font-semibold mb-3">{track.title}</p>
                    {track.audio_url && <StudioAudioEditor audioUrl={track.audio_url} onExport={(url) => {
                      publishMutation.mutate(track.id);
                    }} />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-stone-800/30 rounded-lg border border-amber-600/20">
                <Music className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                <h3 className="text-amber-100 font-semibold text-lg mb-2">No tracks to edit</h3>
                <p className="text-amber-400/60">Upload a track first to open it in the DAW editor</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="distribute" className="mt-6">
            <div className="space-y-4">
              <div className="bg-stone-800/30 border border-amber-600/20 rounded-xl p-6">
                <h3 className="text-amber-100 font-bold text-lg mb-2">Distribute Your Music</h3>
                <p className="text-amber-400/60 text-sm mb-6">Push your published tracks to major streaming platforms</p>
                <div className="space-y-3">
                  {[
                    { name: 'Spotify', color: '#1db954', desc: 'World\'s largest streaming platform', emoji: '🟢' },
                    { name: 'Apple Music', color: '#fc3c44', desc: 'Reach 1 billion Apple users', emoji: '🍎' },
                    { name: 'YouTube Music', color: '#ff0000', desc: 'Largest music video platform', emoji: '▶️' },
                    { name: 'Amazon Music', color: '#00a8e1', desc: 'Alexa and Prime integration', emoji: '📦' },
                    { name: 'Tidal', color: '#00ffff', desc: 'Hi-fi lossless streaming', emoji: '🌊' },
                    { name: 'Deezer', color: '#a238ff', desc: '16 million tracks worldwide', emoji: '🎵' },
                    { name: 'SoundCloud', color: '#ff5500', desc: 'Independent artist platform', emoji: '☁️' },
                    { name: 'TikTok Music', color: '#010101', desc: 'Viral music discovery', emoji: '🎶' },
                  ].map(platform => (
                    <div key={platform.name} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{platform.emoji}</span>
                        <div>
                          <p className="text-white font-medium text-sm">{platform.name}</p>
                          <p className="text-white/30 text-xs">{platform.desc}</p>
                        </div>
                      </div>
                      <button className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all"
                        style={{ borderColor: platform.color + '60', color: platform.color, backgroundColor: platform.color + '15' }}
                        onClick={() => alert(`Distribution to ${platform.name} requires a DistroKid or TuneCore account. Connect your account in Settings to enable automatic distribution.`)}>
                        Connect
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-200 text-xs font-semibold mb-1">💡 How distribution works</p>
                  <p className="text-amber-200/60 text-xs">Connect your DistroKid or TuneCore account in Settings. Once connected, published tracks automatically distribute to all selected platforms within 24-48 hours. You keep 100% of your royalties.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}