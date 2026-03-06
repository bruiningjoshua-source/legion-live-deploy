import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Radio, 
  Users, 
  Swords, 
  Camera,
  Upload,
  Sparkles,
  Plus,
  X,
  ArrowRight,
  Video,
  Gift
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ZegoService from '@/components/stream/ZegoService';
import StreamQualityMonitor from '@/components/stream/StreamQualityMonitor';
import BulletChat from '@/components/stream/BulletChat';
import BroadcasterWallet from '@/components/stream/BroadcasterWallet';
import HostSubscriptionGate from '@/components/creator/HostSubscriptionGate';
import PremiumLensUI from '@/components/stream/PremiumLensUI';
import StreamingSettings from '@/components/stream/StreamingSettings';

const categories = [
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'talk_show', label: 'Talk Show', icon: '🎙️' },
  { value: 'dance', label: 'Dance', icon: '💃' },
  { value: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'art', label: 'Art', icon: '🎨' },
  { value: 'comedy', label: 'Comedy', icon: '😂' },
  { value: 'other', label: 'Other', icon: '✨' }
];

const streamTypes = [
  { 
    value: 'solo', 
    label: 'Solo Stream', 
    description: 'Stream on your own with optional guest invites',
    icon: Radio,
    color: 'from-blue-500 to-blue-600'
  },
  { 
    value: 'multi_panel', 
    label: 'Multi-Panel', 
    description: 'Stream with multiple creators side by side',
    icon: Users,
    color: 'from-purple-500 to-purple-600'
  },
  { 
    value: 'pk_battle', 
    label: 'PK Battle', 
    description: 'Challenge another creator to a gift battle',
    icon: Swords,
    color: 'from-orange-500 to-red-600'
  }
];

