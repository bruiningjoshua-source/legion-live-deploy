import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Settings2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  FlipHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize,
  ScreenShare,
  ScreenShareOff,
  Camera,
  Sun,
  Contrast,
  Palette,
  Gauge,
  Wifi,
  WifiOff,
  Radio,
  Users,
  MessageSquare,
  Gift,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Bell,
  BellOff,
  RefreshCw,
  Zap,
  Timer,
  Pause,
  Play,
  StopCircle,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const QUALITY_PRESETS = [
  { id: '1080p', label: '1080p HD', bitrate: 4500, fps: 30 },
  { id: '720p', label: '720p HD', bitrate: 2500, fps: 30 },
  { id: '480p', label: '480p SD', bitrate: 1000, fps: 30 },
  { id: 'auto', label: 'Auto', bitrate: null, fps: null },
];

const FILTER_PRESETS = [
  { id: 'none', name: 'None', filter: '' },
  { id: 'warm', name: 'Warm', filter: 'sepia(20%) saturate(110%)' },
  { id: 'cool', name: 'Cool', filter: 'hue-rotate(10deg) saturate(90%)' },
  { id: 'vivid', name: 'Vivid', filter: 'saturate(130%) contrast(105%)' },
  { id: 'muted', name: 'Muted', filter: 'saturate(70%) brightness(105%)' },
  { id: 'noir', name: 'Noir', filter: 'grayscale(100%) contrast(120%)' },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(40%) contrast(90%)' },
  { id: 'dramatic', name: 'Dramatic', filter: 'contrast(130%) saturate(120%)' },
];

