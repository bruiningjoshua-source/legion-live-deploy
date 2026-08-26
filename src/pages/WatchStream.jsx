import { useMiniPlayer, enterPictureInPicture } from '@/components/stream/MiniPlayerContext';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase/supabaseCore';
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
import GiftVideoOverlay from '@/components/gifts/GiftVideoOverlay';
import GiftStreakOverlay from '@/components/stream/GiftStreakOverlay';
import SpinWheel from '@/components/stream/SpinWheel';
import StreamLottery from '@/components/stream/StreamLottery';
import ViewerChallenge from '@/components/stream/ViewerChallenge';
import GiftLeaderboard from '@/components/stream/GiftLeaderboard';
import ExpandedGiftLeaderboard from '@/components/stream/ExpandedGiftLeaderboard';
import PKBattleOverlay from '@/components/pk/PKBattleOverlay';
import BigoMultiPanel from '@/components/stream/BigoMultiPanel';
import AudioLiveStage from '@/components/stream/AudioLiveStage';
import WaitingLounge from '@/components/stream/WaitingLounge';
import ZegoService from '@/components/stream/ZegoService';
import EndStreamDialog from '@/components/stream/EndStreamDialog';
import ModerationPanel from '@/components/stream/ModerationPanel';
import StreamBannerLayer from '@/components/stream/StreamBannerLayer';
import ChannelPointsPanel from '@/components/stream/ChannelPointsPanel';
import EntranceEffect from '@/components/stream/EntranceEffect';
import HostLiveControls from '@/components/stream/HostLiveControls';
import { ViewerAuctionWidget } from '@/components/affiliate/LiveAuctionEngine';
import BigoStreamTopBar from '@/components/stream/BigoStreamTopBar';
import ViewerListSheet from '@/components/stream/ViewerListSheet';
import BigoStreamBottomBar from '@/components/stream/BigoStreamBottomBar';
import RoomToolsSheet from '@/components/stream/RoomToolsSheet';
import HostProfileSheet from '@/components/stream/HostProfileSheet';
import WishlistSheet from '@/components/stream/WishlistSheet';
import LegionAREngine from '@/components/stream/LegionAREngine';

