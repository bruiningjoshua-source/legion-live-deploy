import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Megaphone, DollarSign, TrendingUp, Radio, ShoppingBag, Users,
  Target, ArrowRight, Star, CheckCircle, Clock, BarChart3, Wallet,
  Video, Eye, Gift, Play, Sparkles, Store, Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AffiliateVideoUpload from '@/components/affiliate/AffiliateVideoUpload';

const TIER_BENEFITS = {
  bronze:   { minSales: 0,       bonus: 0,  color: 'amber'  },
  silver:   { minSales: 5000,    bonus: 2,  color: 'slate'  },
  gold:     { minSales: 25000,   bonus: 5,  color: 'yellow' },
  platinum: { minSales: 100000,  bonus: 8,  color: 'blue'   },
  elite:    { minSales: 500000,  bonus: 12, color: 'purple' },
};

const TIER_STYLES = {
  bronze:   'bg-amber-500/15 text-amber-300 border-amber-500/25',
  silver:   'bg-slate-500/15 text-slate-300 border-slate-500/25',
  gold:     'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
  platinum: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  elite:    'bg-purple-500/15 text-purple-300 border-purple-500/25',
};

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-amber-700/20 p-4 flex items-center justify-between" style={{ background: 'rgba(20,15,6,0.7)' }}>
      <div>
        <p className="text-amber-600/60 text-xs font-medium mb-1">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

