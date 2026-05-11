import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Radio, FlipHorizontal, Sparkles, Gift, ArrowRight, X, ScreenShare } from 'lucide-react';
import BeautyFilter from '@/components/stream/BeautyFilter';
import LegionAREngine from '@/components/stream/LegionAREngine';
import Soundboard from '@/components/stream/Soundboard';
import LegionMoCap from '@/components/mocap/LegionMoCap';
import { startMicLipSync, stopMicLipSync } from '@/components/mocap/LegionMicLipSync';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ZegoService from '@/components/stream/ZegoService';

// Detect if coming from affiliate marketplace or gaming hub
const getInitialPlatformType = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('platform') === 'affiliate' ? 'affiliate_marketplace' : 'legion_live';
};

const getInitialTitle = () => {
  const params = new URLSearchParams(window.location.search);
  const gameTitle = params.get('gameTitle');
  return gameTitle ? `Playing ${gameTitle}` : '';
};

const getInitialCategory = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('gameTitle') ? 'gaming' : '';
};

export default function GoLive() {
  const [streamType, setStreamType] = useState('solo');
  const [title, setTitle] = useState(getInitialTitle);
  const [category, setCategory] = useState(getInitialCategory);
  const [platformType] = useState(getInitialPlatformType);
  const [cameraStream, setCameraStream] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [showBeauty, setShowBeauty] = useState(false);
  const [showSoundboard, setShowSoundboard] = useState(false);
  const [mocapMode, setMocapMode] = useState(false);
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
         platform_type: platformType,
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
      
      const { appId: ZEGO_APP_ID, token, serverUrl } = tokenResponse.data || {};
      if (!ZEGO_APP_ID || !token) throw new Error('Invalid token response');

      // Stop preview camera BEFORE Zego opens its own camera.
      // On iOS/Android holding two getUserMedia handles causes the second to fail silently.
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null); // clear ref so cleanup useEffect doesn't double-stop
      }

      await ZegoService.initialize(ZEGO_APP_ID, serverUrl);
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
  const canMonetize = isAdmin || hostSubscription?.status === 'active' || hostSubscription?.admin_activated;

  // ── Camera preview UI ──
  if (hasPermissions) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Full screen camera */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent z-10" />

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />

        {/* TOP BAR */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-safe"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
          
          {/* Close button */}
          <button onClick={handleClose}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Stream type tabs */}
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur rounded-full px-1 py-1 border border-white/10">
            {['solo', 'multi_panel', 'pk_battle'].map(type => (
              <button key={type}
                onClick={() => setStreamType(type)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  streamType === type
                    ? 'bg-amber-500 text-black'
                    : 'text-white/50'
                }`}>
                {type === 'solo' ? 'Solo' : type === 'multi_panel' ? 'Multi' : 'PK'}
              </button>
            ))}
          </div>

          {/* Flip camera */}
          <button onClick={() => {
            if (cameraStream) {
              const tracks = cameraStream.getVideoTracks();
              const current = tracks[0]?.getSettings()?.facingMode;
              cameraStream.getTracks().forEach(t => t.stop());
              navigator.mediaDevices.getUserMedia({
                video: { facingMode: current === 'environment' ? 'user' : 'environment' },
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
              }).then(s => setCameraStream(s)).catch(() => {});
            }
          }}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center">
            <FlipHorizontal className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* RIGHT SIDE TOOLS */}
        <div className="absolute right-3 z-20 flex flex-col items-center gap-4"
          style={{ top: '50%', transform: 'translateY(-50%)' }}>
          
          <button onClick={() => setShowBeauty(!showBeauty)}
            className="flex flex-col items-center gap-1">
            <div className={`w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center ${
              showBeauty ? 'bg-amber-500/30 border-amber-400/50' : 'bg-black/40 border-white/10'
            }`}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/60 text-[9px]">Beauty</span>
          </button>

          <button onClick={() => toast.info('Screen sharing activates once you go live')}
            className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center">
              <ScreenShare className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/60 text-[9px]">Screen</span>
          </button>

          <button onClick={() => setShowSoundboard(v => !v)} className="flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center transition-all"
              style={{
                background: showSoundboard ? 'rgba(245,166,35,0.25)' : 'rgba(0,0,0,0.4)',
                borderColor: showSoundboard ? 'rgba(245,166,35,0.5)' : 'rgba(255,255,255,0.1)',
              }}
            >
              <span className="text-lg">🎵</span>
            </div>
            <span className="text-white/60 text-[9px]">Sound</span>
          </button>

          <button onClick={() => setMocapMode(v=>!v)} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center transition-all"
              style={{ background:mocapMode?"rgba(139,92,246,0.30)":"rgba(0,0,0,0.4)", borderColor:mocapMode?"rgba(139,92,246,0.60)":"rgba(255,255,255,0.1)", boxShadow:mocapMode?"0 0 12px rgba(139,92,246,0.4)":"none" }}>
              <span className="text-lg">🎭</span>
            </div>
            <span className="text-white/60 text-[9px]">MoCap</span>
          </button>
        </div>

        {/* BOTTOM SECTION */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

          {/* Title input */}
          <div className="mb-3">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Add a stream title..."
              maxLength={100}
              className="w-full bg-black/40 backdrop-blur border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {['gaming','music','talk_show','dance','cooking','fitness','education','art','comedy','other'].map(cat => (
              <button key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  category === cat
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-black/30 text-white/50 border-white/10'
                }`}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Monetization warning */}
          {!canMonetize && (
            <button onClick={() => navigate(createPageUrl('CreatorMonetization'))}
              className="w-full mb-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <Gift className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-amber-200 text-xs flex-1 text-left">Enable monetization to earn from gifts</span>
              <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
            </button>
          )}

          {/* GO LIVE button */}
          <button
            onClick={() => goLiveMutation.mutate()}
            disabled={!isFormValid || goLiveMutation.isPending}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-base tracking-wide shadow-[0_0_30px_rgba(239,68,68,0.3)] disabled:opacity-30 disabled:shadow-none transition-all active:scale-[0.98]"
          >
            {goLiveMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </span>
            ) : (
              '🔴  Go Live'
            )}
          </button>
        </div>

        {/* Beauty overlay */}
        <AnimatePresence>
          {showBeauty && <BeautyFilter videoRef={videoRef} />}
        </AnimatePresence>

        <AnimatePresence>
          {showSoundboard && <Soundboard onClose={() => setShowSoundboard(false)} />}
        </AnimatePresence>

        <LegionAREngine
          videoRef={videoRef}
          isLive={!!goLiveMutation.data}
          onProcessedStream={(stream) => {
            if (!stream) return;
            const track = stream.getVideoTracks()[0];
            if (track && typeof ZegoService.replaceTrack === "function") {
              ZegoService.replaceTrack(track).catch(err =>
                console.warn('[LegionAR] replaceTrack:', err.message)
              );
            }
          }}
        />

        {mocapMode && (
          <LegionMoCap
            videoRef={videoRef}
            onProcessedStream={(stream) => {
              if (!stream) return;
              // Start mic lip-sync from camera stream audio
              if (cameraStream) startMicLipSync(cameraStream);
              const track = stream.getVideoTracks()[0];
              if (track && typeof ZegoService.replaceTrack === "function") {
                ZegoService.replaceTrack(track).catch(console.warn);
              }
            }}
            onClose={() => { setMocapMode(false); stopMicLipSync(); }}
          />
        )}
      </div>
    );
  }

  // ── Pre-permission state ──
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative">
      {/* Back / Close button */}
      <button
        onClick={() => navigate(createPageUrl('Home'))}
        className="absolute top-4 left-4 z-10 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <X className="w-5 h-5" />
      </button>
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