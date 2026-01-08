import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@antml/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  Radio, 
  Play, 
  Pause,
  Upload,
  Plus,
  Settings,
  Users,
  TrendingUp,
  Music
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PodcastStudio() {
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [showNewPodcast, setShowNewPodcast] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

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

  const { data: podcasts = [] } = useQuery({
    queryKey: ['my-podcasts', creator?.id],
    queryFn: () => base44.entities.Podcast.filter({ creator_id: creator.id }),
    enabled: !!creator?.id
  });

  const [newPodcast, setNewPodcast] = useState({
    title: '',
    description: '',
    category: 'entertainment',
    cover_art_url: ''
  });

  const createPodcastMutation = useMutation({
    mutationFn: (data) => base44.entities.Podcast.create({
      ...data,
      creator_id: creator.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-podcasts']);
      setShowNewPodcast(false);
      toast.success('Podcast created!');
    }
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'podcast-recording.webm', { type: 'audio/webm' });
        const result = await base44.integrations.Core.UploadFile({ file });
        toast.success('Recording uploaded!', { description: result.file_url });
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      // Start timer
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error('Microphone access required');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await base44.integrations.Core.UploadFile({ file });
      setNewPodcast({ ...newPodcast, cover_art_url: result.file_url });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-100 mb-2 flex items-center gap-2">
              <Mic className="w-8 h-8 text-amber-400" />
              Podcast Studio
            </h1>
            <p className="text-amber-400/70">Record, edit, and publish your podcasts</p>
          </div>
          <Dialog open={showNewPodcast} onOpenChange={setShowNewPodcast}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                New Podcast
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-stone-900 border-amber-600/30">
              <DialogHeader>
                <DialogTitle className="text-amber-100">Create New Podcast</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Podcast Title"
                  value={newPodcast.title}
                  onChange={(e) => setNewPodcast({ ...newPodcast, title: e.target.value })}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                />
                <Textarea
                  placeholder="Description"
                  value={newPodcast.description}
                  onChange={(e) => setNewPodcast({ ...newPodcast, description: e.target.value })}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                />
                <select
                  value={newPodcast.category}
                  onChange={(e) => setNewPodcast({ ...newPodcast, category: e.target.value })}
                  className="w-full p-2 bg-stone-800 border border-amber-600/20 text-amber-100 rounded-md"
                >
                  <option value="technology">Technology</option>
                  <option value="business">Business</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="education">Education</option>
                  <option value="health">Health</option>
                  <option value="sports">Sports</option>
                  <option value="news">News</option>
                  <option value="comedy">Comedy</option>
                  <option value="music">Music</option>
                </select>
                <div>
                  <label className="block text-amber-200 mb-2">Cover Art</label>
                  <input type="file" accept="image/*" onChange={handleCoverUpload} className="text-amber-200" />
                  {newPodcast.cover_art_url && (
                    <img src={newPodcast.cover_art_url} className="mt-2 w-32 h-32 object-cover rounded-lg" alt="Cover" />
                  )}
                </div>
                <Button
                  onClick={() => createPodcastMutation.mutate(newPodcast)}
                  disabled={!newPodcast.title}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  Create Podcast
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recording Studio */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-8">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-2">
              <Radio className="w-5 h-5" />
              Quick Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="relative">
                <motion.div
                  animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`w-32 h-32 rounded-full flex items-center justify-center ${
                    isRecording 
                      ? 'bg-red-600 shadow-lg shadow-red-500/50' 
                      : 'bg-amber-600'
                  }`}
                >
                  <Mic className="w-16 h-16 text-white" />
                </motion.div>
              </div>

              {isRecording && (
                <div className="text-center">
                  <Badge className="bg-red-500 text-white text-lg px-6 py-2 animate-pulse">
                    REC {formatTime(recordingTime)}
                  </Badge>
                </div>
              )}

              <Button
                onClick={isRecording ? stopRecording : startRecording}
                size="lg"
                className={isRecording 
                  ? 'bg-red-600 hover:bg-red-700 text-white px-12' 
                  : 'bg-amber-600 hover:bg-amber-700 text-white px-12'}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Your Podcasts */}
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100">Your Podcasts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {podcasts.map((podcast, i) => (
                <motion.div
                  key={podcast.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-stone-900/50 rounded-xl overflow-hidden border border-amber-600/20 hover:border-amber-500/50 transition-all cursor-pointer"
                >
                  {podcast.cover_art_url ? (
                    <img src={podcast.cover_art_url} className="w-full h-48 object-cover" alt={podcast.title} />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
                      <Music className="w-16 h-16 text-white/50" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-amber-100 font-bold text-lg mb-2">{podcast.title}</h3>
                    <p className="text-amber-400/70 text-sm mb-4 line-clamp-2">{podcast.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30 capitalize">
                        {podcast.category}
                      </Badge>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-amber-400/70">{podcast.total_episodes || 0} episodes</span>
                        <span className="text-amber-400/70">{podcast.subscriber_count || 0} subs</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}