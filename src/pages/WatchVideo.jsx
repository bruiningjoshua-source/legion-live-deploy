import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Eye,
  Heart,
  Share2,
  Flag,
  ThumbsUp,
  ThumbsDown,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import VideoPlayer from '@/components/video/VideoPlayer';
import TipButton from '@/components/stream/TipButton';
import VideoCommentSystem from '@/components/community/VideoCommentSystem';
import RecommendedVideos from '@/components/video/RecommendedVideos';

export default function WatchVideo() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('id');
  const contentType = urlParams.get('type'); // 'music' or null for video

  const isMusic = contentType === 'music';

  const viewTrackedRef = React.useRef(false);

  const { data: video } = useQuery({
    queryKey: ['video', videoId, contentType],
    queryFn: async () => {
      if (isMusic) {
        const items = await base44.entities.Music.filter({ id: videoId }, null, 1);
        return items[0];
      } else {
        const videos = await base44.entities.VlogVideo.filter({ id: videoId }, null, 1);
        return videos[0];
      }
    },
    enabled: !!videoId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Track view count once on mount
  React.useEffect(() => {
    if (!video || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    
    if (isMusic) {
      base44.entities.Music.update(videoId, {
        play_count: (video.play_count || 0) + 1
      }).catch(err => console.error('Play count update failed:', err));
    } else {
      base44.entities.VlogVideo.update(videoId, {
        view_count: (video.view_count || 0) + 1
      }).catch(err => console.error('View count update failed:', err));
    }
  }, [video, videoId, isMusic]);

  const { data: creator } = useQuery({
    queryKey: ['video-creator', video?.creator_id],
    queryFn: async () => {
      const creators = await base44.entities.Creator.filter({ id: video.creator_id }, null, 1);
      return creators[0];
    },
    enabled: !!video?.creator_id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const { data: affiliateProducts = [] } = useQuery({
    queryKey: ['video-affiliate-products', video?.affiliate_products],
    queryFn: async () => {
      if (!video?.affiliate_products?.length) return [];
      try {
        const products = await Promise.all(
          video.affiliate_products.map(async (productId) => {
            const result = await base44.entities.AffiliateProduct.filter({ id: productId }, null, 1);
            return result[0];
          })
        );
        return products.filter(Boolean);
      } catch (error) {
        console.error('Affiliate products fetch failed:', error);
        return [];
      }
    },
    enabled: !!video?.affiliate_products?.length,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: userInterest } = useQuery({
    queryKey: ['user-interest', user?.email],
    queryFn: async () => {
      const interests = await base44.entities.UserInterest.filter({ user_email: user.email }, null, 1);
      return interests[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const hasLiked = userInterest?.liked_videos?.includes(videoId);
  const hasDisliked = userInterest?.disliked_videos?.includes(videoId);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const currentLikes = video.like_count || 0;
      const currentDislikes = video.dislike_count || 0;
      
      if (hasLiked) {
        // Remove like
        await base44.entities.VlogVideo.update(videoId, {
          like_count: Math.max(currentLikes - 1, 0)
        });
        if (userInterest) {
          await base44.entities.UserInterest.update(userInterest.id, {
            liked_videos: (userInterest.liked_videos || []).filter(id => id !== videoId)
          });
        }
      } else {
        // Add like, remove dislike if exists
        const updates = { like_count: currentLikes + 1 };
        if (hasDisliked) {
          updates.dislike_count = Math.max(currentDislikes - 1, 0);
        }
        await base44.entities.VlogVideo.update(videoId, updates);
        
        if (userInterest) {
          await base44.entities.UserInterest.update(userInterest.id, {
            liked_videos: [...(userInterest.liked_videos || []), videoId],
            disliked_videos: (userInterest.disliked_videos || []).filter(id => id !== videoId)
          });
        } else {
          await base44.entities.UserInterest.create({
            user_email: user.email,
            liked_videos: [videoId]
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId], refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['user-interest'], refetchType: 'none' });
      queryClient.setQueryData(['video', videoId, contentType], (old) => old ? { ...old, like_count: hasLiked ? Math.max((old.like_count || 0) - 1, 0) : (old.like_count || 0) + 1 } : old);
      toast.success(hasLiked ? 'Removed like' : 'Liked!');
    }
  });

  const dislikeMutation = useMutation({
    mutationFn: async () => {
      const currentLikes = video.like_count || 0;
      const currentDislikes = video.dislike_count || 0;
      
      if (hasDisliked) {
        // Remove dislike
        await base44.entities.VlogVideo.update(videoId, {
          dislike_count: Math.max(currentDislikes - 1, 0)
        });
        if (userInterest) {
          await base44.entities.UserInterest.update(userInterest.id, {
            disliked_videos: (userInterest.disliked_videos || []).filter(id => id !== videoId)
          });
        }
      } else {
        // Add dislike, remove like if exists
        const updates = { dislike_count: currentDislikes + 1 };
        if (hasLiked) {
          updates.like_count = Math.max(currentLikes - 1, 0);
        }
        await base44.entities.VlogVideo.update(videoId, updates);
        
        if (userInterest) {
          await base44.entities.UserInterest.update(userInterest.id, {
            disliked_videos: [...(userInterest.disliked_videos || []), videoId],
            liked_videos: (userInterest.liked_videos || []).filter(id => id !== videoId)
          });
        } else {
          await base44.entities.UserInterest.create({
            user_email: user.email,
            disliked_videos: [videoId]
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video', videoId], refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['user-interest'], refetchType: 'none' });
      queryClient.setQueryData(['video', videoId, contentType], (old) => old ? { ...old, dislike_count: hasDisliked ? Math.max((old.dislike_count || 0) - 1, 0) : (old.dislike_count || 0) + 1 } : old);
    }
  });

  const trackAffiliateClick = async (productId, link) => {
    await base44.entities.AffiliateProduct.update(productId, {
      click_count: (affiliateProducts.find(p => p.id === productId)?.click_count || 0) + 1
    });
    window.open(link, '_blank');
  };

  if (!video) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video/Music Player */}
            <div className={`bg-black rounded-xl overflow-hidden ${
              video.video_type === 'short' ? 'max-w-md mx-auto' : 'aspect-video'
            }`}>
              {isMusic ? (
                // Music content - prefer video_url (music video) or show cover with audio
                video.video_url || video.audio_url ? (
                  <VideoPlayer 
                    src={video.video_url || video.audio_url}
                    poster={video.cover_url || video.thumbnail_url}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-400/50">
                    Audio not available
                  </div>
                )
              ) : (
                // Regular video content
                video.video_url ? (
                  <VideoPlayer 
                    src={video.video_url}
                    poster={video.thumbnail_url}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-400/50">
                    Video not available
                  </div>
                )
              )}
            </div>

            {/* Video Info */}
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardContent className="p-6">
                <h1 className="text-2xl font-bold text-amber-100 mb-4">{video.title}</h1>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Link to={createPageUrl(`CreatorProfile?id=${creator?.id}`)}>
                      <div className="flex items-center gap-3">
                        {creator?.avatar_url && (
                          <img src={creator.avatar_url} className="w-12 h-12 rounded-full" alt="" />
                        )}
                        <div>
                          <p className="text-amber-100 font-semibold">{creator?.display_name}</p>
                          <p className="text-amber-400/60 text-sm">{creator?.follower_count?.toLocaleString()} followers</p>
                        </div>
                      </div>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <TipButton 
                      creatorId={creator?.id}
                      streamId={null}
                      variant="outline"
                      size="default"
                    />
                    <div className="flex items-center bg-stone-800 rounded-lg overflow-hidden">
                      <Button
                        onClick={() => user && likeMutation.mutate()}
                        variant="ghost"
                        className={`rounded-none border-r border-stone-700 ${hasLiked ? 'text-blue-400' : 'text-amber-200'}`}
                      >
                        <ThumbsUp className={`w-4 h-4 mr-2 ${hasLiked ? 'fill-current' : ''}`} />
                        {video.like_count?.toLocaleString() || 0}
                      </Button>
                      <Button
                        onClick={() => user && dislikeMutation.mutate()}
                        variant="ghost"
                        className={`rounded-none ${hasDisliked ? 'text-red-400' : 'text-amber-200'}`}
                      >
                        <ThumbsDown className={`w-4 h-4 ${hasDisliked ? 'fill-current' : ''}`} />
                        {video.dislike_count > 0 && (
                          <span className="ml-1">{video.dislike_count?.toLocaleString()}</span>
                        )}
                      </Button>
                    </div>
                    <Button variant="outline" className="border-amber-600/30 text-amber-200">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-amber-600/20 text-amber-300 capitalize">
                    {(video.category || video.genre)?.replace('_', ' ')}
                  </Badge>
                  <Badge className="bg-stone-700/50 text-amber-300">
                    <Eye className="w-3 h-3 mr-1" />
                    {(video.view_count || video.play_count)?.toLocaleString() || 0} {isMusic ? 'plays' : 'views'}
                  </Badge>
                  {isMusic ? (
                    <Badge className="bg-purple-600/20 text-purple-300">
                      ♪ Music
                    </Badge>
                  ) : video.video_type && (
                    <Badge className="bg-purple-600/20 text-purple-300 capitalize">
                      {video.video_type.replace('_', ' ')}
                    </Badge>
                  )}
                  {isMusic && video.artist && (
                    <Badge className="bg-cyan-600/20 text-cyan-300">
                      {video.artist}
                    </Badge>
                  )}
                </div>

                {video.description && (
                  <p className="text-amber-100/80 text-sm">{video.description}</p>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <VideoCommentSystem videoId={videoId} creatorId={creator?.id} />
          </div>

          {/* Sidebar - Affiliate Products */}
          {affiliateProducts.length > 0 && (
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-amber-900/30 to-stone-900/30 border-amber-600/30">
                <CardContent className="p-6">
                  <h3 className="text-amber-100 font-semibold mb-4 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-400" />
                    Featured Products
                  </h3>
                  <div className="space-y-3">
                    {affiliateProducts.map(product => (
                      <div
                        key={product.id}
                        className="bg-stone-800/50 rounded-lg p-3 border border-amber-600/20 hover:border-amber-500/50 transition-all cursor-pointer"
                        onClick={() => trackAffiliateClick(product.id, product.affiliate_link)}
                      >
                        {product.product_image_url && (
                          <img 
                            src={product.product_image_url} 
                            className="w-full h-32 object-cover rounded-lg mb-2" 
                            alt={product.product_name}
                          />
                        )}
                        <h4 className="text-amber-100 font-semibold text-sm mb-1">{product.product_name}</h4>
                        {product.description && (
                          <p className="text-amber-400/70 text-xs line-clamp-2 mb-2">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          {product.price && (
                            <span className="text-green-400 font-bold">${product.price}</span>
                          )}
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}