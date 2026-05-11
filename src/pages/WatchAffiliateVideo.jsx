import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Play, 
  ThumbsUp, 
  Share2, 
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  Gift,
  Eye,
  Tag,
  User,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import MarketplaceGiftPanel from '@/components/affiliate/MarketplaceGiftPanel';
import AffiliateVideoInfoSection from '@/components/affiliate/AffiliateVideoInfoSection';

export default function WatchAffiliateVideo() {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('id');
  const queryClient = useQueryClient();
  
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: video, isLoading } = useQuery({
    queryKey: ['affiliate-video', videoId],
    queryFn: async () => {
      const videos = await base44.entities.AffiliateVideo.filter({ id: videoId }, null, 1);
      return videos[0] || null;
    },
    enabled: !!videoId
  });

  const { data: partner } = useQuery({
    queryKey: ['video-partner', video?.partner_id],
    queryFn: async () => {
      const partners = await base44.entities.AffiliatePartner.filter({ id: video.partner_id }, null, 1);
      return partners[0] || null;
    },
    enabled: !!video?.partner_id
  });

  const { data: relatedVideos = [] } = useQuery({
    queryKey: ['related-affiliate-videos', video?.category],
    queryFn: async () => {
      const videos = await base44.entities.AffiliateVideo.filter({ 
        category: video.category, 
        is_published: true 
      }, '-view_count', 10);
      return videos.filter(v => v.id !== videoId);
    },
    enabled: !!video?.category
  });

  // Track view
  useEffect(() => {
    if (video?.id) {
      base44.entities.AffiliateVideo.update(video.id, {
        view_count: (video.view_count || 0) + 1
      }).catch(() => {});
    }
  }, [video?.id]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.AffiliateVideo.update(video.id, {
        like_count: (video.like_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-video', videoId] });
      toast.success('Liked!');
    }
  });

  const trackClickMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.AffiliateVideo.update(video.id, {
        click_count: (video.click_count || 0) + 1
      });
    }
  });

  const copyPromoCode = () => {
    if (video?.promo_code) {
      navigator.clipboard.writeText(video.promo_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success('Promo code copied!');
    }
  };

  const handleProductClick = () => {
    trackClickMutation.mutate();
    window.open(video.product_link, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 pt-20 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-stone-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-green-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Video Not Found</h1>
          <Link to={createPageUrl('TheAmphitheatre')}>
            <Button className="bg-amber-600 hover:bg-amber-700">Back to Amphitheatre</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-16 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <Link to={createPageUrl('TheAmphitheatre')}>
          <Button variant="ghost" className="text-amber-400 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Amphitheatre
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <div className={`relative bg-black rounded-xl overflow-hidden ${video.video_type === 'short' ? 'aspect-[9/16] max-w-sm mx-auto' : 'aspect-video'}`}>
              {video.video_url ? (
                <video
                  src={video.video_url}
                  controls
                  className="w-full h-full object-contain"
                  poster={video.thumbnail_url}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-16 h-16 text-green-400/50" />
                </div>
              )}
            </div>

            {/* Title & Meta */}
            <div>
              <div className="flex items-start gap-3 mb-3">
                <Badge className="bg-green-600 text-white">{video.brand_name}</Badge>
                {video.category && (
                  <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">{video.category}</Badge>
                )}
                {video.product_type && (
                  <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                    {video.product_type.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-amber-100 mb-2">{video.title}</h1>
              <div className="flex items-center gap-4 text-sm text-amber-400/70">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {(video.view_count || 0).toLocaleString()} views
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  {video.like_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Gift className="w-4 h-4" />
                  {video.gift_count || 0} gifts
                </span>
              </div>
            </div>

            {/* Partner Info */}
            {partner && (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center overflow-hidden">
                    {partner.avatar_url ? (
                      <img src={partner.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-100 font-semibold">{partner.display_name}</p>
                    <Badge className={`bg-${partner.tier === 'gold' ? 'yellow' : partner.tier === 'platinum' ? 'blue' : 'amber'}-600/20 text-${partner.tier === 'gold' ? 'yellow' : partner.tier === 'platinum' ? 'blue' : 'amber'}-300 text-xs`}>
                      {partner.tier?.toUpperCase()} Partner
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {video.description && (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="p-4">
                  <p className="text-amber-100/80 whitespace-pre-wrap">{video.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Custom Info Section */}
            <AffiliateVideoInfoSection video={video} />

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button onClick={() => likeMutation.mutate()} variant="outline" className="border-amber-600/30 text-amber-300">
                <ThumbsUp className="w-4 h-4 mr-2" />
                Like
              </Button>
              <Button onClick={() => setShowGiftPanel(true)} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                <Gift className="w-4 h-4 mr-2" />
                Send Gift
              </Button>
              <Button variant="outline" className="border-amber-600/30 text-amber-300">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Product Card */}
            <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-green-300 font-bold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Featured Product
                </h3>
                
                {video.price_usd > 0 && (
                  <div className="text-3xl font-bold text-amber-100">
                    ${video.price_usd}
                    {video.discount_info && (
                      <span className="text-green-400 text-sm ml-2">{video.discount_info}</span>
                    )}
                  </div>
                )}

                {video.promo_code && (
                  <div>
                    <p className="text-amber-400/70 text-xs mb-2 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Promo Code
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-green-900/50 border border-green-600/30 px-3 py-2 rounded-lg text-green-300 font-mono">
                        {video.promo_code}
                      </code>
                      <Button onClick={copyPromoCode} size="sm" className="bg-green-600 hover:bg-green-700">
                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {video.product_link && (
                  <Button
                    onClick={handleProductClick}
                    className="w-full bg-green-600 hover:bg-green-700 py-6"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Shop Now
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Related Videos */}
            {relatedVideos.length > 0 && (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="p-4">
                  <h3 className="text-amber-100 font-semibold mb-4">More Products</h3>
                  <div className="space-y-3">
                    {relatedVideos.slice(0, 5).map(rv => (
                      <Link key={rv.id} to={createPageUrl(`WatchAffiliateVideo?id=${rv.id}`)}>
                        <div className="flex gap-3 p-2 rounded-lg hover:bg-stone-700/30 transition-colors">
                          <div className="w-24 h-16 rounded bg-stone-700 overflow-hidden flex-shrink-0">
                            {rv.thumbnail_url ? (
                              <img src={rv.thumbnail_url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-green-400/30" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-amber-100 text-sm font-medium line-clamp-2">{rv.title}</p>
                            <p className="text-green-400 text-xs">{rv.brand_name}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Marketplace Gift Panel */}
      <MarketplaceGiftPanel
        isOpen={showGiftPanel}
        onClose={() => setShowGiftPanel(false)}
        partnerId={video?.partner_id}
        videoId={video?.id}
        onGiftSent={() => queryClient.invalidateQueries({ queryKey: ['affiliate-video', videoId] })}
      />
    </div>
  );
}