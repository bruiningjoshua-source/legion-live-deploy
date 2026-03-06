import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { 
  Radio, FlipHorizontal, Sparkles, Wand2, Gamepad2, Music, Gift, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ZegoService from '@/components/stream/ZegoService';
import GoLiveTopBar from '@/components/stream/GoLiveTopBar';
import GoLiveStreamTypeBar from '@/components/stream/GoLiveStreamTypeBar';

export default function GoLive() {
  const [streamType, setStreamType] = useState('solo');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(false);
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
      // Use standard 9:16 portrait for mobile broadcast (720×1280)
      // Falls back gracefully if device can't match exactly
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

  const handleClose = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setHasPermissions(false);
    navigate(createPageUrl('Home'));
  };

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in to go live');
      if (!hasPermissions || !cameraStream) throw new Error('Camera permissions required');
      const trimmedTitle = title.trim();
      if (!trimmedTitle) throw new Error('Stream title is required');
      if (trimmedTitle.length > 100) throw new Error('Title must be under 100 characters');
      if (!category) throw new Error('Please select a category');

      let creatorId = creator?.id;

      // Clean up stale live streams for this creator
      if (creatorId) {
        const stale = await base44.entities.Stream.filter({ creator_id: creatorId, status: 'live' }, '-created_date', 10);
        for (const s of stale) {
          await base44.entities.Stream.update(s.id, { 
            status: 'ended', 
            duration_minutes: Math.floor((Date.now() - new Date(s.created_date).getTime()) / 60000), 
            viewer_count: 0 
          });
        }
        await base44.entities.Creator.update(creatorId, { is_live: false, current_stream_id: null });
      }

      // Create creator profile if needed
      if (!creatorId) {
        const existing = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
        if (existing[0]) {
          creatorId = existing[0].id;
        } else {
          const newCreator = await base44.entities.Creator.create({
            user_email: user.email,
            display_name: user.full_name || 'New Creator',
            category: category || 'other'
          });
          creatorId = newCreator.id;
        }
      }

      // Create stream record
      const stream = await base44.entities.Stream.create({
        creator_id: creatorId,
        title: trimmedTitle.substring(0, 100),
        category,
        stream_type: streamType,
        status: 'live',
        viewer_count: 0,
        peak_viewers: 0,
        total_gifts_received: 0,
        total_denarii_earned: 0,
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

      // System welcome (non-blocking)
      base44.entities.ChatMessage.create({
        stream_id: stream.id,
        sender_email: 'system',
        sender_name: 'System',
        message: `${user.full_name || 'The host'} started a live stream!`,
        message_type: 'system'
      }).catch(() => {});

      // Stop the preview camera — WatchStream will create its own
      cameraStream?.getTracks().forEach(t => t.stop());

      return stream;
    },
    onSuccess: (stream) => navigate(createPageUrl(`WatchStream?id=${stream.id}`)),
    onError: async (error) => {
      console.error('[GoLive] Failed:', error.message);
      ZegoService.leave().catch(() => {});
      const cId = creator?.id;
      if (cId) {
        const stale = await base44.entities.Stream.filter({ creator_id: cId, status: 'live' }, '-created_date', 10).catch(() => []);
        for (const s of stale) await base44.entities.Stream.update(s.id, { status: 'ended', viewer_count: 0 }).catch(() => {});
        await base44.entities.Creator.update(cId, { is_live: false, current_stream_id: null }).catch(() => {});
      }
      toast.error(error.message || 'Failed to start stream.');
    }
  });

  const isFormValid = title.trim() && category;
  const isAdmin = user?.role === 'admin';
  const canMonetize = isAdmin || hostSubscription?.status === 'active';

  // ── Camera preview UI ──
  if (hasPermissions) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Video — 9:16 normalized container */}
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className="h-full object-cover"
            style={{ transform: 'scaleX(-1)', maxWidth: '100%', aspectRatio: '9/16' }}
          />
        </div>

        {/* Gradient overlays */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/50 to-transparent z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />

        {/* ─── TOP BAR: Title + Category menu ─── */}
        <GoLiveTopBar
          title={title}
          onTitleChange={setTitle}
          category={category}
          onCategoryChange={setCategory}
          onClose={handleClose}
        />

        {/* ─── STREAM TYPE SELECTOR (centered below top bar) ─── */}
        <div className="absolute z-20 left-1/2 -translate-x-1/2" style={{ top: 'calc(max(12px, env(safe-area-inset-top)) + 60px)' }}>
          <GoLiveStreamTypeBar streamType={streamType} onStreamTypeChange={setStreamType} />
        </div>

        {/* ─── RIGHT SIDE TOOLS ─── */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4">
          {[
            { icon: Sparkles, label: 'Beauty' },
            { icon: Wand2, label: 'Filter' },
            { icon: Music, label: 'Music' },
            { icon: Gamepad2, label: 'Game' },
          ].map(tool => (
            <button key={tool.label} className="flex flex-col items-center gap-0.5">
              <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                <tool.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/50 text-[10px]">{tool.label}</span>
            </button>
          ))}
          <button className="flex flex-col items-center gap-0.5" onClick={() => {
            if (videoRef.current) {
              const cur = videoRef.current.style.transform;
              videoRef.current.style.transform = cur === 'scaleX(-1)' ? 'scaleX(1)' : 'scaleX(-1)';
            }
          }}>
            <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center">
              <FlipHorizontal className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/50 text-[10px]">Flip</span>
          </button>
        </div>

        {/* ─── BOTTOM SECTION ─── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
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

          {/* Validation hint */}
          {!isFormValid && (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-center text-white/30 text-xs mb-2"
            >
              {!title.trim() ? 'Add a title to go live' : 'Select a category to go live'}
            </motion.p>
          )}

          {/* GO LIVE button */}
          <div className="flex justify-center pb-2">
            <button
              onClick={() => goLiveMutation.mutate()}
              disabled={!isFormValid || goLiveMutation.isPending}
              className="relative w-[72px] h-[72px] rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)] disabled:opacity-30 disabled:shadow-none flex items-center justify-center transition-all active:scale-95"
            >
              {goLiveMutation.isPending ? (
                <span className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500 to-red-600 animate-ping opacity-20" />
                  <span className="text-white font-bold text-sm tracking-wide leading-tight text-center">GO<br/>LIVE</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pre-permission state ──
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-20 h-20 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
          <Radio className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Go Live</h1>
        <p className="text-white/50 text-sm mb-8">Camera & microphone access is needed</p>
        <Button 
          onClick={requestCamera}
          className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full px-8 py-3 font-semibold shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        >
          Enable Camera
        </Button>
      </div>
    </div>
  );
}