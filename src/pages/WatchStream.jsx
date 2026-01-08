import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  StopCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StreamChat from '@/components/stream/StreamChat';
import GiftPanel from '@/components/gifts/GiftPanel';
import GiftAnimation from '@/components/gifts/GiftAnimation';
import PKBattleOverlay from '@/components/pk/PKBattleOverlay';
import ModerationDashboard from '@/components/moderation/ModerationDashboard';

export default function WatchStream() {
  const urlParams = new URLSearchParams(window.location.search);
  const streamId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [giftAnimation, setGiftAnimation] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = React.useRef(null);
  const [liveStream, setLiveStream] = useState(null);
  const [showModeration, setShowModeration] = useState(false);

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

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chat-messages', streamId],
    queryFn: () => base44.entities.ChatMessage.filter({ stream_id: streamId }, 'created_date', 100),
    enabled: !!streamId,
    refetchInterval: 2000
  });

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

  const sendMessageMutation = useMutation({
    mutationFn: (message) => base44.entities.ChatMessage.create({
      stream_id: streamId,
      sender_email: user.email,
      sender_name: user.full_name || 'Anonymous',
      message,
      message_type: 'text',
      vip_level: wallet?.vip_level || 0
    }),
    onSuccess: () => queryClient.invalidateQueries(['chat-messages', streamId])
  });

  const sendGiftMutation = useMutation({
    mutationFn: async ({ gift, quantity }) => {
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

      // Update wallet
      const currentAs = (wallet.denarii_balance * 100) + (wallet.as_balance || 0);
      const newAs = currentAs - totalCost;
      const newDenarii = Math.floor(newAs / 100);
      const remainingAs = newAs % 100;

      await base44.entities.Wallet.update(wallet.id, {
        denarii_balance: newDenarii,
        as_balance: remainingAs
      });

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
        total_denarii_earned: (stream.total_denarii_earned || 0) + Math.floor(totalCost / 100)
      });

      return { gift, quantity };
    },
    onSuccess: ({ gift, quantity }) => {
      queryClient.invalidateQueries(['wallet']);
      queryClient.invalidateQueries(['chat-messages', streamId]);
      setShowGiftPanel(false);
      
      // Trigger animation
      setGiftAnimation({ 
        gift, 
        sender: user.full_name || 'Anonymous' 
      });
    }
  });

  const followMutation = useMutation({
    mutationFn: async () => {
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
    }
  });

  const endStreamMutation = useMutation({
    mutationFn: async () => {
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

      // Stop camera stream
      if (liveStream) {
        liveStream.getTracks().forEach(track => track.stop());
      }
    },
    onSuccess: () => {
      window.location.href = createPageUrl('Profile');
    }
  });

  const totalAsBalance = (wallet?.denarii_balance || 0) * 100 + (wallet?.as_balance || 0);

  // Simulate live stream (in production, this would connect to real stream)
  React.useEffect(() => {
    const initLiveStream = async () => {
      if (stream?.status === 'live') {
        try {
          // For demo: access local camera to simulate viewing a live stream
          // In production, you'd connect to the creator's broadcast URL
          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          setLiveStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (error) {
          console.log('Live stream simulation:', error);
        }
      }
    };
    initLiveStream();
    
    return () => {
      if (liveStream) {
        liveStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream?.status]);

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
      <div className="min-h-screen bg-stone-950 pt-16">
        <div className="max-w-7xl mx-auto p-4">
          <Skeleton className="aspect-video w-full rounded-2xl bg-stone-800" />
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-stone-950 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Stream Not Found</h1>
          <p className="text-amber-400/70 mb-6">This stream may have ended or doesn't exist.</p>
          <Link to={createPageUrl('Explore')}>
            <Button className="bg-amber-600 hover:bg-amber-700">
              Explore Streams
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 pt-16">
      {/* Gift Animation */}
      <AnimatePresence>
        {giftAnimation && (
          <GiftAnimation 
            gift={giftAnimation.gift}
            sender={giftAnimation.sender}
            onComplete={() => setGiftAnimation(null)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main Content */}
          <div className="flex-1">
            {/* Video Player */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-4">
              {/* HTML5 Video Player */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted={isMuted}
                poster={stream.thumbnail_url}
                controls={false}
              >
                Your browser does not support video playback.
              </video>
              
              {!liveStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-900/80">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-amber-100">Connecting to live stream...</p>
                  </div>
                </div>
              )}
              
              {/* Live Badge Overlay */}
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-red-500 text-white border-0 animate-pulse">
                  ● LIVE
                </Badge>
              </div>

              {/* PK Battle Overlay */}
              {stream.stream_type === 'pk_battle' && (
                <PKBattleOverlay
                  hostCreator={creator}
                  opponentCreator={opponentCreator}
                  hostScore={pkBattle?.host_score || stream.pk_score?.host || 0}
                  opponentScore={pkBattle?.opponent_score || stream.pk_score?.opponent || 0}
                  timeRemaining={pkBattle ? 300 : 0}
                  status={pkBattle?.status || 'pending'}
                />
              )}

              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500 text-white border-0">
                      <Eye className="w-3 h-3 mr-1" />
                      {(stream.viewer_count || 0).toLocaleString()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                      <Maximize className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Info */}
            <div className="bg-stone-900/50 rounded-2xl p-4 border border-amber-600/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                {user?.email === creator?.user_email && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowModeration(!showModeration)}
                      variant="outline"
                      size="sm"
                      className="border-amber-600/30 text-amber-300 hover:bg-amber-800/20"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Moderation Dashboard
                    </Button>
                    <Button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to end this stream?')) {
                          endStreamMutation.mutate();
                        }
                      }}
                      variant="destructive"
                      size="sm"
                      disabled={endStreamMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <StopCircle className="w-4 h-4 mr-2" />
                      {endStreamMutation.isPending ? 'Ending...' : 'End Stream'}
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Link to={createPageUrl(`CreatorProfile?id=${creator?.id}`)}>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 flex-shrink-0">
                      <div className="w-full h-full rounded-full overflow-hidden bg-stone-800">
                        {creator?.avatar_url ? (
                          <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-amber-100 mb-1">{stream.title}</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={createPageUrl(`CreatorProfile?id=${creator?.id}`)}>
                        <span className="text-amber-300 font-semibold hover:underline">{creator?.display_name}</span>
                      </Link>
                      {creator?.is_verified && <Crown className="w-4 h-4 text-amber-400" />}
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 capitalize">
                        {stream.category?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => followMutation.mutate()}
                    variant={isFollowing ? "outline" : "default"}
                    className={isFollowing 
                      ? "border-amber-500 text-amber-400" 
                      : "bg-amber-600 hover:bg-amber-700 text-white"}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button variant="outline" className="border-amber-500/30 text-amber-300">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {stream.description && (
                <p className="text-amber-100/70 mt-4 text-sm">{stream.description}</p>
              )}
            </div>

            {/* Mobile Gift Button */}
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowGiftPanel(true)}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-6"
                >
                  <Gift className="w-5 h-5 mr-2" />
                  Send Gift
                </Button>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="border-amber-500/30 text-amber-300 py-6">
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="bg-stone-900 border-amber-600/30 p-0 w-full sm:w-[400px]">
                    <div className="h-full">
                      <StreamChat 
                        streamId={streamId}
                        messages={chatMessages}
                        onSendMessage={(msg) => sendMessageMutation.mutate(msg)}
                        onOpenGifts={() => setShowGiftPanel(true)}
                        currentUser={user}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* Chat/Moderation Sidebar - Desktop */}
          <div className="hidden lg:block w-96 h-[calc(100vh-8rem)] sticky top-20">
            {showModeration && user?.email === creator?.user_email ? (
              <ModerationDashboard 
                streamId={streamId}
                onClose={() => setShowModeration(false)}
              />
            ) : (
              <StreamChat 
                streamId={streamId}
                messages={chatMessages}
                onSendMessage={(msg) => sendMessageMutation.mutate(msg)}
                onOpenGifts={() => setShowGiftPanel(true)}
                currentUser={user}
              />
            )}
          </div>
        </div>
      </div>

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