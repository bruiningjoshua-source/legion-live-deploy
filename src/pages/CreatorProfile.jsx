import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SteamProfileCard from "@/components/gaming/SteamProfileCard";
import { 
  Crown, 
  Heart, 
  Radio, 
  Trophy,
  Swords,
  Users,
  Star,
  ExternalLink,
  Video,
  Play,
  Eye,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import formatCount from '@/components/shared/FormatCount';
import StreamCard from '@/components/stream/StreamCard';
import SubscriptionTierCard from '@/components/creator/SubscriptionTierCard';
import TipButton from '@/components/stream/TipButton';
import FreeTierWalletTip from '@/components/creator/FreeTierWalletTip';
import CreatorInfoSection from '@/components/creator/CreatorInfoSection';
import DirectMessaging from '@/components/community/DirectMessaging';
import CreatorStorefront from '@/components/affiliate/CreatorStorefront';

export default function CreatorProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const creatorId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [showMessages, setShowMessages] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: creator, isLoading } = useQuery({
    queryKey: ['creator', creatorId],
    queryFn: () => base44.entities.Creator.filter({ id: creatorId }, null, 1).then(r => r[0]),
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: allStreams = [] } = useQuery({
    queryKey: ['creator-streams', creatorId],
    queryFn: () => base44.entities.Stream.filter({ creator_id: creatorId }, '-created_date', 20),
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const streams = allStreams.filter(s => s.status !== 'scheduled');

  const { data: videos = [] } = useQuery({
    queryKey: ['creator-videos', creatorId],
    queryFn: () => base44.entities.VlogVideo.filter({ creator_id: creatorId, is_published: true }, '-view_count', 30),
    enabled: !!creatorId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: subscriptionTiers = [] } = useQuery({
    queryKey: ['subscription-tiers', creatorId],
    queryFn: () => base44.entities.SubscriptionTier.filter({ creator_id: creatorId, is_active: true }),
    enabled: !!creatorId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['my-subscription', creatorId, user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const subs = await base44.entities.ViewerSubscription.filter({
        viewer_email: user.email,
        creator_id: creatorId,
        status: 'active'
      }, null, 1);
      return subs[0] || null;
    },
    enabled: !!creatorId && !!user?.email,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: isFollowing } = useQuery({
    queryKey: ['follow-status', user?.email, creatorId],
    queryFn: async () => {
      if (!user?.email) return false;
      const follows = await base44.entities.Follow.filter({ 
        follower_email: user.email, 
        following_creator_id: creatorId 
      }, null, 1);
      return follows.length > 0;
    },
    enabled: !!user?.email && !!creatorId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const follows = await base44.entities.Follow.filter({
          follower_email: user.email,
          following_creator_id: creatorId
        }, null, 1);
        if (follows[0]) await base44.entities.Follow.delete(follows[0].id);
        await base44.entities.Creator.update(creatorId, {
          follower_count: Math.max((creator.follower_count || 1) - 1, 0)
        });
      } else {
        await base44.entities.Follow.create({
          follower_email: user.email,
          following_creator_id: creatorId
        });
        await base44.entities.Creator.update(creatorId, {
          follower_count: (creator.follower_count || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status'] });
      queryClient.invalidateQueries({ queryKey: ['creator', creatorId] });
    }
  });

  const liveStreams = streams.filter(s => s.status === 'live');
  const pastStreams = streams.filter(s => s.status === 'ended');
  const shorts = videos.filter(v => v.video_type === 'short');
  const longFormVideos = videos.filter(v => v.video_type === 'long_form');

  const levelBadges = {
    1: { label: 'Recruit', color: 'stone', icon: '🔰' },
    5: { label: 'Legionary', color: 'green', icon: '⚔️' },
    10: { label: 'Decanus', color: 'blue', icon: '🛡️' },
    20: { label: 'Centurion', color: 'purple', icon: '🏛️' },
    35: { label: 'Praetor', color: 'amber', icon: '👑' },
    50: { label: 'Consul', color: 'rose', icon: '🦅' },
    75: { label: 'Imperator', color: 'yellow', icon: '✨' }
  };

  const getLevelBadge = (level) => {
    const thresholds = Object.keys(levelBadges).map(Number).sort((a, b) => b - a);
    const threshold = thresholds.find(t => level >= t) || 1;
    return levelBadges[threshold];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="h-64 rounded-2xl bg-stone-800 mb-8" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-2xl bg-stone-800" />
            <Skeleton className="h-48 rounded-2xl bg-stone-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Creator Not Found</h1>
          <p className="text-amber-400/70 mb-6">This profile doesn't exist.</p>
          <Link to={createPageUrl('Explore')}>
            <Button className="bg-amber-600 hover:bg-amber-700">
              Explore Creators
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const badge = getLevelBadge(creator.level || 1);
  const pkWinRate = creator.pk_wins && creator.pk_losses 
    ? ((creator.pk_wins / (creator.pk_wins + creator.pk_losses)) * 100).toFixed(0)
    : 0;

  return (
    <div className="min-h-screen bg-[#050508] pb-24">
      {/* Hero banner */}
      <div className="relative">
        <div className="h-36 sm:h-48 bg-gradient-to-r from-amber-900/60 via-stone-800 to-amber-900/60 overflow-hidden">
          {creator.banner_url
            ? <img src={creator.banner_url} alt="" className="w-full h-full object-cover opacity-60" />
            : <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200')] bg-cover bg-center opacity-25" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] to-transparent" />
        </div>

        <div className="max-w-2xl mx-auto px-4 relative">
          {/* Avatar — centered, overlapping banner cleanly (no cut-off) */}
          <div className="flex flex-col items-center -mt-14">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1 shadow-xl">
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-800 border-4 border-[#050508]">
                  {creator.avatar_url
                    ? <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>}
                </div>
              </div>
              {creator.is_live && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#050508]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                </span>
              )}
            </div>

            {/* Name + badge */}
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <h1 className="text-2xl font-bold text-amber-100">{creator.display_name}</h1>
              {creator.is_verified && <Crown className="w-5 h-5 text-amber-400" />}
            </div>
            <div className="mt-1.5">
              <span className="inline-flex items-center gap-1 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {badge.icon} {badge.label} • Lv.{creator.level || 1}
              </span>
            </div>
            <p className="text-white/50 capitalize text-sm mt-1.5">{creator.category?.replace('_', ' ') || 'Content Creator'}</p>
            {creator.bio && <p className="text-white/70 text-sm mt-2 text-center max-w-md">{creator.bio}</p>}

            {/* Social links */}
            {creator.social_links && Object.keys(creator.social_links).length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {creator.social_links.youtube && (
                  <a href={creator.social_links.youtube} target="_blank" rel="noopener noreferrer"
                    className="text-white/60 hover:text-amber-400 text-xs flex items-center gap-1">
                    YouTube <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {creator.social_links.tiktok && (
                  <a href={creator.social_links.tiktok} target="_blank" rel="noopener noreferrer"
                    className="text-white/60 hover:text-amber-400 text-xs flex items-center gap-1">
                    TikTok <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Action buttons — responsive row, no overflow */}
            <div className="flex items-center gap-2 mt-4 w-full max-w-sm">
              <div className="flex-1">
                <TipButton creatorId={creatorId} streamId={null} variant="default" size="default" className="w-full" />
              </div>
              {user && creator?.user_email && user.email !== creator.user_email && (
                <button onClick={() => setShowMessages(true)}
                  className="ll-btn ll-btn-secondary flex-1 !h-10">
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
              )}
              <button onClick={() => followMutation.mutate()}
                className={`ll-btn flex-1 !h-10 ${isFollowing ? 'll-btn-ghost' : 'll-btn-primary'}`}>
                <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>

            <div className="w-full mt-4">
              <SteamProfileCard email={creator.user_email} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="ll-card p-4 text-center">
                  <Users className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{formatCount(creator.follower_count)}</p>
                  <p className="text-white/50 text-xs">Followers</p>
                </div>
                <div className="ll-card p-4 text-center">
                  <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{formatCount(creator.total_earnings_denarii)}</p>
                  <p className="text-white/50 text-xs">🪙 Earned</p>
                </div>
                <div className="ll-card p-4 text-center">
                  <Swords className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{formatCount(creator.pk_wins)}</p>
                  <p className="text-white/50 text-xs">PK Wins</p>
                </div>
                <div className="ll-card p-4 text-center">
                  <Star className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{pkWinRate}%</p>
                  <p className="text-white/50 text-xs">Win Rate</p>
                </div>
              </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        {/* Free Tier Wallet Tip */}
        <div className="mb-6">
          <FreeTierWalletTip creator={creator} isOwnProfile={false} />
        </div>

        {/* Creator Info Section - Affiliate Links, Promo Codes, Brand Partners */}
        <div className="mb-6">
          <CreatorInfoSection creator={creator} isOwnProfile={false} />
        </div>

        {/* Subscription Tiers */}
        {subscriptionTiers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-amber-100 mb-4">Support This Creator</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subscriptionTiers.map(tier => (
                <SubscriptionTierCard
                  key={tier.id}
                  tier={tier}
                  creatorId={creatorId}
                  isSubscribed={mySubscription?.tier === tier.tier_name}
                />
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-2xl">
            <TabsTrigger value="videos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl text-white/60">
              <Video className="w-4 h-4 mr-2" />
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-xl text-white/60">
              <Radio className="w-4 h-4 mr-2" />
              Live ({liveStreams.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl text-white/60">
              Past Streams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-0">
            {videos.length > 0 ? (
              <div className="space-y-6">
                {shorts.length > 0 && (
                  <div>
                    <h3 className="text-amber-100 font-semibold mb-3 flex items-center gap-2">
                      <Video className="w-5 h-5 text-amber-400" />
                      Shorts ({shorts.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {shorts.map((video, i) => (
                        <VideoCard key={video.id} video={video} creator={creator} index={i} />
                      ))}
                    </div>
                  </div>
                )}
                {longFormVideos.length > 0 && (
                  <div>
                    <h3 className="text-amber-100 font-semibold mb-3 flex items-center gap-2">
                      <Video className="w-5 h-5 text-amber-400" />
                      Long Form ({longFormVideos.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {longFormVideos.map((video, i) => (
                        <VideoCard key={video.id} video={video} creator={creator} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.08]">
                <CardContent className="py-12 text-center">
                  <Video className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No Videos Yet</h3>
                  <p className="text-white/50">This creator hasn't uploaded any videos.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="live" className="mt-0">
            {liveStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveStreams.map((stream, i) => (
                  <motion.div
                    key={stream.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.25 }}
                  >
                    <StreamCard stream={stream} creator={creator} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.08]">
                <CardContent className="py-12 text-center">
                  <Radio className="w-12 h-12 text-red-400/30 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">Not Live Right Now</h3>
                  <p className="text-white/50">Check back later or follow for notifications!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            {pastStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastStreams.map((stream, i) => (
                  <motion.div
                    key={stream.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.25 }}
                  >
                    <StreamCard stream={{ ...stream, status: 'ended' }} creator={creator} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-white/[0.03] backdrop-blur-xl border-white/[0.08]">
                <CardContent className="py-12 text-center">
                  <Star className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No Past Streams</h3>
                  <p className="text-white/50">This creator hasn't streamed yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {creator && (
          <div className="mt-6">
            <CreatorStorefront
              creatorId={creator.id}
              creatorEmail={creator.user_email}
              displayName={creator.display_name || 'Creator'}
            />
          </div>
        )}

        {/* Direct Messaging Modal */}
        <DirectMessaging 
          isOpen={showMessages} 
          onClose={() => setShowMessages(false)}
          initialRecipient={creator?.user_email}
        />
      </div>
    </div>
  );
}

function VideoCard({ video, creator, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.25 }}
    >
      <Link to={createPageUrl(`WatchVideo?id=${video.id}`)}>
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-xl overflow-hidden border border-white/[0.08] hover:border-amber-500/40 transition-all cursor-pointer group">
          <div className={`relative bg-stone-950 ${
            video.video_type === 'short' ? 'aspect-[9/16]' : 'aspect-video'
          }`}>
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} className="w-full h-full object-cover" alt={video.title} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-8 h-8 text-amber-400/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="w-10 h-10 text-white" />
            </div>
            {video.duration_seconds && (
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs">
                {Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
          <div className="p-3">
            <h3 className="text-amber-100 font-semibold text-sm line-clamp-2 mb-2">{video.title}</h3>
            <div className="flex items-center gap-2 text-xs text-amber-400/70">
              <Eye className="w-3 h-3" />
              {formatCount(video.view_count)}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}