export default function GoLive() {
  const [streamType, setStreamType] = useState('solo');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [pkOpponent, setPkOpponent] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [streamStats, setStreamStats] = useState(null);
  const [zegoToken, setZegoToken] = useState(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [activeEffect, setActiveEffect] = useState(null);
  const [activeBackground, setActiveBackground] = useState(null);
  const [activeBeauty, setActiveBeauty] = useState(null);
  const [streamSettings, setStreamSettings] = useState({
    resolution: '720p',
    bitrate: 'auto',
    frameRate: 30,
    arComplexity: 'medium',
    faceMeshEnabled: true,
    segmentationEnabled: false,
    adaptiveEnabled: true,
    lowPowerMode: false,
  });
  const videoPreviewRef = useRef(null);
  const arCanvasRef = useRef(null);
  const navigate = useNavigate();

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

  const { data: allCreators = [] } = useQuery({
    queryKey: ['all-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 50)
  });

  const { data: hostSubscription } = useQuery({
    queryKey: ['host-subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.CreatorSubscription.filter({ 
        user_email: user.email, 
        status: 'active' 
      }, '-created_date', 1);
      return subs[0] || null;
    },
    enabled: !!user?.email
  });

  const isSubscribed = hostSubscription?.status === 'active';

  // Auto-request camera permissions on page load
  useEffect(() => {
    if (user && !hasPermissions && !cameraStream) {
      requestCameraPermissions();
    }
    // eslint-disable-next-line
  }, [user?.email]);

  const createCreatorMutation = useMutation({
    mutationFn: () => base44.entities.Creator.create({
      user_email: user.email,
      display_name: user.full_name || 'New Creator',
      category: category || 'other'
    })
  });

  useEffect(() => {
    if (cameraStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = cameraStream;
      videoPreviewRef.current.muted = true;
      videoPreviewRef.current.playsInline = true;
      const playVideo = async () => {
        try { await videoPreviewRef.current.play(); }
        catch (e) { console.log('Play blocked, retrying...', e); setTimeout(playVideo, 500); }
      };
      playVideo();
    }
  }, [cameraStream]);

  useEffect(() => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.style.transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    }
  }, [isMirrored, cameraStream]);

  useEffect(() => {
    const unsubscribe = ZegoService.onQualityChange((stats) => setStreamStats(stats));
    return () => unsubscribe?.();
  }, []);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    };
  }, [cameraStream]);

  const requestCameraPermissions = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user'
            }, 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
      setCameraStream(stream);
      setHasPermissions(true);
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.playsInline = true;
        
        // Force play for mobile
        try {
          await videoPreviewRef.current.play();
        } catch (playError) {
          console.log('Autoplay prevented, waiting for user interaction');
        }
      }
    } catch (error) {
      toast.error('Camera and microphone access is required to go live. Please allow permissions and try again.');
      console.error('Media error:', error);
    }
  };

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Please sign in to go live');
      }
      
      if (!hasPermissions || !cameraStream) {
        throw new Error('Camera and microphone permissions are required to go live');
      }

      // Prevent double-tap: check if we're already live
      if (creator?.is_live && creator?.current_stream_id) {
        const existing = await base44.entities.Stream.filter({ id: creator.current_stream_id, status: 'live' }, null, 1);
        if (existing.length > 0) {
          // Already have a live stream — just navigate to it
          navigate(createPageUrl(`WatchStream?id=${existing[0].id}`));
          return existing[0];
        }
      }

      let creatorId = creator?.id;

      // Check if creator already has a live stream - clean up stale ones
      if (creator?.is_live || creator?.current_stream_id) {
        // Check if that stream is actually still live
        const existingStreams = await base44.entities.Stream.filter({
          creator_id: creatorId,
          status: 'live'
        }, '-created_date', 5);

        if (existingStreams.length > 0) {
          // End all existing live streams from this creator
          for (const oldStream of existingStreams) {
            await base44.entities.Stream.update(oldStream.id, {
              status: 'ended',
              duration_minutes: Math.floor((new Date() - new Date(oldStream.created_date)) / 60000)
            });
          }
        }

        // Reset creator live status
        await base44.entities.Creator.update(creatorId, {
          is_live: false,
          current_stream_id: null
        });
      }

      // Create creator profile if doesn't exist
      if (!creatorId) {
        const newCreator = await createCreatorMutation.mutateAsync();
        creatorId = newCreator.id;
      }

      // Create stream
      if (!title.trim()) {
        throw new Error('Stream title is required');
      }
      if (!category) {
        throw new Error('Please select a category');
      }

      const stream = await base44.entities.Stream.create({
        creator_id: creatorId,
        title: title.trim(),
        description: description.trim(),
        category,
        thumbnail_url: thumbnailUrl || null,
        stream_type: streamType,
        status: 'live',
        tags: tags.slice(0, 5),
        guests: guestEmail ? [guestEmail] : [],
        pk_opponent_id: pkOpponent || null
      });

      // Initialize Zegocloud
      const odescription = user.email.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32);
      console.log('[GoLive] Requesting Zego token for room:', stream.id, 'userId:', odescription);
      
      let tokenResponse;
      try {
        tokenResponse = await base44.functions.invoke('generateZegoToken', {
          roomId: stream.id,
          userId: odescription,
          role: 'host'
        });
        console.log('[GoLive] Token response:', tokenResponse);
      } catch (tokenError) {
        console.error('[GoLive] Token request failed:', tokenError);
        throw new Error('Failed to get streaming token: ' + tokenError.message);
      }
      
      const ZEGO_APP_ID = tokenResponse.data?.appId;
      const token = tokenResponse.data?.token;
      
      if (!ZEGO_APP_ID || !token) {
        console.error('[GoLive] Invalid token response:', tokenResponse.data);
        throw new Error('Invalid token response from server');
      }
      
      console.log('[GoLive] Initializing Zego with appId:', ZEGO_APP_ID);
      
      try {
        await ZegoService.initialize(ZEGO_APP_ID);
        console.log('[GoLive] Zego initialized');
      } catch (initError) {
        console.error('[GoLive] Zego init failed:', initError);
        throw new Error('Failed to initialize streaming: ' + initError.message);
      }
      
      // Login to room
      try {
        await ZegoService.loginRoom(stream.id, odescription, user.full_name || 'Host', token);
        console.log('[GoLive] Logged into room as host');
      } catch (loginError) {
        console.error('[GoLive] Room login failed:', loginError);
        throw new Error('Failed to join room: ' + loginError.message);
      }
      
      // Create and publish stream
      try {
        await ZegoService.createLocalStream();
        await ZegoService.startPublishing(stream.id);
        console.log('[GoLive] Stream published successfully');
      } catch (publishError) {
        console.error('[GoLive] Stream publish failed:', publishError);
        throw new Error('Failed to start broadcasting: ' + publishError.message);
      }

      setZegoToken(token);

      // Update creator to live status
      await base44.entities.Creator.update(creatorId, {
        is_live: true,
        current_stream_id: stream.id
      });

      // Create PK battle if applicable
      if (streamType === 'pk_battle' && pkOpponent) {
        await base44.entities.PKBattle.create({
          stream_id: stream.id,
          host_creator_id: creatorId,
          opponent_creator_id: pkOpponent,
          status: 'pending',
          duration_minutes: 5
        });
      }

      // Post system welcome message
      try {
        await base44.entities.ChatMessage.create({
          stream_id: stream.id,
          sender_email: 'system',
          sender_name: 'System',
          message: `${user.full_name || 'The host'} started a live stream!`,
          message_type: 'system'
        });
      } catch (e) {}

      return stream;
    },
    onSuccess: (stream) => {
      console.log('[GoLive] Stream created successfully:', stream.id);
      navigate(createPageUrl(`WatchStream?id=${stream.id}`));
    },
    onError: async (error) => {
      console.error('[GoLive] Go live failed:', error);
      // Clean up any partial Zego state
      ZegoService.leave().catch(e => console.error('[GoLive] Zego cleanup failed:', e));

      // If a stream was partially created, mark it ended
      if (creator?.id) {
        try {
          const staleStreams = await base44.entities.Stream.filter({ creator_id: creator.id, status: 'live' }, '-created_date', 5);
          for (const s of staleStreams) {
            await base44.entities.Stream.update(s.id, { status: 'ended', viewer_count: 0 });
          }
          await base44.entities.Creator.update(creator.id, { is_live: false, current_stream_id: null });
        } catch (cleanupErr) { console.error('[GoLive] DB cleanup failed:', cleanupErr); }
      }
      
      if (error.message?.includes('sign in')) {
        toast.error('You need to sign in to go live');
        setTimeout(() => base44.auth.redirectToLogin(window.location.href), 1500);
      } else if (error.message?.includes('title')) {
        toast.error('Please enter a stream title');
      } else if (error.message?.includes('category')) {
        toast.error('Please select a category');
      } else if (error.message?.includes('permissions')) {
        toast.error('Camera and microphone access is required');
      } else {
        toast.error('Failed to start stream. Please try again.');
      }
    }
  });

  const addTag = () => {
    if (newTag && !tags.includes(newTag) && tags.length < 5) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info('Uploading thumbnail...');
      const result = await base44.integrations.Core.UploadFile({ file });
      setThumbnailUrl(result.file_url);
      toast.success('Thumbnail uploaded');
    }
  };

  const isFormValid = title.trim() && category;
  const isAdmin = user?.role === 'admin';
  const canMonetize = isAdmin || isSubscribed;
  // Everyone can broadcast for free - monetization requires subscription

  return (
    <>
      {/* Fullscreen mode handled by Layout hiding nav on GoLive/WatchStream */}
      <div className={hasPermissions ? "fixed inset-0 w-screen h-screen z-50 bg-black" : "min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12"}>
        <div className={hasPermissions ? "w-full h-full" : "max-w-3xl mx-auto px-4"}>
        {/* Header - Only show when not in camera preview */}
        {!hasPermissions && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-4 py-2 mb-4">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-red-200 text-sm font-medium">Go Live</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Start Your Stream</h1>
            <p className="text-amber-400/70">Set up your stream and go live to your audience</p>
          </div>
        )}

        {/* Stream Type Selection - Only show when not in camera preview */}
        {!hasPermissions && (
          <div className="mb-8">
            <Label className="text-amber-100 text-lg mb-4 block">Choose Stream Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {streamTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <motion.div
                    key={type.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all ${
                        streamType === type.value
                          ? `bg-gradient-to-br ${type.color} border-0 ring-2 ring-amber-400`
                          : 'bg-stone-800/50 border-amber-600/20 hover:border-amber-500/50'
                      }`}
                      onClick={() => setStreamType(type.value)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                          streamType === type.value ? 'bg-white/20' : `bg-gradient-to-br ${type.color}`
                        }`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className={`font-bold mb-1 ${streamType === type.value ? 'text-white' : 'text-amber-100'}`}>
                          {type.label}
                        </h3>
                        <p className={`text-xs ${streamType === type.value ? 'text-white/70' : 'text-amber-400/60'}`}>
                          {type.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Camera Preview & Quality Monitor */}
        {hasPermissions && (
          <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-40 bg-black" style={{ width: '100vw', height: '100vh' }}>
            <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
              {/* Full Screen Video */}
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                preload="auto"
                webkit-playsinline="true"
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: 'cover', backgroundColor: '#000' }}
              />

              {/* Background Layer - Rendered behind video for green screen effect */}
              {activeBackground && activeBackground.type === 'image' && (
                <div 
                  className="absolute inset-0 z-0"
                  style={{
                    backgroundImage: `url(${activeBackground.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
              )}
              {activeBackground && activeBackground.type === 'gradient' && (
                <div 
                  className="absolute inset-0 z-0"
                  style={{
                    background: `linear-gradient(${activeBackground.angle || 135}deg, ${activeBackground.colors?.join(', ')})`
                  }}
                />
              )}
              {activeBackground && activeBackground.type === 'solid' && (
                <div 
                  className="absolute inset-0 z-0"
                  style={{ backgroundColor: activeBackground.color }}
                />
              )}

              {/* Top Left - Exit Button */}
              <button
                onClick={() => {
                  if (goLiveMutation.isPending) return;
                  if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                    setCameraStream(null);
                    setHasPermissions(false);
                  }
                  ZegoService.leave().catch(() => {});
                  navigate(createPageUrl('Home'));
                }}
                className="absolute top-4 left-4 z-30 w-10 h-10 bg-black/60 hover:bg-red-600/80 rounded-full flex items-center justify-center text-white transition-colors"
                style={{ top: 'max(16px, env(safe-area-inset-top))' }}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Hidden canvas for AR processing */}
              <canvas ref={arCanvasRef} className="hidden" />

              {/* Top Right - Premium Lens UI & Settings */}
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                <PremiumLensUI 
                  videoRef={videoPreviewRef}
                  canvasRef={arCanvasRef}
                  onMirrorChange={setIsMirrored}
                  initialMirror={isMirrored}
                  onEffectChange={setActiveEffect}
                  onBackgroundChange={setActiveBackground}
                  onBeautyChange={setActiveBeauty}
                  faceMeshEnabled={streamSettings.faceMeshEnabled}
                  segmentationEnabled={streamSettings.segmentationEnabled}
                />
                <StreamingSettings
                  onSettingsChange={setStreamSettings}
                  initialSettings={streamSettings}
                  isLive={false}
                />
              </div>

              {/* Top Left - Earnings Widget (below exit button) */}
              <div className="absolute top-16 left-4 z-20">
                <BroadcasterWallet 
                  totalEarnings={creator?.total_earnings_denarii || 0}
                  sessionEarnings={0}
                  giftsReceived={0}
                  creatorId={creator?.id}
                />
              </div>

              {/* Stream Quality Monitor */}
              {streamStats && (
                <div className="absolute top-20 left-4 right-4 z-10">
                  <StreamQualityMonitor 
                    stats={streamStats}
                    onQualityChange={(quality) => ZegoService.setVideoQuality(quality)}
                  />
                </div>
              )}

              {/* Stream Setup Overlay - Title & Category Input - BOTTOM */}
              {(!title.trim() || !category) && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-28 left-4 right-4 z-20 bg-black/80 backdrop-blur-xl rounded-2xl p-4 space-y-3 border border-white/10"
                >
                  <p className="text-white/60 text-xs font-medium">Set up your stream</p>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter stream title..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-amber-500/50"
                    maxLength={100}
                  />
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900/95 backdrop-blur-xl border-white/10">
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value} className="text-white focus:bg-white/10">
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            {cat.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}

              {/* Bottom Bar */}
              <div className="absolute bottom-6 left-4 right-4 z-20 flex flex-col items-center gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {/* Stream info preview */}
                {title.trim() && category && (
                  <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 max-w-xs">
                    <span className="text-amber-400 text-sm">{categories.find(c => c.value === category)?.icon}</span>
                    <span className="text-white/80 text-sm truncate">{title}</span>
                    <Badge className="bg-red-500/80 text-white border-0 text-[10px] ml-auto shrink-0">
                      {streamTypes.find(t => t.value === streamType)?.label}
                    </Badge>
                  </div>
                )}
                {/* Go Live Button */}
                <Button
                  onClick={() => goLiveMutation.mutate()}
                  disabled={!isFormValid || goLiveMutation.isPending}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold px-10 py-3 text-base rounded-full shadow-lg shadow-red-500/30"
                >
                  {goLiveMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Starting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-100" />
                      </span>
                      GO LIVE
                    </span>
                  )}
                </Button>
              </div>

              {/* Broadcaster Chat */}
              <BulletChat messages={chatMessages} onSendMessage={() => {}} isAuthenticated={!!user} />
            </div>
          </div>
        )}

        {!hasPermissions && (
          <>
          {/* Monetization Upsell - Non-subscribers see this but can still broadcast */}
          {!canMonetize && (
            <div className="mb-8">
              <Card className="bg-gradient-to-r from-amber-900/30 to-stone-900 border-amber-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-amber-100 font-medium text-sm">Want to earn from your streams?</p>
                      <p className="text-amber-400/70 text-xs">Subscribe to receive gifts and cash out earnings</p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => navigate(createPageUrl('CreatorMonetization'))}
                      className="bg-amber-600 hover:bg-amber-700 text-xs"
                    >
                      Unlock $5/mo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        {/* Stream Setup Form */}
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Stream Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-amber-200">Stream Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your stream an exciting title..."
                className="bg-stone-900/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40"
                maxLength={100}
              />
              <p className="text-amber-400/50 text-xs text-right">{title.length}/100</p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-amber-200">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-stone-900/50 border-amber-600/20 text-amber-100">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-600/30">
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-amber-100 focus:bg-amber-800/30">
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-amber-200">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers what your stream is about..."
                className="bg-stone-900/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40 min-h-[100px]"
                maxLength={500}
              />
            </div>

            {/* Thumbnail */}
            <div className="space-y-2">
              <Label className="text-amber-200">Thumbnail</Label>
              <div className="flex items-center gap-4">
                {thumbnailUrl ? (
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden">
                    <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setThumbnailUrl('')}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-32 h-20 border-2 border-dashed border-amber-600/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 transition-colors">
                    <Upload className="w-5 h-5 text-amber-400/50" />
                    <span className="text-amber-400/50 text-xs mt-1">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                  </label>
                )}
                <p className="text-amber-400/50 text-xs">Recommended: 16:9 aspect ratio</p>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-amber-200">Tags (up to 5)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button onClick={addTag} disabled={!newTag || tags.length >= 5} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map(tag => (
                    <Badge key={tag} className="bg-amber-600/20 text-amber-200 border-amber-500/30">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* PK Opponent Selection */}
            {streamType === 'pk_battle' && (
              <div className="space-y-2 p-4 bg-orange-900/20 rounded-xl border border-orange-500/30">
                <Label className="text-orange-200 flex items-center gap-2">
                  <Swords className="w-4 h-4" />
                  Select Your Opponent
                </Label>
                <Select value={pkOpponent} onValueChange={setPkOpponent}>
                  <SelectTrigger className="bg-stone-900/50 border-orange-600/30 text-amber-100">
                    <SelectValue placeholder="Choose a creator to battle" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-amber-600/30">
                    {allCreators.filter(c => c.id !== creator?.id).map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-amber-100 focus:bg-amber-800/30">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-xs">
                            {c.display_name?.[0] || '?'}
                          </span>
                          {c.display_name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Guest Invite */}
            {streamType === 'solo' && (
              <div className="space-y-2">
                <Label className="text-amber-200">Invite a Guest (optional)</Label>
                <Input
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Enter guest's email..."
                  type="email"
                  className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                />
              </div>
            )}

            {/* Go Live Button */}
            <Button
              onClick={() => goLiveMutation.mutate()}
              disabled={!isFormValid || !hasPermissions || goLiveMutation.isPending}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-6 text-lg font-bold disabled:opacity-50"
            >
              {goLiveMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Radio className="w-5 h-5 animate-pulse" />
                  Go Live Now
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </CardContent>
          </Card>
          </>
          )}
          </div>
          </div>
          </>
          );
          }