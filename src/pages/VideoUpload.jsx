import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload, Video, X, Plus, Globe, Lock, EyeOff,
  AlertCircle, ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import MediaDropZone from '@/components/upload/MediaDropZone';
import UploadProgressBar from '@/components/upload/UploadProgressBar';
import ThumbnailGenerator from '@/components/upload/ThumbnailGenerator';

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
  const urlParams = new URLSearchParams(window.location.search);
  const presetType = urlParams.get('type');

  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [mediaFile, setMediaFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [autoThumbnailDataUrl, setAutoThumbnailDataUrl] = useState(null);
  
  const [videoData, setVideoData] = useState({
    title: '',
    description: '',
    video_type: presetType === 'short' ? 'short' : 'long_form',
    category: '',
    tags: [],
    interests: [],
    visibility: 'public',
    comments_enabled: true,
    age_restricted: false,
    made_for_kids: false,
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

  const isAudio = mediaFile?.type?.startsWith('audio/');
  const isVideo = mediaFile?.type?.startsWith('video/');

  const handleFileSelect = (file) => {
    setMediaFile(file);
    // Auto-fill title from filename
    if (!videoData.title) {
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setVideoData(prev => ({ ...prev, title: name }));
    }
    // Auto-set category to music for audio
    if (file.type.startsWith('audio/') && !videoData.category) {
      setVideoData(prev => ({ ...prev, category: 'music' }));
    }
  };

  const handleThumbnailFileSelect = (file) => {
    if (!file) {
      setThumbnailFile(null);
      setThumbnailPreview(null);
      return;
    }
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Convert data URL to File for upload
  const dataUrlToFile = async (dataUrl, filename) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!mediaFile) throw new Error('Please select a file');
      if (!videoData.title.trim()) throw new Error('Please enter a title');
      if (!videoData.category) throw new Error('Please select a category');

      setIsUploading(true);
      setUploadProgress(10);

      // Upload media file
      const mediaResult = await base44.integrations.Core.UploadFile({ file: mediaFile });
      setUploadProgress(50);

      // Upload thumbnail
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbResult = await base44.integrations.Core.UploadFile({ file: thumbnailFile });
        thumbnailUrl = thumbResult.file_url;
      } else if (autoThumbnailDataUrl) {
        const thumbFile = await dataUrlToFile(autoThumbnailDataUrl, 'thumbnail.jpg');
        const thumbResult = await base44.integrations.Core.UploadFile({ file: thumbFile });
        thumbnailUrl = thumbResult.file_url;
      }
      setUploadProgress(75);

      // Create entity record based on media type
      if (isAudio) {
        const music = await base44.entities.Music.create({
          creator_id: user.email,
          title: videoData.title.trim(),
          artist: user.full_name || 'Unknown',
          description: videoData.description,
          audio_url: mediaResult.file_url,
          cover_url: thumbnailUrl,
          genre: videoData.category === 'music' ? 'other' : 'other',
          tags: videoData.tags,
          is_published: videoData.visibility !== 'private',
        });
        setUploadProgress(100);
        return { type: 'music', record: music };
      } else {
        const video = await base44.entities.VlogVideo.create({
          creator_id: creator?.id || user.email,
          title: videoData.title.trim(),
          description: videoData.description,
          video_url: mediaResult.file_url,
          thumbnail_url: thumbnailUrl,
          video_type: videoData.video_type,
          category: videoData.category,
          tags: videoData.tags,
          interests: videoData.interests,
          visibility: videoData.visibility,
          comments_enabled: videoData.comments_enabled,
          age_restricted: videoData.age_restricted,
          made_for_kids: videoData.made_for_kids,
          language: 'en',
          is_published: videoData.visibility !== 'private',
          review_status: 'pending',
          view_count: 0,
          like_count: 0,
        });
        setUploadProgress(100);
        return { type: 'video', record: video };
      }
    },
    onSuccess: (result) => {
      const msg = result.type === 'music' ? 'Audio uploaded successfully!' : 'Video uploaded! It will be reviewed shortly.';
      toast.success(msg);
      navigate(createPageUrl('CreatorStudio'));
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(error.message);
    }
  });

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !videoData.tags.includes(tag) && videoData.tags.length < 15) {
      setVideoData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setNewTag('');
    }
  };

  const updateField = (field, value) => {
    setVideoData(prev => ({ ...prev, [field]: value }));
  };

  if (!user || !creator) {
    return (
      <div className="min-h-screen pb-12 flex items-center justify-center px-4">
        <Card className="bg-white/[0.03] border-white/[0.08] p-8 text-center max-w-sm">
          <Video className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2 font-bold">Create a Channel First</h2>
          <p className="text-white/40 text-sm mb-4">Set up your creator profile to upload</p>
          <Button onClick={() => navigate(createPageUrl('Profile'))} className="bg-amber-600 hover:bg-amber-700">
            Go to Profile
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/40 text-xs mb-3 hover:text-white transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Upload className="w-6 h-6 text-amber-400" />
            Upload Media
          </h1>
          <p className="text-white/40 text-sm mt-1">Upload video or audio to share with the Legion community</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <button
                onClick={() => { if (s < step) setStep(s); }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= s
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-white/[0.06] text-white/30'
                }`}
              >
                {step > s ? '✓' : s}
              </button>
              {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-amber-500' : 'bg-white/[0.06]'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: File Selection */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Type selector (video only) */}
            {(!mediaFile || isVideo) && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateField('video_type', 'short')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    videoData.video_type === 'short'
                      ? 'bg-pink-500/20 border border-pink-500/40 text-pink-300'
                      : 'bg-white/[0.03] border border-white/[0.06] text-white/40'
                  }`}
                >
                  📱 Short
                </button>
                <button
                  onClick={() => updateField('video_type', 'long_form')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    videoData.video_type === 'long_form'
                      ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                      : 'bg-white/[0.03] border border-white/[0.06] text-white/40'
                  }`}
                >
                  🎬 Long Form
                </button>
              </div>
            )}

            {/* Drop zone */}
            <MediaDropZone
              file={mediaFile}
              onFileSelect={handleFileSelect}
              onClear={() => { setMediaFile(null); setAutoThumbnailDataUrl(null); }}
            />

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!mediaFile}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold px-6"
              >
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Thumbnail */}
            <ThumbnailGenerator
              videoFile={mediaFile}
              thumbnailFile={thumbnailFile}
              thumbnailPreview={thumbnailPreview}
              onThumbnailSelect={setAutoThumbnailDataUrl}
              onThumbnailFileSelect={handleThumbnailFileSelect}
            />

            {/* Title */}
            <div>
              <Label className="text-amber-200 text-sm">Title *</Label>
              <Input
                value={videoData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Add a title…"
                className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                maxLength={100}
              />
              <p className="text-white/20 text-[10px] text-right mt-1">{videoData.title.length}/100</p>
            </div>

            {/* Description */}
            <div>
              <Label className="text-amber-200 text-sm">Description</Label>
              <Textarea
                value={videoData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Tell viewers about your content…"
                className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 min-h-[100px]"
                maxLength={5000}
              />
            </div>

            {/* Category */}
            <div>
              <Label className="text-amber-200 text-sm">Category *</Label>
              <Select value={videoData.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger className="mt-1.5 bg-white/[0.04] border-white/[0.08] text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1f] border-white/[0.1] max-h-60">
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-white">
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <Label className="text-amber-200 text-sm">Tags (up to 15)</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag…"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                />
                <Button onClick={addTag} size="icon" className="bg-amber-600 hover:bg-amber-700 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {videoData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {videoData.tags.map(tag => (
                    <Badge key={tag} className="bg-amber-500/15 text-amber-300 border-amber-500/20 text-[11px]">
                      {tag}
                      <button onClick={() => updateField('tags', videoData.tags.filter(t => t !== tag))} className="ml-1">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Interests */}
            {isVideo && (
              <div>
                <Label className="text-amber-200 text-sm">Discovery interests (up to 10)</Label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {INTERESTS.map(interest => (
                    <button
                      key={interest}
                      onClick={() => {
                        if (videoData.interests.includes(interest)) {
                          updateField('interests', videoData.interests.filter(i => i !== interest));
                        } else if (videoData.interests.length < 10) {
                          updateField('interests', [...videoData.interests, interest]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        videoData.interests.includes(interest)
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-white/[0.03] text-white/30 hover:text-white/60 border border-transparent'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button onClick={() => setStep(1)} variant="outline" className="border-white/[0.1] text-white/60">
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!videoData.title.trim() || !videoData.category}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold px-6"
              >
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Visibility & Publish */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Visibility */}
            <div>
              <Label className="text-amber-200 text-sm">Visibility</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                  { value: 'public', label: 'Public', icon: Globe, desc: 'Everyone' },
                  { value: 'unlisted', label: 'Unlisted', icon: EyeOff, desc: 'Link only' },
                  { value: 'private', label: 'Private', icon: Lock, desc: 'Only you' }
                ].map(opt => {
                  const Icon = opt.icon;
                  const active = videoData.visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateField('visibility', opt.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        active
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${active ? 'text-amber-400' : 'text-white/20'}`} />
                      <p className={`font-semibold text-xs ${active ? 'text-white' : 'text-white/50'}`}>{opt.label}</p>
                      <p className="text-white/20 text-[10px]">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-3">
              {[
                { field: 'comments_enabled', label: 'Allow Comments', desc: 'Let viewers comment' },
                { field: 'age_restricted', label: 'Age Restricted (18+)', desc: 'Mature content' },
                { field: 'made_for_kids', label: 'Made for Kids', desc: 'Child-friendly content' },
              ].map(opt => (
                <div key={opt.field} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">{opt.label}</p>
                    <p className="text-white/30 text-[11px]">{opt.desc}</p>
                  </div>
                  <Switch
                    checked={videoData[opt.field]}
                    onCheckedChange={(v) => updateField(opt.field, v)}
                  />
                </div>
              ))}
            </div>

            {/* Review notice */}
            <div className="p-3 bg-amber-500/[0.06] border border-amber-500/15 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 font-semibold text-xs">Platform Review</p>
                <p className="text-white/30 text-[11px]">Your upload will be reviewed before appearing publicly. Usually under 24 hours.</p>
              </div>
            </div>

            {/* Upload progress */}
            <UploadProgressBar progress={uploadProgress} isUploading={isUploading} />

            <div className="flex justify-between">
              <Button onClick={() => setStep(2)} variant="outline" className="border-white/[0.1] text-white/60">
                Back
              </Button>
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={isUploading}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold px-8"
              >
                {isUploading ? 'Publishing…' : isAudio ? 'Publish Audio' : 'Publish Video'}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}