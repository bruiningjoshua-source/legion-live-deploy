import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Video,
  Save,
  ArrowLeft,
  Image,
  Plus,
  X,
  Globe,
  Lock,
  EyeOff,
  Settings,
  BarChart3,
  MessageSquare,
  Clock,
  Scissors,
  Layers,
  Type
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'howto', label: 'How-to & Style', icon: '✨' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'comedy', label: 'Comedy', icon: '😂' },
  { value: 'tech', label: 'Technology', icon: '💻' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'food', label: 'Food', icon: '🍳' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'vlogs', label: 'Vlogs', icon: '📹' },
  { value: 'other', label: 'Other', icon: '📦' }
];

export default function VideoEditor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('id');

  const [activeTab, setActiveTab] = useState('details');
  const [videoData, setVideoData] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [newChapter, setNewChapter] = useState({ time: '', title: '' });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: video, isLoading } = useQuery({
    queryKey: ['edit-video', videoId],
    queryFn: async () => {
      const videos = await base44.entities.VlogVideo.filter({ id: videoId }, null, 1);
      return videos[0] || null;
    },
    enabled: !!videoId
  });

  useEffect(() => {
    if (video) {
      setVideoData({ ...video });
    }
  }, [video]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.VlogVideo.update(videoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['edit-video', videoId]);
      queryClient.invalidateQueries(['studio-videos']);
      toast.success('Video updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update video');
    }
  });

  const handleSave = () => {
    if (!videoData) return;
    updateMutation.mutate({
      title: videoData.title,
      description: videoData.description,
      category: videoData.category,
      subcategory: videoData.subcategory,
      tags: videoData.tags,
      interests: videoData.interests,
      visibility: videoData.visibility,
      comments_enabled: videoData.comments_enabled,
      age_restricted: videoData.age_restricted,
      made_for_kids: videoData.made_for_kids,
      chapters: videoData.chapters
    });
  };

  const addTag = () => {
    if (newTag && !videoData.tags?.includes(newTag) && (videoData.tags?.length || 0) < 15) {
      setVideoData({ ...videoData, tags: [...(videoData.tags || []), newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setVideoData({ ...videoData, tags: videoData.tags.filter(t => t !== tag) });
  };

  const addChapter = () => {
    if (newChapter.time && newChapter.title) {
      const timeSeconds = parseTimeToSeconds(newChapter.time);
      const chapters = [...(videoData.chapters || []), { time_seconds: timeSeconds, title: newChapter.title }];
      chapters.sort((a, b) => a.time_seconds - b.time_seconds);
      setVideoData({ ...videoData, chapters });
      setNewChapter({ time: '', title: '' });
    }
  };

  const removeChapter = (index) => {
    const chapters = [...videoData.chapters];
    chapters.splice(index, 1);
    setVideoData({ ...videoData, chapters });
  };

  const parseTimeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  };

  const formatSeconds = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading || !videoData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12 flex items-center justify-center">
        <div className="animate-pulse text-amber-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('CreatorStudio'))}
              className="text-amber-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-amber-100">Video Editor</h1>
              <p className="text-amber-400/70 text-sm">Edit your video details and settings</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-red-600 hover:bg-red-700">
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Preview */}
          <div className="lg:col-span-1">
            <Card className="bg-stone-800/30 border-amber-600/20 sticky top-24">
              <CardContent className="p-4">
                <div className="aspect-video bg-stone-900 rounded-lg overflow-hidden mb-4">
                  {videoData.thumbnail_url ? (
                    <img src={videoData.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-amber-400/30" />
                    </div>
                  )}
                </div>
                <h3 className="text-amber-100 font-semibold line-clamp-2">{videoData.title}</h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-amber-400/70">
                  <span>{(videoData.view_count || 0).toLocaleString()} views</span>
                  <span>•</span>
                  <Badge className={
                    videoData.visibility === 'public' ? 'bg-green-500/20 text-green-400' :
                    videoData.visibility === 'unlisted' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }>
                    {videoData.visibility}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editor Tabs */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-stone-800/50 border border-amber-600/20 mb-6">
                <TabsTrigger value="details" className="data-[state=active]:bg-amber-600">
                  <Settings className="w-4 h-4 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="chapters" className="data-[state=active]:bg-amber-600">
                  <Layers className="w-4 h-4 mr-2" />
                  Chapters
                </TabsTrigger>
                <TabsTrigger value="cards" className="data-[state=active]:bg-amber-600">
                  <Type className="w-4 h-4 mr-2" />
                  Cards & End Screen
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardContent className="p-6 space-y-6">
                    {/* Title */}
                    <div>
                      <Label className="text-amber-200">Title</Label>
                      <Input
                        value={videoData.title || ''}
                        onChange={(e) => setVideoData({ ...videoData, title: e.target.value })}
                        className="mt-2 bg-stone-900 border-amber-600/20 text-amber-100"
                        maxLength={100}
                      />
                      <p className="text-amber-400/50 text-xs text-right mt-1">{(videoData.title?.length || 0)}/100</p>
                    </div>

                    {/* Description */}
                    <div>
                      <Label className="text-amber-200">Description</Label>
                      <Textarea
                        value={videoData.description || ''}
                        onChange={(e) => setVideoData({ ...videoData, description: e.target.value })}
                        className="mt-2 bg-stone-900 border-amber-600/20 text-amber-100 min-h-[150px]"
                        maxLength={5000}
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <Label className="text-amber-200">Category</Label>
                      <Select value={videoData.category} onValueChange={(v) => setVideoData({ ...videoData, category: v })}>
                        <SelectTrigger className="mt-2 bg-stone-900 border-amber-600/20 text-amber-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-stone-900 border-amber-600/30">
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value} className="text-amber-100">
                              {cat.icon} {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tags */}
                    <div>
                      <Label className="text-amber-200">Tags</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a tag..."
                          className="bg-stone-900 border-amber-600/20 text-amber-100"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button onClick={addTag} className="bg-amber-600 hover:bg-amber-700">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {videoData.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {videoData.tags.map(tag => (
                            <Badge key={tag} className="bg-amber-600/20 text-amber-200">
                              {tag}
                              <button onClick={() => removeTag(tag)} className="ml-1">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Visibility */}
                    <div>
                      <Label className="text-amber-200">Visibility</Label>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        {[
                          { value: 'public', label: 'Public', icon: Globe },
                          { value: 'unlisted', label: 'Unlisted', icon: EyeOff },
                          { value: 'private', label: 'Private', icon: Lock }
                        ].map(opt => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setVideoData({ ...videoData, visibility: opt.value })}
                              className={`p-3 rounded-lg border text-center transition-all ${
                                videoData.visibility === opt.value
                                  ? 'bg-amber-600/20 border-amber-500'
                                  : 'bg-stone-900/50 border-amber-600/20 hover:border-amber-500/50'
                              }`}
                            >
                              <Icon className={`w-5 h-5 mx-auto mb-1 ${videoData.visibility === opt.value ? 'text-amber-400' : 'text-amber-400/50'}`} />
                              <p className="text-amber-100 text-sm">{opt.label}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Settings Toggles */}
                    <div className="space-y-4 pt-4 border-t border-amber-600/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-amber-100 font-medium">Allow Comments</p>
                          <p className="text-amber-400/60 text-sm">Viewers can comment on this video</p>
                        </div>
                        <Switch
                          checked={videoData.comments_enabled}
                          onCheckedChange={(v) => setVideoData({ ...videoData, comments_enabled: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-amber-100 font-medium">Age Restricted (18+)</p>
                          <p className="text-amber-400/60 text-sm">Contains mature content</p>
                        </div>
                        <Switch
                          checked={videoData.age_restricted}
                          onCheckedChange={(v) => setVideoData({ ...videoData, age_restricted: v })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Chapters Tab */}
              <TabsContent value="chapters" className="space-y-6">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-purple-400" />
                      Video Chapters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-amber-400/70 text-sm">
                      Add chapters to help viewers navigate your video. First chapter must start at 0:00.
                    </p>

                    {/* Add Chapter */}
                    <div className="flex gap-2">
                      <Input
                        value={newChapter.time}
                        onChange={(e) => setNewChapter({ ...newChapter, time: e.target.value })}
                        placeholder="0:00"
                        className="w-24 bg-stone-900 border-amber-600/20 text-amber-100"
                      />
                      <Input
                        value={newChapter.title}
                        onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                        placeholder="Chapter title..."
                        className="flex-1 bg-stone-900 border-amber-600/20 text-amber-100"
                      />
                      <Button onClick={addChapter} className="bg-amber-600 hover:bg-amber-700">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Chapter List */}
                    {videoData.chapters?.length > 0 ? (
                      <div className="space-y-2">
                        {videoData.chapters.map((chapter, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-stone-900/50 rounded-lg">
                            <Badge className="bg-purple-600/20 text-purple-300">
                              {formatSeconds(chapter.time_seconds)}
                            </Badge>
                            <span className="text-amber-100 flex-1">{chapter.title}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeChapter(i)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-amber-400/60">
                        No chapters added yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cards Tab */}
              <TabsContent value="cards" className="space-y-6">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardContent className="py-12 text-center">
                    <Type className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                    <h3 className="text-amber-100 font-semibold mb-2">Cards & End Screens</h3>
                    <p className="text-amber-400/60">Add interactive elements to your video</p>
                    <p className="text-amber-400/50 text-sm mt-4">Coming soon...</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}