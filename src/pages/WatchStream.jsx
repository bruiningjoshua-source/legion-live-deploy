import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Heart, 
  Share2, 
  Users, 
  Eye, 
  Crown, 
  Gift, 
  MessageCircle,
  MoreVertical,
  Flag,
  Volume2,
  VolumeX,
  Maximize,
  Radio,
  Shield,
  StopCircle,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StreamChat from '@/components/stream/StreamChat';
import GiftPanel from '@/components/gifts/GiftPanel';
import GiftAnimation from '@/components/gifts/GiftAnimation';
import AlertNotifications from '@/components/moderation/AlertNotifications';
import PKBattleOverlay from '@/components/pk/PKBattleOverlay';
import ModerationDashboard from '@/components/moderation/ModerationDashboard';
import MultiPanelView from '@/components/stream/MultiPanelView';
import TipButton from '@/components/stream/TipButton';
import AgoraService from '@/components/stream/AgoraService';
import StreamQualityMonitor from '@/components/stream/StreamQualityMonitor';
import BroadcasterWallet from '@/components/stream/BroadcasterWallet';
import ViewerWallet from '@/components/stream/ViewerWallet';
import DirectTipButton from '@/components/stream/DirectTipButton';
import HostControls from '@/components/stream/HostControls';
import EndStreamDialog from '@/components/stream/EndStreamDialog';
import LiveChatOverlay from '@/components/stream/LiveChatOverlay';

import MultiPanelGrid from '@/components/stream/MultiPanelGrid';
import ModerationPanel from '@/components/stream/ModerationPanel';
import BroadcasterTopBar from '@/components/stream/BroadcasterTopBar';