export default function WatchStream() {
  const urlParams = new URLSearchParams(window.location.search);
  const streamId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { minimize } = useMiniPlayer();

  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [giftAnimation, setGiftAnimation] = useState(null);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showLottery, setShowLottery] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [recentGifts, setRecentGifts] = useState([]);
  const lotteryGiftCallbackRef = useRef(null);
  const [liveStream, setLiveStream] = useState(null);
  const [ppvLocked, setPpvLocked] = useState(false);   // gated behind a PPV ticket
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [liveViewers, setLiveViewers] = useState([]);
  const [chatMutedAll, setChatMutedAll] = useState(false);
  const [streamMods, setStreamMods] = useState([]);

  // Load the appointed moderators for this stream (and keep them fresh via realtime).
  useEffect(() => {
    if (!streamId) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from('stream_moderators')
        .select('moderator_email')
        .eq('stream_id', streamId)
        .eq('is_active', true);
      if (active && data) {
        setStreamMods(data.map(m => ({ email: m.moderator_email, display_name: m.moderator_email.split('@')[0] })));
      }
    };
    load();
    const chan = supabase
      .channel(`mods_${streamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_moderators', filter: `stream_id=eq.${streamId}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(chan); };
  }, [streamId]);

  // Enforce moderation: listen for guest-state changes affecting THIS user
  // (kick/ban forces them out; mute/cam-down applies to their published tracks).
  // NOTE: defined after `user` is declared (see below) to avoid a TDZ crash.

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
  const [magicInitialTab, setMagicInitialTab] = useState('filters');

  const videoRef = useRef(null);
  const streamContainerRef = useRef(null);
  const liveStreamRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('fullscreen-lock');
    return () => document.body.classList.remove('fullscreen-lock');
  }, []);

  // ── Presence: who is actually watching (for the viewer list, not just count) ──
  const [presenceViewers, setPresenceViewers] = useState([]);
  const [showViewerList, setShowViewerList] = useState(false);
  useEffect(() => {
    if (!streamId) return;
    const chan = supabase.channel(`presence_${streamId}`, {
      config: { presence: { key: user?.email || `anon_${Date.now()}` } },
    });
    chan
      .on('presence', { event: 'sync' }, () => {
        const state = chan.presenceState();
        const list = Object.values(state).flat().map((p) => ({
          email: p.email, display_name: p.display_name, avatar_url: p.avatar_url,
        }));
        setPresenceViewers(list);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await chan.track({
            email: user?.email || null,
            display_name: user?.full_name || 'Viewer',
            avatar_url: user?.avatar_url || null,
          });
        }
      });
    return () => { supabase.removeChannel(chan); };
  }, [streamId, user?.email]);

  const [boosting, setBoosting] = useState(false);
  const boostStream = useCallback(async () => {
    if (!streamId) return;
    setBoosting(true);
    try {
      const res = await base44.functions.invoke('boostStream', { streamId });
      const payload = res?.data ?? res ?? {};
      if (payload.error) throw new Error(payload.error);
      toast.success('🚀 Stream boosted for 20 minutes!');
      queryClient.invalidateQueries({ queryKey: ["stream", streamId] });
    } catch (e) {
      toast.error(e.message || 'Could not boost');
    } finally {
      setBoosting(false);
    }
  }, [streamId, queryClient]);

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
  // (follow mutation is defined below as followMutation with correct object params)

  // Gifts are only accepted by monetized creators (Stripe payouts enabled),
  // an active subscription, or admin. Mirrors the server-side sendGift gate so
  // the UI never offers a gift the backend will reject. Free creators get tips only.
  const creatorCanReceiveGifts =
    creator?.payouts_enabled === true ||
    creatorSubscription?.status === 'active' ||
    creatorSubscription?.admin_activated ||
    (creator?.user_email === user?.email && user?.role === 'admin');
  const isHost = user?.email === creator?.user_email;
  const isModerator = !isHost && streamMods.some(m => m.email === user?.email);
  const canModerate = isHost || isModerator;

  // ── Multi-guest panel: seats + join requests, real data + realtime sync ──
  const [panelSeats, setPanelSeats] = useState([]);     // stream_panel_seats rows
  const [panelSeatCount, setPanelSeatCount] = useState(6);
  useEffect(() => {
    if (!streamId || !['multi_panel','audio_live'].includes(stream?.stream_type)) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from('stream_panel_seats').select('*').eq('stream_id', streamId);
      if (active && data) setPanelSeats(data);
    };
    load();
    const chan = supabase
      .channel(`panel_seats_${streamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_panel_seats', filter: `stream_id=eq.${streamId}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(chan); };
  }, [streamId, stream?.stream_type]);

  const seatStates = React.useMemo(() => {
    const map = {};
    panelSeats.forEach(s => { map[s.seat_index] = s; });
    return map;
  }, [panelSeats]);
  const panelParticipants = React.useMemo(() => {
    return panelSeats
      .filter(s => s.occupant_email)
      .sort((a, b) => a.seat_index - b.seat_index)
      .map(s => ({ email: s.occupant_email, display_name: s.occupant_name }));
  }, [panelSeats]);

  const [joinRequests, setJoinRequests] = useState([]);   // pending stream_join_requests

  // ── Guest publishing: if THIS viewer occupies a panel seat, they publish
  // their own camera/mic into the room (previously guests never published at
  // all — the panel only ever showed identity, never real video). ──
  const [myGuestCameraOn, setMyGuestCameraOn] = useState(true);
  const [roomJoined, setRoomJoined] = useState(false); // set once loginRoom succeeds
  const guestPublishingRef = useRef(false);
  const myOccupiedSeat = React.useMemo(
    () => panelSeats.find(s => s.occupant_email && user?.email && s.occupant_email.toLowerCase() === user.email.toLowerCase()),
    [panelSeats, user?.email]
  );

  useEffect(() => {
    // Wait for the viewer-join effect's loginRoom to actually complete first —
    // calling startPublishing before that would race Zego's connection state.
    if (!myOccupiedSeat || !streamId || !user?.email || isHost || !roomJoined) return;
    let cancelled = false;
    (async () => {
      try {
        const guestUserId = `guest_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}`.substring(0, 60);
        const res = await base44.functions.invoke('generateZegoToken', { roomId: streamId, userId: guestUserId, role: 'cohost' });
        const payload = res?.data ?? res ?? {};
        if (payload.code === 'PPV_TICKET_REQUIRED' || cancelled) return;
        const { appId, token, serverUrl } = payload;
        if (!appId || !token) return;
        // ZegoService is already initialized/logged in as this viewer from the
        // main join effect above; just add publishing on top of the existing
        // room connection rather than logging in twice.
        await ZegoService.createLocalStream({});
        const publishId = `${streamId}_${guestUserId}`;
        await ZegoService.startPublishing(publishId);
        if (!cancelled) {
          guestPublishingRef.current = true;
          toast.success("🎥 You're live on the panel!");
        }
      } catch (e) {
        console.warn('[guest-publish] failed:', e?.message);
      }
    })();
    return () => {
      cancelled = true;
      if (guestPublishingRef.current) {
        ZegoService.stopPublishing?.();
        guestPublishingRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myOccupiedSeat?.id, streamId, user?.email, isHost, roomJoined]);

  const toggleMyGuestCamera = useCallback(async () => {
    const next = !myGuestCameraOn;
    setMyGuestCameraOn(next);
    try { await ZegoService.toggleCamera?.(next); } catch (_) {}
  }, [myGuestCameraOn]);

  // ── Track every guest's remote video stream so the panel can render it ──
  const [guestRemoteStreams, setGuestRemoteStreams] = useState({}); // { seatIndex: MediaStream }
  useEffect(() => {
    if (!panelSeats.length) return;
    const unsub = ZegoService.onRoomEvent((event) => {
      if (event.type !== 'streamUpdate') return;
      setGuestRemoteStreams(prev => {
        const next = { ...prev };
        for (const s of event.streamList || []) {
          const seat = panelSeats.find(ps => s.streamID?.includes(ps.occupant_email?.replace(/[^a-zA-Z0-9]/g, '_')));
          if (!seat) continue;
          if (event.updateType === 'ADD') {
            next[seat.seat_index] = ZegoService.remoteStreams?.get(s.streamID) || null;
          } else if (event.updateType === 'DELETE') {
            delete next[seat.seat_index];
          }
        }
        return next;
      });
    });
    return unsub;
  }, [panelSeats]);

  useEffect(() => {
    if (!streamId || !isHost || !['multi_panel','audio_live'].includes(stream?.stream_type)) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from('stream_join_requests')
        .select('*').eq('stream_id', streamId).eq('status', 'pending').order('created_at', { ascending: true });
      if (active && data) setJoinRequests(data);
    };
    load();
    const chan = supabase
      .channel(`join_requests_${streamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_join_requests', filter: `stream_id=eq.${streamId}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(chan); };
  }, [streamId, isHost, stream?.stream_type]);

  const callPanelSeat = useCallback(async (action, extra = {}) => {
    try {
      const res = await base44.functions.invoke('streamPanelSeat', { streamId, action, ...extra });
      const payload = res?.data ?? res ?? {};
      if (payload.error) throw new Error(payload.error);
      // Requesting a seat has no other visible feedback (the seat doesn't
      // change until the host accepts) — confirm the tap actually registered.
      if (action === 'request' && payload.requested) {
        toast.success('Request sent — waiting for the host');
      }
      return payload;
    } catch (e) {
      toast.error(e.message || 'Action failed');
      return null;
    }
  }, [streamId]);

  const shareStream = useCallback(async () => {
    const url = `${window.location.origin}${createPageUrl('WatchStream')}?id=${streamId}`;
    try {
      if (navigator.share) await navigator.share({ title: stream?.title || 'Legion Live', url });
      else { await navigator.clipboard.writeText(url); toast.success('Stream link copied'); }
    } catch { /* user cancelled */ }
  }, [streamId, stream?.title]);

  // Enforce moderation on THIS user (kick/ban forces out; mute/cam applies).
  useEffect(() => {
    if (!streamId || !user?.email) return;
    const chan = supabase
      .channel(`modstate_${streamId}_${user.email}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'stream_guest_states',
        filter: `stream_id=eq.${streamId}`,
      }, (payload) => {
        const row = payload.new;
        if (!row || row.guest_email !== user.email) return;
        if (row.is_kicked) {
          toast.error('You were removed from this stream by a moderator.');
          ZegoService.leave().catch(() => {});
          setTimeout(() => navigate(createPageUrl('Home')), 1500);
          return;
        }
        if (typeof ZegoService.setLocalAudioMuted === 'function') ZegoService.setLocalAudioMuted(!!row.is_muted);
        if (typeof ZegoService.setLocalVideoMuted === 'function') ZegoService.setLocalVideoMuted(!!row.cam_off);
        if (row.is_muted) toast('A moderator muted your mic', { icon: '🔇' });
        if (row.cam_off) toast('A moderator turned off your camera', { icon: '📷' });
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [streamId, user?.email, navigate]);

  // Send a moderation action to the backend (host + appointed mods only).
  const moderate = useCallback(async (action, targetEmail, value) => {
    if (!targetEmail) return;
    try {
      const res = await base44.functions.invoke('streamModerate', { streamId, action, targetEmail, value });
      if (res.data?.error) throw new Error(res.data.error);
      const verb = { kick: 'Kicked', ban: 'Banned', mute: 'Muted', cam_off: 'Camera off for', drop_to_chat: 'Dropped to chat', appoint_mod: 'Appointed', remove_mod: 'Removed mod', set_volume: 'Volume set for' }[action] || 'Updated';
      toast.success(`${verb} ${targetEmail.split('@')[0]}`);
    } catch (err) {
      toast.error(`Action failed: ${err.message}`);
    }
  }, [streamId]);
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
    if (!stream?.id || isHost || !user || stream?.status !== 'live') return;
    if (viewerJoinedRef.current && streamIdRef.current === stream?.id) return;
    const sid = stream?.id;
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

  // Realtime stream updates — viewer count AND status (so the lounge -> live
  // transition, or ending, reaches viewers without a refresh).
  useEffect(() => {
    if (!streamId) return;
    return base44.entities.Stream.subscribe((event) => {
      if (event.id === streamId && event.type === 'update') {
        queryClient.setQueryData(['stream', streamId], (old) => old ? {
          ...old,
          viewer_count: event.data.viewer_count ?? old.viewer_count,
          peak_viewers: event.data.peak_viewers ?? old.peak_viewers,
          status: event.data.status ?? old.status,
          lounge_message: event.data.lounge_message ?? old.lounge_message,
          lounge_background_url: event.data.lounge_background_url ?? old.lounge_background_url,
        } : old);
      }
    });
  }, [streamId, queryClient]);

  // Zego viewer
  const zegoInitAttempted = useRef(false);
  useEffect(() => {
    let mounted = true;
    // Wait until creator loads before deciding viewer vs host
    // Without this, zegoInitAttempted locks in viewer mode before isHost resolves
    if (stream?.status !== 'live' || !streamId) return;
    if (creator === undefined) return; // still loading — wait
    if (isHost) return; // Host has own Zego session from GoLive page
    if (zegoInitAttempted.current) return;
    zegoInitAttempted.current = true;
    const init = async () => {
      const viewerId = user?.email?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32) || `viewer_${Date.now()}`;
      let res;
      try {
        res = await base44.functions.invoke('generateZegoToken', { roomId: streamId, userId: viewerId, role: 'audience' });
      } catch (err) {
        // Server refused a token — most importantly the PPV gate (403).
        if (/ticket required|PPV_TICKET_REQUIRED/i.test(err?.message || '')) {
          if (mounted) setPpvLocked(true);
          return;
        }
        throw err;
      }
      if (!mounted) return;
      const payload = res.data || {};
      if (payload.code === 'PPV_TICKET_REQUIRED') { setPpvLocked(true); return; }
      const { appId, token, serverUrl } = payload;
      if (!appId || !token) { setLiveStream(true); return; }
      await ZegoService.initialize(appId, serverUrl);
      if (!mounted) return;
      await ZegoService.loginRoom(streamId, viewerId, user?.full_name || 'Viewer', token);
      if (!mounted) return;
      setRoomJoined(true); // guest-publish effect waits on this — avoids
      // calling startPublishing before loginRoom has actually completed.
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
        if (event.type === 'userUpdate' && Array.isArray(event.userList)) {
          setLiveViewers(prev => {
            const map = new Map(prev.map(v => [v.email, v]));
            if (event.updateType === 'ADD') {
              event.userList.forEach(u => {
                const email = u.userID || u.userId;
                if (email && email !== user?.email) map.set(email, { email, display_name: u.userName || email.split('@')[0] });
              });
            } else if (event.updateType === 'DELETE') {
              event.userList.forEach(u => map.delete(u.userID || u.userId));
            }
            return Array.from(map.values());
          });
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
  }, [stream?.status, streamId, isHost, creator?.id]);

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
    // Trigger lottery entry if send_gift lottery is active
    if (lotteryGiftCallbackRef.current) lotteryGiftCallbackRef.current();
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

  // Lotto deduct helper — server-authoritative debit
  const handleLottoDeduct = useCallback(async (amount) => {
    const { error } = await base44.rpc('debit_denarii', {
      p_amount: amount, p_reason: 'lotto_entry', p_related: streamId || null,
    });
    if (error) throw new Error(error.message || 'Debit failed');
    queryClient.invalidateQueries({ queryKey: ['wallet', user?.email] });
  }, [streamId, queryClient, user?.email]);

  if (streamLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // PPV paywall — the stream exists and is visible (title, host, cover), but the
  // player is locked until a ticket is purchased. The server also refuses to
  // issue a stream token without one, so this cannot be bypassed client-side.
  if (ppvLocked) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          {creator?.avatar_url && (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 mx-auto mb-4">
              <img src={creator.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            </div>
          )}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
            style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.4)' }}>
            <span className="text-amber-400 text-[11px] font-bold tracking-wide">PAY-PER-VIEW EVENT</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{stream?.title || 'Ticketed Event'}</h1>
          <p className="text-white/50 text-sm mb-1">
            {creator?.display_name ? `Hosted by ${creator.display_name}` : ''}
          </p>
          <p className="text-white/40 text-sm mb-6">
            This event requires a ticket. Buy one to watch live.
          </p>
          <Button
            onClick={() => navigate(createPageUrl('PPVEvents'))}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold h-12 rounded-xl">
            Get a Ticket
          </Button>
          <button onClick={() => navigate(createPageUrl('Home'))}
            className="mt-3 text-white/40 text-sm">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Streamer generated OBS credentials but Zego hasn't confirmed a real video
  // feed yet — show the lounge (chat + customizable message) instead of dead
  // air or an error screen.
  if (stream?.status === 'scheduled') {
    return (
      <WaitingLounge
        stream={stream}
        creator={creator}
        isHost={isHost}
        chatSlot={
          <div className="w-full px-3 pb-24">
            <BulletChat messages={chatMessages} maxMessages={10} />
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
                    message_type: 'text',
                  });
                }
              }}
              onGiftClick={() => {}}
              onMenuClick={() => {}}
            />
          </div>
        }
      />
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
  // Final guard - never render live UI without a valid stream object
  if (!stream) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading stream...</p>
        </div>
      </div>
    );
  }

  const isAudioOnly = stream?.stream_type === 'audio_live';

  return (
    <div ref={streamContainerRef} className="fixed inset-0 bg-black z-40 overflow-hidden">
      {/* Audio-only streams show NO video — a decorative host avatar + seat
          chairs instead, matching Bigo's Audio LIVE layout. The <video>
          element still mounts (hidden) so ZegoService's audio pipeline has
          somewhere to attach; only the visual differs. */}
      {isAudioOnly ? (
        <AudioLiveStage
          hostCreator={creator}
          isHost={isHost}
          seatParticipants={panelParticipants}
          seatStates={seatStates}
          seatCount={panelSeatCount}
          onRequestSeat={(seatIndex) => callPanelSeat('request', { seatIndex, targetName: user?.full_name })}
          onInviteToPanel={(seatIndex) => {
            const next = joinRequests[0];
            if (!next) { toast('No pending join requests'); return; }
            callPanelSeat('accept', { seatIndex, targetEmail: next.requester_email, targetName: next.requester_name });
          }}
        />
      ) : (
        <video
          ref={videoRef}
          autoPlay playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {isAudioOnly && <video ref={videoRef} autoPlay playsInline className="hidden" />}

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
        onBoost={boostStream}
        boosting={boosting}
        onViewerListClick={() => setShowViewerList(true)}
        viewerAvatars={presenceViewers.map(v => v.avatar_url).filter(Boolean)}
        onClose={() => isHost ? setShowEndDialog(true) : navigate(createPageUrl('Home'))}
        onShare={async () => {
          const url = `${window.location.origin}${createPageUrl('WatchStream')}?id=${streamId}`;
          try {
            if (navigator.share) await navigator.share({ title: stream?.title || 'Legion Live', url });
            else { await navigator.clipboard.writeText(url); toast.success('Stream link copied'); }
          } catch { /* user cancelled */ }
        }}
        onMinimize={() => {
          // Pop the stream into the floating mini-player and go home
          const ms = liveStreamRef.current || (videoRef.current && videoRef.current.srcObject);
          minimize({
            streamId,
            title: stream?.title,
            creatorName: creator?.display_name || creator?.username,
            mediaStream: ms,
          });
          navigate(createPageUrl('Home'));
        }}
        onPictureInPicture={() => enterPictureInPicture(videoRef.current)}
        viewerCount={stream?.viewer_count || 0}
        onAvatarClick={() => setShowHostProfile(true)}
      />

      {/* Custom host banners (tip/gift goals, links, text) — draggable/resizable */}
      <StreamBannerLayer
        streamId={streamId}
        creatorEmail={creator?.user_email}
        isHost={isHost}
        containerRef={streamContainerRef}
      />

      {/* ── HOST END STREAM + CONTROLS — top-right cluster, clear of leaderboard ── */}
      {isHost && (
        <div className="absolute z-30 right-3 flex items-center gap-2"
          style={{ top: 'calc(max(12px, env(safe-area-inset-top)) + 92px)' }}>
          <button
            onClick={() => setShowHostControls(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md active:scale-95 transition-transform"
            style={{ background: 'rgba(26,21,16,0.7)', border: '1px solid rgba(200,135,26,0.35)', color: '#e8dcc8' }}>
            <span style={{ fontSize: '11px' }}>⚙</span> Controls
          </button>
          <button
            onClick={() => setShowEndDialog(true)}
            aria-label="End stream"
            className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
            style={{ background: 'rgba(26,21,16,0.7)', border: '1px solid rgba(196,42,42,0.5)', color: '#ff9a9a' }}>
            <span style={{ fontSize: '13px' }}>✕</span>
          </button>
        </div>
      )}

      {/* Appointed moderators (not host) get a Moderate button */}
      {isModerator && (
        <div className="absolute z-30 right-3 flex items-center gap-2"
          style={{ top: 'calc(max(12px, env(safe-area-inset-top)) + 92px)' }}>
          <button
            onClick={() => setShowModerationPanel(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md active:scale-95 transition-transform"
            style={{ background: 'rgba(26,21,16,0.7)', border: '1px solid rgba(96,165,250,0.4)', color: '#bfdbfe' }}>
            <span style={{ fontSize: '11px' }}>🛡</span> Moderate
          </button>
        </div>
      )}

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
        giftingEnabled={true}
        onGiftClick={() => {
          if (creatorCanReceiveGifts) {
            setShowGiftPanel(true);
          } else {
            toast.info(`${creator?.display_name || 'This creator'} hasn't enabled gifts yet — they need to finish payout setup first.`);
          }
        }}
        onLottoClick={() => setShowChannelPoints(v => !v)}
        onPKClick={() => setShowChallenge(true)}
        onMissionClick={() => setShowSpinWheel(true)}
      />

      {/* ── OVERLAYS ── */}
      <AnimatePresence>
        {showGiftPanel && creatorCanReceiveGifts && (
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
          currentUser={user}
          panelParticipants={panelParticipants}
          seatStates={seatStates}
          seatCount={panelSeatCount}
          onChangeSeatCount={setPanelSeatCount}
          onShare={shareStream}
          onToggleSeatLock={(seatIndex, locked) => callPanelSeat(locked ? 'lock' : 'unlock', { seatIndex })}
          onRequestSeat={(seatIndex) => callPanelSeat('request', { seatIndex, targetName: user?.full_name })}
          onInviteToPanel={(seatIndex) => {
            // Host taps an empty seat: seat the oldest pending join request.
            const next = joinRequests[0];
            if (!next) { toast('No pending join requests'); return; }
            callPanelSeat('accept', { seatIndex, targetEmail: next.requester_email, targetName: next.requester_name });
          }}
          onKickParticipant={(participant, seatIndex) => callPanelSeat('remove_occupant', { seatIndex })}
          selfEmail={user?.email}
          hostMediaStream={isHost ? ZegoService.localStream : liveStream}
          hostCameraOn={isHost ? myGuestCameraOn : true}
          guestMediaStreams={guestRemoteStreams}
          onToggleOwnCamera={toggleMyGuestCamera}
        />
      )}

      {stream?.platform_type === 'affiliate_marketplace' && !isHost && (
        <ViewerAuctionWidget streamId={streamId} user={user} />
      )}

      {giftAnimation && <GiftVideoOverlay gift={giftAnimation.gift} sender={giftAnimation.sender} quantity={giftAnimation.quantity} onComplete={() => setGiftAnimation(null)} />}
      {showSpinWheel  && <SpinWheel    streamId={streamId} isHost={false} onClose={()=>setShowSpinWheel(false)} />}
      {showLottery    && <StreamLottery streamId={streamId} isHost={false} onClose={()=>setShowLottery(false)} onGiftSent={cb => { lotteryGiftCallbackRef.current = cb; }} />}
      {showChallenge  && <ViewerChallenge streamId={streamId} isHost={false} onClose={()=>setShowChallenge(false)} />}

      <ViewerListSheet
        open={showViewerList}
        onClose={() => setShowViewerList(false)}
        viewers={presenceViewers}
        hostEmail={creator?.user_email}
      />

      <EndStreamDialog
        isOpen={showEndDialog}
        onConfirm={() => endStream()}
        onCancel={() => setShowEndDialog(false)}
        isPending={_endStream.isPending}
      />

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
          isHost={isHost}
          currentUserIsMod={isModerator}
          viewers={liveViewers}
          moderators={streamMods}
          onClose={() => setShowModerationPanel(false)}
          onKickViewer={(v) => moderate('kick', v.email || v.user_email)}
          onMuteViewerAudio={(v) => moderate('mute', v.email || v.user_email)}
          onEndViewerCamera={(v) => moderate('cam_off', v.email || v.user_email)}
          onAppointModerator={(v) => moderate('appoint_mod', v.email || v.user_email)}
          onRemoveModerator={(v) => moderate('remove_mod', v.email || v.user_email)}
          onToggleChatMute={(muted) => setChatMutedAll(muted)}
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
              if (action === 'magic') { setShowRoomTools(false); setMagicInitialTab('filters'); setShowMagicPanel(true); }
              if (action === 'beauty') { setShowRoomTools(false); setMagicInitialTab('beauty'); setShowMagicPanel(true); }
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

      {/* Magic filters — host applies AR to their own published stream via the real engine */}
      {isHost && (
        <LegionAREngine
          videoRef={videoRef}
          isLive={stream?.status === 'live'}
          openPanel={showMagicPanel}
          initialTab={magicInitialTab}
          onPanelClose={() => setShowMagicPanel(false)}
          onProcessedStream={(processed) => {
            if (!processed) return;
            const track = processed.getVideoTracks()[0];
            if (track && typeof ZegoService.replaceTrack === 'function') {
              ZegoService.replaceTrack(track).catch(err =>
                console.warn('[LegionAR] replaceTrack:', err.message)
              );
            }
          }}
        />
      )}

      <AnimatePresence>
        {showWishlist && (
          <WishlistSheet
            creator={creator}
            gifts={gifts}
            onClose={() => setShowWishlist(false)}
            onSendGift={(gift) => {
              setShowWishlist(false);
              if (creatorCanReceiveGifts) setShowGiftPanel(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}