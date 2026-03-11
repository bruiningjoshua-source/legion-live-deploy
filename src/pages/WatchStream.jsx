import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Radio, X, Shield, Sparkles, Users } from 'lucide-react';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useCurrentUser, useStream, useCreator, useWallet, useGifts,
  useChatMessages, useFollowStatus, useCreatorSubscription,
  useStreamPKBattle, useSendGift, useToggleFollow, useEndStream,
} from '@/components/hooks/useStreamData';
import ChatService from '@/components/services/ChatService';
import { getVipTier } from '@/components/wallet/CurrencyPackages';

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
import BigoMultiPanel from '@/components/stream/BigoMultiPanel';
import BigoBottomBar from '@/components/stream/BigoBottomBar';
import ZegoService from '@/components/stream/ZegoService';
import HostWallet from '@/components/stream/HostWallet';
import ViewerWallet from '@/components/stream/ViewerWallet';
import HostTopBar from '@/components/stream/HostTopBar';
import LiveControlPanel from '@/components/stream/LiveControlPanel';
import EndStreamDialog from '@/components/stream/EndStreamDialog';
import ModerationPanel from '@/components/stream/ModerationPanel';
import CoStreamPanel from '@/components/stream/CoStreamPanel';
import ViewerLotto from '@/components/stream/ViewerLotto';

