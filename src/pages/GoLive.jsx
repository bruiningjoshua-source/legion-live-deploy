import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  X,
  ArrowRight,
  Gift,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ZegoService from '@/components/stream/ZegoService';

const CATEGORIES = [
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

const STREAM_TYPES = [
  { value: 'solo', label: 'Solo', icon: Radio, color: 'from-blue-500 to-blue-600' },
  { value: 'multi_panel', label: 'Panel', icon: Users, color: 'from-purple-500 to-purple-600' },
  { value: 'pk_battle', label: 'PK Battle', icon: Swords, color: 'from-orange-500 to-red-600' }
];

export default function GoLive() {
  const [streamType, setStreamType] = useState('solo');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const videoRef = useRef(null);
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

  const { data: hostSubscription } = useQuery({
    queryKey: ['host-subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.CreatorSubscription.filter({ 
        user_email: user.email, status: 'active' 
      }, '-created_date', 1);
      return subs[0] || null;
    },
    enabled: !!user?.email
  });

  // Auto-request camera
  useEffect(() => {
    if (user && !hasPermissions && !cameraStream) requestCamera();
  }, [user?.email]);

  // Attach stream to video element
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      const el = videoRef.current;
      el.srcObject = cameraStream;
      el.muted = true;
      el.playsInline = true;
      el.play().catch(() => {});
    }
  }, [cameraStream]);

  // Stop camera on unmount
  useEffect(() => {
    return () => { cameraStream?.getTracks().forEach(t => t.stop()); };
  }, [cameraStream]);

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      setCameraStream(stream);
      setHasPermissions(true);
    } catch (error) {
      toast.error('Camera & microphone access required to go live.');
    }
  };

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in to go live');
      if (!hasPermissions || !cameraStream) throw new Error('Camera permissions required');
      if (!title.trim()) throw new Error('Stream title is required');
      if (!category) throw new Error('Please select a category');

      let creatorId = creator?.id;

      // Clean up any stale live streams
      if (creator?.is_live || creator?.current_stream_id) {
        const stale = await base44.entities.Stream.filter({ creator_id: creatorId, status: 'live' }, '-created_date', 5);
        for (const s of stale) {
          await base44.entities.Stream.update(s.id, { status: 'ended', duration_minutes: Math.floor((new Date() - new Date(s.created_date)) / 60000) });
        }
        await base44.entities.Creator.update(creatorId, { is_live: false, current_stream_id: null });
      }

      // Create creator profile if needed
      if (!creatorId) {
        const newCreator = await base44.entities.Creator.create({
          user_email: user.email,
          display_name: user.full_name || 'New Creator',
          category: category || 'other'
        });
        creatorId = newCreator.id;
      }

      // Create stream record
      const stream = await base44.entities.Stream.create({
        creator_id: creatorId,
        title: title.trim(),
        category,
        stream_type: streamType,
        status: 'live',
      });

      // Initialize ZegoCloud
      const userId = user.email.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32);
      const tokenResponse = await base44.functions.invoke('generateZegoToken', {
        roomId: stream.id, userId, role: 'host'
      });
      
      const { appId: ZEGO_APP_ID, token } = tokenResponse.data || {};
      if (!ZEGO_APP_ID || !token) throw new Error('Invalid token response');

      await ZegoService.initialize(ZEGO_APP_ID);
      await ZegoService.loginRoom(stream.id, userId, user.full_name || 'Host', token);
      await ZegoService.createLocalStream();
      await ZegoService.startPublishing(stream.id);

      // Set creator live
      await base44.entities.Creator.update(creatorId, { is_live: true, current_stream_id: stream.id });

      // PK battle init
      if (streamType === 'pk_battle') {
        await base44.entities.PKBattle.create({
          stream_id: stream.id,
          host_creator_id: creatorId,
          opponent_creator_id: '',
          status: 'pending',
          duration_minutes: 5
        });
      }

      // System welcome
      await base44.entities.ChatMessage.create({
        stream_id: stream.id,
        sender_email: 'system',
        sender_name: 'System',
        message: `${user.full_name || 'The host'} started a live stream!`,
        message_type: 'system'
      }).catch(() => {});

      return stream;
    },
    onSuccess: (stream) => navigate(createPageUrl(`WatchStream?id=${stream.id}`)),
    onError: async (error) => {
      ZegoService.leave().catch(() => {});
      if (creator?.id) {
        const stale = await base44.entities.Stream.filter({ creator_id: creator.id, status: 'live' }, '-created_date', 5).catch(() => []);
        for (const s of stale) await base44.entities.Stream.update(s.id, { status: 'ended', viewer_count: 0 }).catch(() => {});
        await base44.entities.Creator.update(creator.id, { is_live: false, current_stream_id: null }).catch(() => {});
      }
      toast.error(error.message || 'Failed to start stream.');
    }
  });

  const isFormValid = title.trim() && category;
  const isAdmin = user?.role === 'admin';
  const canMonetize = isAdmin || hostSubscription?.status === 'active';

  // Fullscreen camera preview mode
  if (hasPermissions) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Video */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10" />
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent z-10" />

        {/* Close button */}
        <button
          onClick={() => {
            cameraStream?.getTracks().forEach(t => t.stop());
            setCameraStream(null);
            setHasPermissions(false);
            navigate(createPageUrl('Home'));
          }}
          className="absolute top-4 left-4 z-20 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          style={{ top: 'max(16px, env(safe-area-inset-top))' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Stream type pills - top right */}
        <div className="absolute top-4 right-4 z-20 flex gap-1.5" style={{ top: 'max(16px, env(safe-area-inset-top))' }}>
          {STREAM_TYPES.map(t => {
            const Icon = t.icon;
            const active = streamType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setStreamType(t.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active
                    ? `bg-gradient-to-r ${t.color} text-white shadow-lg`
                    : 'bg-black/40 backdrop-blur-md text-white/60 border border-white/10'
                }`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Setup overlay */}
        <AnimatePresence>
          {showSetup && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 left-4 right-4 z-20"
            >
              <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 space-y-3 border border-white/10">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Stream title..."
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30 rounded-xl h-10"
                  maxLength={100}
                />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-white/10 border-white/10 text-white rounded-xl h-10">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1f] border-white/10">
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} className="text-white focus:bg-white/10">
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          {cat.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isFormValid && (
                  <button onClick={() => setShowSetup(false)} className="w-full text-center text-white/40 text-xs py-1">
                    <ChevronDown className="w-4 h-4 mx-auto" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stream info pill - show when setup is hidden */}
        {!showSetup && isFormValid && (
          <button 
            onClick={() => setShowSetup(true)}
            className="absolute bottom-32 left-4 z-20 bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 border border-white/10"
          >
            <span className="text-sm">{CATEGORIES.find(c => c.value === category)?.icon}</span>
            <span className="text-white/70 text-xs truncate max-w-[150px]">{title}</span>
          </button>
        )}

        {/* Monetization hint */}
        {!canMonetize && (
          <div className="absolute bottom-[120px] left-4 right-4 z-20">
            <button
              onClick={() => navigate(createPageUrl('CreatorMonetization'))}
              className="w-full flex items-center gap-2 bg-amber-500/15 backdrop-blur-md border border-amber-500/20 rounded-xl px-3 py-2"
            >
              <Gift className="w-4 h-4 text-amber-400" />
              <span className="text-amber-200 text-xs flex-1 text-left">Enable monetization to earn from gifts</span>
              <ArrowRight className="w-3 h-3 text-amber-400" />
            </button>
          </div>
        )}

        {/* GO LIVE button */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Button
            onClick={() => goLiveMutation.mutate()}
            disabled={!isFormValid || goLiveMutation.isPending}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold px-12 py-3 text-base rounded-full shadow-lg shadow-red-500/30 disabled:opacity-40"
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
      </div>
    );
  }

  // Pre-permission state: minimal loading screen
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-20 h-20 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
          <Radio className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Go Live</h1>
        <p className="text-white/50 text-sm mb-8">Camera & microphone access is needed</p>
        <Button 
          onClick={requestCamera}
          className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full px-8 py-3 font-semibold"
        >
          Enable Camera
        </Button>
      </div>
    </div>
  );
}