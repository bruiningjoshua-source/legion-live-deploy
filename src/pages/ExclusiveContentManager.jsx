import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Lock,
  Video,
  Plus,
  DollarSign,
  Eye,
  Upload,
  Trash2,
  Edit,
  Crown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ExclusiveContentManager() {
  const queryClient = useQueryClient();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'short',
    tip_price_denarii: 100,
    video_url: '',
    thumbnail_url: ''
  });

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

  const { data: exclusiveContent = [] } = useQuery({
    queryKey: ['my-exclusive-content', creator?.id],
    queryFn: () => base44.entities.ExclusiveContent.filter({ creator_id: creator.id }, '-created_date', 50),
    enabled: !!creator?.id
  });

  const totalEarnings = exclusiveContent.reduce((sum, c) => sum + (c.total_earnings_denarii || 0), 0);
  const totalUnlocks = exclusiveContent.reduce((sum, c) => sum + (c.unlock_count || 0), 0);

  const uploadVideoMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ExclusiveContent.create({
        ...data,
        creator_id: creator.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-exclusive-content']);
      setShowUploadForm(false);
      setFormData({
        title: '',
        description: '',
        content_type: 'short',
        tip_price_denarii: 100,
        video_url: '',
        thumbnail_url: ''
      });
      toast.success('Exclusive content added!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExclusiveContent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-exclusive-content']);
      toast.success('Content deleted');
    }
  });

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (type === 'video') {
        setFormData({ ...formData, video_url: result.file_url });
      } else {
        setFormData({ ...formData, thumbnail_url: result.file_url });
      }
    } catch (error) {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12 flex items-center justify-center">
        <Card className="bg-stone-800/50 border-amber-600/20">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
            <p className="text-amber-400/70">Sign in to manage exclusive content</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-3">
              <Lock className="w-8 h-8 text-amber-400" />
              Exclusive Content
            </h1>
            <p className="text-amber-400/70">Create tip-gated content for your fans</p>
          </div>
          <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-stone-900 border-amber-600/30 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-amber-100">Add Exclusive Content</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-amber-200">Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                    placeholder="Give your content a catchy title"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-200">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                    placeholder="What will fans get access to?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-amber-200">Content Type</Label>
                    <Select
                      value={formData.content_type}
                      onValueChange={(v) => setFormData({ ...formData, content_type: v })}
                    >
                      <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-stone-900 border-amber-600/30">
                        <SelectItem value="short">Short Video</SelectItem>
                        <SelectItem value="long_form">Long Form Video</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-200">Unlock Price (Denarii)</Label>
                    <Input
                      type="number"
                      value={formData.tip_price_denarii}
                      onChange={(e) => setFormData({ ...formData, tip_price_denarii: parseInt(e.target.value) })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                      min={10}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-200">Video File</Label>
                  <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(e) => handleFileUpload(e, 'video')}
                    className="text-amber-200 w-full"
                  />
                  {formData.video_url && (
                    <p className="text-green-400 text-sm">✓ Video uploaded</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-200">Thumbnail</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'thumbnail')}
                    className="text-amber-200 w-full"
                  />
                  {formData.thumbnail_url && (
                    <img src={formData.thumbnail_url} className="w-32 h-20 object-cover rounded mt-2" alt="thumbnail" />
                  )}
                </div>
                <Button
                  onClick={() => uploadVideoMutation.mutate(formData)}
                  disabled={!formData.title || !formData.video_url || uploading || uploadVideoMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {uploading ? 'Uploading...' : uploadVideoMutation.isPending ? 'Creating...' : 'Create Exclusive Content'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-900/30 to-stone-900 border-amber-600/30">
            <CardContent className="p-4">
              <Video className="w-6 h-6 text-amber-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">{exclusiveContent.length}</p>
              <p className="text-amber-400/60 text-sm">Total Content</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">{totalEarnings}</p>
              <p className="text-amber-400/60 text-sm">🪙 Earned</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-900/30 to-stone-900 border-blue-600/30">
            <CardContent className="p-4">
              <Lock className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">{totalUnlocks}</p>
              <p className="text-amber-400/60 text-sm">Total Unlocks</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-900/30 to-stone-900 border-purple-600/30">
            <CardContent className="p-4">
              <Crown className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">40%</p>
              <p className="text-amber-400/60 text-sm">Your Cut</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100">Your Exclusive Content</CardTitle>
          </CardHeader>
          <CardContent>
            {exclusiveContent.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exclusiveContent.map((content, i) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.25 }}
                    className="bg-stone-900/50 rounded-xl overflow-hidden border border-amber-600/20"
                  >
                    <div className="relative aspect-video bg-stone-950">
                      {content.thumbnail_url ? (
                        <img src={content.thumbnail_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-12 h-12 text-amber-400/30" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-amber-600 text-white">
                          🪙 {content.tip_price_denarii}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-amber-100 font-semibold mb-2">{content.title}</h3>
                      <p className="text-amber-400/60 text-sm line-clamp-2 mb-3">{content.description}</p>
                      
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="flex items-center gap-1 text-amber-400/60">
                          <Eye className="w-4 h-4" />
                          {content.view_count || 0} views
                        </span>
                        <span className="flex items-center gap-1 text-green-400">
                          <Lock className="w-4 h-4" />
                          {content.unlock_count || 0} unlocks
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => deleteMutation.mutate(content.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-red-500/30 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Lock className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
                <h3 className="text-xl text-amber-100 mb-2">No Exclusive Content Yet</h3>
                <p className="text-amber-400/60 mb-4">Create tip-gated content that fans can unlock</p>
                <Button onClick={() => setShowUploadForm(true)} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Content
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}