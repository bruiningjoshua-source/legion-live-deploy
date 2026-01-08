import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Crown, 
  Heart, 
  Radio, 
  Trophy,
  Swords,
  Users,
  Star,
  ExternalLink,
  Share2,
  Video,
  Play,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import StreamCard from '@/components/stream/StreamCard';
import SubscriptionTierCard from '@/components/creator/SubscriptionTierCard';
import TipButton from '@/components/stream/TipButton';

export default function CreatorProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const creatorId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const { data: creator, isLoading } = useQuery({
    queryKey: ['creator', creatorId],
    queryFn: () => base44.entities.Creator.filter({ id: creatorId }, null, 1).then(r => r[0]),
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  const { data: streams = [] } = useQuery({
    queryKey: ['creator-streams', creatorId],
    queryFn: () => base44.entities.Stream.filter({ creator_id: creatorId }, '-created_date', 20),
    enabled: !!creatorId,
    staleTime: 60 * 1000 // 1 minute
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['creator-videos', creatorId],
    queryFn: () => base44.entities.VlogVideo.filter({ creator_id: creatorId, is_published: true }, '-view_count', 30),
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  const { data: subscriptionTiers = [] } = useQuery({
    queryKey: ['subscription-tiers', creatorId],
    queryFn: () => base44.entities.SubscriptionTier.filter({ creator_id: creatorId, is_active: true }),
    enabled: !!creatorId,
    staleTime: 5 * 60 * 1000
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
    enabled: !!creatorId && !!user?.email
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
    enabled: !!user?.email && !!creatorId
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
      queryClient.invalidateQueries(['follow-status']);
      queryClient.invalidateQueries(['creator', creatorId]);
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
      <div className="min-h-screen bg-stone-950 pt-20 pb-12">
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
      <div className="min-h-screen bg-stone-950 pt-20 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-16 pb-12">
      {/* Hero Section */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-gradient-to-r from-amber-900 via-stone-800 to-amber-900">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200')] bg-cover bg-center opacity-30" />
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-20 relative">
          <Card className="bg-stone-900/95 border-amber-600/30 backdrop-blur overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end gap-6">
                {/* Avatar */}
                <div className="relative -mt-24 md:-mt-16">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1">
                    <div className="w-full h-full rounded-full overflow-hidden bg-stone-800 border-4 border-stone-900">
                      {creator.avatar_url ? (
                        <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">👤</div>
                      )}
                    </div>
                  </div>
                  {creator.is_live && (
                    <Badge className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white border-0 animate-pulse">
                      ● LIVE
                    </Badge>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-bold text-amber-100">{creator.display_name}</h1>
                    {creator.is_verified && <Crown className="w-6 h-6 text-amber-400" />}
                    <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30">
                      {badge.icon} {badge.label} • Lv.{creator.level || 1}
                    </Badge>
                  </div>
                  <p className="text-amber-400/70 capitalize mb-3">{creator.category?.replace('_', ' ') || 'Content Creator'}</p>
                  {creator.bio && (
                    <p className="text-amber-100/80 text-sm mb-4">{creator.bio}</p>
                  )}
                  
                  {/* Social Links */}
                  {creator.social_links && Object.keys(creator.social_links).length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      {creator.social_links.youtube && (
                        <a href={creator.social_links.youtube} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-900/30">
                            YouTube <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                      )}
                      {creator.social_links.tiktok && (
                        <a href={creator.social_links.tiktok} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="text-pink-400 hover:bg-pink-900/30">
                            TikTok <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <TipButton 
                    creatorId={creatorId} 
                    streamId={null}
                    variant="default"
                    size="lg"
                  />
                  <Button
                    onClick={() => followMutation.mutate()}
                    variant={isFollowing ? "outline" : "default"}
                    className={isFollowing 
                      ? "border-amber-500 text-amber-400" 
                      : "bg-amber-600 hover:bg-amber-700 text-white"}
                    size="lg"
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button variant="outline" size="lg" className="border-amber-500/30 text-amber-300">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                  <Users className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-100">{(creator.follower_count || 0).toLocaleString()}</p>
                  <p className="text-amber-400/60 text-xs">Followers</p>
                </div>
                <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                  <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-100">{(creator.total_earnings_denarii || 0).toLocaleString()}</p>
                  <p className="text-amber-400/60 text-xs">🪙 Earned</p>
                </div>
                <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                  <Swords className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-100">{creator.pk_wins || 0}</p>
                  <p className="text-amber-400/60 text-xs">PK Wins</p>
                </div>
                <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                  <Star className="w-5 h-5 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-100">{pkWinRate}%</p>
                  <p className="text-amber-400/60 text-xs">Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
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
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1 rounded-xl">
            <TabsTrigger value="videos" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              <Video className="w-4 h-4 mr-2" />
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              <Radio className="w-4 h-4 mr-2" />
              Live ({liveStreams.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg">
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
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="py-12 text-center">
                  <Video className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                  <h3 className="text-amber-100 font-semibold mb-2">No Videos Yet</h3>
                  <p className="text-amber-400/60">This creator hasn't uploaded any videos.</p>
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <StreamCard stream={stream} creator={creator} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="py-12 text-center">
                  <Radio className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                  <h3 className="text-amber-100 font-semibold mb-2">Not Live Right Now</h3>
                  <p className="text-amber-400/60">Check back later or follow for notifications!</p>
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <StreamCard stream={{ ...stream, status: 'ended' }} creator={creator} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="py-12 text-center">
                  <Star className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                  <h3 className="text-amber-100 font-semibold mb-2">No Past Streams</h3>
                  <p className="text-amber-400/60">This creator hasn't streamed yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function VideoCard({ video, creator, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={createPageUrl(`WatchVideo?id=${video.id}`)}>
        <div className="bg-stone-800/30 rounded-xl overflow-hidden border border-amber-600/20 hover:border-amber-500/50 transition-all cursor-pointer group">
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
              {video.view_count?.toLocaleString() || 0}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}