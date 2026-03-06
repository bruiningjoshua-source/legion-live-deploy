import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Radio, X, Shield, Sparkles, Users } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
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

  // ─── Viewer: update viewer count on join/leave ───
  useEffect(() => {
    if (!stream?.id || isBroadcaster || !user) return;
    base44.entities.Stream.update(stream.id, {
      viewer_count: (stream.viewer_count || 0) + 1,
      peak_viewers: Math.max(stream.peak_viewers || 0, (stream.viewer_count || 0) + 1)
    }).catch(() => {});
    return () => {
      base44.entities.Stream.update(stream.id, {
        viewer_count: Math.max(0, (stream.viewer_count || 1) - 1)
      }).catch(() => {});
    };
  }, [stream?.id, isBroadcaster, user?.email]);

  // ─── Chat sync ─────────────────────────
  useEffect(() => {
    if (initialMessages?.length) setChatMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!streamId) return;
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.stream_id === streamId && event.type === 'create') {
        setChatMessages(prev => {
          // Deduplicate: skip if already exists (from optimistic add or subscription)
          if (prev.some(m => m.id === event.data.id)) return prev;
          // Remove matching optimistic message if it exists
          const filtered = prev.filter(m => !(
            m.id?.startsWith('optimistic-') &&
            m.sender_email === event.data.sender_email &&
            m.message === event.data.message
          ));
          // Cap buffer at 200 messages to prevent memory leak
          const next = [...filtered, event.data];
          return next.length > 200 ? next.slice(-200) : next;
        });
      }
    });
    return unsubscribe;
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

  // ─── Mutations ────────────────────────
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      if (!user) throw new Error('Please sign in to chat');
      if (stream?.status !== 'live' && !isBroadcaster) throw new Error('Stream has ended');
      const messageContent = typeof messageData === 'string' ? messageData : messageData.message;
      if (!messageContent?.trim()) throw new Error('Empty message');
      try {
        const modResult = await base44.functions.invoke('aiModerateContent', {
          content_type: 'chat_message', content: messageContent,
          stream_id: streamId, user_email: user.email, user_name: user.full_name || 'Anonymous'
        });
        if (!modResult.data?.approved) throw new Error(modResult.data?.reason || 'Message blocked');
      } catch (modError) {
        if (modError.message?.includes('blocked') || modError.message?.includes('banned')) throw modError;
      }
      return base44.entities.ChatMessage.create({
        stream_id: streamId, sender_email: user.email,
        sender_name: user.full_name || 'Anonymous', message: messageContent,
        message_type: messageData.message_type || 'text', vip_level: wallet?.vip_level || 0,
        mentions: messageData.mentions || [], reply_to_id: messageData.reply_to_id || null,
        reply_to_content: messageData.reply_to_content || null, reply_to_sender: messageData.reply_to_sender || null
      });
    },
    onMutate: (messageData) => {
      // Optimistic: immediately show the message in the chat
      const messageContent = typeof messageData === 'string' ? messageData : messageData.message;
      const optimisticMsg = {
        id: `optimistic-${Date.now()}`,
        stream_id: streamId,
        sender_email: user.email,
        sender_name: user.full_name || 'Anonymous',
        message: messageContent,
        message_type: messageData.message_type || 'text',
        vip_level: wallet?.vip_level || 0,
        created_date: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, optimisticMsg]);
    },
    onError: (error) => alert(error.message || 'Unable to send message.')
  });

  const sendGiftMutation = useMutation({
    mutationFn: async ({ gift, quantity }) => {
      if (!user || !wallet) throw new Error('Please sign in to send gifts');
      if (!creatorCanReceiveGifts) throw new Error('Creator has not enabled monetization');
      if (stream?.status !== 'live') throw new Error('Stream has ended');
      const totalCost = (gift.cost_denarii || 0) * quantity;
      if (totalCost > (wallet.denarii_balance || 0)) throw new Error('Insufficient balance.');
      if (quantity < 1 || quantity > 100) throw new Error('Invalid quantity');

      await base44.entities.GiftTransaction.create({
        sender_email: user.email, receiver_creator_id: creator.id, stream_id: streamId,
        gift_id: gift.id, gift_name: gift.name, quantity, total_as_value: totalCost,
        is_pk_gift: stream.stream_type === 'pk_battle'
      });
      await base44.entities.Wallet.update(wallet.id, { denarii_balance: (wallet.denarii_balance || 0) - totalCost });

      const creatorEarning = Math.floor(totalCost * 0.50);
      await base44.entities.Creator.update(creator.id, { total_earnings_denarii: (creator.total_earnings_denarii || 0) + creatorEarning });

      try {
        const existing = await base44.entities.BroadcasterEarnings.filter({ creator_id: creator.id }, null, 1);
        if (existing[0]) {
          await base44.entities.BroadcasterEarnings.update(existing[0].id, {
            session_earnings_denarii: (existing[0].session_earnings_denarii || 0) + creatorEarning,
            session_gifts_count: (existing[0].session_gifts_count || 0) + quantity,
            total_earnings_denarii: (existing[0].total_earnings_denarii || 0) + creatorEarning,
            total_gifts_received: (existing[0].total_gifts_received || 0) + quantity,
            last_gift_at: new Date().toISOString()
          });
        } else {
          await base44.entities.BroadcasterEarnings.create({
            creator_id: creator.id, user_email: creator.user_email, stream_id: streamId,
            session_earnings_denarii: creatorEarning, session_gifts_count: quantity,
            total_earnings_denarii: creatorEarning, total_gifts_received: quantity,
            session_start_time: new Date().toISOString(), last_gift_at: new Date().toISOString()
          });
        }
      } catch (e) { console.error('BroadcasterEarnings update failed:', e); }

      await base44.entities.ChatMessage.create({
        stream_id: streamId, sender_email: user.email, sender_name: user.full_name || 'Anonymous',
        message: `sent ${quantity > 1 ? quantity + 'x ' : ''}${gift.name}`, message_type: 'gift',
        vip_level: wallet?.vip_level || 0, gift_data: { gift_name: gift.name, gift_icon: gift.icon, quantity }
      });
      await base44.entities.Stream.update(stream.id, {
        total_gifts_received: (stream.total_gifts_received || 0) + quantity,
        total_denarii_earned: (stream.total_denarii_earned || 0) + Math.floor(totalCost * 0.50)
      });
      return { gift, quantity };
    },
    onMutate: async ({ gift, quantity }) => {
      // Optimistic wallet deduction
      const totalCost = (gift.cost_denarii || 0) * quantity;
      await queryClient.cancelQueries({ queryKey: ['wallet', user?.email] });
      const prevWallet = queryClient.getQueryData(['wallet', user?.email]);
      if (prevWallet) {
        queryClient.setQueryData(['wallet', user?.email], {
          ...prevWallet,
          denarii_balance: (prevWallet.denarii_balance || 0) - totalCost
        });
      }
      setShowGiftPanel(false);
      setGiftAnimation({ gift, sender: user.full_name || 'Anonymous', quantity });
      return { prevWallet };
    },
    onError: (error, _vars, context) => {
      // Rollback wallet on failure
      if (context?.prevWallet) {
        queryClient.setQueryData(['wallet', user?.email], context.prevWallet);
      }
      alert(error.message || 'Gift failed.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    }
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in');
      if (isFollowing) {
        const follows = await base44.entities.Follow.filter({ follower_email: user.email, following_creator_id: creator.id }, null, 1);
        if (follows[0]) await base44.entities.Follow.delete(follows[0].id);
      } else {
        await base44.entities.Follow.create({ follower_email: user.email, following_creator_id: creator.id });
      }
    },
    onMutate: async () => {
      // Optimistic update — toggle follow state instantly
      await queryClient.cancelQueries({ queryKey: ['follow-status', user?.email, creator?.id] });
      const prev = queryClient.getQueryData(['follow-status', user?.email, creator?.id]);
      queryClient.setQueryData(['follow-status', user?.email, creator?.id], !isFollowing);
      // Optimistic follower count
      if (creator) {
        queryClient.setQueryData(['creator', creator.id], old => old ? {
          ...old,
          follower_count: (old.follower_count || 0) + (isFollowing ? -1 : 1)
        } : old);
      }
      return { prev };
    },
    onError: (error, _vars, context) => {
      // Rollback on failure
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['follow-status', user?.email, creator?.id], context.prev);
      }
      if (error.message?.includes('sign in')) base44.auth.redirectToLogin();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status'] });
      queryClient.invalidateQueries({ queryKey: ['creator', creator?.id] });
    }
  });

  const endStreamMutation = useMutation({
    mutationFn: async () => {
      if (user?.email !== creator?.user_email) throw new Error('Unauthorized');

      const durationMin = Math.floor((Date.now() - new Date(stream.created_date).getTime()) / 60000);

      // 1. End the stream record
      await base44.entities.Stream.update(stream.id, {
        status: 'ended',
        duration_minutes: durationMin,
        viewer_count: 0
      });

      // 2. Reset creator live status
      await base44.entities.Creator.update(creator.id, { is_live: false, current_stream_id: null });

      // 3. Finalize PK battle
      if (stream.stream_type === 'pk_battle' && pkBattle) {
        const hostWon = (pkBattle.host_score || 0) > (pkBattle.opponent_score || 0);
        await base44.entities.PKBattle.update(pkBattle.id, {
          status: 'completed',
          ended_at: new Date().toISOString(),
          winner_creator_id: hostWon ? pkBattle.host_creator_id : pkBattle.opponent_creator_id
        });
        // Update W/L records
        if (hostWon) {
          await base44.entities.Creator.update(pkBattle.host_creator_id, { pk_wins: (creator.pk_wins || 0) + 1 });
        } else {
          await base44.entities.Creator.update(pkBattle.host_creator_id, { pk_losses: (creator.pk_losses || 0) + 1 });
        }
      }

      // 4. Finalize broadcaster earnings for this session
      try {
        const earnings = await base44.entities.BroadcasterEarnings.filter({ creator_id: creator.id, stream_id: stream.id }, null, 1);
        if (earnings[0]) {
          await base44.entities.BroadcasterEarnings.update(earnings[0].id, {
            session_end_time: new Date().toISOString(),
            session_duration_minutes: durationMin,
            session_peak_viewers: stream.peak_viewers || 0
          });
        }
      } catch (e) { console.error('[EndStream] Earnings finalize error:', e); }

      // 5. Stop local media tracks
      if (liveStream && typeof liveStream !== 'boolean') {
        liveStream.getTracks().forEach(t => t.stop());
      }

      // 6. Leave Zego room
      try { await ZegoService.leave(); } catch (e) { console.warn('[EndStream] Zego leave error:', e); }

      // 7. Post system chat message
      try {
        await base44.entities.ChatMessage.create({
          stream_id: streamId, sender_email: 'system', sender_name: 'System',
          message: `${creator.display_name || 'The host'} ended the stream. Thanks for watching!`,
          message_type: 'system'
        });
      } catch (e) {}
    },
    onSuccess: () => { navigate(createPageUrl('Profile')); },
    onError: (error) => alert(error.message || 'Failed to end stream')
  });

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
              recentChatters={chatMessages.reduce((acc, msg) => {
                if (!acc.find(u => u.sender_email === msg.sender_email)) {
                  acc.push({ sender_email: msg.sender_email, sender_name: msg.sender_name });
                }
                return acc;
              }, [])}
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
            recentChatters={chatMessages.reduce((acc, msg) => {
              if (!acc.find(u => u.sender_email === msg.sender_email)) acc.push({ sender_email: msg.sender_email, sender_name: msg.sender_name });
              return acc;
            }, [])}
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