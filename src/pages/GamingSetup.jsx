import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Gamepad2, Check, X, Settings, Copy, Eye, EyeOff, Radio, 
  Monitor, Mic, Volume2, Camera, Wifi, Zap, AlertCircle,
  RefreshCw, Download, ExternalLink, Server, Key, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const STREAMING_SOFTWARE = [
  { id: 'obs', name: 'OBS Studio', icon: '📹', color: 'from-gray-700 to-gray-800', description: 'Free, open-source streaming software' },
  { id: 'streamlabs', name: 'Streamlabs', icon: '⭐', color: 'from-teal-600 to-emerald-600', description: 'All-in-one streaming with alerts' },
  { id: 'xsplit', name: 'XSplit', icon: '🎬', color: 'from-blue-600 to-indigo-600', description: 'Professional broadcasting suite' },
  { id: 'prismlive', name: 'Prism Live', icon: '💎', color: 'from-purple-600 to-pink-600', description: 'Mobile-first streaming' }
];

const GAMING_PLATFORMS = [
  { id: 'steam', name: 'Steam', icon: '🎮', color: 'from-blue-600 to-blue-800' },
  { id: 'xbox', name: 'Xbox Live', icon: '🟢', color: 'from-green-600 to-green-800' },
  { id: 'playstation', name: 'PlayStation Network', icon: '🔵', color: 'from-blue-700 to-indigo-800' },
  { id: 'epic', name: 'Epic Games', icon: '🎯', color: 'from-gray-700 to-gray-900' },
  { id: 'battlenet', name: 'Battle.net', icon: '⚔️', color: 'from-blue-500 to-blue-700' },
  { id: 'nintendo', name: 'Nintendo Switch', icon: '🔴', color: 'from-red-600 to-red-800' }
];

