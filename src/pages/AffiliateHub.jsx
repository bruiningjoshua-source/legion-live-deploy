import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Megaphone, 
  DollarSign, 
  TrendingUp, 
  Radio,
  ShoppingBag,
  Users,
  Target,
  Zap,
  ArrowRight,
  Star,
  CheckCircle,
  Clock,
  BarChart3,
  Wallet,
  Video,
  Eye,
  Gift,
  Play
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AffiliateVideoUpload from '@/components/affiliate/AffiliateVideoUpload';

const TIER_BENEFITS = {
  bronze: { color: 'amber', minSales: 0, bonus: 0 },
  silver: { color: 'gray', minSales: 5000, bonus: 2 },
  gold: { color: 'yellow', minSales: 25000, bonus: 5 },
  platinum: { color: 'blue', minSales: 100000, bonus: 8 },
  elite: { color: 'purple', minSales: 500000, bonus: 12 }
};

export default function AffiliateHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showVideoUpload, setShowVideoUpload] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: partner } = useQuery({
    queryKey: ['affiliate-partner', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const partners = await base44.entities.AffiliatePartner.filter({ user_email: user.email }, null, 1);
      return partners[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: activeCampaigns = [] } = useQuery({
    queryKey: ['active-campaigns'],
    queryFn: () => base44.entities.LiveCampaign.filter({ status: 'active' }, '-created_date', 50)
  });

  const { data: myCampaigns = [] } = useQuery({
    queryKey: ['my-affiliate-campaigns', partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const campaigns = await base44.entities.LiveCampaign.filter({ status: 'active' });
      return campaigns.filter(c => c.assigned_partners?.includes(partner.id));
    },
    enabled: !!partner?.id
  });

  const { data: myStreams = [] } = useQuery({
    queryKey: ['my-affiliate-streams', partner?.id],
    queryFn: () => base44.entities.AffiliateLiveStream.filter({ partner_id: partner.id }, '-created_date', 20),
    enabled: !!partner?.id
  });

  const { data: mySales = [] } = useQuery({
    queryKey: ['my-affiliate-sales', partner?.id],
    queryFn: () => base44.entities.AffiliateSale.filter({ partner_id: partner.id }, '-created_date', 100),
    enabled: !!partner?.id
  });

  const { data: myVideos = [] } = useQuery({
    queryKey: ['affiliate-videos', partner?.id],
    queryFn: () => base44.entities.AffiliateVideo.filter({ partner_id: partner.id }, '-created_date', 50),
    enabled: !!partner?.id
  });

  const applyToPartnerMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.AffiliatePartner.create({
        user_email: user.email,
        display_name: user.full_name || 'Partner',
        status: 'pending',
        tier: 'bronze',
        partner_cut_percent: 75,
        platform_cut_percent: 25
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-partner']);
      toast.success('Application submitted! We\'ll review it shortly.');
    }
  });

  const joinCampaignMutation = useMutation({
    mutationFn: async (campaignId) => {
      const campaign = activeCampaigns.find(c => c.id === campaignId);
      if (!campaign) throw new Error('Campaign not found');
      
      const currentPartners = campaign.assigned_partners || [];
      if (currentPartners.length >= campaign.max_partners) {
        throw new Error('Campaign is full');
      }
      
      await base44.entities.LiveCampaign.update(campaignId, {
        assigned_partners: [...currentPartners, partner.id]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-affiliate-campaigns']);
      queryClient.invalidateQueries(['active-campaigns']);
      toast.success('Joined campaign! Start streaming to earn.');
    },
    onError: (error) => toast.error(error.message)
  });

  const totalEarnings = partner?.total_earnings_usd || 0;
  const pendingPayout = partner?.pending_payout_usd || 0;
  const totalSales = mySales.reduce((sum, s) => sum + s.sale_amount_usd, 0);
  const confirmedSales = mySales.filter(s => s.status === 'confirmed').length;

  // Not a partner yet - show application
  if (!partner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-green-600/20 border border-green-500/30 rounded-full px-6 py-3 mb-6">
              <Megaphone className="w-5 h-5 text-green-400" />
              <span className="text-green-200 font-semibold">Legion Affiliate Network</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-amber-100 mb-4">
              Turn Your Influence Into Income
            </h1>
            <p className="text-xl text-amber-400/70 max-w-2xl mx-auto">
              Partner with proven brands. Stream live campaigns. Keep 75% of everything you sell.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Radio, title: 'Solo Streaming Only', desc: 'Focused, high-converting live streams' },
              { icon: DollarSign, title: '75% Earnings', desc: 'Keep most of what you sell (minus taxes)' },
              { icon: Target, title: 'Proven Products', desc: 'Vetted brands with real demand' }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-stone-800/30 border-green-600/30 h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-7 h-7 text-green-400" />
                    </div>
                    <h3 className="text-amber-100 font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-amber-400/70 text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-amber-100 mb-4">Ready to Start Earning?</h2>
              <p className="text-amber-400/70 mb-6">
                Apply now and get approved within 24-48 hours. Once approved, browse live campaigns and start streaming.
              </p>
              <Button
                onClick={() => applyToPartnerMutation.mutate()}
                disabled={applyToPartnerMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
              >
                {applyToPartnerMutation.isPending ? 'Submitting...' : 'Apply to Join'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Pending approval
  if (partner.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12 flex items-center justify-center">
        <Card className="bg-stone-800/30 border-amber-600/20 max-w-md">
          <CardContent className="p-8 text-center">
            <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-amber-100 mb-2">Application Under Review</h2>
            <p className="text-amber-400/70 mb-4">
              Your affiliate partner application is being reviewed. You'll be notified once approved.
            </p>
            <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30">
              Usually 24-48 hours
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active partner dashboard
  const tierInfo = TIER_BENEFITS[partner.tier] || TIER_BENEFITS.bronze;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-green-500" />
              Affiliate Hub
            </h1>
            <p className="text-amber-400/70">Live campaign streaming platform</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={`bg-${tierInfo.color}-600/20 text-${tierInfo.color}-300 border-${tierInfo.color}-500/30 px-4 py-2 text-lg`}>
              <Star className="w-4 h-4 mr-2" />
              {partner.tier.toUpperCase()} Partner
            </Badge>
            <Button onClick={() => setShowVideoUpload(true)} variant="outline" className="border-green-600/30 text-green-300">
              <Video className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
            <Link to={createPageUrl('AffiliateGoLive')}>
              <Button className="bg-red-600 hover:bg-red-700">
                <Radio className="w-4 h-4 mr-2" />
                Go Live
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400/70 text-sm">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-300">${totalEarnings.toFixed(2)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Pending Payout</p>
                  <p className="text-2xl font-bold text-amber-100">${pendingPayout.toFixed(2)}</p>
                </div>
                <Wallet className="w-10 h-10 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Total Sales</p>
                  <p className="text-2xl font-bold text-amber-100">${totalSales.toFixed(2)}</p>
                </div>
                <ShoppingBag className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Conversions</p>
                  <p className="text-2xl font-bold text-amber-100">{confirmedSales}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1 rounded-xl mb-6">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              Browse Campaigns
            </TabsTrigger>
            <TabsTrigger value="my-campaigns" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              My Campaigns ({myCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              My Videos ({myVideos.length})
            </TabsTrigger>
            <TabsTrigger value="streams" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              My Streams
            </TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-amber-300 rounded-lg">
              Payouts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to={createPageUrl('AffiliateGoLive')} className="block">
                    <Button className="w-full bg-red-600 hover:bg-red-700 justify-between">
                      <span className="flex items-center gap-2">
                        <Radio className="w-4 h-4" />
                        Start Affiliate Stream
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => setActiveTab('campaigns')}
                    variant="outline" 
                    className="w-full border-amber-600/30 text-amber-300 justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Browse New Campaigns
                    </span>
                    <Badge className="bg-green-600/20 text-green-300">{activeCampaigns.length} Active</Badge>
                  </Button>
                </CardContent>
              </Card>

              {/* Tier Progress */}
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100">Partner Tier</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-full bg-${tierInfo.color}-600/20 flex items-center justify-center`}>
                      <Star className={`w-8 h-8 text-${tierInfo.color}-400`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-amber-100 capitalize">{partner.tier}</p>
                      <p className="text-amber-400/70 text-sm">+{tierInfo.bonus}% bonus commission</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-amber-400/70">
                    <p>• Base rate: 75% of commissions</p>
                    <p>• Tier bonus: +{tierInfo.bonus}%</p>
                    <p>• Your effective rate: {75 + tierInfo.bonus}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCampaigns.map((campaign, i) => {
                const isJoined = campaign.assigned_partners?.includes(partner.id);
                const spotsLeft = campaign.max_partners - (campaign.assigned_partners?.length || 0);
                
                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="bg-stone-800/30 border-amber-600/20 overflow-hidden h-full">
                      {campaign.product_image_url && (
                        <div className="aspect-video bg-stone-900">
                          <img src={campaign.product_image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-amber-400/70 text-xs">{campaign.brand_name}</p>
                            <h3 className="text-amber-100 font-bold">{campaign.campaign_name}</h3>
                          </div>
                          <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                            {campaign.commission_rate}%
                          </Badge>
                        </div>
                        
                        <p className="text-amber-400/70 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                          <div className="bg-stone-900/50 rounded-lg p-2">
                            <p className="text-amber-400/60">Product Price</p>
                            <p className="text-amber-100 font-bold">${campaign.product_price_usd}</p>
                          </div>
                          <div className="bg-stone-900/50 rounded-lg p-2">
                            <p className="text-amber-400/60">Your Earnings</p>
                            <p className="text-green-400 font-bold">
                              ${((campaign.product_price_usd * campaign.commission_rate / 100) * 0.75).toFixed(2)}/sale
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-amber-400/60 text-xs">
                            {spotsLeft} spots left
                          </span>
                          {isJoined ? (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Joined
                            </Badge>
                          ) : (
                            <Button
                              onClick={() => joinCampaignMutation.mutate(campaign.id)}
                              disabled={spotsLeft <= 0 || joinCampaignMutation.isPending}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Join Campaign
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

              {activeCampaigns.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Target className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                  <p className="text-amber-400/70">No active campaigns at the moment</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-campaigns">
            {myCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="bg-stone-800/30 border-green-600/30">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {campaign.product_image_url && (
                          <img src={campaign.product_image_url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                        )}
                        <div className="flex-1">
                          <p className="text-green-400 text-xs">{campaign.brand_name}</p>
                          <h3 className="text-amber-100 font-bold mb-2">{campaign.campaign_name}</h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-amber-400/70">
                              {campaign.commission_rate}% commission
                            </span>
                            {campaign.promo_code && (
                              <Badge className="bg-amber-600/20 text-amber-300">
                                Code: {campaign.promo_code}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Link to={createPageUrl(`AffiliateGoLive?campaign=${campaign.id}`)}>
                          <Button className="bg-red-600 hover:bg-red-700">
                            <Radio className="w-4 h-4 mr-2" />
                            Stream
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                  <h3 className="text-amber-100 font-semibold mb-2">No Campaigns Yet</h3>
                  <p className="text-amber-400/70 mb-4">Browse and join campaigns to start earning</p>
                  <Button onClick={() => setActiveTab('campaigns')} className="bg-green-600 hover:bg-green-700">
                    Browse Campaigns
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="videos">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-amber-100 font-semibold">My Product/Service Videos</h2>
              <Button onClick={() => setShowVideoUpload(true)} className="bg-green-600 hover:bg-green-700">
                <Video className="w-4 h-4 mr-2" />
                Upload New
              </Button>
            </div>
            {myVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myVideos.map((video, i) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="bg-stone-800/30 border-amber-600/20 overflow-hidden">
                      <div className={`relative bg-stone-900 ${video.video_type === 'short' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-8 h-8 text-amber-400/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                        <Badge className="absolute top-2 left-2 bg-green-600 text-white text-xs">
                          {video.brand_name}
                        </Badge>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="text-amber-100 font-semibold text-sm line-clamp-2 mb-2">{video.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-amber-400/70">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {video.view_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            {video.gift_count || 0}
                          </span>
                          <span className="text-green-400">
                            {video.total_gifts_denarii || 0} 🪙
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="py-12 text-center">
                  <Video className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                  <h3 className="text-amber-100 font-semibold mb-2">No Videos Yet</h3>
                  <p className="text-amber-400/70 mb-4">Upload product reviews and demos to the Amphitheatre</p>
                  <Button onClick={() => setShowVideoUpload(true)} className="bg-green-600 hover:bg-green-700">
                    Upload First Video
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="streams">
            {myStreams.length > 0 ? (
              <div className="space-y-4">
                {myStreams.map((stream) => (
                  <Card key={stream.id} className="bg-stone-800/30 border-amber-600/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-amber-100 font-semibold">{stream.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-amber-400/70">
                            <span>{stream.viewer_count} viewers</span>
                            <span>{stream.conversions} sales</span>
                            <span className="text-green-400">${stream.total_earnings_usd?.toFixed(2)} earned</span>
                          </div>
                        </div>
                        <Badge className={stream.status === 'live' ? 'bg-red-500' : 'bg-stone-600'}>
                          {stream.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="py-12 text-center">
                  <Radio className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                  <h3 className="text-amber-100 font-semibold mb-2">No Streams Yet</h3>
                  <p className="text-amber-400/70">Start streaming to build your earnings history</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payouts">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Payout Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-900/20 border border-green-600/30 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-400/70 text-sm">Available for Payout</p>
                      <p className="text-3xl font-bold text-green-300">${pendingPayout.toFixed(2)}</p>
                    </div>
                    <Button 
                      disabled={pendingPayout < 50}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Request Payout
                    </Button>
                  </div>
                  {pendingPayout < 50 && (
                    <p className="text-amber-400/70 text-xs mt-4">Minimum payout: $50</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-stone-900/50 rounded-xl">
                    <p className="text-amber-200 font-semibold mb-2">Revenue Split</p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-green-600/30 h-4 rounded-full" style={{ width: '75%' }}>
                        <div className="bg-green-500 h-full rounded-full" />
                      </div>
                      <span className="text-green-400 font-bold">75%</span>
                    </div>
                    <p className="text-amber-400/60 text-xs mt-2">You keep 75% of commissions (minus applicable taxes)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Video Upload Modal */}
      <AffiliateVideoUpload
        isOpen={showVideoUpload}
        onClose={() => setShowVideoUpload(false)}
        partnerId={partner?.id}
        onSuccess={() => queryClient.invalidateQueries(['affiliate-videos'])}
      />
    </div>
  );
}