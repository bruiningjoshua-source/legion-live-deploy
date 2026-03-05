import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Radio,
  Upload,
  Plus,
  Settings,
  TrendingUp,
  Headphones,
  BarChart3,
  Loader2,
  Square,
  Pause,
  Play,
  Trash2,
  Clock,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import PodcastCard from '@/components/podcast/PodcastCard';
import PodcastDetailPanel from '@/components/podcast/PodcastDetailPanel';
import PodcastAudioPlayer from '@/components/podcast/PodcastAudioPlayer';

const CATEGORIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'education', label: 'Education' },
  { value: 'health', label: 'Health' },
  { value: 'sports', label: 'Sports' },
  { value: 'news', label: 'News' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'music', label: 'Music' },
  { value: 'other', label: 'Other' },
];

export default function PodcastStudio() {
  const queryClient = useQueryClient();
  const [showNewPodcast, setShowNewPodcast] = useState(false);
  const [editingPodcast, setEditingPodcast] = useState(null);
  const [selectedPodcast, setSelectedPodcast] = useState(null);
  const [playingEpisode, setPlayingEpisode] = useState(null);
  const [playlist, setPlaylist] = useState([]);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: podcasts = [], isLoading } = useQuery({
    queryKey: ['my-podcasts', creator?.id],
    queryFn: () => base44.entities.Podcast.filter({ creator_id: creator.id }),
    enabled: !!creator?.id
  });

  // Podcast form
  const [podForm, setPodForm] = useState({
    title: '', description: '', category: 'entertainment', cover_art_url: '', is_explicit: false, website_url: ''
  });

  useEffect(() => {
    if (editingPodcast) {
      setPodForm({
        title: editingPodcast.title || '',
        description: editingPodcast.description || '',
        category: editingPodcast.category || 'entertainment',
        cover_art_url: editingPodcast.cover_art_url || '',
        is_explicit: editingPodcast.is_explicit || false,
        website_url: editingPodcast.website_url || '',
      });
    } else {
      setPodForm({ title: '', description: '', category: 'entertainment', cover_art_url: '', is_explicit: false, website_url: '' });
    }
  }, [editingPodcast]);

  const savePodcastMutation = useMutation({
    mutationFn: (data) => {
      if (editingPodcast) {
        return base44.entities.Podcast.update(editingPodcast.id, data);
      }
      return base44.entities.Podcast.create({ ...data, creator_id: creator.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-podcasts'] });
      setShowNewPodcast(false);
      setEditingPodcast(null);
      toast.success(editingPodcast ? 'Podcast updated!' : 'Podcast created!');
    }
  });

  const deletePodcastMutation = useMutation({
    mutationFn: (id) => base44.entities.Podcast.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-podcasts'] });
      toast.success('Podcast deleted');
    }
  });

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await base44.integrations.Core.UploadFile({ file });
      setPodForm(prev => ({ ...prev, cover_art_url: result.file_url }));
    }
  };

  // ---- Recording ----
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    streamRef.current = stream;
    chunksRef.current = [];
    setRecordedUrl(null);

    const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      toast.loading('Uploading recording...');
      const result = await base44.integrations.Core.UploadFile({ file });
      setRecordedUrl(result.file_url);
      toast.dismiss();
      toast.success('Recording uploaded! You can now create an episode with it.');
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setIsPaused(false);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      clearInterval(timerRef.current);
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayEpisode = (episode, episodes) => {
    setPlayingEpisode(episode);
    setPlaylist(episodes);
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

  // Stats
  const totalEps = podcasts.reduce((a, p) => a + (p.total_episodes || 0), 0);
  const totalSubs = podcasts.reduce((a, p) => a + (p.subscriber_count || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-2">
              <Mic className="w-8 h-8 text-amber-400" />
              Podcast Studio
            </h1>
            <p className="text-amber-400/60 mt-1">Record, manage, and publish your podcasts</p>
          </div>
          <Button onClick={() => { setEditingPodcast(null); setShowNewPodcast(true); }} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" /> New Podcast
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Shows', value: podcasts.length, icon: Headphones },
            { label: 'Episodes', value: totalEps, icon: Radio },
            { label: 'Subscribers', value: totalSubs, icon: Users },
          ].map(stat => (
            <Card key={stat.label} className="bg-stone-800/30 border-amber-600/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/15 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-100">{stat.value}</p>
                  <p className="text-xs text-amber-400/50">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedPodcast ? (
          <PodcastDetailPanel
            podcast={selectedPodcast}
            creatorId={creator?.id}
            isCreator={true}
            onBack={() => setSelectedPodcast(null)}
            onPlayEpisode={handlePlayEpisode}
            currentEpisodeId={playingEpisode?.id}
          />
        ) : (
          <Tabs defaultValue="shows">
            <TabsList className="bg-stone-800/50 border border-amber-600/20 mb-6">
              <TabsTrigger value="shows" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300">
                <Headphones className="w-3 h-3 mr-1" /> My Shows
              </TabsTrigger>
              <TabsTrigger value="record" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300">
                <Mic className="w-3 h-3 mr-1" /> Record
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shows">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
              ) : podcasts.length === 0 ? (
                <div className="text-center py-16">
                  <Headphones className="w-16 h-16 text-amber-400/20 mx-auto mb-4" />
                  <p className="text-amber-400/50 mb-4">You haven't created any podcasts yet</p>
                  <Button onClick={() => setShowNewPodcast(true)} className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-2" /> Create Your First Podcast
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {podcasts.map((p, i) => (
                    <div key={p.id} className="relative group">
                      <PodcastCard podcast={p} index={i} onClick={() => setSelectedPodcast(p)} />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingPodcast(p); setShowNewPodcast(true); }}
                          className="w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-amber-300 hover:bg-amber-600"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm('Delete this podcast and all episodes?')) deletePodcastMutation.mutate(p.id); }}
                          className="w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="record">
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100 flex items-center gap-2">
                    <Radio className="w-5 h-5 text-amber-400" />
                    Recording Studio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-6 py-8">
                    {/* Mic animation */}
                    <motion.div
                      animate={isRecording && !isPaused ? { scale: [1, 1.08, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className={`w-32 h-32 rounded-full flex items-center justify-center ${
                        isRecording ? 'bg-red-600 shadow-lg shadow-red-500/50' : 'bg-amber-600'
                      }`}
                    >
                      <Mic className="w-16 h-16 text-white" />
                    </motion.div>

                    {/* Timer */}
                    {isRecording && (
                      <Badge className={`text-lg px-6 py-2 ${isPaused ? 'bg-yellow-600 text-yellow-100' : 'bg-red-500 text-white animate-pulse'}`}>
                        {isPaused ? '⏸ PAUSED' : '● REC'} {formatTime(recordingTime)}
                      </Badge>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                      {!isRecording ? (
                        <Button onClick={startRecording} size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8">
                          <Mic className="w-5 h-5 mr-2" /> Start Recording
                        </Button>
                      ) : (
                        <>
                          <Button onClick={isPaused ? resumeRecording : pauseRecording} variant="outline" className="border-amber-600/30 text-amber-200">
                            {isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
                            {isPaused ? 'Resume' : 'Pause'}
                          </Button>
                          <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700 text-white">
                            <Square className="w-4 h-4 mr-1" /> Stop & Save
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Recorded file */}
                    {recordedUrl && (
                      <div className="w-full max-w-md bg-stone-900 rounded-xl p-4 border border-green-500/30">
                        <p className="text-green-300 text-sm font-medium mb-2">✓ Recording saved</p>
                        <audio src={recordedUrl} controls className="w-full mb-3" />
                        <p className="text-amber-400/50 text-xs">Select a podcast above, then create a new episode to use this recording.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create / Edit Podcast Dialog */}
      <Dialog open={showNewPodcast} onOpenChange={v => { setShowNewPodcast(v); if (!v) setEditingPodcast(null); }}>
        <DialogContent className="bg-stone-900 border-amber-600/30 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-100">{editingPodcast ? 'Edit Podcast' : 'Create New Podcast'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-amber-200">Title *</Label>
              <Input value={podForm.title} onChange={e => setPodForm(p => ({ ...p, title: e.target.value }))} placeholder="My Awesome Podcast" className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1" />
            </div>
            <div>
              <Label className="text-amber-200">Description</Label>
              <Textarea value={podForm.description} onChange={e => setPodForm(p => ({ ...p, description: e.target.value }))} placeholder="What is your podcast about?" className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1" rows={3} />
            </div>
            <div>
              <Label className="text-amber-200">Category</Label>
              <Select value={podForm.category} onValueChange={v => setPodForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-600/30">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value} className="text-amber-100">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-amber-200">Cover Art</Label>
              <div className="flex items-center gap-3 mt-1">
                {podForm.cover_art_url ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden">
                    <img src={podForm.cover_art_url} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => setPodForm(p => ({ ...p, cover_art_url: '' }))} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white">✕</button>
                  </div>
                ) : (
                  <label className="w-24 h-24 border-2 border-dashed border-amber-600/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50">
                    <Upload className="w-6 h-6 text-amber-400/50" />
                    <span className="text-amber-400/50 text-xs mt-1">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  </label>
                )}
                <p className="text-amber-400/50 text-xs">Square format recommended (1400×1400)</p>
              </div>
            </div>
            <div>
              <Label className="text-amber-200">Website (optional)</Label>
              <Input value={podForm.website_url} onChange={e => setPodForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://yourpodcast.com" className="bg-stone-800 border-amber-600/20 text-amber-100 mt-1" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-amber-200">Explicit Content</Label>
              <Switch checked={podForm.is_explicit} onCheckedChange={v => setPodForm(p => ({ ...p, is_explicit: v }))} />
            </div>
            <Button
              onClick={() => savePodcastMutation.mutate(podForm)}
              disabled={!podForm.title.trim() || savePodcastMutation.isPending}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {savePodcastMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingPodcast ? 'Save Changes' : 'Create Podcast'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audio Player */}
      {playingEpisode && (
        <PodcastAudioPlayer
          episode={playingEpisode}
          coverFallback={selectedPodcast?.cover_art_url || podcasts.find(p => p.id === playingEpisode.podcast_id)?.cover_art_url}
          onNext={handleNext}
          onPrev={handlePrev}
          onClose={() => setPlayingEpisode(null)}
        />
      )}
    </div>
  );
}