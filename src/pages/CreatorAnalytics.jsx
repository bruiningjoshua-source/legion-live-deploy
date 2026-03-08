import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, Users, Eye, Heart } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CreatorAnalytics() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: creator, isLoading } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: streams = [] } = useQuery({
    queryKey: ['analytics-streams', creator?.id],
    queryFn: () => base44.entities.Stream.filter({ creator_id: creator.id }, '-created_date', 50),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['analytics-videos', creator?.id],
    queryFn: () => base44.entities.VlogVideo.filter({ creator_id: creator.id }, '-created_date', 50),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  const totalViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (v.like_count || 0), 0);
  const avgViewDuration = streams.length > 0 ? (streams.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / streams.length).toFixed(1) : 0;

  const viewsData = videos.slice(0, 10).map((v, i) => ({
    name: `Video ${i + 1}`,
    views: v.view_count || 0,
    likes: v.like_count || 0
  }));

  const streamData = streams.slice(0, 7).map((s, i) => ({
    name: `Stream ${i + 1}`,
    viewers: s.peak_viewers || 0,
    duration: s.duration_minutes || 0
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2">Creator Analytics</h1>
          <p className="text-amber-400/70">Track your performance and audience growth</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Total Views</p>
                  <p className="text-3xl font-bold text-amber-100">{totalViews.toLocaleString()}</p>
                </div>
                <Eye className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Total Likes</p>
                  <p className="text-3xl font-bold text-amber-100">{totalLikes.toLocaleString()}</p>
                </div>
                <Heart className="w-12 h-12 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Followers</p>
                  <p className="text-3xl font-bold text-amber-100">{(creator?.follower_count || 0).toLocaleString()}</p>
                </div>
                <Users className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Avg Stream Time</p>
                  <p className="text-3xl font-bold text-amber-100">{avgViewDuration}m</p>
                </div>
                <TrendingUp className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20">
            <TabsTrigger value="videos">Video Performance</TabsTrigger>
            <TabsTrigger value="streams">Stream Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Video Views & Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                {viewsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={viewsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                      <YAxis stroke="rgba(255,255,255,0.5)" />
                      <Tooltip contentStyle={{ backgroundColor: '#1c1917', border: '1px solid rgba(217,119,6,0.3)' }} />
                      <Legend />
                      <Bar dataKey="views" fill="#f59e0b" />
                      <Bar dataKey="likes" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-amber-400/60 text-center py-8">No video data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="streams">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Stream Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {streamData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={streamData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                      <YAxis stroke="rgba(255,255,255,0.5)" />
                      <Tooltip contentStyle={{ backgroundColor: '#1c1917', border: '1px solid rgba(217,119,6,0.3)' }} />
                      <Legend />
                      <Line type="monotone" dataKey="viewers" stroke="#3b82f6" />
                      <Line type="monotone" dataKey="duration" stroke="#10b981" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-amber-400/60 text-center py-8">No stream data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}