export default function AffiliateHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showVideoUpload, setShowVideoUpload] = useState(false);

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: partner } = useQuery({
    queryKey: ['affiliate-partner', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const r = await base44.entities.AffiliatePartner.filter({ user_email: user.email }, null, 1);
      return r[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: activeCampaigns = [] } = useQuery({
    queryKey: ['active-campaigns'],
    queryFn: () => base44.entities.LiveCampaign.filter({ status: 'active' }, '-created_date', 50),
  });

  const { data: myCampaigns = [] } = useQuery({
    queryKey: ['my-affiliate-campaigns', partner?.id],
    queryFn: async () => {
      const campaigns = await base44.entities.LiveCampaign.filter({ status: 'active' });
      return campaigns.filter(c => c.assigned_partners?.includes(partner.id));
    },
    enabled: !!partner?.id,
  });

  const { data: myStreams = [] } = useQuery({
    queryKey: ['my-affiliate-streams', partner?.id],
    queryFn: () => base44.entities.AffiliateLiveStream.filter({ partner_id: partner.id }, '-created_date', 20),
    enabled: !!partner?.id,
  });

  const { data: mySales = [] } = useQuery({
    queryKey: ['my-affiliate-sales', partner?.id],
    queryFn: () => base44.entities.AffiliateSale.filter({ partner_id: partner.id }, '-created_date', 100),
    enabled: !!partner?.id,
  });

  const { data: myVideos = [] } = useQuery({
    queryKey: ['affiliate-videos', partner?.id],
    queryFn: () => base44.entities.AffiliateVideo.filter({ partner_id: partner.id }, '-created_date', 50),
    enabled: !!partner?.id,
  });

  const applyMutation = useMutation({
    mutationFn: () => base44.entities.AffiliatePartner.create({
      user_email: user.email,
      display_name: user.full_name || 'Partner',
      status: 'pending',
      tier: 'bronze',
      partner_cut_percent: 75,
      platform_cut_percent: 25,
    }),
    onSuccess: () => { queryClient.invalidateQueries(['affiliate-partner']); toast.success('Application submitted!'); },
  });

  const joinCampaignMutation = useMutation({
    mutationFn: async (campaignId) => {
      const campaign = activeCampaigns.find(c => c.id === campaignId);
      if (!campaign) throw new Error('Campaign not found');
      const current = campaign.assigned_partners || [];
      if (current.length >= campaign.max_partners) throw new Error('Campaign is full');
      await base44.entities.LiveCampaign.update(campaignId, { assigned_partners: [...current, partner.id] });
    },
    onSuccess: () => { queryClient.invalidateQueries(['my-affiliate-campaigns', 'active-campaigns']); toast.success('Joined campaign!'); },
    onError: (e) => toast.error(e.message),
  });

  const totalEarnings = partner?.total_earnings_usd || 0;
  const pendingPayout = partner?.pending_payout_usd || 0;
  const totalSales = mySales.reduce((sum, s) => sum + (s.sale_amount_usd || 0), 0);
  const confirmedSales = mySales.filter(s => s.status === 'confirmed').length;

  // ── Not a partner yet ──
  if (!partner) {
    return (
      <div className="min-h-screen pt-16 pb-24" style={{ background: 'linear-gradient(180deg, #0d0a05 0%, #0f0c07 50%, #0a0804 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 pt-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-4">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400/70" />
              <span className="text-emerald-400/70 text-[10px] font-black uppercase tracking-[0.2em]">Merchant Program · MMXXVI</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 via-emerald-400 to-green-600">MERCHANT</span>
              <span className="text-white/80 ml-3">HUB</span>
            </h1>
            <p className="text-white/40 text-base max-w-lg mx-auto">
              Partner with proven brands. Stream live campaigns. Keep <strong className="text-emerald-400">75%</strong> of everything you sell.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Radio,       title: 'Live Commerce',    desc: 'High-converting affiliate streams' },
              { icon: DollarSign,  title: '75% Earnings',     desc: 'Keep most of what you sell'        },
              { icon: Target,      title: 'Proven Products',  desc: 'Vetted brands with real demand'    },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-emerald-700/20 p-5 text-center"
                style={{ background: 'rgba(20,15,6,0.8)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-white/35 text-xs">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="rounded-2xl border border-emerald-700/20 p-6 text-center" style={{ background: 'rgba(20,15,6,0.8)' }}>
            <h2 className="text-xl font-black text-white mb-2">Ready to Start Earning?</h2>
            <p className="text-white/40 text-sm mb-5">Apply now and get approved within 24–48 hours.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-600/35 text-emerald-300 font-bold text-sm transition-all disabled:opacity-50"
              >
                {applyMutation.isPending ? 'Submitting...' : 'Apply to Join'}
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link to={createPageUrl('AffiliateMarketplace')}>
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 text-white/60 font-bold text-sm transition-all">
                  <Store className="w-4 h-4" />
                  Browse Marketplace
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending ──
  if (partner.status === 'pending') {
    return (
      <div className="min-h-screen pt-16 pb-24 flex items-center justify-center" style={{ background: '#0d0a05' }}>
        <div className="max-w-md w-full mx-4 rounded-2xl border border-amber-700/25 p-8 text-center" style={{ background: 'rgba(20,15,6,0.9)' }}>
          <Clock className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">Under Review</h2>
          <p className="text-white/40 text-sm mb-5">Your application is being reviewed by the Senate. Usually 24–48 hours.</p>
          <span className="inline-block bg-amber-500/15 text-amber-300 border border-amber-500/25 px-4 py-1.5 rounded-full text-xs font-bold">Pending Approval</span>
        </div>
      </div>
    );
  }

  // ── Active partner dashboard ──
  const tierInfo = TIER_BENEFITS[partner.tier] || TIER_BENEFITS.bronze;
  const tierStyle = TIER_STYLES[partner.tier] || TIER_STYLES.bronze;

  return (
    <div className="min-h-screen pt-16 pb-24" style={{ background: 'linear-gradient(180deg, #0d0a05 0%, #0f0c07 50%, #0a0804 100%)' }}>
      <div className="max-w-7xl mx-auto px-4">

        {/* ── Header ── */}
        <div className="pt-8 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-3">
              <Sparkles className="w-3 h-3 text-emerald-400/70" />
              <span className="text-emerald-400/70 text-[10px] font-black uppercase tracking-widest">Merchant Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-400">MERCHANT</span>
              <span className="text-white/80 ml-2">HUB</span>
            </h1>
            <p className="text-white/30 text-sm mt-0.5">Campaigns · Streams · Earnings</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${tierStyle}`}>
              <Star className="w-3 h-3" />
              {partner.tier.toUpperCase()} Partner
            </span>
            <Link to={createPageUrl('AffiliateMarketplace')}>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 text-white/60 text-xs font-bold transition-all">
                <Store className="w-3.5 h-3.5" /> Marketplace
              </button>
            </Link>
            <button onClick={() => setShowVideoUpload(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 text-white/60 text-xs font-bold transition-all">
              <Video className="w-3.5 h-3.5" /> Upload Video
            </button>
            <Link to={createPageUrl('AffiliateGoLive')}>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-300 text-xs font-bold transition-all">
                <Radio className="w-3.5 h-3.5" /> Go Live
              </button>
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Earnings"  value={`$${totalEarnings.toFixed(2)}`}    icon={DollarSign}  color="bg-emerald-500/15 text-emerald-400" />
          <StatCard label="Pending Payout"  value={`$${pendingPayout.toFixed(2)}`}    icon={Wallet}      color="bg-amber-500/15 text-amber-400"    />
          <StatCard label="Total Sales"     value={`$${totalSales.toFixed(2)}`}        icon={ShoppingBag} color="bg-blue-500/15 text-blue-400"      />
          <StatCard label="Conversions"     value={confirmedSales}                     icon={TrendingUp}  color="bg-purple-500/15 text-purple-400"  />
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto scrollbar-hide mb-5">
            <TabsList className="inline-flex bg-amber-900/20 border border-amber-700/25 p-1 rounded-xl gap-0.5 h-auto min-w-max">
              {[
                { value: 'dashboard',    label: 'Dashboard'                 },
                { value: 'campaigns',    label: 'Campaigns'                 },
                { value: 'my-campaigns', label: `Mine (${myCampaigns.length})` },
                { value: 'videos',       label: `Videos (${myVideos.length})`  },
                { value: 'streams',      label: 'Streams'                   },
                { value: 'payouts',      label: 'Payouts'                   },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 data-[state=active]:border data-[state=active]:border-emerald-500/25 rounded-lg px-4 py-2 text-white/40 hover:text-white/70 text-xs font-bold whitespace-nowrap transition-all"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-amber-700/20 p-5" style={{ background: 'rgba(20,15,6,0.7)' }}>
                <h3 className="text-amber-200/80 font-bold text-sm mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link to={createPageUrl('AffiliateGoLive')} className="block">
                    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-600/25 text-red-300 font-bold text-sm transition-all">
                      <span className="flex items-center gap-2"><Radio className="w-4 h-4" />Start Affiliate Stream</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => setActiveTab('campaigns')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-300 font-bold text-sm transition-all"
                  >
                    <span className="flex items-center gap-2"><Target className="w-4 h-4" />Browse Campaigns</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">{activeCampaigns.length} Active</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-700/20 p-5" style={{ background: 'rgba(20,15,6,0.7)' }}>
                <h3 className="text-amber-200/80 font-bold text-sm mb-4">Partner Tier</h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${tierStyle}`}>
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-black text-base capitalize">{partner.tier}</p>
                    <p className="text-amber-500/50 text-xs">+{tierInfo.bonus}% bonus commission</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-amber-600/50">
                  <p>• Base rate: 75% of commissions</p>
                  <p>• Tier bonus: +{tierInfo.bonus}%</p>
                  <p>• Effective rate: <span className="text-emerald-400 font-bold">{75 + tierInfo.bonus}%</span></p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Browse Campaigns */}
          <TabsContent value="campaigns">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCampaigns.map((campaign, i) => {
                const isJoined = campaign.assigned_partners?.includes(partner.id);
                const spotsLeft = campaign.max_partners - (campaign.assigned_partners?.length || 0);
                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    className="rounded-2xl border border-amber-700/20 overflow-hidden"
                    style={{ background: 'rgba(20,15,6,0.8)' }}
                  >
                    {campaign.product_image_url && (
                      <div className="aspect-video bg-black/30">
                        <img src={campaign.product_image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-amber-600/60 text-[10px] font-bold uppercase">{campaign.brand_name}</p>
                          <h3 className="text-white font-bold text-sm">{campaign.campaign_name}</h3>
                        </div>
                        <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[10px] font-black px-2 py-0.5 rounded-full">
                          {campaign.commission_rate}%
                        </span>
                      </div>
                      <p className="text-white/35 text-xs mb-3 line-clamp-2">{campaign.description}</p>
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div className="bg-black/20 rounded-lg p-2">
                          <p className="text-amber-600/50 text-[10px]">Price</p>
                          <p className="text-white font-bold">${campaign.product_price_usd}</p>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2">
                          <p className="text-amber-600/50 text-[10px]">Your Earn</p>
                          <p className="text-emerald-400 font-bold">
                            ${((campaign.product_price_usd * campaign.commission_rate / 100) * 0.75).toFixed(2)}/sale
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-amber-600/40 text-[10px]">{spotsLeft} spots left</span>
                        {isJoined ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                            <CheckCircle className="w-3.5 h-3.5" /> Joined
                          </span>
                        ) : (
                          <button
                            onClick={() => joinCampaignMutation.mutate(campaign.id)}
                            disabled={spotsLeft <= 0 || joinCampaignMutation.isPending}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-300 text-xs font-bold transition-all disabled:opacity-40"
                          >
                            Join Campaign
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {activeCampaigns.length === 0 && (
                <div className="col-span-full text-center py-16 text-amber-600/40">
                  <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  No active campaigns at the moment.
                </div>
              )}
            </div>
          </TabsContent>

          {/* My Campaigns */}
          <TabsContent value="my-campaigns">
            {myCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myCampaigns.map(campaign => (
                  <div key={campaign.id} className="rounded-2xl border border-emerald-700/20 p-4" style={{ background: 'rgba(20,15,6,0.7)' }}>
                    <div className="flex items-start gap-3">
                      {campaign.product_image_url && (
                        <img src={campaign.product_image_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-emerald-400/60 text-[10px] font-bold uppercase">{campaign.brand_name}</p>
                        <h3 className="text-white font-bold text-sm mb-1 truncate">{campaign.campaign_name}</h3>
                        <p className="text-amber-600/50 text-xs">{campaign.commission_rate}% commission</p>
                        {campaign.promo_code && (
                          <span className="inline-block mt-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            Code: {campaign.promo_code}
                          </span>
                        )}
                      </div>
                      <Link to={createPageUrl(`AffiliateGoLive?campaign=${campaign.id}`)}>
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-600/25 text-red-300 text-xs font-bold transition-all shrink-0">
                          <Radio className="w-3.5 h-3.5" /> Stream
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 rounded-2xl border border-amber-700/15" style={{ background: 'rgba(20,15,6,0.5)' }}>
                <ShoppingBag className="w-10 h-10 text-amber-500/20 mx-auto mb-3" />
                <h3 className="text-white/70 font-bold mb-1">No Campaigns Joined</h3>
                <p className="text-amber-600/40 text-sm mb-4">Browse and join campaigns to start earning</p>
                <button onClick={() => setActiveTab('campaigns')} className="px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-600/30 text-emerald-300 text-sm font-bold transition-all">
                  Browse Campaigns
                </button>
              </div>
            )}
          </TabsContent>

          {/* Videos */}
          <TabsContent value="videos">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white/70 font-bold text-sm">My Product Videos</h2>
              <button onClick={() => setShowVideoUpload(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-600/30 text-emerald-300 text-xs font-bold transition-all">
                <Video className="w-3.5 h-3.5" /> Upload
              </button>
            </div>
            {myVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myVideos.map((video, i) => (
                  <motion.div key={video.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="rounded-2xl border border-amber-700/20 overflow-hidden" style={{ background: 'rgba(20,15,6,0.7)' }}>
                    <div className={`relative bg-black/30 ${video.video_type === 'short' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-amber-500/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-10 h-10 text-white" />
                      </div>
                      {video.brand_name && (
                        <span className="absolute top-2 left-2 bg-emerald-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{video.brand_name}</span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-white/80 font-semibold text-xs line-clamp-2 mb-2">{video.title}</h3>
                      <div className="flex items-center gap-3 text-[10px] text-amber-600/50">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{video.view_count || 0}</span>
                        <span className="flex items-center gap-1"><Gift className="w-3 h-3" />{video.gift_count || 0}</span>
                        <span className="text-emerald-400">{video.total_gifts_denarii || 0} 🪙</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 rounded-2xl border border-amber-700/15" style={{ background: 'rgba(20,15,6,0.5)' }}>
                <Video className="w-10 h-10 text-amber-500/20 mx-auto mb-3" />
                <h3 className="text-white/70 font-bold mb-1">No Videos Yet</h3>
                <p className="text-amber-600/40 text-sm mb-4">Upload product reviews to the Colosseum</p>
                <button onClick={() => setShowVideoUpload(true)} className="px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-600/30 text-emerald-300 text-sm font-bold">Upload First Video</button>
              </div>
            )}
          </TabsContent>

          {/* Streams */}
          <TabsContent value="streams">
            {myStreams.length > 0 ? (
              <div className="space-y-3">
                {myStreams.map(stream => (
                  <div key={stream.id} className="rounded-xl border border-amber-700/20 p-4 flex items-center justify-between" style={{ background: 'rgba(20,15,6,0.7)' }}>
                    <div>
                      <h3 className="text-white/80 font-semibold text-sm">{stream.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-[10px] text-amber-600/50">
                        <span>{stream.viewer_count || 0} viewers</span>
                        <span>{stream.conversions || 0} sales</span>
                        <span className="text-emerald-400">${stream.total_earnings_usd?.toFixed(2) || '0.00'} earned</span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      stream.status === 'live'
                        ? 'bg-red-500/15 text-red-400 border-red-500/25'
                        : 'bg-white/5 text-white/40 border-white/10'
                    }`}>
                      {stream.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 rounded-2xl border border-amber-700/15" style={{ background: 'rgba(20,15,6,0.5)' }}>
                <Radio className="w-10 h-10 text-amber-500/20 mx-auto mb-3" />
                <h3 className="text-white/70 font-bold mb-1">No Streams Yet</h3>
                <p className="text-amber-600/40 text-sm">Start streaming to build your earnings history</p>
              </div>
            )}
          </TabsContent>

          {/* Payouts */}
          <TabsContent value="payouts">
            <div className="max-w-lg">
              <div className="rounded-2xl border border-emerald-700/20 p-6 mb-5" style={{ background: 'rgba(20,15,6,0.8)' }}>
                <p className="text-emerald-500/60 text-xs font-bold uppercase tracking-widest mb-1">Available for Payout</p>
                <p className="text-4xl font-black text-emerald-300 mb-4">${pendingPayout.toFixed(2)}</p>
                <button
                  disabled={pendingPayout < 50}
                  className="w-full py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-300 font-bold text-sm transition-all disabled:opacity-40"
                >
                  {pendingPayout < 50 ? `Need $${(50 - pendingPayout).toFixed(2)} more for payout` : 'Request Payout'}
                </button>
              </div>

              <div className="rounded-2xl border border-amber-700/20 p-5" style={{ background: 'rgba(20,15,6,0.7)' }}>
                <p className="text-amber-200/60 font-bold text-sm mb-3">Revenue Split</p>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" />
                  </div>
                  <span className="text-emerald-400 font-black text-sm">75%</span>
                </div>
                <p className="text-amber-600/40 text-xs">You keep 75% of commissions (minus applicable taxes)</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AffiliateVideoUpload
        isOpen={showVideoUpload}
        onClose={() => setShowVideoUpload(false)}
        partnerId={partner?.id}
        onSuccess={() => queryClient.invalidateQueries(['affiliate-videos'])}
      />
    </div>
  );
}