import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3,
  TrendingUp,
  Eye,
  Clock,
  ThumbsUp,
  Users,
  DollarSign,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Video,
  Globe,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const TIME_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '28', label: 'Last 28 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 365 days' }
];

const COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6', '#ec4899'];

export default function ChannelAnalytics() {
  const [timeRange, setTimeRange] = useState('28');
  const [activeTab, setActiveTab] = useState('overview');

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

  const { data: videos = [] } = useQuery({
    queryKey: ['analytics-videos', creator?.id],
    queryFn: () => base44.entities.VlogVideo.filter({ creator_id: creator.id }, '-created_date', 100),
    enabled: !!creator?.id
  });

  const { data: analytics = [] } = useQuery({
    queryKey: ['channel-analytics', creator?.id, timeRange],
    queryFn: () => base44.entities.VideoAnalytics.filter({ creator_id: creator.id }, '-date', parseInt(timeRange)),
    enabled: !!creator?.id
  });

  // Calculate metrics
  const totalViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (v.like_count || 0), 0);
  const totalWatchTime = videos.reduce((sum, v) => sum + (v.watch_time_hours || 0), 0);
  const avgViewDuration = analytics.length > 0 
    ? analytics.reduce((sum, a) => sum + (a.avg_view_duration_seconds || 0), 0) / analytics.length
    : 0;

  // Generate chart data
  const chartData = useMemo(() => {
    const days = parseInt(timeRange);
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayAnalytics = analytics.filter(a => a.date === dateStr);
      
      data.push({
        date: format(date, 'MMM d'),
        views: dayAnalytics.reduce((sum, a) => sum + (a.views || 0), 0),
        watchTime: dayAnalytics.reduce((sum, a) => sum + (a.watch_time_minutes || 0), 0),
        likes: dayAnalytics.reduce((sum, a) => sum + (a.likes || 0), 0),
        comments: dayAnalytics.reduce((sum, a) => sum + (a.comments || 0), 0)
      });
    }
    return data;
  }, [analytics, timeRange]);

  // Top videos by views
  const topVideos = useMemo(() => {
    return [...videos]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5);
  }, [videos]);

  // Traffic sources (mock data for demo)
  const trafficSources = [
    { name: 'Browse', value: 35, color: '#f59e0b' },
    { name: 'Search', value: 25, color: '#ef4444' },
    { name: 'Suggested', value: 20, color: '#8b5cf6' },
    { name: 'External', value: 12, color: '#10b981' },
    { name: 'Direct', value: 8, color: '#3b82f6' }
  ];

  // Device breakdown (mock data)
  const deviceData = [
    { name: 'Mobile', value: 65, icon: Smartphone },
    { name: 'Desktop', value: 28, icon: Monitor },
    { name: 'Tablet', value: 7, icon: Tablet }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900 border border-amber-600/30 rounded-lg p-3 shadow-lg">
          <p className="text-amber-100 font-semibold mb-1">{label}</p>
          {payload.map((entry, i) => (
            <p key={i} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('CreatorStudio')}>
              <Button variant="ghost" className="text-amber-400">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-green-400" />
                Channel Analytics
              </h1>
              <p className="text-amber-400/70 text-sm">Track your channel performance</p>
            </div>
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-stone-800/50 border-amber-600/20 text-amber-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-amber-600/30">
              {TIME_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value} className="text-amber-100">
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-900/30 to-stone-900 border-blue-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/60 text-sm">Views</p>
                  <p className="text-2xl font-bold text-amber-100">{totalViews.toLocaleString()}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-900/30 to-stone-900 border-purple-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/60 text-sm">Watch Time</p>
                  <p className="text-2xl font-bold text-amber-100">{totalWatchTime.toFixed(1)}h</p>
                </div>
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/60 text-sm">Subscribers</p>
                  <p className="text-2xl font-bold text-amber-100">{(creator?.follower_count || 0).toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-900/30 to-stone-900 border-amber-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/60 text-sm">Avg. Duration</p>
                  <p className="text-2xl font-bold text-amber-100">{Math.floor(avgViewDuration / 60)}:{(avgViewDuration % 60).toFixed(0).padStart(2, '0')}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-amber-600">Overview</TabsTrigger>
            <TabsTrigger value="reach" className="data-[state=active]:bg-amber-600">Reach</TabsTrigger>
            <TabsTrigger value="engagement" className="data-[state=active]:bg-amber-600">Engagement</TabsTrigger>
            <TabsTrigger value="audience" className="data-[state=active]:bg-amber-600">Audience</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Views Chart */}
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Views Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#viewsGradient)"
                        name="Views"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Videos */}
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Top Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topVideos.map((video, i) => (
                    <div key={video.id} className="flex items-center gap-4 p-3 bg-stone-900/50 rounded-lg">
                      <span className="text-amber-400 font-bold w-6">{i + 1}</span>
                      <div className="w-24 aspect-video bg-stone-800 rounded overflow-hidden flex-shrink-0">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-6 h-6 text-amber-400/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-amber-100 font-semibold truncate">{video.title}</p>
                        <p className="text-amber-400/60 text-sm">{(video.view_count || 0).toLocaleString()} views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reach" className="space-y-6">
            {/* Traffic Sources */}
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={trafficSources}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {trafficSources.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {trafficSources.map((source, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                          <span className="text-amber-100">{source.name}</span>
                        </div>
                        <span className="text-amber-400 font-semibold">{source.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            {/* Engagement Chart */}
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Engagement Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="likes" name="Likes" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="comments" name="Comments" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="space-y-6">
            {/* Device Breakdown */}
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Device Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {deviceData.map((device, i) => {
                    const Icon = device.icon;
                    return (
                      <div key={i} className="bg-stone-900/50 rounded-xl p-6 text-center">
                        <Icon className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                        <p className="text-2xl font-bold text-amber-100">{device.value}%</p>
                        <p className="text-amber-400/60">{device.name}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}