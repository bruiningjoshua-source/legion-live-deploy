import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Radio, X, Shield, Sparkles, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useCurrentUser, useStream, useCreator, useWallet, useGifts,
  useChatMessages, useFollowStatus, useCreatorSubscription,
  useStreamPKBattle, useSendGift, useToggleFollow, useEndStream,
} from '@/components/hooks/useStreamData';
import ChatService from '@/components/services/ChatService';
import StreamService from '@/components/services/StreamService';

import BulletChat from '@/components/stream/BulletChat';
import FloatingHearts from '@/components/stream/FloatingHearts';
import ViewerTopBar from '@/components/stream/ViewerTopBar';
import StreamActionBar from '@/components/stream/StreamActionBar';
import GiftPanel from '@/components/gifts/GiftPanel';
import GiftAnimation from '@/components/gifts/GiftAnimation';
import GiftLeaderboard from '@/components/stream/GiftLeaderboard';
import ExpandedGiftLeaderboard from '@/components/stream/ExpandedGiftLeaderboard';
import AlertNotifications from '@/components/moderation/AlertNotifications';
import PKBattleOverlay from '@/components/pk/PKBattleOverlay';
import DiscordStylePanel from '@/components/stream/DiscordStylePanel';
import ZegoService from '@/components/stream/ZegoService';
import StreamQualityMonitor from '@/components/stream/StreamQualityMonitor';
import BroadcasterWallet from '@/components/stream/BroadcasterWallet';
import ViewerWallet from '@/components/stream/ViewerWallet';
import BroadcasterTopBar from '@/components/stream/BroadcasterTopBar';
import PremiumLensUI from '@/components/stream/PremiumLensUI';
import StreamingSettings from '@/components/stream/StreamingSettings';
import BroadcastControlPanel from '@/components/stream/BroadcastControlPanel';
import EndStreamDialog from '@/components/stream/EndStreamDialog';
import ModerationPanel from '@/components/stream/ModerationPanel';
import CoStreamPanel from '@/components/stream/CoStreamPanel';
import MultiStreamManager from '@/components/stream/MultiStreamManager';
import StreamOverlayEditor from '@/components/stream/StreamOverlayEditor';

