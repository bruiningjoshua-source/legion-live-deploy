import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Radio, X, Shield, Sparkles, Users } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useCurrentUser, useStream, useCreator, useWallet, useGifts,
  useChatMessages, useFollowStatus, useCreatorSubscription,
  useStreamPKBattle, useSendGift, useToggleFollow, useEndStream,
} from '@/components/hooks/useStreamData';
import ChatService from '@/components/services/ChatService';

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
import BroadcasterWallet from '@/components/stream/BroadcasterWallet';
import ViewerWallet from '@/components/stream/ViewerWallet';
import BroadcasterTopBar from '@/components/stream/BroadcasterTopBar';
import BroadcastControlPanel from '@/components/stream/BroadcastControlPanel';
import EndStreamDialog from '@/components/stream/EndStreamDialog';
import ModerationPanel from '@/components/stream/ModerationPanel';
import CoStreamPanel from '@/components/stream/CoStreamPanel';

export default function WatchStream() {
  const urlParams = new URLSearchParams(window.location.search);
  const streamId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Core state
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

  // Lock body scroll
  useEffect(() => {
    document.body.classList.add('fullscreen-lock');
    return () => document.body.classList.remove('fullscreen-lock');
  }, []);

  // Data queries
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
  const streamEnded = stream?.status === 'ended';

  // Warn broadcaster on tab close
  useEffect(() => {
    if (!isBroadcaster || !stream?.id) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = 'You are live!'; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isBroadcaster, stream?.id]);

  // Viewer count — atomic join/leave via backend function (prevents race conditions)
  const viewerJoinedRef = useRef(false);
  const streamIdRef = useRef(null);
  useEffect(() => {
    if (!stream?.id || isBroadcaster || !user || stream.status !== 'live') return;
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

  // Chat sync — only seed from initial fetch, don't overwrite live messages
  const chatSeeded = useRef(false);
  useEffect(() => {
    if (initialMessages?.length && !chatSeeded.current) {
      setChatMessages(initialMessages);
      chatSeeded.current = true;
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!streamId) return;
    return ChatService.subscribe(streamId, (msg) => {
      setChatMessages(prev => ChatService.addToBuffer(prev, msg));
    });
  }, [streamId]);

  // Zego viewer init
  const zegoInitAttempted = useRef(false);
  useEffect(() => {
    let mounted = true;
    if (stream?.status !== 'live' || isBroadcaster || !streamId) return;
    if (zegoInitAttempted.current) return;
    zegoInitAttempted.current = true;

    const init = async () => {
      const viewerId = user?.email?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32) || `viewer_${Date.now()}`;
      const res = await base44.functions.invoke('generateZegoToken', { roomId: streamId, userId: viewerId, role: 'audience' });
      if (!mounted) return;
      const { appId, token } = res.data || {};
      if (!appId || !token) { setLiveStream(true); return; }
      await ZegoService.initialize(appId);
      if (!mounted) return;
      await ZegoService.loginRoom(streamId, viewerId, user?.full_name || 'Viewer', token);
      if (!mounted) return;
      ZegoService.onRoomEvent((event) => {
        if (event.type === 'roomState' && event.state === 'DISCONNECTED') {
          // Host ended or connection lost — refetch stream to get ended state
          queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
        }
        if (event.type === 'streamUpdate' && event.updateType === 'DELETE') {
          // All remote streams removed — stream is ending
          queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
          ZegoService.leave().catch(() => {});
        }
      });
      // Wait for remote stream list to populate, then retry once more
      setTimeout(() => { if (mounted) ZegoService.getRemoteStreams(); }, 1500);
      setTimeout(() => { if (mounted) ZegoService.getRemoteStreams(); }, 4000);
      if (mounted) setLiveStream(true);
    };
    init().catch(error => {
      console.error('[WatchStream] Join failed:', error);
      if (mounted) setLiveStream(true);
    });
    return () => {
      mounted = false;
      zegoInitAttempted.current = false;
      ZegoService.leave().catch(() => {});
      document.body.classList.remove('fullscreen-lock');
    };
  }, [stream?.status, streamId, isBroadcaster]);

  // Broadcaster camera
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (stream?.status !== 'live' || !isBroadcaster) return;
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        if (!mounted) { media.getTracks().forEach(t => t.stop()); return; }
        liveStreamRef.current = media;
        setLiveStream(media);
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.play().catch(() => {});
        }
      } catch (error) {
        console.error('Camera error:', error);
      }
    };
    init();
    return () => {
      mounted = false;
      if (liveStreamRef.current && typeof liveStreamRef.current !== 'boolean') {
        liveStreamRef.current.getTracks().forEach(t => t.stop());
        liveStreamRef.current = null;
      }
    };
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
      // Stop any remaining media
      if (liveStreamRef.current && typeof liveStreamRef.current !== 'boolean') {
        liveStreamRef.current.getTracks().forEach(t => t.stop());
        liveStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      navigate(createPageUrl('Profile'));
    }
  });

  // Reactions
  const handleDoubleTap = useCallback(() => {
    const emojis = ['❤️', '🔥', '💜', '✨', '🌟'];
    setFloatingReactions(prev => [...prev.slice(-15), { id: Date.now() + Math.random(), emoji: emojis[Math.floor(Math.random() * emojis.length)] }]);
    if (!isFollowing) followMutation.mutate();
  }, [isFollowing]);

  useEffect(() => {
    const iv = setInterval(() => setFloatingReactions(prev => prev.filter(r => Date.now() - r.id < 3500)), 1000);
    return () => clearInterval(iv);
  }, []);

  // Loading
  if (streamLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Cleanup fullscreen lock on ended/not-found
  useEffect(() => {
    if (!stream || streamEnded) {
      document.body.classList.remove('fullscreen-lock');
    }
  }, [stream, streamEnded]);

  // Ended / Not found
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
            <div className="flex items-center justify-center gap-5 text-white/40 text-sm mb-6">
              {stream.duration_minutes > 0 && <div className="text-center"><p className="text-white font-bold text-lg">{stream.duration_minutes}m</p><p className="text-[11px]">Duration</p></div>}
              {stream.peak_viewers > 0 && <div className="text-center"><p className="text-white font-bold text-lg">{stream.peak_viewers}</p><p className="text-[11px]">Peak Viewers</p></div>}
              {stream.total_gifts_received > 0 && <div className="text-center"><p className="text-white font-bold text-lg">{stream.total_gifts_received}</p><p className="text-[11px]">Gifts</p></div>}
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

  // ── RENDER ──
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

      {/* Video Layer */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        <div className="relative w-full h-full" style={{ maxWidth: 'calc(100vh * 9 / 16)' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay playsInline muted
            poster={stream.thumbnail_url}
            controls={false}
            style={isBroadcaster ? { transform: 'scaleX(-1)' } : undefined}
            onDoubleClick={handleDoubleTap}
          />

          {/* Multi-panel */}
          {stream.stream_type === 'multi_panel' && (
            <div className="absolute inset-0 z-10">
              <DiscordStylePanel
                hostStream={stream} hostCreator={creator} currentUser={user}
                panelParticipants={[]}
                onLeaveCall={() => navigate(createPageUrl('Explore'))}
                isHost={isBroadcaster} maxParticipants={8}
              />
            </div>
          )}

          {/* PK Battle */}
          {stream.stream_type === 'pk_battle' && (
            <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
              <PKBattleOverlay
                streamId={streamId}
                hostCreator={creator}
                opponentCreator={opponentCreator}
                initialBattle={pkBattle}
                isBroadcaster={isBroadcaster}
              />
            </div>
          )}
        </div>

        {/* Loading */}
        {!liveStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-5">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/50 text-sm">Connecting...</p>
            </div>
          </div>
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />

      {/* Floating reactions */}
      <FloatingHearts reactions={floatingReactions} />

      {/* ── VIEWER UI ── */}
      {!isBroadcaster && (
        <>
          <ViewerTopBar
            creator={creator} stream={stream}
            isFollowing={isFollowing}
            onFollowClick={() => followMutation.mutate()}
            onClose={() => navigate(createPageUrl('Home'))}
            viewerCount={stream.viewer_count || 0}
          />

          {wallet && (
            <div className="absolute top-3 right-3 z-30">
              <ViewerWallet denariiBalance={wallet.denarii_balance || 0} userEmail={user?.email} />
            </div>
          )}

          <StreamActionBar
            onGiftClick={() => {
              if (!creatorCanReceiveGifts) { toast.error('Creator has not enabled monetization.'); return; }
              setShowGiftPanel(true);
            }}
            onLikeClick={handleDoubleTap}
            onShareClick={() => {
              const url = window.location.href;
              if (navigator.share) navigator.share({ title: stream.title, url });
              else navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
            }}
            onChatToggle={() => setShowChat(!showChat)}
            isLiked={isFollowing}
            likeCount={creator?.follower_count || 0}
            giftDisabled={!creatorCanReceiveGifts}
            showChat={showChat}
          />

          <div className="absolute top-16 right-3 z-20 w-44" onClick={() => setShowExpandedLeaderboard(true)}>
            <GiftLeaderboard streamId={streamId} compact />
          </div>

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

      {/* ── BROADCASTER UI ── */}
      {isBroadcaster && (
        <>
          <button
            onClick={() => setShowEndDialog(true)}
            className="absolute top-3 left-3 z-30 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute top-3 left-14 z-30">
            <BroadcasterTopBar
              stream={stream} viewerCount={stream.viewer_count || 0}
              onUpdateStream={async (updates) => {
                await base44.entities.Stream.update(stream.id, updates);
                queryClient.invalidateQueries(['stream', streamId]);
              }}
            />
          </div>

          {/* Creator tools */}
          <div className="absolute top-16 left-3 z-20 flex gap-1.5 flex-wrap" style={{ maxWidth: '240px' }}>
            <button onClick={() => setShowCoStreamPanel(true)}
              className="w-9 h-9 bg-black/50 backdrop-blur-md border border-white/15 rounded-full flex items-center justify-center text-white/70 hover:text-white">
              <Users className="w-4 h-4" />
            </button>
            <button onClick={() => setShowModerationPanel(true)}
              className="w-9 h-9 bg-black/50 backdrop-blur-md border border-white/15 rounded-full flex items-center justify-center text-white/70 hover:text-white">
              <Shield className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute top-16 right-3 z-20">
            <BroadcasterWallet
              totalEarnings={creator?.total_earnings_denarii || 0}
              sessionEarnings={stream?.total_denarii_earned || 0}
              giftsReceived={stream?.total_gifts_received || 0}
              creatorId={creator?.id}
            />
          </div>

          <BroadcastControlPanel
            stream={stream}
            streamStats={{
              viewers: stream?.viewer_count || 0,
              duration: stream?.created_date
                ? `${Math.floor((Date.now() - new Date(stream.created_date).getTime()) / 60000)}:${String(Math.floor(((Date.now() - new Date(stream.created_date).getTime()) % 60000) / 1000)).padStart(2, '0')}`
                : '0:00',
              bitrate: 0
            }}
            onToggleMic={(on) => {
              if (liveStream && typeof liveStream !== 'boolean') liveStream.getAudioTracks().forEach(t => t.enabled = on);
            }}
            onToggleCamera={(on) => {
              if (liveStream && typeof liveStream !== 'boolean') liveStream.getVideoTracks().forEach(t => t.enabled = on);
            }}
            onToggleScreenShare={async (on) => {
              if (on) {
                try {
                  const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
                  if (videoRef.current) videoRef.current.srcObject = screen;
                } catch {}
              } else if (liveStream && typeof liveStream !== 'boolean' && videoRef.current) {
                videoRef.current.srcObject = liveStream;
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

          <BulletChat
            messages={chatMessages}
            onSendMessage={(msg) => sendMessageMutation.mutate(msg)}
            currentUser={user} isAuthenticated={!!user}
            disabled={sendMessageMutation.isPending} isHost={true}
            recentChatters={ChatService.getRecentChatters(chatMessages)}
          />

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
        {showExpandedLeaderboard && <ExpandedGiftLeaderboard streamId={streamId} onClose={() => setShowExpandedLeaderboard(false)} />}
      </AnimatePresence>

      {/* Co-Stream panel */}
      <AnimatePresence>
        {showCoStreamPanel && <CoStreamPanel streamId={streamId} hostCreator={creator} currentUser={user} isHost={isBroadcaster} onClose={() => setShowCoStreamPanel(false)} />}
      </AnimatePresence>

      {/* Gift Panel */}
      <AnimatePresence>
        {showGiftPanel && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowGiftPanel(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50">
              <GiftPanel gifts={gifts} walletBalance={walletBalance}
                onSendGift={(gift, qty) => sendGift({ gift, quantity: qty })}
                onClose={() => setShowGiftPanel(false)} />
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}