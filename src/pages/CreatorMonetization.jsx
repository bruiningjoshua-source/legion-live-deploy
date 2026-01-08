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
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import MonetizationShowcase from '@/components/monetization/MonetizationShowcase';
import ViewerSpendingIncentives from '@/components/monetization/ViewerSpendingIncentives';
import ReferralDashboard from '@/components/monetization/ReferralDashboard';

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
    queryKey: ['creator-subscription', creator?.id],
    queryFn: async () => {
      if (!creator?.id) return null;
      const subs = await base44.entities.CreatorSubscription.filter(
        { creator_id: creator.id, status: 'active' },
        '-created_date',
        1
      );
      return subs[0] || null;
    },
    enabled: !!creator?.id
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

  const subscribeMutation = useMutation({
    mutationFn: async (planType) => {
      // Admins get instant access
      if (user?.role === 'admin') {
        const expiryDate = planType === 'monthly' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        
        await base44.entities.CreatorSubscription.create({
          creator_id: creator.id,
          plan_type: planType,
          status: 'active',
          start_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
          auto_renew: planType === 'monthly'
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
    onError: (error) => {
      if (error.message === 'IFRAME_BLOCKED') {
        alert('⚠️ Subscription checkout only works in the published app.');
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
                      <p className="text-3xl font-bold text-amber-100">{subscribers.length}</p>
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
                      <p className="text-3xl font-bold text-amber-100">{tips.length}</p>
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
              <TabsList className="bg-stone-800/50 border border-amber-600/20">
                <TabsTrigger value="tiers">Subscription Tiers</TabsTrigger>
                <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
                <TabsTrigger value="tips">Recent Tips</TabsTrigger>
              </TabsList>

              <TabsContent value="tiers">
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-amber-100 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Configure Your Subscription Tiers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {['bronze', 'silver', 'gold'].map(tier => (
                        <div key={tier} className="bg-stone-900/50 rounded-xl p-6 border border-amber-600/20">
                          <h3 className="text-amber-100 font-bold capitalize mb-4">{tier} Tier</h3>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-amber-200">Price (USD/month)</Label>
                              <Input
                                type="number"
                                value={tierSettings[tier].price}
                                onChange={(e) => setTierSettings({
                                  ...tierSettings,
                                  [tier]: { ...tierSettings[tier], price: parseFloat(e.target.value) }
                                })}
                                className="bg-stone-800 border-amber-600/20 text-amber-100"
                              />
                            </div>
                            <div>
                              <Label className="text-amber-200">Perks (one per line)</Label>
                              <textarea
                                value={tierSettings[tier].perks.join('\n')}
                                onChange={(e) => setTierSettings({
                                  ...tierSettings,
                                  [tier]: { ...tierSettings[tier], perks: e.target.value.split('\n') }
                                })}
                                className="w-full bg-stone-800 border border-amber-600/20 text-amber-100 rounded-lg p-3"
                                rows={4}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button className="w-full bg-amber-600 hover:bg-amber-700">
                        Save Tier Settings
                      </Button>
                    </div>
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

              <TabsContent value="tips">
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
                              <p className="text-green-400 font-bold text-lg">${tip.amount_usd.toFixed(2)}</p>
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