export default function WatchStream() {
  const urlParams = new URLSearchParams(window.location.search);
  const streamId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [giftAnimation, setGiftAnimation] = useState(null);
  const [liveStream, setLiveStream] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [showCoStreamPanel, setShowCoStreamPanel] = useState(false);

  const videoRef = useRef(null);
  const liveStreamRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('fullscreen-lock');
    return () => document.body.classList.remove('fullscreen-lock');
  }, []);

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
  const isHost = user?.email === creator?.user_email;
  const walletBalance = wallet?.denarii_balance || 0;
  const streamEnded = stream?.status === 'ended';
  const userVipPoints = wallet?.vip_points || 0;

  useEffect(() => {
    if (!stream || streamEnded) document.body.classList.remove('fullscreen-lock');
  }, [stream, streamEnded]);

  useEffect(() => {
    if (!isHost || !stream?.id) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = 'You are live!'; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isHost, stream?.id]);

  // Viewer count
  const viewerJoinedRef = useRef(false);
  const streamIdRef = useRef(null);
  useEffect(() => {
    if (!stream?.id || isHost || !user || stream.status !== 'live') return;
    if (viewerJoinedRef.current && streamIdRef.current === stream.id) return;
    const sid = stream.id;
    streamIdRef.current = sid;
    const join = async () => {
      await base44.functions.invoke('updateViewerCount', { streamId: sid, action: 'join' });
      viewerJoinedRef.current = true;
    };
    join().catch((e) => console.warn('[Viewer] Join failed:', e.message));
    return () => {
      if (viewerJoinedRef.current && streamIdRef.current === sid) {
        base44.functions.invoke('updateViewerCount', { streamId: sid, action: 'leave' }).catch(() => {});
        viewerJoinedRef.current = false;
        streamIdRef.current = null;
      }
    };
  }, [stream?.id, isBroadcaster, user?.email, stream?.status]);

  // Chat seed from initial fetch
  const chatSeeded = useRef(false);
  useEffect(() => {
    if (initialMessages?.length && !chatSeeded.current) {
      setChatMessages(initialMessages);
      chatSeeded.current = true;
    }
  }, [initialMessages]);

  // Realtime chat subscription (single source of truth — no polling)
  useEffect(() => {
    if (!streamId) return;
    return ChatService.subscribe(streamId, (msg) => {
      setChatMessages(prev => ChatService.addToBuffer(prev, msg));
    });
  }, [streamId]);

  // Realtime viewer count — subscribe to stream entity changes for live count
  useEffect(() => {
    if (!streamId) return;
    return base44.entities.Stream.subscribe((event) => {
      if (event.id === streamId && event.type === 'update' && event.data?.viewer_count !== undefined) {
        queryClient.setQueryData(['stream', streamId], (old) => 
          old ? { ...old, viewer_count: event.data.viewer_count, peak_viewers: event.data.peak_viewers ?? old.peak_viewers } : old
        );
      }
    });
  }, [streamId, queryClient]);

  // Zego viewer
  const zegoInitAttempted = useRef(false);
  useEffect(() => {
    let mounted = true;
    if (stream?.status !== 'live' || isHost || !streamId) return;
    if (zegoInitAttempted.current) return;
    zegoInitAttempted.current = true;
    const init = async () => {
      const viewerId = user?.email?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32) || `viewer_${Date.now()}`;
      const res = await base44.functions.invoke('generateZegoToken', { roomId: streamId, userId: viewerId, role: 'audience' });
      if (!mounted) return;
      const { appId, token, serverUrl } = res.data || {};
      if (!appId || !token) { setLiveStream(true); return; }
      await ZegoService.initialize(appId, serverUrl);
      if (!mounted) return;
      await ZegoService.loginRoom(streamId, viewerId, user?.full_name || 'Viewer', token);
      if (!mounted) return;
      ZegoService.onRoomEvent((event) => {
        if (event.type === 'roomState' && event.state === 'DISCONNECTED') {
          queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
        }
        if (event.type === 'streamUpdate' && event.updateType === 'DELETE') {
          queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
          ZegoService.leave().catch(() => {});
        }
      });
      setTimeout(() => { if (mounted) ZegoService.getRemoteStreams(); }, 1500);
      setTimeout(() => { if (mounted) ZegoService.getRemoteStreams(); }, 4000);
      if (mounted) setLiveStream(true);
    };
    init().catch(err => { console.error('[WatchStream] Join failed:', err); if (mounted) setLiveStream(true); });
    return () => {
      mounted = false;
      zegoInitAttempted.current = false;
      ZegoService.leave().catch(() => {});
      document.body.classList.remove('fullscreen-lock');
    };
  }, [stream?.status, streamId, isBroadcaster]);

  // Host camera
  useEffect(() => {
    if (stream?.status !== 'live' || !isHost) return;
    const zegoStream = ZegoService.getLocalStream();
    if (zegoStream) {
      liveStreamRef.current = zegoStream;
      setLiveStream(zegoStream);
      if (videoRef.current) {
        videoRef.current.srcObject = zegoStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.play().catch(() => {});
      }
    } else {
      const retryTimer = setInterval(() => {
        const s = ZegoService.getLocalStream();
        if (s) {
          clearInterval(retryTimer);
          liveStreamRef.current = s;
          setLiveStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            videoRef.current.play().catch(() => {});
          }
        }
      }, 500);
      return () => clearInterval(retryTimer);
    }
  }, [stream?.status, isBroadcaster]);

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: (data) => ChatService.sendMessage({ streamId, user, wallet, messageData: data }),
    onMutate: (data) => {
      const msg = ChatService.createOptimisticMessage({ streamId, user, messageData: data, wallet });
      setChatMessages(prev => [...prev, msg]);
    },
    onError: (err) => toast.error(err.message || 'Unable to send message.'),
  });

  const _sendGift = useSendGift({ user, wallet, creator, stream, creatorCanReceiveGifts });
  const sendGift = ({ gift, quantity }) => {
    setShowGiftPanel(false);
    setGiftAnimation({ gift, sender: user?.full_name || 'Anonymous', quantity });
    _sendGift.mutate({ gift, quantity });
  };

  const followMutation = useToggleFollow({ user, creator, isFollowing });
  const _endStream = useEndStream({ stream, creator, pkBattle, liveStream });
  const endStream = () => _endStream.mutate(null, {
    onSuccess: () => {
      if (liveStreamRef.current && typeof liveStreamRef.current !== 'boolean') {
        liveStreamRef.current.getTracks().forEach(t => t.stop());
        liveStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      navigate(createPageUrl('Profile'));
    }
  });

  const handleDoubleTap = useCallback(() => {
    const emojis = ['❤️', '🔥', '💜', '✨', '🌟'];
    setFloatingReactions(prev => [...prev.slice(-15), { id: Date.now() + Math.random(), emoji: emojis[Math.floor(Math.random() * emojis.length)] }]);
    if (!isFollowing) followMutation.mutate();
  }, [isFollowing]);

  useEffect(() => {
    const iv = setInterval(() => setFloatingReactions(prev => prev.filter(r => Date.now() - r.id < 3500)), 1000);
    return () => clearInterval(iv);
  }, []);

  // Lotto deduct helper
  const handleLottoDeduct = useCallback(async (amount) => {
    if (!wallet?.id) throw new Error('No wallet');
    await base44.entities.Wallet.update(wallet.id, {
      denarii_balance: Math.max(0, (wallet.denarii_balance || 0) - amount)
    });
    queryClient.invalidateQueries({ queryKey: ['wallet', user?.email] });
  }, [wallet, queryClient, user?.email]);

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
        <div className="text-center max-w-sm mx-auto px-6">
          {streamEnded && creator?.avatar_url ? (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 mx-auto mb-4">
              <img src={creator.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            </div>
          ) : (
            <Radio className="w-16 h-16 text-white/20 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold text-white mb-2">
            {streamEnded ? 'Stream Ended' : 'Stream Not Found'}
          </h1>
          <p className="text-white/40 text-sm mb-6">
            {streamEnded ? `${creator?.display_name || 'The host'} ended this broadcast.` : "This stream doesn't exist."}
          </p>
          {streamEnded && stream && (
            <div className="flex items-center justify-center gap-5 text-sm mb-6">
              {stream.duration_minutes > 0 && <div className="text-center"><p className="text-white font-bold text-lg">{stream.duration_minutes}m</p><p className="text-white/40 text-[11px]">Duration</p></div>}
              {stream.peak_viewers > 0 && <div className="text-center"><p className="text-white font-bold text-lg">{stream.peak_viewers}</p><p className="text-white/40 text-[11px]">Peak Viewers</p></div>}
              {stream.total_gifts_received > 0 && <div className="text-center"><p className="text-white font-bold text-lg">{stream.total_gifts_received}</p><p className="text-white/40 text-[11px]">Gifts</p></div>}
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <Link to={createPageUrl('Explore')}>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-6">Explore</Button>
            </Link>
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" className="text-white/60 hover:text-white rounded-full px-6">Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ width: '100vw', height: '100vh' }}>

      {/* Gift Animation */}
      <AnimatePresence>
        {giftAnimation && (
          <GiftAnimation
            gift={giftAnimation.gift} sender={giftAnimation.sender}
            quantity={giftAnimation.quantity} onComplete={() => setGiftAnimation(null)}
          />
        )}
      </AnimatePresence>

      {/* ── VIDEO LAYER ───────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-black">
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay playsInline muted
            poster={stream.thumbnail_url}
            controls={false}
            style={isBroadcaster ? { transform: 'scaleX(-1)' } : undefined}
            onDoubleClick={handleDoubleTap}
          />

          {stream.stream_type === 'multi_panel' && (
            <div className="absolute inset-0 z-10 flex flex-col">
              {/* BIGO-style top ~55% panel grid */}
              <div style={{ height: '55%' }}>
                <BigoMultiPanel
                  hostStream={stream}
                  hostCreator={creator}
                  currentUser={user}
                  panelParticipants={stream.panel_creators || []}
                  onInviteToPanel={() => setShowCoStreamPanel(true)}
                    onLeaveCall={() => navigate(createPageUrl('Explore'))}
                    isHost={isHost}
                  layout="grid"
                  maxParticipants={4}
                />
              </div>
              {/* Bottom ~45% is transparent for chat + action bar */}
              <div className="flex-1 pointer-events-none" />
            </div>
          )}

          {stream.stream_type === 'pk_battle' && (
            <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
              <ErrorBoundary label="pk-overlay" inline>
                <PKBattleOverlay
                  streamId={streamId} hostCreator={creator} opponentCreator={opponentCreator}
                  initialBattle={pkBattle} isHost={isHost}
                />
              </ErrorBoundary>
            </div>
          )}
        </div>

        {!liveStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-5">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/50 text-sm">Connecting to stream...</p>
            </div>
          </div>
        )}
      </div>

      {/* ── GRADIENT OVERLAYS ─────────────────────────────────────────── */}
      {/* Top gradient — for top bar readability */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/70 via-black/30 to-transparent z-10 pointer-events-none" />
      {/* Bottom gradient — for chat + action bar */}
      <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />

      {/* Floating reactions */}
      <FloatingHearts reactions={floatingReactions} />

      {/* ── VIEWER UI ─────────────────────────────────────────────────── */}
      {!isHost && (
        <>
          {/* Top bar */}
          <ViewerTopBar
            creator={creator} stream={stream}
            isFollowing={isFollowing}
            onFollowClick={() => followMutation.mutate()}
            onClose={() => navigate(createPageUrl('Home'))}
            viewerCount={stream.viewer_count || 0}
            userVipPoints={userVipPoints}
          />

          {/* Wallet — top right */}
          {wallet && (
            <div className="absolute top-3 right-14 z-30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
              <ViewerWallet denariiBalance={wallet.denarii_balance || 0} userEmail={user?.email} />
            </div>
          )}

          {/* Lotto widget — below top bar, left aligned */}
          <div className="absolute z-30" style={{ top: 'calc(env(safe-area-inset-top) + 90px)', left: '12px' }}>
            <ViewerLotto
              streamId={streamId}
              hostCreatorId={creator?.id}
              currentUser={user}
              walletBalance={walletBalance}
              isHost={false}
              vipPoints={userVipPoints}
              onDeductDenarii={handleLottoDeduct}
            />
          </div>

          {/* Gift leaderboard — top right below wallet */}
          <div
            className="absolute z-20 w-44"
            style={{ top: 'calc(env(safe-area-inset-top) + 56px)', right: '12px' }}
            onClick={() => setShowExpandedLeaderboard(true)}
          >
            <GiftLeaderboard streamId={streamId} compact />
          </div>

          {/* BIGO-style bottom action bar */}
          <BigoBottomBar
            onChatToggle={() => setShowChat(!showChat)}
            onEmojiClick={(em) => sendMessageMutation.mutate({ message: em, message_type: 'text' })}
            onMenuClick={() => setShowExpandedLeaderboard(true)}
            onGiftClick={() => {
              if (!creatorCanReceiveGifts) { toast.error('Creator has not enabled monetization.'); return; }
              setShowGiftPanel(true);
            }}
            onPKClick={() => toast.info('PK Battle — challenge a creator!')}
            onShopClick={() => navigate(createPageUrl('AffiliateHub'))}
            onInboxClick={() => setShowExpandedLeaderboard(true)}
            showChat={showChat}
            giftDisabled={!creatorCanReceiveGifts}
            hasPK={stream.stream_type === 'pk_battle'}
          />

          {/* Chat */}
          {showChat && (
            <ErrorBoundary label="viewer-chat" inline>
              <BulletChat
                messages={chatMessages}
                onSendMessage={(msg) => sendMessageMutation.mutate(msg)}
                currentUser={user}
                isAuthenticated={!!user}
                disabled={sendMessageMutation.isPending}
                isHost={false}
                recentChatters={ChatService.getRecentChatters(chatMessages)}
              />
            </ErrorBoundary>
          )}
        </>
      )}

      {/* ── BROADCASTER UI ────────────────────────────────────────────── */}
      {isHost && (
        <>
          {/* End stream button — top left */}
          <button
            onClick={() => setShowEndDialog(true)}
            className="absolute top-3 left-3 z-30 w-10 h-10 bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
            style={{ marginTop: 'env(safe-area-inset-top)' }}
          >
            <X className="w-5 h-5 text-red-400" />
          </button>

          {/* Top bar (title + thumbnail) */}
          <div className="absolute z-30" style={{ top: 'calc(env(safe-area-inset-top) + 12px)', left: '60px' }}>
            <HostTopBar
              stream={stream} viewerCount={stream.viewer_count || 0}
              onUpdateStream={async (updates) => {
                await base44.entities.Stream.update(stream.id, updates);
                queryClient.invalidateQueries(['stream', streamId]);
              }}
            />
          </div>

          {/* Broadcaster tool buttons — below top */}
          <div
            className="absolute z-30 flex flex-col gap-2"
            style={{ top: 'calc(env(safe-area-inset-top) + 70px)', left: '12px' }}
          >
            {/* Lotto launcher */}
            <ViewerLotto
              streamId={streamId}
              hostCreatorId={creator?.id}
              currentUser={user}
              walletBalance={walletBalance}
              isHost={true}
              vipPoints={userVipPoints}
              onDeductDenarii={handleLottoDeduct}
            />

            {/* Co-stream */}
            <button onClick={() => setShowCoStreamPanel(true)}
              className="w-9 h-9 bg-black/60 backdrop-blur-md border border-white/15 rounded-full flex items-center justify-center text-white/70 hover:text-white">
              <Users className="w-4 h-4" />
            </button>

            {/* Moderation */}
            <button onClick={() => setShowModerationPanel(true)}
              className="w-9 h-9 bg-black/60 backdrop-blur-md border border-white/15 rounded-full flex items-center justify-center text-white/70 hover:text-white">
              <Shield className="w-4 h-4" />
            </button>
          </div>

          {/* Host wallet — top right */}
          <div
            className="absolute z-30"
            style={{ top: 'calc(env(safe-area-inset-top) + 70px)', right: '12px' }}
          >
            <HostWallet
              totalEarnings={creator?.total_earnings_denarii || 0}
              sessionEarnings={stream?.total_denarii_earned || 0}
              giftsReceived={stream?.total_gifts_received || 0}
              creatorId={creator?.id}
            />
          </div>

          {/* Live control panel */}
          <LiveControlPanel
            stream={stream}
            streamStats={{
              viewers: stream?.viewer_count || 0,
              duration: stream?.created_date
                ? `${Math.floor((Date.now() - new Date(stream.created_date).getTime()) / 60000)}:${String(Math.floor(((Date.now() - new Date(stream.created_date).getTime()) % 60000) / 1000)).padStart(2, '0')}`
                : '0:00',
              bitrate: 0
            }}
            onToggleMic={(on) => ZegoService.toggleMic(on)}
            onToggleCamera={(on) => ZegoService.toggleCamera(on)}
            onToggleScreenShare={async (on) => {
              if (on) {
                try {
                  const screenStream = await ZegoService.startScreenShare(streamId);
                  if (videoRef.current && screenStream) videoRef.current.srcObject = screenStream;
                } catch (e) {
                  toast.error('Screen share failed. Please try again.');
                  console.warn('[ScreenShare] Failed:', e);
                }
              } else {
                await ZegoService.stopScreenShare().catch(() => {});
                const localStream = ZegoService.getLocalStream();
                if (videoRef.current && localStream) videoRef.current.srcObject = localStream;
              }
            }}
            onFlipCamera={() => {
              if (videoRef.current) {
                const current = videoRef.current.style.transform;
                videoRef.current.style.transform = current === 'scaleX(-1)' ? 'scaleX(1)' : 'scaleX(-1)';
              }
            }}
            onEndStream={() => setShowEndDialog(true)}
            onUpdateSettings={() => {}}
          />

          {/* Chat */}
          <ErrorBoundary label="broadcaster-chat" inline>
            <BulletChat
              messages={chatMessages}
              onSendMessage={(msg) => sendMessageMutation.mutate(msg)}
              currentUser={user} isAuthenticated={!!user}
              disabled={sendMessageMutation.isPending} isHost={true}
              recentChatters={ChatService.getRecentChatters(chatMessages)}
            />
          </ErrorBoundary>

          <EndStreamDialog isOpen={showEndDialog} onConfirm={endStream} onCancel={() => setShowEndDialog(false)} isPending={_endStream.isPending} />

          <ModerationPanel
            isOpen={showModerationPanel} onClose={() => setShowModerationPanel(false)}
            streamId={streamId} viewers={[]} moderators={[]} kickedUsers={[]}
            chatMuted={false} onToggleChatMute={() => {}}
            onAppointModerator={() => {}} onRemoveModerator={() => {}}
            onKickViewer={() => {}} onResetKicks={() => {}}
            onMuteViewerAudio={() => {}} onEndViewerCamera={() => {}} isHost={true}
          />
        </>
      )}

      {/* Alerts */}
      <AlertNotifications streamId={streamId} isAdmin={user?.role === 'admin'} />

      {/* Expanded leaderboard */}
      <AnimatePresence>
        {showExpandedLeaderboard && (
          <ExpandedGiftLeaderboard streamId={streamId} onClose={() => setShowExpandedLeaderboard(false)} />
        )}
      </AnimatePresence>

      {/* Co-stream panel */}
      <AnimatePresence>
        {showCoStreamPanel && (
          <CoStreamPanel streamId={streamId} hostCreator={creator} currentUser={user} isHost={isBroadcaster} onClose={() => setShowCoStreamPanel(false)} />
        )}
      </AnimatePresence>

      {/* Gift Panel — BigO style bottom sheet */}
      <AnimatePresence>
        {showGiftPanel && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowGiftPanel(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50">
              <GiftPanel
                gifts={gifts} walletBalance={walletBalance}
                onSendGift={(gift, qty) => sendGift({ gift, quantity: qty })}
                onClose={() => setShowGiftPanel(false)}
              />
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}