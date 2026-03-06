import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Radio,
  DollarSign,
  Settings,
  AlertCircle,
  TrendingUp,
  Eye,
  Zap,
  Trash2,
  Power,
  Shield,
  BarChart3,
  Briefcase,
  Bot,
  CreditCard,
  Gift
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import formatCount from '@/components/shared/FormatCount';
import PayoutConfigManager from '@/components/admin/PayoutConfigManager';

// Authorized admin emails - update these as needed
// Authorized admin emails - add your admin emails here
const AUTHORIZED_ADMINS = [
  'admin@legionlive.io', 
  'support@legionlive.io', 
  'inthestixproductions@gmail.com', 
  'muggabuckerpro@gmail.com', 
  'rankincadence@gmail.com', 
  'invictaoperations@gmail.com', 
  'bruiningjoshua@gmail.com'
];

// CEO-level affiliates who get special earnings structure
const CEO_AFFILIATES = ['rankincadence@gmail.com'];

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: streams = [] } = useQuery({
    queryKey: ['admin-streams'],
    queryFn: () => base44.entities.Stream.list('-created_date', 100),
    enabled: user && AUTHORIZED_ADMINS.includes(user.email)
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['admin-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 100),
    enabled: user && AUTHORIZED_ADMINS.includes(user.email)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Only admins can list users via the service role function
      const response = await base44.functions.invoke('adminListUsers');
      return response.data?.users || [];
    },
    enabled: user && AUTHORIZED_ADMINS.includes(user.email)
  });

  const clearLiveStreamsMutation = useMutation({
    mutationFn: () => base44.functions.invoke('clearLiveStreams'),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Platform cleared for launch!');
    },
    onError: () => toast.error('Failed to clear streams')
  });

  // Check both admin role AND authorized email
  const isAuthorized = user?.role === 'admin' && AUTHORIZED_ADMINS.includes(user?.email);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 flex items-center justify-center">
        <Card className="bg-stone-800/50 border-red-500/30 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400/50 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-amber-100 mb-2">Access Denied</h2>
            <p className="text-amber-400/70">Authorized administrators only</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const liveStreamCount = streams.filter(s => s.status === 'live').length;
  const totalViewers = streams.reduce((sum, s) => sum + (s.viewer_count || 0), 0);
  const totalRevenue = streams.reduce((sum, s) => sum + (s.total_denarii_earned || 0), 0);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header - Centered */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center gap-2 mb-2">
            <Zap className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p className="text-white/50 text-sm">Manage platform, users, and content</p>
        </motion.div>

        {/* Quick Stats - 2x2 grid on mobile */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { icon: Radio, label: 'Live', value: liveStreamCount, color: 'red' },
            { icon: Users, label: 'Creators', value: creators.length, color: 'blue' },
            { icon: Eye, label: 'Viewers', value: formatCount(totalViewers), color: 'purple' },
            { icon: TrendingUp, label: 'Revenue', value: formatCount(totalRevenue), color: 'green' }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardContent className="p-4 text-center">
                    <Icon className={`w-5 h-5 mx-auto mb-2 text-${stat.color}-400`} />
                    <div className="text-xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-white/50">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Links - 3x2 grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link to={createPageUrl('PlatformAdminAnalytics')}>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all h-full">
              <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-white font-medium text-xs">Analytics</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('ContentModerationAdmin')}>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all h-full">
              <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-white font-medium text-xs">Moderation</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('AmbassadorProgram')}>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all h-full">
              <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-white font-medium text-xs">Ambassadors</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('BrandCampaigns')}>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all h-full">
              <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
                <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-white font-medium text-xs">Brands</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('CreatorMonetization')}>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all h-full">
              <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-white font-medium text-xs">Monetization</p>
              </CardContent>
            </Card>
          </Link>
          <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30 h-full">
            <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-cyan-300 font-medium text-xs">AI Mod</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 mb-4">
            <TabsList className="bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-full inline-flex min-w-max">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-full px-4 text-white/70 text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="streams" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-full px-4 text-white/70 text-sm">
                Streams
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-full px-4 text-white/70 text-sm">
                Users
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-full px-4 text-white/70 text-sm">
                Controls
              </TabsTrigger>
              <TabsTrigger value="payouts" className="data-[state=active]:bg-white data-[state=active]:text-black rounded-full px-4 text-white/70 text-sm">
                Payouts
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base">Platform Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/80 text-sm">Live Streams</span>
                  <Badge className={liveStreamCount > 0 ? 'bg-red-500' : 'bg-green-500'}>
                    {liveStreamCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/80 text-sm">Creators</span>
                  <Badge className="bg-blue-500">{creators.length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/80 text-sm">Users</span>
                  <Badge className="bg-purple-500">{users.length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/80 text-sm">Revenue</span>
                  <Badge className="bg-green-500">${formatCount(totalRevenue)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-white/60">
                  <p>Avg viewers/stream: {streams.length > 0 ? Math.round(totalViewers / streams.length) : 0}</p>
                  <p>Top creator: {creators[0]?.display_name || 'N/A'}</p>
                  <p>Peak streams: {liveStreamCount}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Streams */}
          <TabsContent value="streams">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  Active Streams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {streams.filter(s => s.status === 'live').length > 0 ? (
                    streams.filter(s => s.status === 'live').map(stream => (
                      <div key={stream.id} className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium text-sm truncate">{stream.title}</p>
                          <p className="text-white/50 text-xs">{stream.viewer_count} viewers • {stream.category}</p>
                        </div>
                        <Badge className="bg-red-500 animate-pulse ml-2 shrink-0">LIVE</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/40 text-center py-8 text-sm">No active streams</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {users.map(u => (
                    <div key={u.id} className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium text-sm truncate">{u.full_name}</p>
                        <p className="text-white/50 text-xs truncate">{u.email}</p>
                      </div>
                      <Badge className={u.role === 'admin' ? 'bg-amber-500' : 'bg-white/20'}>
                        {u.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings/Controls */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-white/5 backdrop-blur-sm border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-400 text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Platform Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <h3 className="text-white font-medium text-sm mb-2">Clear Live Streams</h3>
                  <p className="text-white/50 text-xs mb-4">
                    End all streams and reset for clean launch.
                  </p>
                  <Button
                    onClick={() => {
                      if (window.confirm('Clear all live streams?')) {
                        clearLiveStreamsMutation.mutate();
                      }
                    }}
                    disabled={clearLiveStreamsMutation.isPending}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full w-full"
                    size="sm"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    {clearLiveStreamsMutation.isPending ? 'Processing...' : 'Clear & Launch'}
                  </Button>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <h3 className="text-white font-medium text-sm mb-2">Maintenance Mode</h3>
                  <p className="text-white/50 text-xs mb-4">
                    Take platform offline (coming soon)
                  </p>
                  <Button disabled className="bg-white/10 text-white/40 rounded-full w-full" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Coming Soon
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Configuration */}
          <TabsContent value="payouts">
            <PayoutConfigManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}