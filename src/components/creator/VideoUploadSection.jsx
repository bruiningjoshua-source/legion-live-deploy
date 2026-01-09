import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Video, 
  Upload, 
  Plus, 
  Film,
  Clock,
  Eye,
  Trash2,
  Edit,
  Play
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const VIDEO_CATEGORIES = [
  { value: 'daily_life', label: 'Daily Life' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'education', label: 'Education' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'tech_reviews', label: 'Tech Reviews' },
  { value: 'health_wellness', label: 'Health & Wellness' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Other' }
];

export default function VideoUploadSection({ creator, videos = [] }) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoData, setVideoData] = useState({
    title: '',
    description: '',
    video_type: 'long_form',
    category: '',
    tags: []
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const queryClient = useQueryClient();

  const shorts = videos.filter(v => v.video_type === 'short');
  const longForm = videos.filter(v => v.video_type === 'long_form');

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!videoFile) throw new Error('Please select a video file');
      if (!videoData.title) throw new Error('Please enter a title');

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
        tags: videoData.tags,
        is_published: true,
        view_count: 0,
        like_count: 0
      });
      setUploadProgress(100);

      return video;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['creator-videos']);
      setShowUpload(false);
      setVideoData({ title: '', description: '', video_type: 'long_form', category: '', tags: [] });
      setVideoFile(null);
      setThumbnailFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      toast.success('Video uploaded successfully!');
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (videoId) => base44.entities.VlogVideo.delete(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries(['creator-videos']);
      toast.success('Video deleted');
    }
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-amber-100 flex items-center gap-2">
            <Video className="w-5 h-5 text-amber-400" />
            My Videos
          </h2>
          <p className="text-amber-400/70 text-sm">Upload shorts and long-form videos to your profile</p>
        </div>
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-stone-900 border-amber-600/30 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-amber-100">Upload New Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Video Type */}
              <div className="flex gap-3">
                <Button
                  variant={videoData.video_type === 'short' ? 'default' : 'outline'}
                  onClick={() => setVideoData({ ...videoData, video_type: 'short' })}
                  className={videoData.video_type === 'short' ? 'bg-pink-600' : 'border-amber-600/30 text-amber-300'}
                >
                  📱 Short (Vertical)
                </Button>
                <Button
                  variant={videoData.video_type === 'long_form' ? 'default' : 'outline'}
                  onClick={() => setVideoData({ ...videoData, video_type: 'long_form' })}
                  className={videoData.video_type === 'long_form' ? 'bg-blue-600' : 'border-amber-600/30 text-amber-300'}
                >
                  🎬 Long Form
                </Button>
              </div>

              {/* Video File */}
              <div>
                <Label className="text-amber-200">Video File *</Label>
                <div className="mt-2 border-2 border-dashed border-amber-600/30 rounded-xl p-6 text-center hover:border-amber-500/50 transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0])}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    {videoFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-400">
                        <Film className="w-5 h-5" />
                        <span>{videoFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
                        <p className="text-amber-400/70 text-sm">Click to upload video</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Thumbnail */}
              <div>
                <Label className="text-amber-200">Thumbnail (Optional)</Label>
                <div className="mt-2 border-2 border-dashed border-amber-600/30 rounded-xl p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0])}
                    className="hidden"
                    id="thumb-upload"
                  />
                  <label htmlFor="thumb-upload" className="cursor-pointer text-amber-400/70 text-sm">
                    {thumbnailFile ? thumbnailFile.name : 'Upload thumbnail'}
                  </label>
                </div>
              </div>

              {/* Title */}
              <div>
                <Label className="text-amber-200">Title *</Label>
                <Input
                  value={videoData.title}
                  onChange={(e) => setVideoData({ ...videoData, title: e.target.value })}
                  placeholder="Enter video title..."
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-amber-200">Description</Label>
                <Textarea
                  value={videoData.description}
                  onChange={(e) => setVideoData({ ...videoData, description: e.target.value })}
                  placeholder="Describe your video..."
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                />
              </div>

              {/* Category */}
              <div>
                <Label className="text-amber-200">Category</Label>
                <Select value={videoData.category} onValueChange={(v) => setVideoData({ ...videoData, category: v })}>
                  <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-amber-600/30">
                    {VIDEO_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} className="text-amber-100">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-amber-400/70 text-xs mt-1 text-center">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={isUploading || !videoFile || !videoData.title}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Shorts Section */}
      {shorts.length > 0 && (
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-2 text-lg">
              📱 Shorts ({shorts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {shorts.map((video, i) => (
                <VideoCard key={video.id} video={video} onDelete={deleteMutation.mutate} index={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Long Form Section */}
      {longForm.length > 0 && (
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-2 text-lg">
              🎬 Long Form Videos ({longForm.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {longForm.map((video, i) => (
                <VideoCard key={video.id} video={video} onDelete={deleteMutation.mutate} index={i} isLongForm />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {videos.length === 0 && (
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardContent className="py-12 text-center">
            <Video className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
            <h3 className="text-amber-100 font-semibold mb-2">No Videos Yet</h3>
            <p className="text-amber-400/60 mb-4">Upload your first video to grow your audience!</p>
            <Button onClick={() => setShowUpload(true)} className="bg-amber-600 hover:bg-amber-700">
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VideoCard({ video, onDelete, index, isLongForm }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <div className={`bg-stone-900/50 rounded-xl overflow-hidden border border-amber-600/20 hover:border-amber-500/50 transition-all ${
        isLongForm ? '' : 'aspect-[9/16]'
      }`}>
        <div className={`relative bg-stone-950 ${isLongForm ? 'aspect-video' : 'aspect-[9/16]'}`}>
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} className="w-full h-full object-cover" alt={video.title} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="w-8 h-8 text-amber-400/30" />
            </div>
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Link to={createPageUrl(`WatchVideo?id=${video.id}`)}>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                <Play className="w-4 h-4" />
              </Button>
            </Link>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onDelete(video.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Duration */}
          {video.duration_seconds && (
            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs">
              {Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
        
        <div className="p-3">
          <h3 className="text-amber-100 font-semibold text-sm line-clamp-2">{video.title}</h3>
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-400/70">
            <Eye className="w-3 h-3" />
            {(video.view_count || 0).toLocaleString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}