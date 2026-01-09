import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload,
  Video,
  Image,
  X,
  Plus,
  Globe,
  Lock,
  EyeOff,
  Clock,
  Calendar,
  Sparkles,
  AlertCircle,
  CheckCircle
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
  { value: 'news', label: 'News & Politics', icon: '📰' },
  { value: 'comedy', label: 'Comedy', icon: '😂' },
  { value: 'film', label: 'Film & Animation', icon: '🎥' },
  { value: 'science', label: 'Science & Tech', icon: '🔬' },
  { value: 'tech', label: 'Technology', icon: '💻' },
  { value: 'travel', label: 'Travel & Events', icon: '✈️' },
  { value: 'food', label: 'Food', icon: '🍳' },
  { value: 'fashion', label: 'Fashion', icon: '👗' },
  { value: 'beauty', label: 'Beauty', icon: '💄' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'vlogs', label: 'Vlogs', icon: '📹' },
  { value: 'pets', label: 'Pets & Animals', icon: '🐾' },
  { value: 'autos', label: 'Autos & Vehicles', icon: '🚗' },
  { value: 'other', label: 'Other', icon: '📦' }
];

const INTERESTS = [
  'Action', 'Adventure', 'Anime', 'Art', 'ASMR', 'Beauty', 'Cars', 'Coding', 'Comedy',
  'Cooking', 'Crafts', 'Dance', 'DIY', 'Documentary', 'Drama', 'Fashion', 'Fitness',
  'Food', 'Gaming', 'History', 'Horror', 'Lifestyle', 'Meditation', 'Music', 'Nature',
  'News', 'Photography', 'Podcast', 'Science', 'Sports', 'Tech', 'Travel', 'Tutorials',
  'Unboxing', 'Vlogs', 'Wellness', 'Wildlife'
];