export default function WatchStream() {
  const urlParams = new URLSearchParams(window.location.search);
  const streamId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [giftAnimation, setGiftAnimation] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamStats, setStreamStats] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const videoRef = React.useRef(null);
  const [liveStream, setLiveStream] = useState(null);
  const [showModeration, setShowModeration] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [customBackground, setCustomBackground] = useState(null);

  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [moderators, setModerators] = useState([]);
  const [kickedUsers, setKickedUsers] = useState([]);
  const [chatMuted, setChatMuted] = useState(false);
  const [panelParticipants, setPanelParticipants] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: stream, isLoading: streamLoading } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => base44.entities.Stream.filter({ id: streamId }, null, 1).then(r => r[0]),
    enabled: !!streamId
  });

  const { data: creator } = useQuery({
    queryKey: ['creator', stream?.creator_id],
    queryFn: () => base44.entities.Creator.filter({ id: stream.creator_id }, null, 1).then(r => r[0]),
    enabled: !!stream?.creator_id
  });

  const { data: opponentCreator } = useQuery({
    queryKey: ['opponent-creator', stream?.pk_opponent_id],
    queryFn: () => base44.entities.Creator.filter({ id: stream.pk_opponent_id }, null, 1).then(r => r[0]),
    enabled: !!stream?.pk_opponent_id
  });

  const { data: pkBattle } = useQuery({
    queryKey: ['pk-battle', streamId],
    queryFn: () => base44.entities.PKBattle.filter({ stream_id: streamId, status: 'active' }, '-created_date', 1).then(r => r[0]),
    enabled: stream?.stream_type === 'pk_battle'
  });

  const { data: gifts = [] } = useQuery({
    queryKey: ['gifts'],
    queryFn: () => base44.entities.Gift.filter({ is_active: true }, 'sort_order', 50)
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.email],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
      return wallets[0] || { denarii_balance: 0, as_balance: 0 };
    },
    enabled: !!user?.email
  });

  const [chatMessages, setChatMessages] = useState([]);

  useQuery({
    queryKey: ['chat-messages', streamId],
    queryFn: () => base44.entities.ChatMessage.filter({ stream_id: streamId }, 'created_date', 100),
    enabled: !!streamId,
    onSuccess: (data) => setChatMessages(data || [])
  });

  // Real-time chat subscription
  useEffect(() => {
    if (!streamId) return;
    
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data.stream_id === streamId) {
        if (event.type === 'create') {
          setChatMessages(prev => [...prev, event.data]);
        }
      }
    });

    return unsubscribe;
  }, [streamId]);

  const { data: isFollowing } = useQuery({
    queryKey: ['follow-status', user?.email, creator?.id],
    queryFn: async () => {
      if (!user?.email || !creator?.id) return false;
      const follows = await base44.entities.Follow.filter({ 
        follower_email: user.email, 
        following_creator_id: creator.id 
      }, null, 1);
      return follows.length > 0;
    },
    enabled: !!user?.email && !!creator?.id
  });

  const { data: mutedUsers = [] } = useQuery({
    queryKey: ['muted-users', streamId],
    queryFn: () => base44.entities.ModerationAction.filter({ 
      stream_id: streamId, 
      action_type: 'mute_chat' 
    }, '-created_date', 100),
    enabled: !!streamId,
    staleTime: 10 * 1000
  });

  const sendMessageMutation = useMutation({
    mutationFn: (message) => base44.entities.ChatMessage.create({
      stream_id: streamId,
      sender_email: user.email,
      sender_name: user.full_name || 'Anonymous',
      message,
      message_type: 'text',
      vip_level: wallet?.vip_level || 0
    }),
    onSuccess: () => queryClient.invalidateQueries(['chat-messages', streamId]),
    onError: (error) => {
      console.error('Failed to send message:', error);
      alert('Unable to send message. Please try again.');
    }
  });

  const sendGiftMutation = useMutation({
    mutationFn: async ({ gift, quantity }) => {
      if (!user || !wallet) {
        throw new Error('Please sign in to send gifts');
      }
      
      const totalCost = gift.cost_as * quantity;
      
      // Create transaction
      await base44.entities.GiftTransaction.create({
        sender_email: user.email,
        receiver_creator_id: creator.id,
        stream_id: streamId,
        gift_id: gift.id,
        gift_name: gift.name,
        quantity,
        total_as_value: totalCost,
        is_pk_gift: stream.stream_type === 'pk_battle'
      });

      // Update wallet - deduct in real-time
      const currentAs = (wallet.denarii_balance * 100) + (wallet.as_balance || 0);
      const newAs = currentAs - totalCost;
      const newDenarii = Math.floor(newAs / 100);
      const remainingAs = newAs % 100;

      await base44.entities.Wallet.update(wallet.id, {
        denarii_balance: newDenarii,
        as_balance: remainingAs
      });

      // Creator earnings: Convert As to Denarii (85% after 15% platform fee)
      const platformFee = totalCost * 0.15;
      const creatorEarning = totalCost - platformFee;
      const earningInDenarii = Math.floor(creatorEarning / 100); // Convert As to Denarii

      // Update creator earnings
      await base44.entities.Creator.update(creator.id, {
        total_earnings_denarii: (creator.total_earnings_denarii || 0) + earningInDenarii
      });

      // Update real-time broadcaster earnings tracker
      try {
        const existingEarnings = await base44.entities.BroadcasterEarnings.filter({ 
          creator_id: creator.id 
        }, null, 1);
        
        if (existingEarnings[0]) {
          await base44.entities.BroadcasterEarnings.update(existingEarnings[0].id, {
            session_earnings_denarii: (existingEarnings[0].session_earnings_denarii || 0) + earningInDenarii,
            session_gifts_count: (existingEarnings[0].session_gifts_count || 0) + quantity,
            total_earnings_denarii: (existingEarnings[0].total_earnings_denarii || 0) + earningInDenarii,
            total_gifts_received: (existingEarnings[0].total_gifts_received || 0) + quantity,
            last_gift_at: new Date().toISOString()
          });
        } else {
          await base44.entities.BroadcasterEarnings.create({
            creator_id: creator.id,
            user_email: creator.user_email,
            stream_id: streamId,
            session_earnings_denarii: earningInDenarii,
            session_gifts_count: quantity,
            total_earnings_denarii: earningInDenarii,
            total_gifts_received: quantity,
            session_start_time: new Date().toISOString(),
            last_gift_at: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('Failed to update broadcaster earnings:', e);
      }

      // Add chat message
      await base44.entities.ChatMessage.create({
        stream_id: streamId,
        sender_email: user.email,
        sender_name: user.full_name || 'Anonymous',
        message: `sent ${quantity > 1 ? quantity + 'x ' : ''}${gift.name}`,
        message_type: 'gift',
        vip_level: wallet?.vip_level || 0,
        gift_data: {
          gift_name: gift.name,
          gift_icon: gift.icon,
          quantity
        }
      });

      // Update stream stats
      await base44.entities.Stream.update(stream.id, {
        total_gifts_received: (stream.total_gifts_received || 0) + quantity,
        total_denarii_earned: (stream.total_denarii_earned || 0) + earningInDenarii
      });

      return { gift, quantity };
    },
    onSuccess: ({ gift, quantity }) => {
      queryClient.invalidateQueries(['wallet']);
      queryClient.invalidateQueries(['chat-messages', streamId]);
      setShowGiftPanel(false);
      
      // Single animation per gift batch (even for bundles)
      setGiftAnimation({ 
        gift, 
        sender: user.full_name || 'Anonymous',
        quantity
      });
    },
    onError: (error) => {
      console.error('Gift send failed:', error);
      alert(error.message || 'Unable to send gift. Please try again.');
    }
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Please sign in to follow creators');
      }
      
      if (isFollowing) {
        const follows = await base44.entities.Follow.filter({
          follower_email: user.email,
          following_creator_id: creator.id
        }, null, 1);
        if (follows[0]) await base44.entities.Follow.delete(follows[0].id);
      } else {
        await base44.entities.Follow.create({
          follower_email: user.email,
          following_creator_id: creator.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['follow-status']);
      queryClient.invalidateQueries(['creator', creator.id]);
    },
    onError: (error) => {
      console.error('Follow action failed:', error);
      if (error.message.includes('sign in')) {
        base44.auth.redirectToLogin();
      } else {
        alert('Unable to update follow status. Please try again.');
      }
    }
  });

  const endStreamMutation = useMutation({
    mutationFn: async () => {
      // Security check: Only creator can end their own stream
      if (user?.email !== creator?.user_email) {
        throw new Error('Unauthorized: Only the stream creator can end the broadcast');
      }

      // Update stream status to ended
      await base44.entities.Stream.update(stream.id, {
        status: 'ended',
        duration_minutes: Math.floor((new Date() - new Date(stream.created_date)) / 60000)
      });

      // Update creator status
      await base44.entities.Creator.update(creator.id, {
        is_live: false,
        current_stream_id: null
      });

      // End any active PK battles
      if (stream.stream_type === 'pk_battle' && pkBattle) {
        await base44.entities.PKBattle.update(pkBattle.id, {
          status: 'completed',
          ended_at: new Date().toISOString(),
          winner_creator_id: pkBattle.host_score > pkBattle.opponent_score 
            ? pkBattle.host_creator_id 
            : pkBattle.opponent_creator_id
        });
      }

      // Stop camera stream and leave Agora
      if (liveStream && typeof liveStream !== 'boolean') {
        liveStream.getTracks().forEach(track => track.stop());
      }
      await AgoraService.leave();
    },
    onSuccess: () => {
      window.location.href = createPageUrl('Profile');
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const totalAsBalance = (wallet?.denarii_balance || 0) * 100 + (wallet?.as_balance || 0);

  // Initialize Agora for viewers
  React.useEffect(() => {
    const initAgoraViewer = async () => {
      if (stream?.status === 'live' && user?.email !== creator?.user_email) {
        try {
          // Get Agora token for viewer
          let viewerUid = Math.floor(Math.random() * 1000000);
          const tokenResponse = await base44.functions.invoke('generateAgoraToken', {
            channelName: streamId,
            uid: viewerUid,
            role: 'audience'
          });
          
          const AGORA_APP_ID = tokenResponse.data.appId || '497c36af191647579fb65a825dd22b42';
          await AgoraService.initialize(AGORA_APP_ID);
          
          const token = tokenResponse.data.token || '';
          viewerUid = tokenResponse.data.uid || viewerUid;

          // Join channel as viewer
          await AgoraService.joinChannel(token, streamId, viewerUid);

          // Monitor stream quality
          AgoraService.onQualityChange((stats) => {
            setStreamStats(stats);
          });

          // Get remote users
          setRemoteUsers(AgoraService.getRemoteUsers());
          setLiveStream(true);

          console.log('Joined stream as viewer');
        } catch (error) {
          console.error('Failed to join Agora stream:', error);
          setLiveStream(true); // Fallback to basic viewing
        }
      }
    };

    initAgoraViewer();

    return () => {
      if (stream?.status === 'ended') {
        AgoraService.leave().catch(e => console.error('Leave error:', e));
      }
    };
  }, [stream?.status, streamId, user?.email, creator?.user_email]);

  // Optimize video performance for portrait streaming (creator view)
  React.useEffect(() => {
    const initLiveStream = async () => {
      if (stream?.status === 'live' && user?.email === creator?.user_email) {
        // Only get camera stream if you're the creator
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                          video: { 
                            facingMode: 'user'
                          },
                          audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                          }
                        });
          setLiveStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.muted = false;
            videoRef.current.playsInline = true;

            // Force play for mobile
            const playAttempt = async () => {
              try {
                await videoRef.current.play();
              } catch (e) {
                console.log('Play blocked, retrying...', e);
                setTimeout(() => playAttempt(), 500);
              }
            };
            playAttempt();
          }
        } catch (error) {
          console.error('Camera access error:', error);
          alert('Unable to access camera. Please ensure permissions are granted.');
        }
      }
    };
    initLiveStream();

    return () => {
      if (liveStream && typeof liveStream !== 'boolean') {
        liveStream.getTracks().forEach(track => track.stop());
      }
    };
    }, [stream?.status, user?.email, creator?.user_email]);

    // Apply mirror effect for creator's own video
    React.useEffect(() => {
    if (videoRef.current && user?.email === creator?.user_email) {
      if (isMirrored) {
        videoRef.current.style.transform = 'scaleX(-1)';
      } else {
        videoRef.current.style.transform = 'scaleX(1)';
      }
    }
    }, [isMirrored, user?.email, creator?.user_email]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen?.() || 
      videoRef.current?.webkitRequestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (streamLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-100">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="fixed inset-0 bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Stream Not Found</h1>
          <p className="text-amber-400/70 mb-6">This stream has ended or doesn't exist</p>
          <Link to={createPageUrl('Home')}>
            <Button className="bg-amber-600 hover:bg-amber-700">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}>
      <style>{`
        body, html { 
          overflow: hidden !important; 
          position: fixed !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>

      {/* Alert Notifications for Admins */}
      <AlertNotifications streamId={streamId} isAdmin={user?.role === 'admin'} />

      {/* Gift Animation - Single animation per gift batch */}
      <AnimatePresence>
        {giftAnimation && (
          <GiftAnimation 
            gift={giftAnimation.gift}
            sender={giftAnimation.sender}
            quantity={giftAnimation.quantity}
            onComplete={() => setGiftAnimation(null)}
          />
        )}
      </AnimatePresence>

      {/* Custom Background Layer */}
      {customBackground && (
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${customBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      {/* Fullscreen Mobile-Optimized Video */}
      <div className="absolute inset-0 bg-black overflow-hidden" style={{ width: '100%', height: '100%', zIndex: customBackground ? 1 : 0 }}>
        <video
          ref={videoRef}
          className="w-full h-full"
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
            maxWidth: '100%',
            maxHeight: '100%'
          }}
          autoPlay
          playsInline
          muted={isMuted}
          poster={stream.thumbnail_url}
          controls={false}
          preload="auto"
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5"
          x5-video-player-fullscreen="true"
        >
          Your browser does not support video playback.
        </video>
        
        {/* Multi-Panel Layout - 4 Square Grid */}
        {stream.stream_type === 'multi_panel' && (
          <div className="absolute inset-0">
            <MultiPanelGrid 
              hostStream={stream}
              hostCreator={creator}
              currentUser={user}
              panelParticipants={panelParticipants}
              onInviteToPanel={(seatId, participant) => {
                setPanelParticipants(prev => [...prev, participant]);
              }}
              onRemoveFromPanel={(seatId) => {
                // Handle removal
              }}
              onMuteAudio={(seatId, participant) => {
                console.log('Mute audio for seat:', seatId);
              }}
              onEndCamera={(seatId, participant) => {
                console.log('End camera for seat:', seatId);
              }}
              isHost={user?.email === creator?.user_email}
            />
          </div>
        )}

                {!liveStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-900/80">
                <div className="text-center">
                <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-amber-100">Connecting to live stream...</p>
                </div>
                </div>
                )}

                {/* PK Battle Overlay */}
                {stream.stream_type === 'pk_battle' && (
                <div className="absolute inset-0 pointer-events-none">
                <PKBattleOverlay
                hostCreator={creator}
                opponentCreator={opponentCreator}
                hostScore={pkBattle?.host_score || stream.pk_score?.host || 0}
                opponentScore={pkBattle?.opponent_score || stream.pk_score?.opponent || 0}
                timeRemaining={pkBattle ? 300 : 0}
                status={pkBattle?.status || 'pending'}
                />
                </div>
                )}
      </div>

      {/* Broadcaster Top Bar - Editable title & room icon (Creator Only) */}
      {user?.email === creator?.user_email ? (
        <BroadcasterTopBar
          stream={stream}
          viewerCount={stream.viewer_count || 0}
          onUpdateStream={async (updates) => {
            await base44.entities.Stream.update(stream.id, updates);
            queryClient.invalidateQueries(['stream', streamId]);
          }}
        />
      ) : (
        /* Viewer Top Bar - Creator Info & Viewers */
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent pt-safe">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl(`CreatorProfile?id=${creator?.id}`)}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden bg-stone-800">
                    {creator?.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                    )}
                  </div>
                </div>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{creator?.display_name}</span>
                  {creator?.is_verified && <Crown className="w-3 h-3 text-amber-400" />}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 text-white border-0 text-xs h-5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full mr-1" />
                    LIVE
                  </Badge>
                  <span className="text-white/80 text-xs">{(stream.viewer_count || 0).toLocaleString()} watching</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {wallet && (
                <ViewerWallet 
                  denariiBalance={wallet.denarii_balance || 0}
                  asBalance={wallet.as_balance || 0}
                />
              )}
              <Button
                onClick={() => followMutation.mutate()}
                size="sm"
                className={isFollowing 
                  ? "bg-stone-700/80 text-white h-7 text-xs" 
                  : "bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"}
              >
                <Heart className={`w-3 h-3 mr-1 ${isFollowing ? 'fill-current' : ''}`} />
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Right Side - Info Card (like rank display) */}
      <div className="absolute top-20 right-4 z-20">
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-3 text-center"
        >
          <div className="text-2xl mb-1">{creator?.badges?.[0] || '🏛️'}</div>
          <div className="text-white text-xs font-semibold">Level {creator?.level || 1}</div>
        </motion.div>
      </div>

      {/* Live Chat Overlay - Real-time floating chat with input */}
      <LiveChatOverlay
        messages={chatMessages}
        onSendMessage={(msg) => sendMessageMutation.mutate(msg)}
        isAuthenticated={!!user}
        disabled={sendMessageMutation.isPending}
      />

      {/* Quality Monitor - Viewer View */}
      {streamStats && user?.email !== creator?.user_email && (
        <div className="absolute bottom-32 left-4 z-20 w-64">
          <StreamQualityMonitor 
            stats={streamStats}
            onQualityChange={(quality) => {
              // Quality display for viewers (read-only)
            }}
          />
        </div>
      )}

      {/* Bottom Action Bar - Minimal icons */}
      <div className="absolute bottom-16 right-4 z-30 flex flex-col gap-3">
        <TipButton 
          creatorId={creator?.id} 
          streamId={streamId}
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
        />
        
        {creator && (
          <DirectTipButton creator={creator} variant="ghost" size="icon" className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm" />
        )}
        
        <button 
          onClick={() => setShowGiftPanel(true)}
          className="w-12 h-12 rounded-full bg-amber-600/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-amber-500 transition-colors"
        >
          <Gift className="w-6 h-6" />
        </button>
      </div>

      {/* Broadcaster Wallet - Only for Stream Owner */}
      {user?.email === creator?.user_email && (
        <BroadcasterWallet 
          totalEarnings={creator?.total_earnings_denarii || 0}
          sessionEarnings={stream?.total_denarii_earned || 0}
          giftsReceived={stream?.total_gifts_received || 0}
          creatorId={creator?.id}
        />
      )}

      {/* Creator Controls - Only for Stream Owner */}
      {user?.email === creator?.user_email && (
        <>
          {/* End Stream X Button - Top Right */}
          <button
            onClick={() => setShowEndDialog(true)}
            className="absolute top-4 right-4 z-30 w-10 h-10 bg-black/60 hover:bg-red-600/80 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Host Controls - Below top bar */}
          <div className="absolute top-20 left-4 z-20 flex gap-2">
            <HostControls 
              videoRef={videoRef}
              onMirrorChange={setIsMirrored}
              initialMirror={isMirrored}
              onBackgroundChange={setCustomBackground}
            />
            <Button
              onClick={() => setShowModerationPanel(true)}
              size="sm"
              className="bg-stone-900/80 border border-amber-600/30 text-amber-300 hover:bg-amber-800/20 h-8 text-xs"
            >
              <Shield className="w-3 h-3 mr-1" />
              Mod
            </Button>
          </div>

          {/* End Stream Dialog */}
          <EndStreamDialog
            isOpen={showEndDialog}
            onConfirm={() => endStreamMutation.mutate()}
            onCancel={() => setShowEndDialog(false)}
            isPending={endStreamMutation.isPending}
          />

          {/* Moderation Panel */}
          <ModerationPanel
            isOpen={showModerationPanel}
            onClose={() => setShowModerationPanel(false)}
            streamId={streamId}
            viewers={[]} // Would be populated from Agora/stream data
            moderators={moderators}
            kickedUsers={kickedUsers}
            chatMuted={chatMuted}
            onToggleChatMute={() => setChatMuted(!chatMuted)}
            onAppointModerator={(viewer) => setModerators([...moderators, viewer])}
            onRemoveModerator={(mod) => setModerators(moderators.filter(m => m.email !== mod.email))}
            onKickViewer={(viewer) => setKickedUsers([...kickedUsers, viewer])}
            onResetKicks={() => setKickedUsers([])}
            onMuteViewerAudio={(viewer) => console.log('Mute audio:', viewer)}
            onEndViewerCamera={(viewer) => console.log('End camera:', viewer)}
            isHost={true}
          />
        </>
      )}

      {/* Gift Panel */}
      <AnimatePresence>
        {showGiftPanel && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50"
          >
            <GiftPanel 
              gifts={gifts}
              walletBalance={totalAsBalance}
              onSendGift={(gift, quantity) => sendGiftMutation.mutate({ gift, quantity })}
              onClose={() => setShowGiftPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}