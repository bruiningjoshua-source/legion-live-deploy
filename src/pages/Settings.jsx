import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  User, 
  CreditCard, 
  LogOut,
  Moon,
  Globe,
  Lock,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings() {
  const [notifications, setNotifications] = useState({
    liveAlerts: true,
    giftAlerts: true,
    followAlerts: true,
    eventReminders: true
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

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
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}