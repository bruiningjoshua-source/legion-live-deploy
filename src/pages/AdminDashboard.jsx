import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Power
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Authorized admin emails - update these as needed
const AUTHORIZED_ADMINS = ['admin@legionlive.io', 'support@legionlive.io', 'inthestixproductions@gmail.com', 'muggabuckerpro@gmail.com', 'rankincadence@gmail.com', 'invictaoperations@gmail.com'];

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
    queryFn: () => base44.asServiceRole.entities.Stream.list('-created_date', 100),
    enabled: user && AUTHORIZED_ADMINS.includes(user.email)
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['admin-creators'],
    queryFn: () => base44.asServiceRole.entities.Creator.list('-follower_count', 100),
    enabled: user && AUTHORIZED_ADMINS.includes(user.email)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.asServiceRole.entities.User.list('-created_date', 100),
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
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-8 h-8 text-amber-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-amber-100">Admin Dashboard</h1>
          </div>
          <p className="text-amber-400/70">Manage platform, users, and content</p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Radio, label: 'Live Streams', value: liveStreamCount, color: 'from-red-500' },
            { icon: Users, label: 'Creators', value: creators.length, color: 'from-blue-500' },
            { icon: Eye, label: 'Total Viewers', value: totalViewers.toLocaleString(), color: 'from-purple-500' },
            { icon: TrendingUp, label: 'Revenue', value: totalRevenue.toLocaleString(), color: 'from-green-500' }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className={`bg-gradient-to-br ${stat.color} bg-opacity-10 border-current border-opacity-20`}>
                  <CardContent className="p-4">
                    <Icon className="w-5 h-5 mb-2 opacity-70" />
                    <div className="text-2xl font-bold text-amber-100">{stat.value}</div>
                    <div className="text-xs text-amber-400/70">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-stone-800/50 border border-amber-600/20 w-full grid grid-cols-4">
            <TabsTrigger value="overview" className="data-[state=active]:bg-amber-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="streams" className="data-[state=active]:bg-amber-600">
              Streams
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-amber-600">
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-amber-600">
              Controls
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Platform Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                  <span className="text-amber-200">Live Streams Active</span>
                  <Badge className={liveStreamCount > 0 ? 'bg-red-600' : 'bg-green-600'}>
                    {liveStreamCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                  <span className="text-amber-200">Total Registered Creators</span>
                  <Badge className="bg-blue-600">{creators.length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                  <span className="text-amber-200">Platform Users</span>
                  <Badge className="bg-purple-600">{users.length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                  <span className="text-amber-200">Total Generated Revenue</span>
                  <Badge className="bg-green-600">${totalRevenue.toLocaleString()}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-amber-300/70">
                  <p>Average viewers per stream: {streams.length > 0 ? Math.round(totalViewers / streams.length) : 0}</p>
                  <p>Top creator: {creators[0]?.display_name || 'N/A'}</p>
                  <p>Peak concurrent streams: {liveStreamCount}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Streams */}
          <TabsContent value="streams" className="mt-6">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Radio className="w-5 h-5" />
                  Active Streams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {streams.filter(s => s.status === 'live').length > 0 ? (
                    streams.filter(s => s.status === 'live').map(stream => (
                      <div key={stream.id} className="p-3 bg-stone-900/50 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-amber-100 font-semibold">{stream.title}</p>
                          <p className="text-amber-400/60 text-xs">{stream.viewer_count} viewers • {stream.category}</p>
                        </div>
                        <Badge className="bg-red-600 animate-pulse">LIVE</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-amber-400/50 text-center py-8">No active streams</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-6">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Accounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {users.map(u => (
                    <div key={u.id} className="p-3 bg-stone-900/50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-amber-100 font-semibold">{u.full_name}</p>
                        <p className="text-amber-400/60 text-xs">{u.email}</p>
                      </div>
                      <Badge className={u.role === 'admin' ? 'bg-amber-600' : 'bg-stone-600'}>
                        {u.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings/Controls */}
          <TabsContent value="settings" className="mt-6 space-y-4">
            <Card className="bg-stone-800/30 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Platform Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <h3 className="text-red-200 font-semibold mb-2">Clear Live Streams</h3>
                  <p className="text-red-300/70 text-sm mb-4">
                    End all active streams and reset creator statuses for a clean launch.
                  </p>
                  <Button
                    onClick={() => {
                      if (window.confirm('Clear all live streams? This action cannot be undone.')) {
                        clearLiveStreamsMutation.mutate();
                      }
                    }}
                    disabled={clearLiveStreamsMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    {clearLiveStreamsMutation.isPending ? 'Processing...' : 'Clear & Launch'}
                  </Button>
                </div>

                <div className="p-4 bg-stone-800 border border-amber-600/20 rounded-lg">
                  <h3 className="text-amber-100 font-semibold mb-2">Maintenance Mode</h3>
                  <p className="text-amber-300/70 text-sm mb-4">
                    Take platform offline for maintenance (coming soon)
                  </p>
                  <Button disabled className="bg-stone-700 text-stone-400">
                    <Settings className="w-4 h-4 mr-2" />
                    Coming Soon
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}