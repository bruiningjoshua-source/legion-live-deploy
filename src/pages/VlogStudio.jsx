import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  Upload,
  Play,
  Eye,
  Heart,
  Calendar,
  Film
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function VlogStudio() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: 'daily_life',
    tags: []
  });

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

  const { data: vlogs = [] } = useQuery({
    queryKey: ['my-vlogs', creator?.id],
    queryFn: () => base44.entities.VlogVideo.filter({ creator_id: creator.id }, '-created_date'),
    enabled: !!creator?.id
  });

  const uploadVlogMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.VlogVideo.create({
        ...data,
        creator_id: creator.id,
        is_published: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vlogs']);
      toast.success('Vlog uploaded successfully!');
      setUploadData({ title: '', description: '', category: 'daily_life', tags: [] });
    }
  });

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const videoResult = await base44.integrations.Core.UploadFile({ file });
      
      // Generate thumbnail (in production, this would extract a frame from the video)
      const thumbnailResult = await base44.integrations.Core.UploadFile({ file });
      
      await uploadVlogMutation.mutateAsync({
        ...uploadData,
        video_url: videoResult.file_url,
        thumbnail_url: thumbnailResult.file_url,
        duration_seconds: 0 // Would be calculated from video metadata
      });
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2 flex items-center gap-2">
            <Video className="w-8 h-8 text-amber-400" />
            Vlog Studio
          </h1>
          <p className="text-amber-400/70">Upload and manage your vlog content</p>
        </div>

        {/* Upload Section */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-8">
          <CardHeader>
            <CardTitle className="text-amber-100">Upload New Vlog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Vlog Title"
              value={uploadData.title}
              onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
              className="bg-stone-900/50 border-amber-600/20 text-amber-100"
            />
            <Textarea
              placeholder="Description"
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              className="bg-stone-900/50 border-amber-600/20 text-amber-100"
            />
            <select
              value={uploadData.category}
              onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
              className="w-full p-3 bg-stone-900/50 border border-amber-600/20 text-amber-100 rounded-md"
            >
              <option value="daily_life">Daily Life</option>
              <option value="travel">Travel</option>
              <option value="food">Food</option>
              <option value="fashion">Fashion</option>
              <option value="beauty">Beauty</option>
              <option value="fitness">Fitness</option>
              <option value="gaming">Gaming</option>
              <option value="education">Education</option>
              <option value="comedy">Comedy</option>
            </select>

            <div className="border-2 border-dashed border-amber-600/30 rounded-xl p-8 text-center hover:border-amber-500/50 transition-colors">
              <label className="cursor-pointer">
                <Upload className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <p className="text-amber-200 mb-2">Click to upload video</p>
                <p className="text-amber-400/70 text-sm">MP4, MOV, AVI up to 2GB</p>
                <input 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleVideoUpload}
                  disabled={uploading || !uploadData.title}
                />
              </label>
            </div>

            {uploading && (
              <div className="text-center py-4">
                <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-amber-200">Uploading your vlog...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Vlogs */}
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100">Your Vlogs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {vlogs.map((vlog, i) => (
                <motion.div
                  key={vlog.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-stone-900/50 rounded-xl overflow-hidden border border-amber-600/20 hover:border-amber-500/50 transition-all cursor-pointer"
                >
                  <div className="relative aspect-video bg-stone-950">
                    {vlog.thumbnail_url ? (
                      <img src={vlog.thumbnail_url} className="w-full h-full object-cover" alt={vlog.title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-12 h-12 text-amber-400/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-amber-100 font-semibold mb-2 line-clamp-2">{vlog.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-amber-400/70 mb-2">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {vlog.view_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {vlog.like_count || 0}
                      </span>
                    </div>
                    <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30 capitalize text-xs">
                      {vlog.category?.replace('_', ' ')}
                    </Badge>
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