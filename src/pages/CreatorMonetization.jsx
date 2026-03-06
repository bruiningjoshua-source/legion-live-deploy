import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Crown,
  DollarSign,
  Users,
  TrendingUp,
  Lock,
  Unlock,
  Check,
  Sparkles,
  Settings,
  Shield,
  Heart,
  Trophy,
  Zap,
  Gift
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import formatCount from '@/components/shared/FormatCount';
import MonetizationShowcase from '@/components/monetization/MonetizationShowcase';
import ViewerSpendingIncentives from '@/components/monetization/ViewerSpendingIncentives';
import ReferralDashboard from '@/components/monetization/ReferralDashboard';
import CreatorPayoutOptimizer from '@/components/monetization/CreatorPayoutOptimizer';
import CustomTierEditor from '@/components/monetization/CustomTierEditor';
import LimitedTimeOfferManager from '@/components/monetization/LimitedTimeOfferManager';
import TipRewardManager from '@/components/monetization/TipRewardManager';
import MilestoneAlertManager from '@/components/monetization/MilestoneAlertManager';

export default function CreatorMonetization() {
  const queryClient = useQueryClient();
  const [tierSettings, setTierSettings] = useState({
    bronze: { price: 4.99, perks: ['Custom badge', 'Exclusive emotes'] },
    silver: { price: 9.99, perks: ['All Bronze perks', 'Ad-free viewing', 'Early access'] },
    gold: { price: 19.99, perks: ['All Silver perks', 'Priority chat', '1-on-1 Q&A'] }
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: subscription } = useQuery({
    queryKey: ['creator-subscription', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const subs = await base44.entities.CreatorSubscription.filter(
        { user_email: user.email, status: 'active' },
        '-created_date',
        1
      );
      return subs[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: subscribers = [] } = useQuery({
    queryKey: ['my-subscribers', creator?.id],
    queryFn: () => base44.entities.ViewerSubscription.filter({ creator_id: creator.id }),
    enabled: !!creator?.id && !!subscription
  });

  const { data: tips = [] } = useQuery({
    queryKey: ['my-tips', creator?.id],
    queryFn: () => base44.entities.Tip.filter({ receiver_creator_id: creator.id }, '-created_date', 50),
    enabled: !!creator?.id && !!subscription
  });

  const { data: customTiers = [] } = useQuery({
    queryKey: ['custom-tiers', user?.email],
    queryFn: () => base44.entities.CustomSubscriptionTier.filter({ creator_id: user.email }, 'tier_level'),
    enabled: !!user?.email && !!subscription
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planType) => {
      // Admins get instant lifetime access
      if (user?.role === 'admin') {
        const expiryDate = new Date(2099, 12, 31); // Lifetime for admins

        await base44.entities.CreatorSubscription.create({
          creator_id: creator.id,
          plan_type: 'admin_lifetime',
          status: 'active',
          start_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
          auto_renew: false,
          admin_activated: true
        });

        queryClient.invalidateQueries(['creator-subscription']);
        return;
      }

      if (window.self !== window.top) {
        throw new Error('IFRAME_BLOCKED');
      }

      const response = await base44.functions.invoke('createCreatorMonetizationCheckout', {
        planType,
        creatorId: creator.id
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to create checkout');
      }
    },
    onSuccess: () => {
      toast.success('Redirecting to checkout...');
    },
    onError: (error) => {
      if (error.message === 'IFRAME_BLOCKED') {
        toast.error('Checkout is only available in the published app. Please open the app directly.');
      } else {
        toast.error('Failed to start checkout. Please try again.');
      }
    }
  });

  const totalTipRevenue = tips.reduce((sum, tip) => sum + (tip.amount_usd || 0), 0);
  const isMonetizationActive = subscription && new Date(subscription.expiry_date) > new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2 flex items-center gap-2">
            <Crown className="w-8 h-8 text-amber-400" />
            Creator Monetization
          </h1>
          <p className="text-amber-400/70">Unlock revenue streams and grow your empire</p>
        </div>

        {/* Subscription Status */}
        {!isMonetizationActive ? (
          <>
            {/* Monetization Showcase */}
            <div className="mb-12">
              <MonetizationShowcase />
            </div>

            <Card className="bg-gradient-to-br from-amber-900/30 to-stone-900 border-amber-600/30 mb-8">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <Lock className="w-12 h-12 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-amber-100 mb-2">Unlock Your Earning Potential</h2>
                  <p className="text-amber-300/70 mb-6">
                    Join thousands of creators earning $1k-$10k+/month. Subscribe now to activate all revenue streams.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Monthly Plan */}
                    <div className="bg-stone-800/50 rounded-xl p-6 border border-amber-600/20">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-amber-100 font-bold text-xl">Monthly</h3>
                          <p className="text-amber-400/60 text-sm">Billed monthly</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-amber-100">$5</p>
                          <p className="text-amber-400/60 text-xs">per month</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => subscribeMutation.mutate('monthly')}
                        disabled={subscribeMutation.isPending}
                        className="w-full bg-amber-600 hover:bg-amber-700"
                      >
                        {user?.role === 'admin' ? 'Activate (Admin)' : 'Subscribe Monthly'}
                      </Button>
                    </div>

                    {/* Yearly Plan */}
                    <div className="bg-gradient-to-br from-amber-800/30 to-stone-800/50 rounded-xl p-6 border-2 border-amber-500/50 relative">
                      <Badge className="absolute top-3 right-3 bg-green-600 text-white">
                        Save 80%
                      </Badge>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-amber-100 font-bold text-xl">Yearly</h3>
                          <p className="text-amber-400/60 text-sm">One-time payment</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-amber-100">$12</p>
                          <p className="text-amber-400/60 text-xs">for 365 days</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => subscribeMutation.mutate('yearly')}
                        disabled={subscribeMutation.isPending}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {user?.role === 'admin' ? 'Activate (Admin)' : 'Get Yearly Access'}
                      </Button>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-6 grid md:grid-cols-3 gap-3">
                    {['Accept viewer subscriptions', 'Receive tips & donations', 'Brand partnerships', 'Advanced analytics', 'Custom tier pricing', 'Priority support'].map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-amber-200/80">
                        <Check className="w-4 h-4 text-green-400" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
        ) : (
          <>
            {/* Active Subscription Banner */}
            <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30 mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Unlock className="w-8 h-8 text-green-400" />
                    <div>
                      <h3 className="text-amber-100 font-bold text-lg">Monetization Active</h3>
                      <p className="text-amber-400/60 text-sm">
                        {subscription.plan_type === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'} • 
                        Expires {new Date(subscription.expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-600 text-white">Active</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-400/70 text-sm">Subscribers</p>
                      <p className="text-3xl font-bold text-amber-100">{formatCount(subscribers.length)}</p>
                    </div>
                    <Users className="w-12 h-12 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-400/70 text-sm">Tips Received</p>
                      <p className="text-3xl font-bold text-amber-100">{formatCount(tips.length)}</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-400/70 text-sm">Tip Revenue</p>
                      <p className="text-3xl font-bold text-green-400">${totalTipRevenue.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-400/70 text-sm">Total Earnings</p>
                      <p className="text-3xl font-bold text-amber-100">
                        {((creator?.total_earnings_denarii || 0) / 100).toFixed(0)} 🪙
                      </p>
                    </div>
                    <Crown className="w-12 h-12 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Creator Payout Optimizer */}
            <Card className="bg-stone-800/30 border-amber-600/20 mb-8">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  Your Payout Tier
                </CardTitle>
                <p className="text-amber-400/70 text-sm mt-2">Earn more as you grow—higher tiers unlock better revenue share</p>
              </CardHeader>
              <CardContent>
                <CreatorPayoutOptimizer creatorEarningsUsd={creator?.total_earnings_denarii || 0} />
              </CardContent>
            </Card>

            {/* Viewer Incentives Section */}
            <Card className="bg-stone-800/30 border-amber-600/20 mb-8">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Viewer Spending Incentives
                </CardTitle>
                <p className="text-amber-400/70 text-sm mt-2">Drive viewership growth with attractive rewards program</p>
              </CardHeader>
              <CardContent>
                <ViewerSpendingIncentives userSpending={totalTipRevenue} />
              </CardContent>
            </Card>

            {/* Referral Section */}
            <Card className="bg-stone-800/30 border-amber-600/20 mb-8">
              <CardHeader>
                <CardTitle className="text-amber-100">Referral Program</CardTitle>
              </CardHeader>
              <CardContent>
                <ReferralDashboard creatorId={creator?.id} />
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="tiers" className="space-y-6">
              <TabsList className="bg-stone-800/50 border border-amber-600/20 flex-wrap h-auto p-1">
                <TabsTrigger value="tiers" className="gap-1">
                  <Crown className="w-4 h-4" /> Tiers
                </TabsTrigger>
                <TabsTrigger value="offers" className="gap-1">
                  <Zap className="w-4 h-4" /> Offers
                </TabsTrigger>
                <TabsTrigger value="tips" className="gap-1">
                  <Heart className="w-4 h-4" /> Tips
                </TabsTrigger>
                <TabsTrigger value="milestones" className="gap-1">
                  <Trophy className="w-4 h-4" /> Milestones
                </TabsTrigger>
                <TabsTrigger value="subscribers" className="gap-1">
                  <Users className="w-4 h-4" /> Subs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tiers">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-400" />
                      Custom Subscription Tiers
                    </CardTitle>
                    <p className="text-amber-400/70 text-sm mt-2">
                      Create unique tiers with custom names, pricing, and perks
                    </p>
                  </CardHeader>
                  <CardContent>
                    <CustomTierEditor 
                      creatorId={user?.email} 
                      existingTiers={customTiers}
                      onSave={() => queryClient.invalidateQueries(['custom-tiers'])}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="offers">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Limited Time Offers
                    </CardTitle>
                    <p className="text-amber-400/70 text-sm mt-2">
                      Create flash sales, discounts, and special promotions
                    </p>
                  </CardHeader>
                  <CardContent>
                    <LimitedTimeOfferManager creatorId={user?.email} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tips">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-400" />
                      Tip Reward Messages
                    </CardTitle>
                    <p className="text-amber-400/70 text-sm mt-2">
                      Set up custom thank-you messages and rewards for different tip amounts
                    </p>
                  </CardHeader>
                  <CardContent>
                    <TipRewardManager creatorId={user?.email} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="milestones">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                      Milestone Alerts
                    </CardTitle>
                    <p className="text-amber-400/70 text-sm mt-2">
                      Automated celebrations when you hit follower, subscriber, or earning goals
                    </p>
                  </CardHeader>
                  <CardContent>
                    <MilestoneAlertManager creatorId={user?.email} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscribers">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100">Your Subscribers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subscribers.length > 0 ? (
                      <div className="space-y-3">
                        {subscribers.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between p-4 bg-stone-900/50 rounded-xl">
                            <div>
                              <p className="text-amber-100 font-medium">{sub.viewer_email}</p>
                              <p className="text-amber-400/60 text-sm capitalize">{sub.tier} Tier</p>
                            </div>
                            <Badge className="bg-green-600/20 text-green-300">${sub.monthly_price}/mo</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-amber-400/60 py-12">No subscribers yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recent-tips">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100">Recent Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tips.length > 0 ? (
                      <div className="space-y-3">
                        {tips.map(tip => (
                          <div key={tip.id} className="flex items-center justify-between p-4 bg-stone-900/50 rounded-xl">
                            <div>
                              <p className="text-amber-100 font-medium">
                                {tip.is_anonymous ? '🕶️ Anonymous' : tip.sender_email}
                              </p>
                              {tip.message && <p className="text-amber-400/70 text-sm">"{tip.message}"</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-green-400 font-bold text-lg">${(tip.amount_usd || 0).toFixed(2)}</p>
                              <p className="text-amber-400/60 text-xs">
                                {new Date(tip.created_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-amber-400/60 py-12">No tips received yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}