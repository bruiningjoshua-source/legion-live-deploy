import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, Wallet, CreditCard, Gift, BarChart3, 
  Users, Download, Settings, ArrowRight, DollarSign, SendHorizontal,
  CheckCircle, Clock, AlertCircle, Loader2
} from 'lucide-react';
import PayoutForecast from '@/components/earnings/PayoutForecast';
import WithdrawalHistorySection from '@/components/earnings/WithdrawalHistorySection';
import PayoutMethodsPreview from '@/components/earnings/PayoutMethodsPreview';

/**
 * Unified Earnings Dashboard Hub
 * Centralized menu for all creator earnings, payouts, and financial features
 */

export default function EarningsDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.email],
    queryFn: () => base44.entities.Wallet.filter({ user_email: user?.email }, null, 1),
    enabled: !!user?.email
  });

  const { data: creator } = useQuery({
    queryKey: ['creator', user?.email],
    queryFn: () => base44.entities.Creator.filter({ user_email: user?.email }, null, 1),
    enabled: !!user?.email
  });

  // Check creator monetization subscription (not fan club)
  const { data: creatorSubs } = useQuery({
    queryKey: ['creator-monetization-sub', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.CreatorSubscription?.filter(
        { user_email: user?.email, status: 'active' }, null, 1
      ).catch(() => []);
      return subs?.length > 0 ? subs[0] : null;
    },
    enabled: !!user?.email
  });

  // Calculate free tier earnings cap ($20/week = ~$86/month on gifts only)
  const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString();
  const { data: recentTips } = useQuery({
    queryKey: ['recent-tips-free-tier', user?.email],
    queryFn: async () => {
      const tips = await base44.entities.GiftTransaction?.filter(
        { recipient_email: user?.email, created_date: { $gte: thirtyDaysAgo } }
      ).catch(() => []);
      return tips || [];
    },
    enabled: !!user?.email
  });

  const freeTierEarningsUsd = (recentTips?.reduce((sum, t) => sum + ((t.total_as_value || 0) / 65), 0) || 0);
  const freeTierMonthlyLimit = 86; // ~$20/week
  const hasMonetization = !!creatorSubs; // True if has active creator monetization sub
  const exceedsFreeLimit = !hasMonetization && freeTierEarningsUsd > freeTierMonthlyLimit;

  const walletData = wallet?.[0];
  const creatorData = creator?.[0];

  const menuItems = [
    {
      id: 'overview',
      label: '📊 Overview',
      icon: TrendingUp,
      description: 'Summary & key metrics',
      color: 'from-blue-500/20 to-blue-600/10',
      gated: false
    },
    {
      id: 'withdrawals',
      label: '💸 Withdrawals',
      icon: SendHorizontal,
      description: 'Request & track withdrawals',
      color: 'from-emerald-500/20 to-emerald-600/10',
      gated: true
    },
    {
      id: 'forecast',
      label: '🔮 30-Day Forecast',
      icon: BarChart3,
      description: 'AI-powered payout projections',
      color: 'from-green-500/20 to-green-600/10',
      gated: true
    },
    {
      id: 'earnings',
      label: '💰 Earnings History',
      icon: DollarSign,
      description: 'Past payouts & transactions',
      color: 'from-amber-500/20 to-amber-600/10',
      gated: true
    },
    {
      id: 'methods',
      label: '🏦 Payout Methods',
      icon: CreditCard,
      description: 'Bank, PayPal, crypto setup',
      color: 'from-purple-500/20 to-purple-600/10',
      gated: true
    },
    {
      id: 'subscriptions',
      label: '📦 Subscription Tiers',
      icon: Gift,
      description: 'Creator monetization tiers',
      color: 'from-pink-500/20 to-pink-600/10',
      gated: false
    },
    {
      id: 'referrals',
      label: '👥 Referral Program',
      icon: Users,
      description: 'Earned via creator invites',
      color: 'from-cyan-500/20 to-cyan-600/10',
      gated: true
    },
    {
      id: 'analytics',
      label: '📈 Revenue Analytics',
      icon: BarChart3,
      description: 'Detailed breakdown & trends',
      color: 'from-indigo-500/20 to-indigo-600/10',
      gated: true
    },
    {
      id: 'settings',
      label: '⚙️ Payout Settings',
      icon: Settings,
      description: 'Configure & manage payouts',
      color: 'from-gray-500/20 to-gray-600/10',
      gated: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Earnings Dashboard</h1>
          <p className="text-gray-400">Manage payouts, track revenue, and plan your finances</p>
        </div>

        {/* Quick Stats */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30 p-5">
              <p className="text-xs text-green-300/70 mb-1">Total Earned</p>
              <p className="text-2xl font-bold text-green-400">${((creatorData?.total_earnings_denarii || 0) / 65).toFixed(2)}</p>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30 p-5">
              <p className="text-xs text-blue-300/70 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-blue-400">${((walletData?.denarii_balance || 0) / 65).toFixed(2)}</p>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30 p-5">
              <p className="text-xs text-amber-300/70 mb-1">VIP Points</p>
              <p className="text-2xl font-bold text-amber-400">{walletData?.vip_points || 0}</p>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30 p-5">
              <p className="text-xs text-purple-300/70 mb-1">Followers</p>
              <p className="text-2xl font-bold text-purple-400">{creatorData?.follower_count || 0}</p>
            </Card>
          </div>
        )}

        {/* Free Tier Warning */}
        {!hasMonetization && exceedsFreeLimit && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8">
            <p className="text-sm text-amber-300">
              ⚠️ <strong>Free Tier Limit Reached:</strong> You've earned ${freeTierEarningsUsd.toFixed(2)} in gift earnings this month. Free creators can earn up to $86/month. Unlock unlimited payouts with Creator Monetization.
            </p>
            <Button className="mt-3 text-xs" onClick={() => setActiveTab('subscriptions')}>
              Upgrade to Creator Monetization →
            </Button>
          </div>
        )}

        {/* Menu Grid */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {menuItems.map((item) => {
              const isLocked = item.gated && !hasMonetization;
              return (
                <Card 
                  key={item.id}
                  className={`bg-gradient-to-br ${item.color} border-white/10 p-4 transition-all group ${
                    isLocked 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'cursor-pointer hover:border-white/30'
                  }`}
                  onClick={() => !isLocked && setActiveTab(item.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="relative">
                      <item.icon className="w-6 h-6 text-white/60 group-hover:text-white/80" />
                      {isLocked && <span className="absolute -top-1 -right-1 text-xs">🔒</span>}
                    </div>
                    {!isLocked && (
                      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all" />
                    )}
                  </div>
                  <h3 className="font-semibold text-white mb-1">{item.label}</h3>
                  <p className="text-xs text-white/60">{item.description}</p>
                  {isLocked && (
                    <p className="text-xs text-amber-300 mt-2 font-semibold">Creator Monetization required</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <Card className="border-white/10 bg-white/5 p-6">
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setActiveTab('overview')}
              >
                ← Back to Menu
              </Button>
              {!hasMonetization ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">🔒 Creator Monetization Required</p>
                  <p className="text-gray-300 mb-6">Request and manage your earnings withdrawals</p>
                  <Button className="gap-2" onClick={() => setActiveTab('subscriptions')}>
                    Unlock Creator Monetization →
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">Withdrawals</h2>
                      <p className="text-gray-400">Request and track your payout withdrawals</p>
                    </div>
                    <Button className="gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50">
                      <SendHorizontal className="w-4 h-4" />
                      Request Withdrawal
                    </Button>
                  </div>

                  {/* Withdrawal Info Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-white/5 border-white/10 p-4">
                      <p className="text-xs text-white/50 mb-2">Available Balance</p>
                      <p className="text-2xl font-bold text-emerald-400">${((walletData?.denarii_balance || 0) / 65).toFixed(2)}</p>
                      <p className="text-xs text-white/30 mt-2">Ready to withdraw</p>
                    </Card>
                    <Card className="bg-white/5 border-white/10 p-4">
                      <p className="text-xs text-white/50 mb-2">Minimum Withdrawal</p>
                      <p className="text-2xl font-bold text-amber-400">$20.00</p>
                      <p className="text-xs text-white/30 mt-2">Check your settings</p>
                    </Card>
                    <Card className="bg-white/5 border-white/10 p-4">
                      <p className="text-xs text-white/50 mb-2">Processing Fee</p>
                      <p className="text-2xl font-bold text-blue-400">1-2%</p>
                      <p className="text-xs text-white/30 mt-2">Varies by method</p>
                    </Card>
                  </div>

                  {/* Withdrawal Methods Setup */}
                  <PayoutMethodsPreview userEmail={user?.email} onManage={() => setActiveTab('methods')} />

                  {/* Real Withdrawal History */}
                  <WithdrawalHistorySection />

                  {/* Setup Help */}
                  <Card className="bg-blue-500/10 border-blue-500/30 p-4 mt-6">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white mb-1">Withdrawals Guide</p>
                        <p className="text-sm text-white/70">
                          • Minimum withdrawal: $20 • Fees: 1-2% depending on method • Processing time: 3-5 business days • Set up at least one payment method in Payout Methods tab
                        </p>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </Card>
          )}

          {/* Forecast Tab */}
          {activeTab === 'forecast' && (
            <>
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setActiveTab('overview')}
              >
                ← Back to Menu
              </Button>
              {!hasMonetization ? (
                <Card className="border-amber-500/30 bg-amber-500/5 p-8 text-center">
                  <p className="text-2xl mb-2">🔒 Creator Monetization Required</p>
                  <p className="text-gray-300 mb-6">Access 30-day payout forecasts and financial planning tools</p>
                  <Button className="gap-2" onClick={() => setActiveTab('subscriptions')}>
                    Unlock Creator Monetization →
                  </Button>
                </Card>
              ) : (
                <PayoutForecast />
              )}
            </>
          )}

          {/* Earnings History Tab */}
          {activeTab === 'earnings' && (
            <Card className="border-white/10 bg-white/5 p-6">
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setActiveTab('overview')}
              >
                ← Back to Menu
              </Button>
              {!hasMonetization ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">🔒 Creator Monetization Required</p>
                  <p className="text-gray-300 mb-6">View full payout history and transaction details</p>
                  <Button className="gap-2" onClick={() => setActiveTab('subscriptions')}>
                    Unlock Creator Monetization →
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-4">Earnings History</h2>
                  <p className="text-gray-400 mb-4">Track all your payouts and earnings transactions</p>
                  <Button 
                    className="gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50"
                    onClick={() => navigate(createPageUrl('CreatorPayouts'))}
                  >
                    <Download className="w-4 h-4" />
                    View Full Payout History
                  </Button>
                </>
              )}
            </Card>
          )}

          {/* Payout Methods Tab */}
          {activeTab === 'methods' && (
            <Card className="border-white/10 bg-white/5 p-6">
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setActiveTab('overview')}
              >
                ← Back to Menu
              </Button>
              {!hasMonetization ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">🔒 Creator Monetization Required</p>
                  <p className="text-gray-300 mb-6">Set up bank transfers, PayPal, and crypto payouts</p>
                  <Button className="gap-2" onClick={() => setActiveTab('subscriptions')}>
                    Unlock Creator Monetization →
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-4">Payout Methods</h2>
                  <p className="text-gray-400 mb-6">Configure how you receive your earnings</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'Bank Account (ACH)', icon: '🏦', fee: 'Lowest fees' },
                  { name: 'PayPal', icon: '💳', fee: '2% + $0.30' },
                  { name: 'Cryptocurrency', icon: '₿', fee: '1% network fee' }
                ].map((method) => (
                  <Card key={method.name} className="border-white/20 bg-white/10 p-4">
                    <p className="text-2xl mb-2">{method.icon}</p>
                    <h3 className="font-semibold text-white mb-1">{method.name}</h3>
                    <p className="text-xs text-gray-400 mb-3">{method.fee}</p>
                    <Button className="w-full text-xs" variant="outline">Configure</Button>
                  </Card>
                ))}
              </div>

                  <Button 
                    className="mt-6 gap-2"
                    onClick={() => navigate(createPageUrl('CreatorPayouts'))}
                  >
                    <Settings className="w-4 h-4" />
                    Manage All Methods
                  </Button>
                </>
              )}
            </Card>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <Card className="border-white/10 bg-white/5 p-6">
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setActiveTab('overview')}
              >
                ← Back to Menu
              </Button>
              <h2 className="text-2xl font-bold text-white mb-4">Subscription Tiers</h2>
              <p className="text-gray-400 mb-6">Set up monetization tiers for your viewers</p>
              <Button 
                className="gap-2"
                onClick={() => navigate(createPageUrl('CreatorMonetization'))}
              >
                <Gift className="w-4 h-4" />
                Configure Subscription Tiers
              </Button>
            </Card>
          )}

          {/* Referrals Tab */}
          {activeTab === 'referrals' && (
            <Card className="border-white/10 bg-white/5 p-6">
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setActiveTab('overview')}
              >
                ← Back to Menu
              </Button>
              {!hasMonetization ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">🔒 Creator Monetization Required</p>
                  <p className="text-gray-300 mb-6">Earn referral bonuses and manage your referral code</p>
                  <Button className="gap-2" onClick={() => setActiveTab('subscriptions')}>
                    Unlock Creator Monetization →
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-4">Referral Program</h2>
                  <p className="text-gray-400 mb-6">Earn $50 for every creator you refer</p>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-300">Your Referral Code:</p>
                <p className="text-xl font-mono font-bold text-amber-400 mt-1">{creatorData?.affiliate_code || 'LOADING...'}</p>
              </div>
                  <Button 
                    className="gap-2"
                    onClick={() => navigate(createPageUrl('CreatorPayouts'))}
                  >
                    <Users className="w-4 h-4" />
                    View Referral Dashboard
                  </Button>
                </>
              )}
            </Card>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <Card className="border-white/10 bg-white/5 p-6">
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setActiveTab('overview')}
              >
                ← Back to Menu
              </Button>
              {!hasMonetization ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">🔒 Creator Monetization Required</p>
                  <p className="text-gray-300 mb-6">View detailed revenue breakdowns and analytics</p>
                  <Button className="gap-2" onClick={() => setActiveTab('subscriptions')}>
                    Unlock Creator Monetization →
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-4">Revenue Analytics</h2>
                  <p className="text-gray-400 mb-6">Detailed breakdown of earnings by source</p>
                  <Button 
                    className="gap-2"
                    onClick={() => navigate(createPageUrl('CreatorAnalytics'))}
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Analytics Dashboard
                  </Button>
                </>
              )}
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <Card className="border-white/10 bg-white/5 p-6">
              <Button 
                variant="outline" 
                className="mb-4"
                onClick={() => setActiveTab('overview')}
              >
                ← Back to Menu
              </Button>
              {!hasMonetization ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-2">🔒 Creator Monetization Required</p>
                  <p className="text-gray-300 mb-6">Configure thresholds, schedules, and payout preferences</p>
                  <Button className="gap-2" onClick={() => setActiveTab('subscriptions')}>
                    Unlock Creator Monetization →
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-4">Payout Settings</h2>
                  <p className="text-gray-400 mb-6">Configure your payout preferences and thresholds</p>
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="font-semibold text-white mb-2">Minimum Payout Threshold</p>
                  <p className="text-sm text-gray-400 mb-3">Set how much you want to earn before automatic payout</p>
                  <Button variant="outline" className="text-xs">Edit Threshold</Button>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="font-semibold text-white mb-2">Payout Schedule</p>
                  <p className="text-sm text-gray-400 mb-3">Choose weekly, bi-weekly, or monthly payouts</p>
                  <Button variant="outline" className="text-xs">Edit Schedule</Button>
                </div>
              </div>
                </>
              )}
            </Card>
          )}
        </div>

        {/* Back Button */}
        {activeTab !== 'overview' && (
          <div className="mt-8">
            <Button 
              variant="outline" 
              onClick={() => setActiveTab('overview')}
              className="w-full"
            >
              ← Return to Menu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}