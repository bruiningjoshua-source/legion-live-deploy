import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Radio, X, Shield, Sparkles, Users, ScreenShare, Gift } from 'lucide-react';
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
import BroadcasterWallet from '@/components/stream/BroadcasterWallet';
import ViewerWallet from '@/components/stream/ViewerWallet';
import BroadcasterTopBar from '@/components/stream/BroadcasterTopBar';
import BroadcastControlPanel from '@/components/stream/BroadcastControlPanel';
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

  const creatorCanReceiveGifts = creatorSubscription?.status === 'active' || creatorSubscription?.admin_activated || (creator?.user_email === user?.email && user?.role === 'admin');
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
  }, [stream?.id, isHost, user?.email, stream?.status]);

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
  }, [stream?.status, streamId, isHost]);

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
  }, [stream?.status, isHost]);

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
    <div className="fixed inset-0 bg-black z-40 overflow-hidden">
      {/* FULL SCREEN VIDEO */}
      <video
        ref={videoRef}
        autoPlay playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/70 to-transparent z-10 pointer-events-none" />

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

      {/* ── TOP BAR ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}>

        {/* Left: back + creator info */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(createPageUrl('Home'))}
            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
          {creator && (
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur border border-white/10 rounded-full pl-1 pr-3 py-1">
              <img
                src={creator.avatar_url || '/default-avatar.png'}
                className="w-7 h-7 rounded-full object-cover border border-white/20"
                onError={e => e.target.src = '/default-avatar.png'}
              />
              <div>
                <p className="text-white text-xs font-bold leading-none">{creator.display_name || 'Creator'}</p>
                <p className="text-white/40 text-[9px] leading-none mt-0.5">{creator.follower_count || 0} followers</p>
              </div>
              {!isHost && (
                <button onClick={() => followMutation?.mutate()}
                  className={`ml-1 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all ${
                    isFollowing
                      ? 'bg-transparent border-white/20 text-white/50'
                      : 'bg-amber-500 border-amber-500 text-black'
                  }`}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: viewer count + live badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur border border-white/10 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-bold">LIVE</span>
            <span className="text-white/50 text-xs">·</span>
            <Users className="w-3 h-3 text-white/60" />
            <span className="text-white/80 text-xs">{stream?.viewer_count || 0}</span>
          </div>
          {isHost && (
            <button onClick={() => setShowEndDialog(true)}
              className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <X className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* ── GIFT LEADERBOARD (top right below top bar) ── */}
      <div className="absolute z-20 right-3"
        style={{ top: 'calc(max(14px, env(safe-area-inset-top)) + 52px)' }}>
        <GiftLeaderboard streamId={streamId} onExpand={() => setShowExpandedLeaderboard(true)} />
      </div>

      {/* ── STREAM TITLE (left side, below creator bar) ── */}
      <div className="absolute z-20 left-3"
        style={{ top: 'calc(max(14px, env(safe-area-inset-top)) + 52px)' }}>
        {stream?.title && (
          <div className="max-w-[180px]">
            <p className="text-white text-xs font-semibold leading-tight line-clamp-2 drop-shadow">{stream.title}</p>
            {stream.category && (
              <span className="text-amber-400 text-[9px] font-medium uppercase tracking-wider">{stream.category}</span>
            )}
          </div>
        )}
      </div>

      {/* ── TIP GOAL BAR ── */}
      {stream?.tip_goal_amount > 0 && (
        <div className="absolute z-20 left-3 right-3"
          style={{ top: 'calc(max(14px, env(safe-area-inset-top)) + 110px)' }}>
          <div className="bg-black/40 backdrop-blur border border-white/10 rounded-xl px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/60 text-[10px]">{stream.tip_goal_label || 'Tip Goal'}</span>
              <span className="text-amber-400 text-[10px] font-bold">
                ${(stream.tip_goal_current || 0).toFixed(0)} / ${stream.tip_goal_amount}
              </span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, ((stream.tip_goal_current || 0) / stream.tip_goal_amount) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── AI LIVE SUMMARY ── */}
      {stream?.ai_summary && !isHost && (
        <div className="absolute z-20 left-3 right-14"
          style={{ bottom: 'calc(max(20px, env(safe-area-inset-bottom)) + 200px)' }}>
          <div className="bg-black/40 backdrop-blur border border-white/10 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/40 text-[9px] uppercase tracking-wider">Live Summary</span>
            </div>
            <p className="text-white/70 text-[11px] leading-snug">{stream.ai_summary}</p>
          </div>
        </div>
      )}

      {/* ── BULLET CHAT ── */}
      <div className="absolute z-20 left-3 right-16"
        style={{ bottom: 'calc(max(20px, env(safe-area-inset-bottom)) + 80px)' }}>
        <BulletChat messages={chatMessages} maxMessages={8} />
      </div>

      {/* ── RIGHT SIDE ACTION BUTTONS ── */}
      <div className="absolute right-3 z-20 flex flex-col items-center gap-3"
        style={{ bottom: 'calc(max(20px, env(safe-area-inset-bottom)) + 80px)' }}>

        {/* Gift button */}
        {!isHost && (
          <button onClick={() => setShowGiftPanel(true)}
            className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/60 text-[9px]">Gift</span>
          </button>
        )}

        {/* Share button */}
        <button onClick={() => {
          navigator.share?.({ title: stream?.title, url: window.location.href })
            .catch(() => navigator.clipboard?.writeText(window.location.href));
          toast.success('Link copied!');
        }}
          className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <span className="text-white/60 text-[9px]">Share</span>
        </button>

        {/* Moderator tools for host */}
        {isHost && (
          <button onClick={() => setShowModerationPanel(!showModerationPanel)}
            className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white/70" />
            </div>
            <span className="text-white/60 text-[9px]">Mod</span>
          </button>
        )}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-3 flex items-center gap-2"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>

        {/* Wallet balance */}
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur border border-white/10 rounded-full px-3 py-2">
          <span className="text-amber-400 text-xs font-bold">◆</span>
          <span className="text-white text-xs font-semibold">{walletBalance.toLocaleString()}</span>
        </div>

        {/* Chat input */}
        <button
          onClick={() => {
            const msg = prompt('Say something...');
            if (msg?.trim()) {
              base44.entities.ChatMessage.create({
                stream_id: streamId,
                sender_email: user?.email,
                sender_name: user?.full_name || 'Viewer',
                message: msg.trim(),
                message_type: 'text'
              }).catch(() => {});
            }
          }}
          className="flex-1 bg-black/40 backdrop-blur border border-white/10 rounded-full px-4 py-2 text-white/40 text-xs text-left"
        >
          Say something...
        </button>

        {/* Gift shortcut */}
        {!isHost && (
          <button onClick={() => setShowGiftPanel(true)}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
            <span className="text-lg">🎁</span>
          </button>
        )}
      </div>

      {/* ── OVERLAYS ── */}
      <AnimatePresence>
        {showGiftPanel && (
          <GiftPanel
            gifts={gifts}
            walletBalance={walletBalance}
            streamId={streamId}
            creatorId={creator?.id}
            onClose={() => setShowGiftPanel(false)}
            onGiftSent={(gift) => {
              setGiftAnimation(gift);
              setTimeout(() => setGiftAnimation(null), 3000);
            }}
          />
        )}
      </AnimatePresence>

      {giftAnimation && <GiftAnimation gift={giftAnimation} />}

      {showEndDialog && (
        <EndStreamDialog
          onConfirm={() => endStream()}
          onCancel={() => setShowEndDialog(false)}
        />
      )}

      {showExpandedLeaderboard && (
        <ExpandedGiftLeaderboard
          streamId={streamId}
          onClose={() => setShowExpandedLeaderboard(false)}
        />
      )}

      {showModerationPanel && (
        <ModerationPanel
          streamId={streamId}
          creatorEmail={creator?.user_email}
          onClose={() => setShowModerationPanel(false)}
        />
      )}
    </div>
  );
}