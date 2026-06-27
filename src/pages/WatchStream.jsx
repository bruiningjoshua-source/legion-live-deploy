import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Radio } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useCurrentUser, useStream, useCreator, useWallet, useGifts,
  useChatMessages, useFollowStatus, useCreatorSubscription,
  useStreamPKBattle, useSendGift, useToggleFollow, useEndStream,
} from '@/components/hooks/useStreamData';
import ChatService from '@/components/services/ChatService';

import BulletChat from '@/components/stream/BulletChat';
import GiftPanel from '@/components/gifts/GiftPanel';
import GiftAnimation from '@/components/gifts/GiftAnimation';
import GiftStreakOverlay from '@/components/stream/GiftStreakOverlay';
import SpinWheel from '@/components/stream/SpinWheel';
import StreamLottery from '@/components/stream/StreamLottery';
import ViewerChallenge from '@/components/stream/ViewerChallenge';
import HostGoalBar from '@/components/stream/HostGoalBar';
import GiftLeaderboard from '@/components/stream/GiftLeaderboard';
import ExpandedGiftLeaderboard from '@/components/stream/ExpandedGiftLeaderboard';
import PKBattleOverlay from '@/components/pk/PKBattleOverlay';
import BigoMultiPanel from '@/components/stream/BigoMultiPanel';
import ZegoService from '@/components/stream/ZegoService';
import EndStreamDialog from '@/components/stream/EndStreamDialog';
import ModerationPanel from '@/components/stream/ModerationPanel';
import ChannelPointsPanel from '@/components/stream/ChannelPointsPanel';
import EntranceEffect from '@/components/stream/EntranceEffect';
import HostLiveControls from '@/components/stream/HostLiveControls';
import { ViewerAuctionWidget } from '@/components/affiliate/LiveAuctionEngine';
import BigoStreamTopBar from '@/components/stream/BigoStreamTopBar';
import BigoStreamBottomBar from '@/components/stream/BigoStreamBottomBar';
import RoomToolsSheet from '@/components/stream/RoomToolsSheet';
import HostProfileSheet from '@/components/stream/HostProfileSheet';
import WishlistSheet from '@/components/stream/WishlistSheet';
import FilterMenuPanel from '@/components/ar/FilterMenuPanel';