export default function WatchStream() {
  const urlParams = new URLSearchParams(window.location.search);
  const streamId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Core state
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [giftAnimation, setGiftAnimation] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [liveStream, setLiveStream] = useState(null);
  const [streamStats, setStreamStats] = useState(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  // Broadcaster state
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [moderators, setModerators] = useState([]);
  const [kickedUsers, setKickedUsers] = useState([]);
  const [chatMuted, setChatMuted] = useState(false);
  const [panelParticipants, setPanelParticipants] = useState([]);
  const [activeLens, setActiveLens] = useState(null);
  const [activeBackground, setActiveBackground] = useState(null);
  const [showCoStreamPanel, setShowCoStreamPanel] = useState(false);
  const [showMultiStream, setShowMultiStream] = useState(false);
  const [showOverlayEditor, setShowOverlayEditor] = useState(false);
  const [streamOverlays, setStreamOverlays] = useState([]);
  const [streamSettings, setStreamSettings] = useState({
    resolution: '720p', bitrate: 'auto', frameRate: 30,
    arComplexity: 'medium', faceMeshEnabled: true, segmentationEnabled: false,
    adaptiveEnabled: true, lowPowerMode: false,
  });

  const videoRef = useRef(null);
  const arCanvasRef = useRef(null);

  // Lock body scroll for fullscreen streaming
  useEffect(() => {
    document.body.classList.add('fullscreen-lock');
    return () => document.body.classList.remove('fullscreen-lock');
  }, []);

  // ─── Data queries (service layer) ─────────────────────────
  const { data: user } = useCurrentUser();
  const { data: stream, isLoading: streamLoading } = useStream(streamId);
  const { data: creator } = useCreator(stream?.creator_id);
  const { data: opponentCreator } = useCreator(stream?.pk_opponent_id);
  const { data: pkBattle } = useStreamPKBattle(streamId, stream?.stream_type);
  const { data: gifts = [] } = useGifts();
  const { data: wallet } = useWallet(user?.email);
  const { data: initialMessages } = useChatMessages(streamId);
  const { data: isFollowing } = useFollowStatus(user?.email, creator?.id);
  const { data: creatorSubscription } = useCreatorSubscription(creator?.user_email);

  const creatorCanReceiveGifts = creatorSubscription?.status === 'active' || user?.role === 'admin';
  const isBroadcaster = user?.email === creator?.user_email;
  const walletBalance = wallet?.denarii_balance || 0;

  // ─── Broadcaster: warn on tab close & cleanup ───
  useEffect(() => {
    if (!isBroadcaster || !stream?.id) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'You are live! Closing this tab will end your stream.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isBroadcaster, stream?.id]);

  // ─── Viewer: update viewer count on join/leave (via StreamService) ───
  useEffect(() => {
    if (!stream?.id || isBroadcaster || !user) return;
    StreamService.joinAsViewer(stream.id, stream.viewer_count, stream.peak_viewers).catch(() => {});
    return () => {
      StreamService.leaveAsViewer(stream.id, stream.viewer_count).catch(() => {});
    };
  }, [stream?.id, isBroadcaster, user?.email]);

  // ─── Chat sync (via ChatService) ─────────────────────────
  useEffect(() => {
    if (initialMessages?.length) setChatMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!streamId) return;
    return ChatService.subscribe(streamId, (newMessage) => {
      setChatMessages(prev => ChatService.addToBuffer(prev, newMessage));
    });
  }, [streamId]);

  // ─── Zego viewer init ─────────────────
  useEffect(() => {
    let mounted = true;
    const initZegoViewer = async () => {
      if (stream?.status === 'live' && !isBroadcaster) {
        try {
          const viewerUserId = user?.email?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32) || `viewer_${Math.floor(Math.random() * 1000000)}`;
          const tokenResponse = await base44.functions.invoke('generateZegoToken', {
            roomId: streamId, userId: viewerUserId, role: 'audience'
          });
          if (!mounted) return;
          const ZEGO_APP_ID = tokenResponse.data?.appId;
          if (!ZEGO_APP_ID || !tokenResponse.data?.token) {
            console.error('[WatchStream] Invalid token response');
            setLiveStream(true);
            return;
          }
          await ZegoService.initialize(ZEGO_APP_ID);
          if (!mounted) return;
          await ZegoService.loginRoom(streamId, viewerUserId, user?.full_name || 'Viewer', tokenResponse.data.token);
          if (!mounted) return;

          // Listen for room events (host ends stream)
          ZegoService.onRoomEvent((event) => {
            if (event.type === 'roomState' && event.state === 'DISCONNECTED') {
              queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
            }
            if (event.type === 'streamUpdate' && event.updateType === 'DELETE') {
              // Host stopped publishing - stream ended
              queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
            }
          });
          ZegoService.onQualityChange((stats) => { if (mounted) setStreamStats(stats); });
          setTimeout(() => ZegoService.getRemoteStreams(), 1000);
          setLiveStream(true);
        } catch (error) {
          console.error('[WatchStream] Failed to join:', error);
          if (mounted) setLiveStream(true);
        }
      }
    };
    initZegoViewer();
    return () => {
      mounted = false;
      ZegoService.leave().catch(() => {});
    };
  }, [stream?.status, streamId, isBroadcaster]);

  // ─── Viewer: detect stream ended and show end screen ───
  const streamEnded = stream?.status === 'ended';

  // ─── Creator camera init ──────────────
  useEffect(() => {
    const initCamera = async () => {
      if (stream?.status === 'live' && isBroadcaster) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          setLiveStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.muted = false;
            videoRef.current.playsInline = true;
            const playAttempt = async () => {
              try { await videoRef.current.play(); }
              catch { setTimeout(playAttempt, 500); }
            };
            playAttempt();
          }
        } catch (error) {
          console.error('Camera access error:', error);
        }
      }
    };
    initCamera();
    return () => {
      if (liveStream && typeof liveStream !== 'boolean') {
        liveStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream?.status, isBroadcaster]);

  // Mirror effect
  useEffect(() => {
    if (videoRef.current && isBroadcaster) {
      videoRef.current.style.transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    }
  }, [isMirrored, isBroadcaster]);

  // ─── Mutations (via service layer hooks) ────────────────────────
  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => ChatService.sendMessage({ streamId, user, wallet, messageData }),
    onMutate: (messageData) => {
      const optimisticMsg = ChatService.createOptimisticMessage({ streamId, user, messageData, wallet });
      setChatMessages(prev => [...prev, optimisticMsg]);
    },
    onError: (error) => alert(error.message || 'Unable to send message.'),
  });

  const _sendGiftMutation = useSendGift({ user, wallet, creator, stream, creatorCanReceiveGifts });
  // Wrap to add UI side effects (animation + panel close)
  const sendGiftMutation = {
    ..._sendGiftMutation,
    mutate: ({ gift, quantity }) => {
      setShowGiftPanel(false);
      setGiftAnimation({ gift, sender: user?.full_name || 'Anonymous', quantity });
      _sendGiftMutation.mutate({ gift, quantity });
    }
  };
  const followMutation = useToggleFollow({ user, creator, isFollowing });
  const _endStreamMutation = useEndStream({ stream, creator, pkBattle, liveStream });
  const endStreamMutation = {
    ..._endStreamMutation,
    mutate: () => _endStreamMutation.mutate(null, { onSuccess: () => navigate(createPageUrl('Profile')) }),
  };

  // ─── Reaction handler ─────────────────
  const handleDoubleTapLike = useCallback(() => {
    const emojis = ['❤️', '🔥', '💜', '✨', '🌟'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    setFloatingReactions(prev => [...prev.slice(-15), { id: Date.now() + Math.random(), emoji }]);
    if (!isFollowing) followMutation.mutate();
  }, [isFollowing]);

  // Clean up old reactions
  useEffect(() => {
    const interval = setInterval(() => {
      setFloatingReactions(prev => prev.filter(r => Date.now() - r.id < 3500));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Loading / Error ──────────────────
  if (streamLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stream || streamEnded) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {streamEnded ? 'Stream Has Ended' : 'Stream Not Found'}
          </h1>
          <p className="text-white/50 mb-2">
            {streamEnded
              ? `${creator?.display_name || 'The host'} ended this broadcast.`
              : "This stream doesn't exist"}
          </p>
          {streamEnded && stream && (
            <div className="flex items-center justify-center gap-4 text-white/40 text-sm mb-6">
              {stream.duration_minutes > 0 && <span>{stream.duration_minutes} min</span>}
              {stream.peak_viewers > 0 && <span>{stream.peak_viewers} peak viewers</span>}
              {stream.total_gifts_received > 0 && <span>{stream.total_gifts_received} gifts</span>}
            </div>
          )}
          <Link to={createPageUrl('Home')}>
            <Button className="bg-amber-600 hover:bg-amber-700">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── RENDER ───────────────────────────
  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ width: '100vw', height: '100vh' }}>


      {/* ── Gift Animation ── */}
      <AnimatePresence>
        {giftAnimation && (
          <GiftAnimation
            gift={giftAnimation.gift} sender={giftAnimation.sender}
            quantity={giftAnimation.quantity} onComplete={() => setGiftAnimation(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Video Layer ── 9:16 portrait */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {activeBackground?.type === 'image' && (
          <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${activeBackground.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}
        {activeBackground?.type === 'gradient' && (
          <div className="absolute inset-0 z-0" style={{ background: `linear-gradient(${activeBackground.angle || 135}deg, ${activeBackground.colors?.join(', ')})` }} />
        )}

        <canvas ref={arCanvasRef} className="hidden" />

        {/* 9:16 video container */}
        <div className="relative w-full h-full" style={{ maxWidth: 'calc(100vh * 9 / 16)' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay playsInline muted={isMuted}
            poster={stream.thumbnail_url}
            controls={false} preload="auto"
            onDoubleClick={handleDoubleTapLike}
          />

          {/* Multi-Panel overlay */}
          {stream.stream_type === 'multi_panel' && (
            <div className="absolute inset-0 z-10">
              <DiscordStylePanel
                hostStream={stream} hostCreator={creator} currentUser={user}
                panelParticipants={panelParticipants}
                onInviteToPanel={(p) => setPanelParticipants(prev => [...prev, p || user])}
                onRemoveFromPanel={(p) => setPanelParticipants(prev => prev.filter(x => x.user_email !== p?.user_email))}
                onMuteAudio={() => {}} onEndCamera={() => {}}
                onLeaveCall={() => { navigate(createPageUrl('Explore')); }}
                isHost={isBroadcaster} maxParticipants={8}
              />
            </div>
          )}

          {/* PK Battle */}
          {stream.stream_type === 'pk_battle' && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <PKBattleOverlay
                hostCreator={creator} opponentCreator={opponentCreator}
                hostScore={pkBattle?.host_score || stream.pk_score?.host || 0}
                opponentScore={pkBattle?.opponent_score || stream.pk_score?.opponent || 0}
                timeRemaining={pkBattle ? 300 : 0} status={pkBattle?.status || 'pending'}
              />
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {!liveStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-5">
            <div className="text-center">
              <div className="w-14 h-14 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/70 text-sm">Connecting to stream...</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Gradient overlays for UI readability ── */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10 pointer-events-none" />

      {/* ── Floating Hearts (double-tap reactions) ── */}
      <FloatingHearts reactions={floatingReactions} />

      {/* ══════════════════════════════════════════ */}
      {/* ── VIEWER UI ── */}
      {/* ══════════════════════════════════════════ */}
      {!isBroadcaster && (
        <>
          {/* Top bar: creator info, follow, viewer count */}
          <ViewerTopBar
            creator={creator} stream={stream}
            isFollowing={isFollowing}
            onFollowClick={() => followMutation.mutate()}
            onClose={() => { navigate(createPageUrl('Home')); }}
            viewerCount={stream.viewer_count || 0}
          />

          {/* Wallet badge */}
          {wallet && (
            <div className="absolute top-3 right-3 z-30">
              <ViewerWallet denariiBalance={wallet.denarii_balance || 0} asBalance={wallet.as_balance || 0} />
            </div>
          )}

          {/* Right-side action bar */}
          <StreamActionBar
            onGiftClick={() => {
              if (!creatorCanReceiveGifts) {
                alert('This creator has not enabled monetization yet.');
                return;
              }
              setShowGiftPanel(true);
            }}
            onLikeClick={handleDoubleTapLike}
            onShareClick={() => {
              if (navigator.share) navigator.share({ title: stream.title, url: window.location.href });
            }}
            onChatToggle={() => setShowChat(!showChat)}
            isLiked={isFollowing}
            likeCount={creator?.follower_count || 0}
            giftDisabled={!creatorCanReceiveGifts}
            showChat={showChat}
          />

          {/* Gift leaderboard - compact, top right below wallet */}
          <div className="absolute top-16 right-3 z-20 w-44" onClick={() => setShowExpandedLeaderboard(true)}>
            <GiftLeaderboard streamId={streamId} compact />
          </div>

          {/* Bullet Chat - bottom left */}
          {showChat && (
            <BulletChat
              messages={chatMessages}
              onSendMessage={(msg) => sendMessageMutation.mutate(msg)}
              currentUser={user}
              isAuthenticated={!!user}
              disabled={sendMessageMutation.isPending}
              isHost={false}
              recentChatters={ChatService.getRecentChatters(chatMessages)}
            />
          )}
        </>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ── BROADCASTER UI ── */}
      {/* ══════════════════════════════════════════ */}
      {isBroadcaster && (
        <>
          {/* Exit button */}
          <button
            onClick={() => setShowEndDialog(true)}
            className="absolute top-3 left-3 z-30 w-10 h-10 bg-black/50 hover:bg-red-600/80 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Broadcaster top bar */}
          <div className="absolute top-3 left-14 z-30">
            <BroadcasterTopBar
              stream={stream} viewerCount={stream.viewer_count || 0}
              onUpdateStream={async (updates) => {
                await base44.entities.Stream.update(stream.id, updates);
                queryClient.invalidateQueries(['stream', streamId]);
              }}
            />
          </div>

          {/* Creator tools row */}
          <div className="absolute top-16 left-3 z-20 flex gap-2 flex-wrap" style={{ maxWidth: '280px' }}>
            <PremiumLensUI
              videoRef={videoRef} canvasRef={arCanvasRef}
              onMirrorChange={setIsMirrored} initialMirror={isMirrored}
              onEffectChange={setActiveLens} onBackgroundChange={setActiveBackground}
              faceMeshEnabled={streamSettings.faceMeshEnabled}
              segmentationEnabled={streamSettings.segmentationEnabled}
            />
            <StreamingSettings onSettingsChange={setStreamSettings} initialSettings={streamSettings} isLive={stream?.status === 'live'} />
            <Button onClick={() => setShowCoStreamPanel(true)} size="sm"
              className="bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 h-10 w-10 rounded-full p-0">
              <Users className="w-4 h-4" />
            </Button>
            <Button onClick={() => setShowOverlayEditor(true)} size="sm"
              className="bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 h-10 w-10 rounded-full p-0">
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button onClick={() => setShowModerationPanel(true)} size="sm"
              className="bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 h-10 w-10 rounded-full p-0">
              <Shield className="w-4 h-4" />
            </Button>
          </div>

          {/* Broadcaster wallet */}
          <BroadcasterWallet
            totalEarnings={creator?.total_earnings_denarii || 0}
            sessionEarnings={stream?.total_denarii_earned || 0}
            giftsReceived={stream?.total_gifts_received || 0}
            creatorId={creator?.id}
          />

          {/* Broadcast controls bottom */}
          <BroadcastControlPanel
            stream={stream}
            streamStats={{
              viewers: stream?.viewer_count || 0,
              duration: stream?.created_date
                ? `${Math.floor((Date.now() - new Date(stream.created_date).getTime()) / 60000)}:${String(Math.floor(((Date.now() - new Date(stream.created_date).getTime()) % 60000) / 1000)).padStart(2, '0')}`
                : '0:00',
              bitrate: streamStats?.bitrate || 0
            }}
            onToggleMic={(enabled) => {
              if (liveStream && typeof liveStream !== 'boolean') liveStream.getAudioTracks().forEach(t => t.enabled = enabled);
            }}
            onToggleCamera={(enabled) => {
              if (liveStream && typeof liveStream !== 'boolean') liveStream.getVideoTracks().forEach(t => t.enabled = enabled);
            }}
            onToggleScreenShare={async (enabled) => {
              if (enabled) {
                try {
                  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                  if (videoRef.current) videoRef.current.srcObject = screenStream;
                } catch (e) { console.error('Screen share failed:', e); }
              } else if (liveStream && typeof liveStream !== 'boolean' && videoRef.current) {
                videoRef.current.srcObject = liveStream;
              }
            }}
            onFlipCamera={() => setIsMirrored(!isMirrored)}
            onEndStream={() => setShowEndDialog(true)}
            onUpdateSettings={() => {}}
          />

          {/* Bullet chat for broadcaster too */}
          <BulletChat
            messages={chatMessages}
            onSendMessage={(msg) => sendMessageMutation.mutate(msg)}
            currentUser={user} isAuthenticated={!!user}
            disabled={sendMessageMutation.isPending} isHost={true}
            recentChatters={ChatService.getRecentChatters(chatMessages)}
          />

          {/* End stream dialog */}
          <EndStreamDialog isOpen={showEndDialog} onConfirm={() => endStreamMutation.mutate()} onCancel={() => setShowEndDialog(false)} isPending={endStreamMutation.isPending} />

          {/* Moderation panel */}
          <ModerationPanel
            isOpen={showModerationPanel} onClose={() => setShowModerationPanel(false)}
            streamId={streamId} viewers={[]} moderators={moderators} kickedUsers={kickedUsers}
            chatMuted={chatMuted} onToggleChatMute={() => setChatMuted(!chatMuted)}
            onAppointModerator={(v) => setModerators([...moderators, v])}
            onRemoveModerator={(m) => setModerators(moderators.filter(x => x.email !== m.email))}
            onKickViewer={(v) => setKickedUsers([...kickedUsers, v])}
            onResetKicks={() => setKickedUsers([])}
            onMuteViewerAudio={() => {}} onEndViewerCamera={() => {}} isHost={true}
          />
        </>
      )}

      {/* ── Stream Overlays ── */}
      {streamOverlays.filter(o => o.visible).map(overlay => (
        <div key={overlay.id} className={`absolute z-30 ${
          overlay.position === 'top-left' ? 'top-24 left-4' :
          overlay.position === 'top-center' ? 'top-24 left-1/2 -translate-x-1/2' :
          overlay.position === 'top-right' ? 'top-24 right-4' :
          overlay.position === 'bottom-left' ? 'bottom-32 left-4' :
          overlay.position === 'bottom-center' ? 'bottom-32 left-1/2 -translate-x-1/2' :
          'bottom-32 right-20'
        }`}>
          {overlay.type === 'text' && <div className="bg-black/70 backdrop-blur-xl px-4 py-2 rounded-xl text-white">{overlay.content}</div>}
          {overlay.type === 'product' && (
            <a href={overlay.link} target="_blank" rel="noopener noreferrer" className="block bg-black/80 backdrop-blur-xl rounded-xl p-3 border border-pink-500/30">
              <p className="text-white font-medium text-sm">{overlay.productName}</p>
              <p className="text-emerald-400 font-bold">{overlay.productPrice}</p>
            </a>
          )}
          {overlay.type === 'cta' && (
            <a href={overlay.link} target="_blank" rel="noopener noreferrer" className="block bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 rounded-xl text-white font-bold text-sm">
              {overlay.content}
            </a>
          )}
        </div>
      ))}

      {/* ── Admin alerts ── */}
      <AlertNotifications streamId={streamId} isAdmin={user?.role === 'admin'} />

      {/* ── Expanded leaderboard ── */}
      <AnimatePresence>
        {showExpandedLeaderboard && (
          <ExpandedGiftLeaderboard streamId={streamId} onClose={() => setShowExpandedLeaderboard(false)} />
        )}
      </AnimatePresence>

      {/* ── Co-Stream panel ── */}
      <AnimatePresence>
        {showCoStreamPanel && (
          <CoStreamPanel streamId={streamId} hostCreator={creator} currentUser={user} isHost={isBroadcaster} onClose={() => setShowCoStreamPanel(false)} />
        )}
      </AnimatePresence>

      {/* ── Multi-Stream ── */}
      <AnimatePresence>
        {showMultiStream && isBroadcaster && (
          <MultiStreamManager isLive={stream?.status === 'live'} onClose={() => setShowMultiStream(false)} />
        )}
      </AnimatePresence>

      {/* ── Overlay Editor ── */}
      <AnimatePresence>
        {showOverlayEditor && isBroadcaster && (
          <StreamOverlayEditor overlays={streamOverlays} onUpdate={setStreamOverlays} onClose={() => setShowOverlayEditor(false)} />
        )}
      </AnimatePresence>

      {/* ── Gift Panel ── */}
      <AnimatePresence>
        {showGiftPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowGiftPanel(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50">
              <GiftPanel gifts={gifts} walletBalance={walletBalance}
                onSendGift={(gift, quantity) => sendGiftMutation.mutate({ gift, quantity })}
                onClose={() => setShowGiftPanel(false)} />
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}