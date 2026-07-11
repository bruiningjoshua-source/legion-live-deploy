import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Video,
  Upload,
  BarChart3,
  Search,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Globe,
  Lock,
  EyeOff,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Users,
  Play,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import formatCount from '@/components/shared/FormatCount';
import ScheduleManager from '@/components/creator/ScheduleManager';

const REVIEW_STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Under Review' },
  approved: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Rejected' },
  flagged: { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Flagged' }
};

const VISIBILITY_CONFIG = {
  public: { icon: Globe, color: 'text-green-400', label: 'Public' },
  unlisted: { icon: EyeOff, color: 'text-yellow-400', label: 'Unlisted' },
  private: { icon: Lock, color: 'text-red-400', label: 'Private' }
};

export default function CreatorStudio() {
  const [activeTab, setActiveTab] = useState('content');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

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

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['studio-videos', creator?.id],
    queryFn: () => base44.entities.VlogVideo.filter({ creator_id: creator.id }, '-created_date', 100),
    enabled: !!creator?.id
  });

  const { data: analytics = [] } = useQuery({
    queryKey: ['studio-analytics', creator?.id],
    queryFn: () => base44.entities.VideoAnalytics.filter({ creator_id: creator.id }, '-date', 30),
    enabled: !!creator?.id
  });

  const deleteMutation = useMutation({
    mutationFn: (videoId) => base44.entities.VlogVideo.delete(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-videos'] });
      toast.success('Video deleted');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VlogVideo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-videos'] });
      toast.success('Video updated');
    }
  });

  // Calculate dashboard stats
  const totalViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (v.like_count || 0), 0);
  const totalWatchTime = videos.reduce((sum, v) => sum + (v.watch_time_hours || 0), 0);
  const publishedCount = videos.filter(v => v.is_published && v.review_status === 'approved').length;

  // Filter videos
  const filteredVideos = videos.filter(v => {
    const matchesSearch = !searchQuery || 
      v.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || v.review_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // While the user query is still resolving, show a calm loader instead of
  // flashing the sign-in screen (which caused the clunky load).
  if (user === undefined) {
    return (
      <div className="ll-page-enter min-h-screen bg-[#050508] pb-20">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2.5 mb-5">
            <Video className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-amber-100">Creator Studio</h1>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl bg-white/5" />)}
          </div>
          <Skeleton className="h-10 rounded-xl bg-white/5 mb-5" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}
          </div>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="min-h-screen bg-[#050508] pb-12 flex items-center justify-center px-4">
        <div className="ll-panel p-8 text-center max-w-sm">
          <Video className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl text-amber-100 mb-4">Sign in to access Creator Studio</h2>
          <button onClick={() => base44.auth.redirectToLogin()} className="ll-btn ll-btn-primary w-full">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ll-page-enter min-h-screen bg-[#050508] pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Video className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-amber-100 leading-tight">Creator Studio</h1>
              <p className="text-white/40 text-xs mt-0.5">Manage videos, analytics &amp; channel</p>
            </div>
          </div>
          <Link to={createPageUrl('VideoUpload')} className="shrink-0">
            <button className="ll-btn ll-btn-primary !h-9 !px-4 text-sm">
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
          </Link>
        </div>

        {/* Dashboard Stats — unified bronze, 2x2 on mobile */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: Eye,      label: 'Total Views', value: formatCount(totalViews) },
            { icon: ThumbsUp, label: 'Total Likes', value: formatCount(totalLikes) },
            { icon: Clock,    label: 'Watch Time',  value: `${totalWatchTime.toFixed(1)}h` },
            { icon: Video,    label: 'Published',   value: publishedCount },
          ].map((stat, i) => (
            <div key={i} className="ll-card p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(200,135,26,0.14)' }}>
                  <stat.icon className="w-4.5 h-4.5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-amber-100 leading-none">{stat.value}</p>
                  <p className="text-white/40 text-xs mt-1">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="w-full grid grid-cols-4 bg-white/[0.03] border border-white/8 p-1 rounded-xl h-auto">
            <TabsTrigger value="content" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black rounded-lg text-xs py-2">
              <Video className="w-3.5 h-3.5 mr-1" /> Content
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black rounded-lg text-xs py-2">
              <BarChart3 className="w-3.5 h-3.5 mr-1" /> Stats
            </TabsTrigger>
            <TabsTrigger value="comments" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black rounded-lg text-xs py-2">
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Comments
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-amber-600 data-[state=active]:text-black rounded-lg text-xs py-2">
              📅 <span className="ml-1">Schedule</span>
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400/50" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-stone-800/50 border-amber-600/20 text-amber-100"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-amber-600/20 text-amber-300">
                    <Filter className="w-4 h-4 mr-2" />
                    {filterStatus === 'all' ? 'All Status' : REVIEW_STATUS_CONFIG[filterStatus]?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-stone-900 border-amber-600/30">
                  <DropdownMenuItem onClick={() => setFilterStatus('all')} className="text-amber-100">
                    All Status
                  </DropdownMenuItem>
                  {Object.entries(REVIEW_STATUS_CONFIG).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => setFilterStatus(key)} className="text-amber-100">
                      <config.icon className={`w-4 h-4 mr-2 ${config.color}`} />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Video List */}
            {videosLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl bg-stone-800" />
                ))}
              </div>
            ) : filteredVideos.length > 0 ? (
              <div className="space-y-4">
                {filteredVideos.map((video, i) => {
                    const reviewConfig = REVIEW_STATUS_CONFIG[video.review_status] || REVIEW_STATUS_CONFIG.pending;
                    const visConfig = VISIBILITY_CONFIG[video.visibility] || VISIBILITY_CONFIG.public;
                    const ReviewIcon = reviewConfig.icon;
                    const VisIcon = visConfig.icon;

                    return (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                      >
                        <Card className="bg-stone-800/30 border-amber-600/20 hover:border-amber-500/40 transition-all">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {/* Thumbnail */}
                              <div className="w-40 aspect-video bg-stone-900 rounded-lg overflow-hidden flex-shrink-0 relative group">
                                {video.thumbnail_url ? (
                                  <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Video className="w-8 h-8 text-amber-400/30" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Play className="w-8 h-8 text-white" />
                                </div>
                                {video.duration_seconds && (
                                  <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
                                    {formatDuration(video.duration_seconds)}
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <h3 className="text-amber-100 font-semibold truncate">{video.title}</h3>
                                    <p className="text-amber-400/60 text-sm line-clamp-2 mt-1">{video.description}</p>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-amber-400">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-stone-900 border-amber-600/30">
                                      <DropdownMenuItem asChild className="text-amber-100">
                                        <Link to={createPageUrl(`VideoEditor?id=${video.id}`)}>
                                          <Edit className="w-4 h-4 mr-2" />
                                          Edit Details
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild className="text-amber-100">
                                        <Link to={createPageUrl(`VideoAnalytics?id=${video.id}`)}>
                                          <BarChart3 className="w-4 h-4 mr-2" />
                                          View Analytics
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => deleteMutation.mutate(video.id)}
                                        className="text-red-400"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                  <Badge className={`${reviewConfig.bg} ${reviewConfig.color} border-0`}>
                                    <ReviewIcon className="w-3 h-3 mr-1" />
                                    {reviewConfig.label}
                                  </Badge>
                                  <Badge className="bg-stone-700/50 text-amber-300 border-0">
                                    <VisIcon className="w-3 h-3 mr-1" />
                                    {visConfig.label}
                                  </Badge>
                                  <Badge className="bg-stone-700/50 text-amber-300 border-0">
                                    {video.video_type === 'short' ? '📱 Short' : '🎬 Long'}
                                  </Badge>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 mt-3 text-sm text-amber-400/70">
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    {formatCount(video.view_count)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <ThumbsUp className="w-4 h-4" />
                                    {formatCount(video.like_count)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="w-4 h-4" />
                                    {formatCount(video.comment_count)}
                                  </span>
                                  <span className="text-amber-400/50">
                                    {video.created_date && format(new Date(video.created_date), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
            ) : (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="py-16 text-center">
                  <Video className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
                  <h3 className="text-xl text-amber-100 font-semibold mb-2">No Videos Yet</h3>
                  <p className="text-amber-400/60 mb-6">Upload your first video to get started</p>
                  <Link to={createPageUrl('VideoUpload')}>
                    <Button className="bg-red-600 hover:bg-red-700">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Video
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Channel Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-stone-900/50 rounded-xl p-6 text-center">
                    <Eye className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-amber-100">{formatCount(totalViews)}</p>
                    <p className="text-amber-400/60">Total Views</p>
                  </div>
                  <div className="bg-stone-900/50 rounded-xl p-6 text-center">
                    <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-amber-100">{formatCount(creator?.follower_count)}</p>
                    <p className="text-amber-400/60">Subscribers</p>
                  </div>
                  <div className="bg-stone-900/50 rounded-xl p-6 text-center">
                    <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-amber-100">{totalWatchTime.toFixed(1)}h</p>
                    <p className="text-amber-400/60">Watch Time</p>
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                  <Link to={createPageUrl('ChannelAnalytics')}>
                    <Button variant="outline" className="border-amber-600/30 text-amber-300">
                      View Detailed Analytics
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  Recent Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                  <p className="text-amber-400/60">Comments management coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <ScheduleManager creator={creator} user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}