export default function BroadcastControlPanel({
  stream,
  streamStats = {},
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onFlipCamera,
  onEndStream,
  onUpdateSettings,
  isMinimized = false,
  onToggleMinimize
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [controls, setControls] = useState({
    micEnabled: true,
    cameraEnabled: true,
    screenShareEnabled: false,
    mirrorCamera: true,
    lowLatencyMode: true,
    chatEnabled: true,
    giftsEnabled: true,
    slowMode: false,
    slowModeDelay: 5,
    subscriberOnly: false,
    followerOnly: false,
    notificationsEnabled: true,
    showViewerCount: true,
  });

  const [videoSettings, setVideoSettings] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    quality: 'auto',
    filter: 'none',
  });

  const [audioSettings, setAudioSettings] = useState({
    micVolume: 80,
    noiseSupression: true,
    echoCancellation: true,
  });

  const handleControlChange = (key, value) => {
    setControls(prev => ({ ...prev, [key]: value }));
    
    // Trigger callbacks
    if (key === 'micEnabled') onToggleMic?.(value);
    if (key === 'cameraEnabled') onToggleCamera?.(value);
    if (key === 'screenShareEnabled') onToggleScreenShare?.(value);
    if (key === 'mirrorCamera') onFlipCamera?.();
    
    onUpdateSettings?.({ [key]: value });
  };

  const handleVideoSettingChange = (key, value) => {
    setVideoSettings(prev => ({ ...prev, [key]: value }));
    onUpdateSettings?.({ video: { [key]: value } });
  };

  const handleAudioSettingChange = (key, value) => {
    setAudioSettings(prev => ({ ...prev, [key]: value }));
    onUpdateSettings?.({ audio: { [key]: value } });
  };

  const currentFilter = FILTER_PRESETS.find(f => f.id === videoSettings.filter) || FILTER_PRESETS[0];

  // Quick control bar (always visible)
  const QuickControls = () => (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2"
    >
      {/* Mic Toggle */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => handleControlChange('micEnabled', !controls.micEnabled)}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
          controls.micEnabled 
            ? 'bg-white/10 text-white hover:bg-white/20' 
            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
        }`}
      >
        {controls.micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </motion.button>

      {/* Camera Toggle */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => handleControlChange('cameraEnabled', !controls.cameraEnabled)}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
          controls.cameraEnabled 
            ? 'bg-white/10 text-white hover:bg-white/20' 
            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
        }`}
      >
        {controls.cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </motion.button>

      {/* Flip Camera */}
      <motion.button
        whileTap={{ scale: 0.9, rotate: 180 }}
        onClick={() => handleControlChange('mirrorCamera', !controls.mirrorCamera)}
        className="w-12 h-12 rounded-xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
      >
        <FlipHorizontal className="w-5 h-5" />
      </motion.button>

      {/* Screen Share */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => handleControlChange('screenShareEnabled', !controls.screenShareEnabled)}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
          controls.screenShareEnabled 
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        {controls.screenShareEnabled ? <ScreenShare className="w-5 h-5" /> : <ScreenShareOff className="w-5 h-5" />}
      </motion.button>

      {/* Divider */}
      <div className="w-px h-8 bg-white/20 mx-1" />

      {/* Effects */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 flex items-center justify-center"
      >
        <Sparkles className="w-5 h-5" />
      </motion.button>

      {/* Settings */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 rounded-xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
          >
            <Settings2 className="w-5 h-5" />
          </motion.button>
        </SheetTrigger>
        <SheetContent className="bg-stone-950/95 backdrop-blur-xl border-white/10 w-[400px] overflow-y-auto pb-24">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-400 animate-pulse" />
              Broadcast Controls
            </SheetTitle>
          </SheetHeader>

          {/* Stream Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Users className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-white font-bold">{streamStats.viewers || 0}</p>
              <p className="text-white/50 text-xs">Viewers</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Timer className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-white font-bold">{streamStats.duration || '0:00'}</p>
              <p className="text-white/50 text-xs">Duration</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Wifi className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-white font-bold">{streamStats.bitrate || '0'} kbps</p>
              <p className="text-white/50 text-xs">Bitrate</p>
            </div>
          </div>

          <Tabs defaultValue="video" className="mt-4">
            <TabsList className="w-full bg-white/5 grid grid-cols-4">
              <TabsTrigger value="video" className="text-xs data-[state=active]:bg-amber-600">
                <Camera className="w-3 h-3 mr-1" />
                Video
              </TabsTrigger>
              <TabsTrigger value="audio" className="text-xs data-[state=active]:bg-purple-600">
                <Volume2 className="w-3 h-3 mr-1" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs data-[state=active]:bg-blue-600">
                <MessageSquare className="w-3 h-3 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="stream" className="text-xs data-[state=active]:bg-green-600">
                <Gauge className="w-3 h-3 mr-1" />
                Stream
              </TabsTrigger>
            </TabsList>

            {/* VIDEO TAB */}
            <TabsContent value="video" className="mt-4 space-y-4">
              {/* Quality */}
              <div>
                <p className="text-white/60 text-sm mb-2">Quality Preset</p>
                <div className="grid grid-cols-4 gap-2">
                  {QUALITY_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleVideoSettingChange('quality', preset.id)}
                      className={`p-2 rounded-lg text-xs transition-all ${
                        videoSettings.quality === preset.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brightness */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1">
                    <Sun className="w-3 h-3" /> Brightness
                  </span>
                  <span className="text-amber-400">{videoSettings.brightness}%</span>
                </div>
                <Slider
                  value={[videoSettings.brightness]}
                  onValueChange={([v]) => handleVideoSettingChange('brightness', v)}
                  min={50}
                  max={150}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1">
                    <Contrast className="w-3 h-3" /> Contrast
                  </span>
                  <span className="text-amber-400">{videoSettings.contrast}%</span>
                </div>
                <Slider
                  value={[videoSettings.contrast]}
                  onValueChange={([v]) => handleVideoSettingChange('contrast', v)}
                  min={50}
                  max={150}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1">
                    <Palette className="w-3 h-3" /> Saturation
                  </span>
                  <span className="text-amber-400">{videoSettings.saturation}%</span>
                </div>
                <Slider
                  value={[videoSettings.saturation]}
                  onValueChange={([v]) => handleVideoSettingChange('saturation', v)}
                  min={0}
                  max={200}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              {/* Filters */}
              <div>
                <p className="text-white/60 text-sm mb-2">Color Filter</p>
                <div className="grid grid-cols-4 gap-2">
                  {FILTER_PRESETS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => handleVideoSettingChange('filter', filter.id)}
                      className={`p-2 rounded-lg text-xs transition-all ${
                        videoSettings.filter === filter.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Video */}
              <Button
                onClick={() => setVideoSettings({ brightness: 100, contrast: 100, saturation: 100, quality: 'auto', filter: 'none' })}
                variant="outline"
                className="w-full border-white/20 text-white/70"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Reset Video Settings
              </Button>
            </TabsContent>

            {/* AUDIO TAB */}
            <TabsContent value="audio" className="mt-4 space-y-4">
              {/* Mic Volume */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1">
                    <Mic className="w-3 h-3" /> Microphone Volume
                  </span>
                  <span className="text-amber-400">{audioSettings.micVolume}%</span>
                </div>
                <Slider
                  value={[audioSettings.micVolume]}
                  onValueChange={([v]) => handleAudioSettingChange('micVolume', v)}
                  min={0}
                  max={100}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              {/* Noise Suppression */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="text-white text-sm">Noise Suppression</p>
                  <p className="text-white/50 text-xs">Reduce background noise</p>
                </div>
                <Switch
                  checked={audioSettings.noiseSupression}
                  onCheckedChange={(v) => handleAudioSettingChange('noiseSupression', v)}
                />
              </div>

              {/* Echo Cancellation */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="text-white text-sm">Echo Cancellation</p>
                  <p className="text-white/50 text-xs">Prevent audio feedback</p>
                </div>
                <Switch
                  checked={audioSettings.echoCancellation}
                  onCheckedChange={(v) => handleAudioSettingChange('echoCancellation', v)}
                />
              </div>

              {/* Audio Level Indicator */}
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-white/70 text-xs mb-2">Audio Level</p>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 w-1/3 transition-all"
                  />
                </div>
              </div>
            </TabsContent>

            {/* CHAT TAB */}
            <TabsContent value="chat" className="mt-4 space-y-3">
              {/* Chat Enabled */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white text-sm">Chat Enabled</p>
                    <p className="text-white/50 text-xs">Allow viewers to chat</p>
                  </div>
                </div>
                <Switch
                  checked={controls.chatEnabled}
                  onCheckedChange={(v) => handleControlChange('chatEnabled', v)}
                />
              </div>

              {/* Gifts Enabled */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-white text-sm">Gifts Enabled</p>
                    <p className="text-white/50 text-xs">Allow virtual gifts</p>
                  </div>
                </div>
                <Switch
                  checked={controls.giftsEnabled}
                  onCheckedChange={(v) => handleControlChange('giftsEnabled', v)}
                />
              </div>

              {/* Slow Mode */}
              <div className="p-3 bg-white/5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Timer className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-white text-sm">Slow Mode</p>
                      <p className="text-white/50 text-xs">Limit message frequency</p>
                    </div>
                  </div>
                  <Switch
                    checked={controls.slowMode}
                    onCheckedChange={(v) => handleControlChange('slowMode', v)}
                  />
                </div>
                {controls.slowMode && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Delay between messages</span>
                      <span className="text-purple-400">{controls.slowModeDelay}s</span>
                    </div>
                    <Slider
                      value={[controls.slowModeDelay]}
                      onValueChange={([v]) => handleControlChange('slowModeDelay', v)}
                      min={3}
                      max={60}
                      className="[&_[role=slider]]:bg-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Subscriber Only */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white text-sm">Subscriber Only</p>
                    <p className="text-white/50 text-xs">Only subs can chat</p>
                  </div>
                </div>
                <Switch
                  checked={controls.subscriberOnly}
                  onCheckedChange={(v) => handleControlChange('subscriberOnly', v)}
                />
              </div>

              {/* Follower Only */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-white text-sm">Follower Only</p>
                    <p className="text-white/50 text-xs">Only followers can chat</p>
                  </div>
                </div>
                <Switch
                  checked={controls.followerOnly}
                  onCheckedChange={(v) => handleControlChange('followerOnly', v)}
                />
              </div>
            </TabsContent>

            {/* STREAM TAB */}
            <TabsContent value="stream" className="mt-4 space-y-3">
              {/* Low Latency Mode */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-white text-sm">Low Latency Mode</p>
                    <p className="text-white/50 text-xs">Faster interaction, lower quality</p>
                  </div>
                </div>
                <Switch
                  checked={controls.lowLatencyMode}
                  onCheckedChange={(v) => handleControlChange('lowLatencyMode', v)}
                />
              </div>

              {/* Show Viewer Count */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white text-sm">Show Viewer Count</p>
                    <p className="text-white/50 text-xs">Display to viewers</p>
                  </div>
                </div>
                <Switch
                  checked={controls.showViewerCount}
                  onCheckedChange={(v) => handleControlChange('showViewerCount', v)}
                />
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-white text-sm">Stream Notifications</p>
                    <p className="text-white/50 text-xs">Notify followers</p>
                  </div>
                </div>
                <Switch
                  checked={controls.notificationsEnabled}
                  onCheckedChange={(v) => handleControlChange('notificationsEnabled', v)}
                />
              </div>

              {/* Stream Health */}
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-white/70 text-sm mb-3">Stream Health</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                    <Wifi className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <p className="text-green-400 text-xs font-medium">Excellent</p>
                    <p className="text-white/50 text-[10px]">Connection</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                    <Gauge className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <p className="text-green-400 text-xs font-medium">Stable</p>
                    <p className="text-white/50 text-[10px]">Bitrate</p>
                  </div>
                </div>
              </div>

              {/* End Stream */}
              <Button
                onClick={onEndStream}
                className="w-full bg-red-600 hover:bg-red-700 mt-4"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                End Stream
              </Button>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Divider */}
      <div className="w-px h-8 bg-white/20 mx-1" />

      {/* End Stream Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onEndStream}
        className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center"
      >
        <StopCircle className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );

  return <QuickControls />;
}