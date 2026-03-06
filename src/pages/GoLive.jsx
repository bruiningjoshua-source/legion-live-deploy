import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Radio, 
  Users, 
  Swords, 
  X,
  ArrowRight,
  Gift,
  Sparkles,
  FlipHorizontal,
  Wand2,
  Gamepad2,
  Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ZegoService from '@/components/stream/ZegoService';

const CATEGORIES = [
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'talk_show', label: 'Chat', icon: '💬' },
  { value: 'dance', label: 'Dance', icon: '💃' },
  { value: 'cooking', label: 'Cooking', icon: '🍳' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'art', label: 'Art', icon: '🎨' },
  { value: 'comedy', label: 'Comedy', icon: '😂' },
  { value: 'other', label: 'Other', icon: '✨' }
];

const STREAM_TYPES = [
  { value: 'solo', label: 'Solo', icon: Radio },
  { value: 'multi_panel', label: 'Multi', icon: Users },
  { value: 'pk_battle', label: 'PK', icon: Swords }
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

  // Fullscreen camera preview — Bigo Live style
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

        {/* Subtle top gradient */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/40 to-transparent z-10" />
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />

        {/* ─── TOP BAR ─── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          {/* Close */}
          <button
            onClick={() => {
              cameraStream?.getTracks().forEach(t => t.stop());
              setCameraStream(null);
              setHasPermissions(false);
              navigate(createPageUrl('Home'));
            }}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Stream type selector - Bigo style rounded tabs */}
          <div className="flex bg-black/40 rounded-full p-0.5 gap-0.5">
            {STREAM_TYPES.map(t => {
              const Icon = t.icon;
              const active = streamType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setStreamType(t.value)}
                  className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[#00d4aa] text-white'
                      : 'text-white/50'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Flip camera */}
          <button className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white">
            <FlipHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* ─── RIGHT SIDE TOOLS (Bigo style vertical bar) ─── */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4">
          <button className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/60 text-[10px]">Beauty</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/60 text-[10px]">Filter</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/60 text-[10px]">Music</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/60 text-[10px]">Game</span>
          </button>
        </div>

        {/* ─── BOTTOM SECTION ─── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>

          {/* Stream setup form */}
          <AnimatePresence>
            {showSetup && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-4 space-y-3"
              >
                {/* Title input - Bigo style */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 flex items-center gap-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add a stream title..."
                    className="bg-transparent border-0 text-white placeholder:text-white/40 h-auto p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    maxLength={100}
                  />
                </div>

                {/* Category selector - horizontal scrollable pills */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        category === cat.value
                          ? 'bg-[#00d4aa] text-white'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stream info pill when setup collapsed */}
          {!showSetup && isFormValid && (
            <button 
              onClick={() => setShowSetup(true)}
              className="mb-4 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2"
            >
              <span>{CATEGORIES.find(c => c.value === category)?.icon}</span>
              <span className="text-white/80 text-xs truncate max-w-[200px]">{title}</span>
            </button>
          )}

          {/* Monetization hint */}
          {!canMonetize && (
            <button
              onClick={() => navigate(createPageUrl('CreatorMonetization'))}
              className="w-full mb-3 flex items-center gap-2 bg-amber-500/15 backdrop-blur-md border border-amber-500/20 rounded-xl px-3 py-2"
            >
              <Gift className="w-4 h-4 text-amber-400" />
              <span className="text-amber-200 text-xs flex-1 text-left">Enable monetization to earn from gifts</span>
              <ArrowRight className="w-3 h-3 text-amber-400" />
            </button>
          )}

          {/* GO LIVE button - large Bigo-style teal */}
          <div className="flex justify-center pb-2">
            <button
              onClick={() => goLiveMutation.mutate()}
              disabled={!isFormValid || goLiveMutation.isPending}
              className="relative w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] shadow-[0_0_30px_rgba(0,212,170,0.4)] disabled:opacity-40 disabled:shadow-none flex items-center justify-center transition-all active:scale-95"
            >
              {goLiveMutation.isPending ? (
                <span className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00b894] animate-ping opacity-20" />
                  <span className="text-white font-bold text-sm tracking-wide">GO<br/>LIVE</span>
                </>
              )}
            </button>
          </div>

          {/* Collapse/expand setup */}
          {showSetup && isFormValid && (
            <button onClick={() => setShowSetup(false)} className="w-full text-center text-white/30 text-xs py-1">
              Tap to collapse
            </button>
          )}
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