export default function WatchStream() {
  const urlParams = new URLSearchParams(window.location.search);
  const streamId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [giftAnimation, setGiftAnimation] = useState(null);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showLottery, setShowLottery] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [recentGifts, setRecentGifts] = useState([]);
  const [liveStream, setLiveStream] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [showCoStreamPanel, setShowCoStreamPanel] = useState(false);
  const [showChannelPoints, setShowChannelPoints] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [showQuality, setShowQuality] = useState(false);
  const [entranceViewer, setEntranceViewer] = useState(null);
  const [showHostControls, setShowHostControls] = useState(false);
  const [showRoomTools, setShowRoomTools] = useState(false);
  const [showHostProfile, setShowHostProfile] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showMagicPanel, setShowMagicPanel] = useState(false);

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
  const toggleFollowMutation = useToggleFollow(user?.email, creator?.id);
  const endStreamMutation = useEndStream(streamId, creator?.id, navigate);

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
      if (msg.message_type === 'system' && (msg.total_gifted_to_creator || 0) >= 100) {
        setEntranceViewer({
          name:         msg.sender_name,
          avatar_url:   msg.avatar_url,
          total_gifted: msg.total_gifted_to_creator || 0,
        });
      }
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
        if (event.type === 'remoteStreamAdded') {
          const { remoteStream } = event;
          if (!mounted) return;
          liveStreamRef.current = remoteStream;
          setLiveStream(remoteStream);
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            videoRef.current.muted = false;
            videoRef.current.playsInline = true;
            videoRef.current.play().catch(() => {});
          }
        }
        if (event.type === 'remoteStreamRemoved') {
          if (videoRef.current) videoRef.current.srcObject = null;
          setLiveStream(null);
        }
        if (event.type === 'roomState' && event.state === 'DISCONNECTED') {
          queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
        }
        if (event.type === 'streamUpdate' && event.updateType === 'DELETE') {
          queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
          ZegoService.leave().catch(() => {});
        }
      });
      // Pull any streams already in the room (host started before viewer joined)
      if (mounted) await ZegoService.getRemoteStreams();
    };
    init().catch(err => { console.error('[WatchStream] Join failed:', err); });
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
    setRecentGifts(g => [{...gift, sender_email: user?.email, sender_name: user?.full_name, quantity, created_at: new Date().toISOString()}, ...g].slice(0,20));
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

      {entranceViewer && (
        <EntranceEffect
          viewer={entranceViewer}
          onDone={() => setEntranceViewer(null)}
        />
      )}

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10 pointer-events-none" />

      {/* ── BIGO TOP BAR ── */}
      <BigoStreamTopBar
        creator={creator}
        stream={stream}
        user={user}
        isHost={isHost}
        isFollowing={isFollowing}
        onFollowClick={() => followMutation?.mutate()}
        onClose={() => isHost ? setShowEndDialog(true) : navigate(createPageUrl('Home'))}
        viewerCount={stream?.viewer_count || 0}
        onAvatarClick={() => setShowHostProfile(true)}
      />

      {/* ── GIFT LEADERBOARD (below top bar, left side) ── */}
      <div className="absolute z-20 left-3 flex items-center gap-2"
        style={{ top: 'calc(max(12px, env(safe-area-inset-top)) + 72px)' }}>
        {/* Wishlist supporters - small avatars */}
        <button onClick={() => setShowWishlist(true)} className="flex items-center">
          <div className="flex -space-x-1">
            {[0,1].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border border-black bg-white/10 flex items-center justify-center overflow-hidden">
                <span className="text-[9px] opacity-40">?</span>
              </div>
            ))}
          </div>
          <span className="text-white/30 text-[9px] ml-1">0/10</span>
        </button>
      </div>

      {/* ── GIFT STREAK OVERLAY ── */}
      <GiftStreakOverlay recentGifts={recentGifts} leaderboard={[]} />

      {/* ── GIFT LEADERBOARD (top right below row 2) ── */}
      <div className="absolute z-20 right-3"
        style={{ top: 'calc(max(12px, env(safe-area-inset-top)) + 72px)' }}>
        <GiftLeaderboard streamId={streamId} onExpand={() => setShowExpandedLeaderboard(true)} />
      </div>

      {/* ── TIP GOAL BAR ── */}
      {stream?.tip_goal_amount > 0 && (
        <div className="absolute z-20 left-3 right-3"
          style={{ top: 'calc(max(12px, env(safe-area-inset-top)) + 110px)' }}>
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

      {/* ── BULLET CHAT ── */}
      <div className="absolute z-20 left-0 right-16"
        style={{ bottom: 'calc(max(8px, env(safe-area-inset-bottom)) + 56px)' }}>
        <BulletChat messages={chatMessages} maxMessages={10} />
      </div>

      {/* ── BIGO BOTTOM BAR ── */}
      <BigoStreamBottomBar
        isHost={isHost}
        onSendMessage={() => {
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
        onEmojiClick={(emoji) => {
          setFloatingReactions(prev => [...prev.slice(-15), { id: Date.now() + Math.random(), emoji }]);
        }}
        onMenuClick={() => setShowRoomTools(true)}
        onGiftClick={() => setShowGiftPanel(true)}
        onLottoClick={() => setShowChannelPoints(v => !v)}
      />

      {/* ── OVERLAYS ── */}
      <AnimatePresence>
        {showGiftPanel && (
          <div className="fixed bottom-0 left-0 right-0 z-[90]">
            <GiftPanel
              gifts={gifts}
              walletBalance={walletBalance}
              streamId={streamId}
              creatorId={creator?.id}
              onClose={() => setShowGiftPanel(false)}
              onSendGift={(gift, qty) => {
                setShowGiftPanel(false);
                setGiftAnimation({ gift, sender: user?.full_name || 'Anonymous', quantity: qty });
                _sendGift.mutate({ gift, quantity: qty });
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {stream?.stream_type === 'pk_battle' && pkBattle && (
        <PKBattleOverlay
          streamId={streamId}
          hostCreator={creator}
          opponentCreator={opponentCreator}
          initialBattle={pkBattle}
          isBroadcaster={isHost}
        />
      )}

      {stream?.stream_type === 'multi_panel' && (
        <BigoMultiPanel
          streamId={streamId}
          isHost={isHost}
          hostCreator={creator}
        />
      )}

      {stream?.platform_type === 'affiliate_marketplace' && !isHost && (
        <ViewerAuctionWidget streamId={streamId} user={user} />
      )}

      {giftAnimation && <GiftAnimation gift={giftAnimation} />}
      {showSpinWheel  && <SpinWheel    streamId={streamId} isHost={false} onClose={()=>setShowSpinWheel(false)} />}
      {showLottery    && <StreamLottery streamId={streamId} isHost={false} onClose={()=>setShowLottery(false)} />}
      {showChallenge  && <ViewerChallenge streamId={streamId} isHost={false} onClose={()=>setShowChallenge(false)} />}

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

      {showChannelPoints && (
        <ChannelPointsPanel
          creatorId={creator?.id}
          user={user}
          streamId={streamId}
          onClose={() => setShowChannelPoints(false)}
        />
      )}

      {showHostControls && isHost && (
        <HostLiveControls
          stream={stream}
          streamId={streamId}
          viewerCount={stream?.viewer_count || 0}
          onClose={() => setShowHostControls(false)}
        />
      )}

      {/* ── BIGO PANELS ── */}
      <AnimatePresence>
        {showRoomTools && (
          <RoomToolsSheet
            onClose={() => setShowRoomTools(false)}
            onAction={(action) => {
              if (action === 'quality') setShowQuality(v => !v);
              if (action === 'magic') { setShowRoomTools(false); setShowMagicPanel(true); }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHostProfile && (
          <HostProfileSheet
            creator={creator}
            isFollowing={isFollowing}
            onFollowClick={() => followMutation?.mutate()}
            onClose={() => setShowHostProfile(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMagicPanel && (
          <FilterMenuPanel onClose={() => setShowMagicPanel(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWishlist && (
          <WishlistSheet
            creator={creator}
            gifts={gifts}
            onClose={() => setShowWishlist(false)}
            onSendGift={(gift) => {
              setShowWishlist(false);
              setShowGiftPanel(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}