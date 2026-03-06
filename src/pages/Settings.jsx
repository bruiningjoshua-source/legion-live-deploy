import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  User, 
  LogOut,
  AlertTriangle,
  Palette,
  Sparkles,
  Zap,
  Monitor,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import DeleteAccountModal from '@/components/settings/DeleteAccountModal';

const THEMES = [
  { id: 'roman', name: 'Roman Gold', colors: ['#d97706', '#f59e0b', '#fbbf24'], icon: '🏛️' },
  { id: 'neon', name: 'Neon Nights', colors: ['#ec4899', '#8b5cf6', '#06b6d4'], icon: '💜' },
  { id: 'ocean', name: 'Ocean Blue', colors: ['#0ea5e9', '#06b6d4', '#22d3ee'], icon: '🌊' },
  { id: 'fire', name: 'Fire Red', colors: ['#ef4444', '#f97316', '#eab308'], icon: '🔥' },
  { id: 'midnight', name: 'Midnight', colors: ['#6366f1', '#8b5cf6', '#a855f7'], icon: '🌙' },
  { id: 'cyber', name: 'Cyberpunk', colors: ['#00ff88', '#00ccff', '#ff00aa'], icon: '🤖' },
];

export default function Settings() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [notifications, setNotifications] = useState({
    liveAlerts: true,
    giftAlerts: true,
    followAlerts: true,
    eventReminders: true
  });

  const [appearance, setAppearance] = useState({
    theme: 'roman',
    particles: 'medium',
    animatedBg: true,
    reducedMotion: false
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Load saved appearance settings
  useEffect(() => {
    const savedTheme = localStorage.getItem('legion_theme');
    const savedParticles = localStorage.getItem('legion_particles');
    const savedAnimated = localStorage.getItem('legion_animated_bg');
    
    if (savedTheme) setAppearance(prev => ({ ...prev, theme: savedTheme }));
    if (savedParticles) setAppearance(prev => ({ ...prev, particles: savedParticles }));
    if (savedAnimated !== null) setAppearance(prev => ({ ...prev, animatedBg: savedAnimated === 'true' }));
  }, []);

  const dispatchThemeEvent = (detail) => {
    window.dispatchEvent(new CustomEvent('legion-theme-change', { detail }));
  };

  const handleThemeChange = (themeId) => {
    setAppearance(prev => ({ ...prev, theme: themeId }));
    localStorage.setItem('legion_theme', themeId);
    dispatchThemeEvent({ theme: themeId });
    toast.success(`Theme changed to ${THEMES.find(t => t.id === themeId)?.name}`);
  };

  const handleParticlesChange = (value) => {
    const modes = ['off', 'low', 'medium', 'high'];
    const mode = modes[value];
    setAppearance(prev => ({ ...prev, particles: mode }));
    localStorage.setItem('legion_particles', mode);
    dispatchThemeEvent({ particles: mode });
  };

  const handleAnimatedBgChange = (enabled) => {
    setAppearance(prev => ({ ...prev, animatedBg: enabled }));
    localStorage.setItem('legion_animated_bg', enabled.toString());
    dispatchThemeEvent({ animatedBg: enabled });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-amber-400" />
            Settings
          </h1>
          <p className="text-amber-400/70">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Account */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-400" />
                  Account
                </CardTitle>
                <CardDescription className="text-amber-400/60">
                  Your account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-amber-200">Email</Label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="bg-stone-900/50 border-amber-600/20 text-amber-100/70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-200">Full Name</Label>
                    <Input
                      value={user?.full_name || ''}
                      disabled
                      className="bg-stone-900/50 border-amber-600/20 text-amber-100/70"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-400" />
                  Notifications
                </CardTitle>
                <CardDescription className="text-amber-400/60">
                  Choose what you want to be notified about
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 font-medium">Live Alerts</p>
                    <p className="text-amber-400/60 text-sm">Get notified when creators you follow go live</p>
                  </div>
                  <Switch
                    checked={notifications.liveAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, liveAlerts: checked })}
                  />
                </div>
                <Separator className="bg-amber-600/20" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 font-medium">Gift Notifications</p>
                    <p className="text-amber-400/60 text-sm">Receive alerts when you get gifts</p>
                  </div>
                  <Switch
                    checked={notifications.giftAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, giftAlerts: checked })}
                  />
                </div>
                <Separator className="bg-amber-600/20" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 font-medium">New Followers</p>
                    <p className="text-amber-400/60 text-sm">Get notified of new followers</p>
                  </div>
                  <Switch
                    checked={notifications.followAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, followAlerts: checked })}
                  />
                </div>
                <Separator className="bg-amber-600/20" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 font-medium">Event Reminders</p>
                    <p className="text-amber-400/60 text-sm">Receive reminders for upcoming events</p>
                  </div>
                  <Switch
                    checked={notifications.eventReminders}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, eventReminders: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-amber-400" />
                  Appearance
                </CardTitle>
                <CardDescription className="text-amber-400/60">
                  Customize how Legion looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div>
                  <Label className="text-amber-200 mb-3 block">Color Theme</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map((theme) => (
                      <motion.button
                        key={theme.id}
                        onClick={() => handleThemeChange(theme.id)}
                        className={`p-3 rounded-xl border transition-all ${
                          appearance.theme === theme.id
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-white/10 hover:border-white/30 bg-stone-900/50'
                        }`}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex gap-1 justify-center mb-2">
                          {theme.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm">{theme.icon}</span>
                          <span className="text-white/80 text-xs">{theme.name}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <Separator className="bg-amber-600/20" />

                {/* Particle Effects */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-amber-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Particle Effects
                    </Label>
                    <span className="text-amber-400 text-sm capitalize">{appearance.particles}</span>
                  </div>
                  <Slider
                    value={[['off', 'low', 'medium', 'high'].indexOf(appearance.particles)]}
                    onValueChange={([v]) => handleParticlesChange(v)}
                    min={0}
                    max={3}
                    step={1}
                    className="[&_[role=slider]]:bg-amber-500"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>Off</span>
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>

                <Separator className="bg-amber-600/20" />

                {/* Animated Background */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-amber-100 font-medium">Animated Background</p>
                      <p className="text-amber-400/60 text-sm">Floating gradient orbs</p>
                    </div>
                  </div>
                  <Switch
                    checked={appearance.animatedBg}
                    onCheckedChange={handleAnimatedBgChange}
                  />
                </div>

                <Separator className="bg-amber-600/20" />

                {/* Reduced Motion */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-amber-100 font-medium">Reduced Motion</p>
                      <p className="text-amber-400/60 text-sm">Minimize animations</p>
                    </div>
                  </div>
                  <Switch
                    checked={appearance.reducedMotion}
                    onCheckedChange={(checked) => setAppearance(prev => ({ ...prev, reducedMotion: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Privacy & Safety */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  Privacy & Safety
                </CardTitle>
                <CardDescription className="text-amber-400/60">
                  Control your privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 font-medium">Private Profile</p>
                    <p className="text-amber-400/60 text-sm">Only approved followers can see your activity</p>
                  </div>
                  <Switch />
                </div>
                <Separator className="bg-amber-600/20" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 font-medium">Hide Gift History</p>
                    <p className="text-amber-400/60 text-sm">Don't show gifts you've sent publicly</p>
                  </div>
                  <Switch />
                </div>
                <Separator className="bg-amber-600/20" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 font-medium">Block Chat Invites</p>
                    <p className="text-amber-400/60 text-sm">Only receive messages from people you follow</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-red-900/20 border-red-600/30">
              <CardHeader>
                <CardTitle className="text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-400/60">
                  Irreversible actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => base44.auth.logout()}
                  variant="outline"
                  className="w-full border-red-500/50 text-red-400 hover:bg-red-900/30"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  variant="outline"
                  className="w-full border-red-600/50 text-red-500 hover:bg-red-900/40 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        userEmail={user?.email}
        onConfirm={async () => {
          toast.success('Account deletion request submitted. Your account will be removed within 24 hours.');
          setShowDeleteModal(false);
          await base44.auth.logout();
        }}
      />
    </div>
  );
}