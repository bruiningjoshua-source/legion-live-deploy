import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Radio, FlipHorizontal, Gift, ArrowRight, X } from 'lucide-react';
import LegionAREngine from '@/components/stream/LegionAREngine';
import CustomStreamBackground from '@/components/stream/CustomStreamBackground';
import Soundboard from '@/components/stream/Soundboard';
import LegionMoCap from '@/components/mocap/LegionMoCap';
import { startMicLipSync, stopMicLipSync } from '@/components/mocap/LegionMicLipSync';
import OBSSetupPanel from '@/components/stream/OBSSetupPanel';
import { AnimatePresence } from 'framer-motion';
import GoLiveToolbar from '@/components/stream/GoLiveToolbar';
import SpinWheel from '@/components/stream/SpinWheel';
import StreamLottery from '@/components/stream/StreamLottery';
import ViewerChallenge from '@/components/stream/ViewerChallenge';
import HostGoalBar from '@/components/stream/HostGoalBar';
import GoLiveStreamModeSelector from '@/components/stream/GoLiveStreamModeSelector';
import SeatsPanel from '@/components/stream/golive/SeatsPanel';
import ThemePanel from '@/components/stream/golive/ThemePanel';
import BeautyPanel from '@/components/stream/golive/BeautyPanel';
import GameSelectPanel from '@/components/stream/golive/GameSelectPanel';
import GameLivePreview from '@/components/stream/golive/GameLivePreview';
import GameLiveToolbar from '@/components/stream/golive/GameLiveToolbar';
import { toast } from 'sonner';
import ZegoService from '@/components/stream/ZegoService';
import Orchestrator from '@/components/engine/EngineOrchestrator';
import DebugOverlay from '@/components/engine/DebugOverlay';

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
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showBeauty, setShowBeauty] = useState(false);
  const [showSoundboard, setShowSoundboard] = useState(false);
  const [mocapMode, setMocapMode] = useState(false);
  const [backdropMode, setBackdropMode] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showLottery, setShowLottery] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [showGoalBar, setShowGoalBar] = useState(true);
  const [streamGoal, setStreamGoal] = useState(null);
  const [showOBS, setShowOBS] = useState(false);
  const [seatCount, setSeatCount] = useState(4);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showGameSelect, setShowGameSelect] = useState(false);
  const [gameDeviceMode, setGameDeviceMode] = useState('mobile');
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

  // Don't auto-request camera on load — causes double permission dialog and
  // duplicate error toasts. User explicitly taps "Enable Camera" instead.
  // Camera is still auto-requested when user clicks Go Live.
  // useEffect(() => {
  //   if (user && !hasPermissions && !cameraStream) requestCamera();
  // }, [user?.email]);

  // Auto-open game select when switching to game_live  
  useEffect(() => {
    if (streamType === 'game_live' && !selectedGame) {
      setShowGameSelect(true);
    }
  }, [streamType]);

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

  // Stop camera on unmount + shutdown production engine
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach(t => t.stop());
      Orchestrator.shutdown();
    };
  }, [cameraStream]);

  // Boot production engine when camera is ready
  useEffect(() => {
    if (hasPermissions) {
      Orchestrator.init(ZegoService);
    }
  }, [hasPermissions]);

  // Host heartbeat is defined AFTER goLiveMutation (see below) to avoid a
  // temporal-dead-zone crash — it depends on goLiveMutation.data.

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      setCameraStream(stream);
      setHasPermissions(true);
      setPermissionDenied(false);
    } catch (error) {
      // Don't show toast — show inline instructions instead
      // Toast was firing twice (once on auto-request, once on manual tap)
      const isDenied = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError';
      setPermissionDenied(isDenied);
      if (!isDenied) {
        toast.error('Camera not available. Check if another app is using it.');
      }
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
      const isAudioOnly = streamType === 'audio_live';
      if (streamType !== 'game_live' && !isAudioOnly && (!hasPermissions || !cameraStream)) throw new Error('Camera permissions required');
      const trimmedTitle = (title.trim() || (selectedGame ? `Playing ${selectedGame.title}` : '')).trim();
      if (!trimmedTitle) throw new Error('Stream title is required');
      if (trimmedTitle.length > 100) throw new Error('Title must be under 100 characters');
      const effectiveCategory = category || (streamType === 'game_live' ? 'gaming' : '');
      if (!effectiveCategory) throw new Error('Please select a category');

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
         category: effectiveCategory,
         stream_type: streamType === 'game_live' ? 'solo' : streamType,
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
      await ZegoService.createLocalStream({ audioOnly: isAudioOnly });
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

  // Host heartbeat: while live, ping the server every 30s so the stream-reaper
  // (which ends streams stale >90s) keeps this stream alive. Declared here,
  // AFTER goLiveMutation, because it reads goLiveMutation.data.
  const liveStreamId = goLiveMutation.data?.id;
  useEffect(() => {
    if (!liveStreamId) return;
    let cancelled = false;
    const ping = () => {
      if (cancelled) return;
      // supabase.rpc returns a thenable builder (not a native Promise), so
      // use .then with an error handler instead of .catch.
      Promise.resolve(base44.rpc('stream_heartbeat', { p_stream_id: liveStreamId }))
        .then(() => {}, () => {});
    };
    ping(); // immediate first beat
    const iv = setInterval(ping, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [liveStreamId]);

  const isFormValid = streamType === 'game_live' 
    ? (selectedGame || title.trim()) 
    : (title.trim() && category);
  const isAdmin = user?.role === 'admin';
  const canMonetize = isAdmin || hostSubscription?.status === 'active' || hostSubscription?.admin_activated;

  // ── Camera preview UI ──
  if (hasPermissions) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Debug overlay — toggle via console: window.__legionDebug() */}
        <DebugOverlay />
        {/* Full screen camera or game preview */}
        {streamType === 'game_live' ? (
          <div className="absolute inset-0 bg-[#0d1117]">
            <GameLivePreview
              selectedGame={selectedGame}
              deviceMode={gameDeviceMode}
              onSelectGame={() => setShowGameSelect(true)}
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent z-10" />

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />

        {/* TOP BAR — BIGO-style pre-stream header */}
        <div className="absolute top-0 left-0 right-0 z-20"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>

          {/* Close + Flip row */}
          <div className="flex items-center justify-end px-4 mb-2">
            {streamType !== 'game_live' && (
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
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center mr-2">
                <FlipHorizontal className="w-4 h-4 text-white" />
              </button>
            )}
            <button onClick={handleClose}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Profile card + title */}
          <div className="mx-4 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 p-0.5 shrink-0">
                <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                  {creator?.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">👤</span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{creator?.display_name || user?.full_name || 'Creator'}</p>
                {streamType === 'game_live' && selectedGame ? (
                  <button
                    onClick={() => setShowGameSelect(true)}
                    className="flex items-center gap-1 mt-0.5"
                  >
                    <span className="text-xs">{selectedGame.icon || '🎮'}</span>
                    <span className="text-amber-300 text-xs font-medium truncate">{selectedGame.title}</span>
                    <span className="text-white/30 text-xs">›</span>
                  </button>
                ) : streamType === 'game_live' ? (
                  <button
                    onClick={() => setShowGameSelect(true)}
                    className="text-amber-300 text-xs font-medium mt-0.5"
                  >
                    🎮 Select a game ›
                  </button>
                ) : (
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="📢 Add stream title..."
                    maxLength={100}
                    className="w-full bg-transparent text-white/50 text-xs placeholder-white/30 focus:outline-none mt-0.5"
                  />
                )}
              </div>
            </div>

            {/* Category chips — hidden in game mode */}
            {streamType !== 'game_live' && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {[
                  { value: 'talk_show', label: '💬 Chat' },
                  { value: 'other', label: '💕 Dating' },
                  { value: 'gaming', label: '🎮 Games' },
                  { value: 'education', label: '⭐ Interests' },
                  { value: 'music', label: '💜 Emotional' },
                ].map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      category === cat.value
                        ? 'bg-white text-black border-white'
                        : 'bg-black/30 text-white/50 border-white/15'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM SECTION — BIGO-style layout */}
        <div className="absolute bottom-0 left-0 right-0 z-20"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>

          {/* Monetization warning */}
          {!canMonetize && (
            <div className="px-4 mb-2">
              <button onClick={() => navigate(createPageUrl('CreatorMonetization'))}
                className="w-full flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-amber-200 text-xs flex-1 text-left">Enable monetization to earn from gifts</span>
                <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
              </button>
            </div>
          )}

          {/* Tool icons row */}
          <div className="mb-3">
            {streamType === 'game_live' ? (
              <GameLiveToolbar onSelectGame={() => setShowGameSelect(true)} />
            ) : (
              <GoLiveToolbar
                activeTool={activeTool}
                onToolSelect={(tool) => {
                  if (tool === 'spin')      { setShowSpinWheel(true); return; }
                  if (tool === 'lottery')   { setShowLottery(true); return; }
                  if (tool === 'challenge') { setShowChallenge(true); return; }
                  if (tool === 'goal')      { setShowGoalBar(true); return; }
                  if (tool === 'obs') {
                    setShowOBS(true);
                    return;
                  }
                  if (tool === 'vtuber') {
                    setMocapMode(v => !v);
                    setActiveTool(null);
                    return;
                  }
                  if (tool === 'backdrop') {
                    setBackdropMode(v => !v);
                    setActiveTool(null);
                    return;
                  }
                  setActiveTool(tool);
                  if (tool === 'beauty') setShowBeauty(true);
                  else setShowBeauty(false);
                }}
              />
            )}
          </div>

          {/* GO LIVE button */}
          <div className="px-4 mb-2">
            <button
              onClick={() => goLiveMutation.mutate()}
              disabled={!isFormValid || goLiveMutation.isPending}
              className={`w-full py-3.5 rounded-full text-white font-bold text-base tracking-wide disabled:opacity-30 disabled:shadow-none transition-all active:scale-[0.98] ${
                streamType === 'game_live'
                  ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                  : 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
              }`}
            >
              {goLiveMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : streamType === 'game_live' ? (
                'OK'
              ) : (
                'Go LIVE'
              )}
            </button>
          </div>

          {/* Device mode toggle for Game LIVE */}
          {streamType === 'game_live' && (
            <div className="flex justify-center mb-2">
              <div className="flex bg-white/[0.06] rounded-full p-0.5 border border-white/[0.08]">
                <button
                  onClick={() => setGameDeviceMode('mobile')}
                  className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    gameDeviceMode === 'mobile' ? 'bg-white text-black' : 'text-white/40'
                  }`}
                >
                  📱
                </button>
                <button
                  onClick={() => setGameDeviceMode('pc')}
                  className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    gameDeviceMode === 'pc' ? 'bg-white text-black' : 'text-white/40'
                  }`}
                >
                  🖥️
                </button>
              </div>
            </div>
          )}

          {/* Stream mode selector at bottom */}
          <GoLiveStreamModeSelector
            streamType={streamType}
            onStreamTypeChange={(type) => {
              setStreamType(type);
              if (type === 'game_live' && !selectedGame) {
                setShowGameSelect(true);
              }
            }}
          />
        </div>

        {/* ── Gamification overlays ── */}
        {showSpinWheel  && <SpinWheel    streamId={streamId} isHost onClose={()=>setShowSpinWheel(false)} />}
        {showLottery    && <StreamLottery streamId={streamId} isHost onClose={()=>setShowLottery(false)} />}
        {showChallenge  && <ViewerChallenge streamId={streamId} isHost onClose={()=>setShowChallenge(false)} />}

        {/* ── Host Goal Bar ── */}
        {showGoalBar && goLiveMutation.data?.id && (
          <div className="absolute z-20 left-3 right-3" style={{top:'calc(max(12px, env(safe-area-inset-top)) + 60px)'}}>
            <HostGoalBar streamId={goLiveMutation.data.id} isHost currentTotal={goLiveMutation.data?.viewer_count || 0}
              onGoalUpdate={(goal)=>setStreamGoal(goal)} />
          </div>
        )}

        {/* Tool panel overlays */}
        <AnimatePresence>
          {activeTool === 'seats' && (
            <SeatsPanel
              seats={seatCount}
              onSeatsChange={setSeatCount}
              onClose={() => setActiveTool(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeTool === 'theme' && (
            <ThemePanel
              onClose={() => setActiveTool(null)}
              onThemeChange={(change) => toast.success(`${change.type} applied`)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(activeTool === 'beauty' || showBeauty) && (
            <BeautyPanel
              onClose={() => { setActiveTool(null); setShowBeauty(false); }}
              onApply={(effect) => toast.success(`${effect.type} applied`)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSoundboard && <Soundboard onClose={() => setShowSoundboard(false)} />}
        </AnimatePresence>

        <AnimatePresence>
          {backdropMode && (
            <CustomStreamBackground
              videoRef={videoRef}
              onClose={() => setBackdropMode(false)}
              onProcessedStream={(stream) => {
                if (!stream) {
                  // Revert to raw camera track when background is cleared
                  const raw = cameraStream?.getVideoTracks?.()[0];
                  if (raw && typeof ZegoService.replaceTrack === 'function') {
                    ZegoService.replaceTrack(raw).catch(() => {});
                  }
                  return;
                }
                const track = stream.getVideoTracks()[0];
                if (track && typeof ZegoService.replaceTrack === 'function') {
                  ZegoService.replaceTrack(track).catch(err =>
                    console.warn('[CustomBG] replaceTrack:', err.message)
                  );
                }
              }}
            />
          )}
        </AnimatePresence>

        <LegionAREngine
          videoRef={videoRef}
          isLive={!!goLiveMutation.data}
          openPanel={activeTool === 'magic'}
          onPanelClose={() => setActiveTool(null)}
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

        <AnimatePresence>
          {showOBS && (
            <OBSSetupPanel
              user={user}
              creator={creator}
              onClose={() => setShowOBS(false)}
              onStreamCreated={(stream) => navigate(createPageUrl(`WatchStream?id=${stream.id}`))}
            />
          )}
        </AnimatePresence>

        {/* Game Select Panel */}
        <AnimatePresence>
          {showGameSelect && (
            <GameSelectPanel
              onGameSelect={(game) => {
                setSelectedGame(game);
                if (!title.trim()) setTitle(`Playing ${game.title}`);
                if (!category) setCategory('gaming');
                setShowGameSelect(false);
              }}
              onClose={() => setShowGameSelect(false)}
              deviceMode={gameDeviceMode}
              onDeviceModeChange={setGameDeviceMode}
            />
          )}
        </AnimatePresence>

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
    <div className="min-h-screen bg-[#050508] flex items-center justify-center relative px-6">
      <button onClick={() => navigate(createPageUrl('Home'))}
        className="absolute top-4 left-4 z-10 w-10 h-10 bg-white/8 rounded-full flex items-center justify-center text-white"
        style={{ marginTop: 'env(safe-area-inset-top)' }}>
        <X className="w-5 h-5" />
      </button>

      <div className="text-center max-w-xs w-full">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: permissionDenied ? 'rgba(239,68,68,0.15)' : 'rgba(245,166,35,0.12)', boxShadow: `0 0 40px ${permissionDenied ? 'rgba(239,68,68,0.2)' : 'rgba(245,166,35,0.15)'}` }}>
          <Radio className="w-9 h-9" style={{ color: permissionDenied ? '#f87171' : '#f5a623' }} />
        </div>

        {permissionDenied ? (
          <>
            <h1 className="text-xl font-bold text-white mb-2">Camera Access Blocked</h1>
            <p className="text-white/45 text-sm mb-6 leading-relaxed">
              Your browser has blocked camera and microphone access. To go live you need to allow it manually.
            </p>
            <div className="ll-card p-4 rounded-2xl text-left mb-6 space-y-2">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">How to fix on Chrome Android:</p>
              {['Tap the 🔒 lock icon in the address bar', 'Tap "Permissions"', 'Set Camera and Microphone to "Allow"', 'Reload the page and try again'].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5"
                    style={{ background: 'rgba(245,166,35,0.2)', color: '#f5a623' }}>{i + 1}</span>
                  <p className="text-white/55 text-xs leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
            <button onClick={() => window.location.reload()}
              className="w-full py-3 rounded-2xl font-bold text-sm"
              style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', color: '#f5a623' }}>
              Reload & Try Again
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Go Live</h1>
            <p className="text-white/45 text-sm mb-8">Camera & microphone access is needed to start broadcasting.</p>
            <button onClick={requestCamera}
              className="w-full py-3.5 rounded-2xl font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #f5a623, #d97706)', color: '#0a0800', boxShadow: '0 4px 20px rgba(245,166,35,0.3)' }}>
              Enable Camera & Mic
            </button>
          </>
        )}
      </div>
    </div>
  );
}