export default function GamingSetup() {
  const queryClient = useQueryClient();
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [activeTab, setActiveTab] = useState('software');
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', apiKey: '' });

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

  const { data: integrations = [] } = useQuery({
    queryKey: ['gaming-integrations', creator?.id],
    queryFn: () => base44.entities.GamingIntegration.filter({ creator_id: creator.id }),
    enabled: !!creator?.id
  });

  // Generate a unique stream key for the user
  const streamKey = useMemo(() => {
    if (!creator?.id) return '';
    return `live_${creator.id.substring(0, 8)}_${btoa(creator.user_email || '').substring(0, 12)}`;
  }, [creator]);

  const rtmpUrl = 'rtmp://live.legionlive.io/live';

  const connectMutation = useMutation({
    mutationFn: (data) => base44.entities.GamingIntegration.create({
      ...data,
      creator_id: creator.id,
      is_connected: true
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['gaming-integrations']);
      toast.success(`Connected to ${variables.platform}!`);
      setConnectingPlatform(null);
      setCredentials({ username: '', apiKey: '' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GamingIntegration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['gaming-integrations']);
      toast.success('Settings updated!');
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: (id) => base44.entities.GamingIntegration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['gaming-integrations']);
      toast.success('Disconnected!');
    }
  });

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const getIntegration = (platformId) => integrations.find(i => i.platform === platformId);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0e0e10] via-[#18181b] to-[#0e0e10] pt-20 flex items-center justify-center">
        <Card className="bg-stone-800/50 border-purple-500/30 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
            <p className="text-white/60 mb-4">Please sign in to access streaming setup</p>
            <Button onClick={() => base44.auth.redirectToLogin()} className="bg-purple-600 hover:bg-purple-700">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0e0e10] via-[#18181b] to-[#0e0e10] pt-20 pb-24">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Settings className="w-8 h-8 text-purple-500" />
              Stream Setup
            </h1>
            <p className="text-white/60">Configure your streaming software and gaming integrations</p>
          </div>
          <Link to={createPageUrl('GoLive')}>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-stone-800/50 border border-purple-500/20 mb-6">
            <TabsTrigger value="software" className="data-[state=active]:bg-purple-600">
              <Monitor className="w-4 h-4 mr-2" />
              Software
            </TabsTrigger>
            <TabsTrigger value="platforms" className="data-[state=active]:bg-purple-600">
              <Gamepad2 className="w-4 h-4 mr-2" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Software Setup Tab */}
          <TabsContent value="software" className="space-y-6">
            {/* Stream Key Section */}
            <Card className="bg-gradient-to-br from-purple-900/30 to-stone-900 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-400" />
                  Stream Key & Server
                </CardTitle>
                <CardDescription className="text-white/60">
                  Use these credentials in OBS, Streamlabs, or any RTMP-compatible software
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* RTMP URL */}
                <div>
                  <Label className="text-white/80 text-sm">Server URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={rtmpUrl}
                      readOnly
                      className="bg-stone-800/50 border-purple-500/20 text-white font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(rtmpUrl, 'Server URL')}
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Stream Key */}
                <div>
                  <Label className="text-white/80 text-sm">Stream Key</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <Input
                        type={showStreamKey ? 'text' : 'password'}
                        value={streamKey}
                        readOnly
                        className="bg-stone-800/50 border-purple-500/20 text-white font-mono pr-10"
                      />
                      <button
                        onClick={() => setShowStreamKey(!showStreamKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                      >
                        {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(streamKey, 'Stream Key')}
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-red-400/70 text-xs mt-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Never share your stream key with anyone
                  </p>
                </div>

                {/* Quick Copy All */}
                <Button
                  onClick={() => copyToClipboard(`Server: ${rtmpUrl}\nStream Key: ${streamKey}`, 'Credentials')}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All Credentials
                </Button>
              </CardContent>
            </Card>

            {/* Streaming Software */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Recommended Software</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STREAMING_SOFTWARE.map((software, i) => (
                  <motion.div
                    key={software.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="bg-stone-800/40 border-purple-500/20 hover:border-purple-500/50 transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${software.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                            {software.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg">{software.name}</h3>
                            <p className="text-white/50 text-sm mb-3">{software.description}</p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 text-white/60 hover:bg-white/10"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Guide
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* OBS Setup Guide */}
            <Card className="bg-stone-800/40 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">Quick Setup Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-white/80">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium text-white">Open OBS/Streamlabs Settings</p>
                    <p className="text-sm text-white/60">Go to Settings → Stream</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium text-white">Select "Custom" Service</p>
                    <p className="text-sm text-white/60">Choose Custom RTMP server from the dropdown</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium text-white">Enter Server & Key</p>
                    <p className="text-sm text-white/60">Paste the server URL and stream key from above</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">4</div>
                  <div>
                    <p className="font-medium text-white">Start Streaming!</p>
                    <p className="text-sm text-white/60">Click "Start Streaming" in OBS, then go live on Legion</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gaming Platforms Tab */}
          <TabsContent value="platforms" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {GAMING_PLATFORMS.map((platform, i) => {
                const integration = getIntegration(platform.id);
                const isConnected = !!integration;

                return (
                  <motion.div
                    key={platform.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="bg-stone-800/40 border-purple-500/20 hover:border-purple-500/50 transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl`}>
                              {platform.icon}
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">{platform.name}</h3>
                              {isConnected && (
                                <Badge className="bg-green-500/20 text-green-300 border-0 text-xs mt-1">
                                  <Check className="w-3 h-3 mr-1" />
                                  Connected
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {isConnected ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-stone-900/50 rounded-lg">
                              <p className="text-white/60 text-xs">Username</p>
                              <p className="text-white font-medium">{integration.platform_username}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-white/70 text-sm">Show Game</Label>
                                <Switch
                                  checked={integration.settings?.show_game_title}
                                  onCheckedChange={(checked) => updateMutation.mutate({
                                    id: integration.id,
                                    data: { settings: { ...integration.settings, show_game_title: checked } }
                                  })}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label className="text-white/70 text-sm">Show Stats</Label>
                                <Switch
                                  checked={integration.settings?.show_achievements}
                                  onCheckedChange={(checked) => updateMutation.mutate({
                                    id: integration.id,
                                    data: { settings: { ...integration.settings, show_achievements: checked } }
                                  })}
                                />
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => disconnectMutation.mutate(integration.id)}
                              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/20"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Disconnect
                            </Button>
                          </div>
                        ) : connectingPlatform === platform.id ? (
                          <div className="space-y-3">
                            <Input
                              placeholder="Username / Gamertag"
                              value={credentials.username}
                              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                              className="bg-stone-900/50 border-purple-500/20 text-white"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => connectMutation.mutate({
                                  platform: platform.id,
                                  platform_username: credentials.username,
                                  settings: { show_game_title: true, show_achievements: true }
                                })}
                                disabled={!credentials.username || connectMutation.isPending}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                Connect
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConnectingPlatform(null)}
                                className="border-white/20"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setConnectingPlatform(platform.id)}
                            className={`w-full bg-gradient-to-r ${platform.color}`}
                          >
                            Connect
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* Stream Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Video Settings */}
              <Card className="bg-stone-800/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-purple-400" />
                    Recommended Video Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-stone-900/50 rounded-lg flex justify-between">
                    <span className="text-white/70">Resolution</span>
                    <span className="text-white font-mono">1920x1080</span>
                  </div>
                  <div className="p-3 bg-stone-900/50 rounded-lg flex justify-between">
                    <span className="text-white/70">Frame Rate</span>
                    <span className="text-white font-mono">60 FPS</span>
                  </div>
                  <div className="p-3 bg-stone-900/50 rounded-lg flex justify-between">
                    <span className="text-white/70">Video Bitrate</span>
                    <span className="text-white font-mono">6000 Kbps</span>
                  </div>
                  <div className="p-3 bg-stone-900/50 rounded-lg flex justify-between">
                    <span className="text-white/70">Encoder</span>
                    <span className="text-white font-mono">x264 / NVENC</span>
                  </div>
                </CardContent>
              </Card>

              {/* Audio Settings */}
              <Card className="bg-stone-800/40 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mic className="w-5 h-5 text-purple-400" />
                    Recommended Audio Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-stone-900/50 rounded-lg flex justify-between">
                    <span className="text-white/70">Sample Rate</span>
                    <span className="text-white font-mono">48 kHz</span>
                  </div>
                  <div className="p-3 bg-stone-900/50 rounded-lg flex justify-between">
                    <span className="text-white/70">Audio Bitrate</span>
                    <span className="text-white font-mono">160 Kbps</span>
                  </div>
                  <div className="p-3 bg-stone-900/50 rounded-lg flex justify-between">
                    <span className="text-white/70">Channels</span>
                    <span className="text-white font-mono">Stereo</span>
                  </div>
                  <div className="p-3 bg-stone-900/50 rounded-lg flex justify-between">
                    <span className="text-white/70">Codec</span>
                    <span className="text-white font-mono">AAC</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Connection Test */}
            <Card className="bg-gradient-to-br from-purple-900/30 to-stone-900 border-purple-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Wifi className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Connection Status</h3>
                      <p className="text-white/60 text-sm">Test your stream connection</p>
                    </div>
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Zap className="w-4 h-4 mr-2" />
                    Test Connection
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