export default function VideoUpload() {
  const navigate = useNavigate();
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  // Check URL params for preset video type
  const urlParams = new URLSearchParams(window.location.search);
  const presetType = urlParams.get('type');

  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  
  const [videoData, setVideoData] = useState({
    title: '',
    description: '',
    video_type: presetType === 'short' ? 'short' : 'long_form',
    category: '',
    subcategory: '',
    tags: [],
    interests: [],
    visibility: 'public',
    comments_enabled: true,
    age_restricted: false,
    made_for_kids: false,
    scheduled_publish_date: null,
    premiere_enabled: false,
    language: 'en'
  });
  
  const [newTag, setNewTag] = useState('');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!videoFile) throw new Error('Please select a video file');
      if (!videoData.title) throw new Error('Please enter a title');
      if (!videoData.category) throw new Error('Please select a category');

      setIsUploading(true);
      setUploadProgress(10);

      // Upload video
      const videoResult = await base44.integrations.Core.UploadFile({ file: videoFile });
      setUploadProgress(50);

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbResult = await base44.integrations.Core.UploadFile({ file: thumbnailFile });
        thumbnailUrl = thumbResult.file_url;
      }
      setUploadProgress(70);

      // Create video record
      const video = await base44.entities.VlogVideo.create({
        creator_id: creator.id,
        title: videoData.title,
        description: videoData.description,
        video_url: videoResult.file_url,
        thumbnail_url: thumbnailUrl,
        video_type: videoData.video_type,
        category: videoData.category,
        subcategory: videoData.subcategory,
        tags: videoData.tags,
        interests: videoData.interests,
        visibility: videoData.visibility,
        comments_enabled: videoData.comments_enabled,
        age_restricted: videoData.age_restricted,
        made_for_kids: videoData.made_for_kids,
        language: videoData.language,
        scheduled_publish_date: videoData.scheduled_publish_date,
        premiere_enabled: videoData.premiere_enabled,
        is_published: videoData.visibility !== 'private',
        review_status: 'pending',
        view_count: 0,
        like_count: 0
      });
      
      setUploadProgress(100);
      return video;
    },
    onSuccess: (video) => {
      toast.success('Video uploaded successfully! It will be reviewed shortly.');
      navigate(createPageUrl('CreatorStudio'));
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(error.message);
    }
  });

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB limit
        toast.error('Video must be under 2GB');
        return;
      }
      setVideoFile(file);
      // Auto-fill title from filename
      if (!videoData.title) {
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setVideoData({ ...videoData, title: name });
      }
    }
  };

  const handleThumbnailSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const addTag = () => {
    if (newTag && !videoData.tags.includes(newTag) && videoData.tags.length < 15) {
      setVideoData({ ...videoData, tags: [...videoData.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setVideoData({ ...videoData, tags: videoData.tags.filter(t => t !== tag) });
  };

  const toggleInterest = (interest) => {
    if (videoData.interests.includes(interest)) {
      setVideoData({ ...videoData, interests: videoData.interests.filter(i => i !== interest) });
    } else if (videoData.interests.length < 10) {
      setVideoData({ ...videoData, interests: [...videoData.interests, interest] });
    }
  };

  if (!user || !creator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12 flex items-center justify-center">
        <Card className="bg-stone-800/50 border-amber-600/20 p-8 text-center">
          <Video className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
          <h2 className="text-xl text-amber-100 mb-2">Create a Channel First</h2>
          <p className="text-amber-400/60 mb-4">Set up your creator profile to upload videos</p>
          <Button onClick={() => navigate(createPageUrl('Profile'))} className="bg-amber-600 hover:bg-amber-700">
            Go to Profile
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-3">
            <Upload className="w-8 h-8 text-red-500" />
            Upload Video
          </h1>
          <p className="text-amber-400/70">Share your content with the Legion community</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                step >= s ? 'bg-red-600 text-white' : 'bg-stone-700 text-amber-400/50'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-20 h-1 mx-2 rounded ${step > s ? 'bg-red-600' : 'bg-stone-700'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Select Video</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Video Type */}
                <div className="flex gap-4">
                  <Button
                    variant={videoData.video_type === 'short' ? 'default' : 'outline'}
                    onClick={() => setVideoData({ ...videoData, video_type: 'short' })}
                    className={videoData.video_type === 'short' ? 'bg-pink-600' : 'border-amber-600/30 text-amber-300'}
                  >
                    📱 Short (Under 60s)
                  </Button>
                  <Button
                    variant={videoData.video_type === 'long_form' ? 'default' : 'outline'}
                    onClick={() => setVideoData({ ...videoData, video_type: 'long_form' })}
                    className={videoData.video_type === 'long_form' ? 'bg-blue-600' : 'border-amber-600/30 text-amber-300'}
                  >
                    🎬 Long Form
                  </Button>
                </div>

                {/* Upload Zone */}
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-amber-600/30 rounded-2xl p-12 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
                >
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="hidden"
                  />
                  {videoFile ? (
                    <div className="flex flex-col items-center gap-4">
                      <CheckCircle className="w-16 h-16 text-green-400" />
                      <p className="text-green-400 font-semibold">{videoFile.name}</p>
                      <p className="text-amber-400/60 text-sm">
                        {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                      <Button variant="outline" className="border-amber-600/30 text-amber-300">
                        Change Video
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
                      <p className="text-amber-100 text-lg font-semibold mb-2">
                        Drag and drop or click to upload
                      </p>
                      <p className="text-amber-400/60 text-sm">
                        MP4, MOV, AVI • Max 2GB • {videoData.video_type === 'short' ? 'Under 60 seconds' : 'Any length'}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!videoFile}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Video Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Thumbnail */}
                <div>
                  <Label className="text-amber-200">Thumbnail</Label>
                  <div className="mt-2 flex gap-4">
                    <div
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="w-48 aspect-video bg-stone-900 rounded-lg border-2 border-dashed border-amber-600/30 flex items-center justify-center cursor-pointer hover:border-amber-500/50 transition-colors overflow-hidden"
                    >
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailSelect}
                        className="hidden"
                      />
                      {thumbnailPreview ? (
                        <img src={thumbnailPreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Image className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
                          <p className="text-amber-400/60 text-xs">Upload</p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-amber-400/70 text-sm">
                        A good thumbnail stands out and grabs attention. Use 1280x720 (16:9) for best results.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label className="text-amber-200">Title *</Label>
                  <Input
                    value={videoData.title}
                    onChange={(e) => setVideoData({ ...videoData, title: e.target.value })}
                    placeholder="Add a title that describes your video"
                    className="mt-2 bg-stone-900 border-amber-600/20 text-amber-100"
                    maxLength={100}
                  />
                  <p className="text-amber-400/50 text-xs text-right mt-1">{videoData.title.length}/100</p>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-amber-200">Description</Label>
                  <Textarea
                    value={videoData.description}
                    onChange={(e) => setVideoData({ ...videoData, description: e.target.value })}
                    placeholder="Tell viewers about your video (hashtags, links, etc.)"
                    className="mt-2 bg-stone-900 border-amber-600/20 text-amber-100 min-h-[120px]"
                    maxLength={5000}
                  />
                </div>

                {/* Category */}
                <div>
                  <Label className="text-amber-200">Category *</Label>
                  <Select value={videoData.category} onValueChange={(v) => setVideoData({ ...videoData, category: v })}>
                    <SelectTrigger className="mt-2 bg-stone-900 border-amber-600/20 text-amber-100">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-amber-600/30 max-h-60">
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
                  <Label className="text-amber-200">Tags (up to 15)</Label>
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
                  {videoData.tags.length > 0 && (
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

                {/* Interests for Discovery */}
                <div>
                  <Label className="text-amber-200">Interests (for discovery - up to 10)</Label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {INTERESTS.map(interest => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          videoData.interests.includes(interest)
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-800/50 text-amber-300 hover:bg-amber-800/30'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button onClick={() => setStep(1)} variant="outline" className="border-amber-600/30 text-amber-300">
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!videoData.title || !videoData.category}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Visibility & Settings */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Visibility & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Visibility */}
                <div>
                  <Label className="text-amber-200">Visibility</Label>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    {[
                      { value: 'public', label: 'Public', icon: Globe, desc: 'Everyone can watch' },
                      { value: 'unlisted', label: 'Unlisted', icon: EyeOff, desc: 'Only people with link' },
                      { value: 'private', label: 'Private', icon: Lock, desc: 'Only you can watch' }
                    ].map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setVideoData({ ...videoData, visibility: opt.value })}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            videoData.visibility === opt.value
                              ? 'bg-amber-600/20 border-amber-500'
                              : 'bg-stone-900/50 border-amber-600/20 hover:border-amber-500/50'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mb-2 ${videoData.visibility === opt.value ? 'text-amber-400' : 'text-amber-400/50'}`} />
                          <p className="text-amber-100 font-semibold">{opt.label}</p>
                          <p className="text-amber-400/60 text-xs">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-stone-900/50 rounded-xl">
                    <div>
                      <p className="text-amber-100 font-semibold">Allow Comments</p>
                      <p className="text-amber-400/60 text-sm">Let viewers comment on your video</p>
                    </div>
                    <Switch
                      checked={videoData.comments_enabled}
                      onCheckedChange={(v) => setVideoData({ ...videoData, comments_enabled: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-stone-900/50 rounded-xl">
                    <div>
                      <p className="text-amber-100 font-semibold">Age Restricted (18+)</p>
                      <p className="text-amber-400/60 text-sm">Contains mature content</p>
                    </div>
                    <Switch
                      checked={videoData.age_restricted}
                      onCheckedChange={(v) => setVideoData({ ...videoData, age_restricted: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-stone-900/50 rounded-xl">
                    <div>
                      <p className="text-amber-100 font-semibold">Made for Kids</p>
                      <p className="text-amber-400/60 text-sm">Content is designed for children</p>
                    </div>
                    <Switch
                      checked={videoData.made_for_kids}
                      onCheckedChange={(v) => setVideoData({ ...videoData, made_for_kids: v })}
                    />
                  </div>
                </div>

                {/* Review Notice */}
                <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-200 font-semibold">Platform Review</p>
                    <p className="text-yellow-400/70 text-sm">
                      Your video will be reviewed before appearing publicly. This usually takes less than 24 hours.
                    </p>
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="p-4 bg-stone-900/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-amber-100 font-semibold">Uploading...</span>
                      <span className="text-amber-400">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                <div className="flex justify-between">
                  <Button onClick={() => setStep(2)} variant="outline" className="border-amber-600/30 text-amber-300">
                    Back
                  </Button>
                  <Button
                    onClick={() => uploadMutation.mutate()}
                    disabled={isUploading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isUploading ? 'Uploading...' : 'Publish Video'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}