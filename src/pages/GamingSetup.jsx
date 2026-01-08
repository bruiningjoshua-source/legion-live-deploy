import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Check, X, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const platforms = [
  { id: 'steam', name: 'Steam', icon: '🎮', color: 'from-blue-600 to-blue-700' },
  { id: 'xbox', name: 'Xbox', icon: '🎮', color: 'from-green-600 to-green-700' },
  { id: 'playstation', name: 'PlayStation', icon: '🎮', color: 'from-blue-600 to-indigo-700' },
  { id: 'oculus', name: 'Oculus VR', icon: '🥽', color: 'from-purple-600 to-purple-700' },
  { id: 'obs', name: 'OBS Studio', icon: '📹', color: 'from-gray-600 to-gray-700' },
  { id: 'streamlabs', name: 'Streamlabs', icon: '⭐', color: 'from-yellow-600 to-orange-600' }
];

export default function GamingSetup() {
  const queryClient = useQueryClient();

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

  const connectMutation = useMutation({
    mutationFn: (data) => base44.entities.GamingIntegration.create({
      ...data,
      creator_id: creator.id,
      is_connected: true
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['gaming-integrations']);
      toast.success(`Connected to ${variables.platform}!`);
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: ({ id, settings }) => base44.entities.GamingIntegration.update(id, { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries(['gaming-integrations']);
      toast.success('Settings updated!');
    }
  });

  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', apiKey: '' });

  const handleConnect = (platform) => {
    if (!credentials.username) {
      toast.error('Username required');
      return;
    }
    connectMutation.mutate({
      platform: platform.id,
      platform_username: credentials.username,
      api_key: credentials.apiKey,
      settings: {
        show_game_title: true,
        show_achievements: true,
        overlay_enabled: false
      }
    });
    setConnectingPlatform(null);
    setCredentials({ username: '', apiKey: '' });
  };

  const getIntegration = (platformId) => {
    return integrations.find(i => i.platform === platformId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2 flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-amber-400" />
            Gaming Integrations
          </h1>
          <p className="text-amber-400/70">Connect your gaming platforms for enhanced streaming</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform, i) => {
            const integration = getIntegration(platform.id);
            const isConnected = !!integration;

            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-stone-800/30 border-amber-600/20 hover:border-amber-500/50 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl`}>
                          {platform.icon}
                        </div>
                        <div>
                          <CardTitle className="text-amber-100 text-lg">{platform.name}</CardTitle>
                          {isConnected && (
                            <Badge className="bg-green-600/20 text-green-300 border-green-500/30 mt-1">
                              <Check className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isConnected ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-amber-200 text-sm">Username</Label>
                          <p className="text-amber-100 font-medium">{integration.platform_username}</p>
                        </div>
                        
                        <div className="space-y-3 pt-2 border-t border-amber-600/20">
                          <div className="flex items-center justify-between">
                            <Label className="text-amber-200 text-sm">Show Game Title</Label>
                            <Switch
                              checked={integration.settings?.show_game_title}
                              onCheckedChange={(checked) => {
                                updateSettingsMutation.mutate({
                                  id: integration.id,
                                  settings: { ...integration.settings, show_game_title: checked }
                                });
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-amber-200 text-sm">Show Achievements</Label>
                            <Switch
                              checked={integration.settings?.show_achievements}
                              onCheckedChange={(checked) => {
                                updateSettingsMutation.mutate({
                                  id: integration.id,
                                  settings: { ...integration.settings, show_achievements: checked }
                                });
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-amber-200 text-sm">Overlay Enabled</Label>
                            <Switch
                              checked={integration.settings?.overlay_enabled}
                              onCheckedChange={(checked) => {
                                updateSettingsMutation.mutate({
                                  id: integration.id,
                                  settings: { ...integration.settings, overlay_enabled: checked }
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {connectingPlatform === platform.id ? (
                          <>
                            <Input
                              placeholder="Username"
                              value={credentials.username}
                              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                              className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                            />
                            <Input
                              placeholder="API Key (optional)"
                              value={credentials.apiKey}
                              onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                              className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                              type="password"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleConnect(platform)}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                Confirm
                              </Button>
                              <Button
                                onClick={() => setConnectingPlatform(null)}
                                variant="outline"
                                className="border-amber-600/30"
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button
                            onClick={() => setConnectingPlatform(platform.id)}
                            className={`w-full bg-gradient-to-r ${platform.color} text-white`}
                          >
                            Connect {platform.name}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Instructions */}
        <Card className="bg-stone-800/30 border-amber-600/20 mt-8">
          <CardHeader>
            <CardTitle className="text-amber-100">Integration Guide</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-200 space-y-2">
            <p>• <strong>Steam:</strong> Enter your Steam username to show currently playing game</p>
            <p>• <strong>Xbox/PlayStation:</strong> Connect your gamertag to display achievements</p>
            <p>• <strong>OBS/Streamlabs:</strong> Configure stream keys for direct streaming integration</p>
            <p>• <strong>Oculus:</strong> Show VR gameplay status and achievements</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}