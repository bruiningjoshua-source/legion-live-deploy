import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, Wallet, CreditCard, Gift, BarChart3, 
  Users, Download, Settings, ArrowRight, DollarSign 
} from 'lucide-react';
import PayoutForecast from '@/components/earnings/PayoutForecast';

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

  const walletData = wallet?.[0];
  const creatorData = creator?.[0];

  const menuItems = [
    {
      id: 'overview',
      label: '📊 Overview',
      icon: TrendingUp,
      description: 'Summary & key metrics',
      color: 'from-blue-500/20 to-blue-600/10'
    },
    {
      id: 'forecast',
      label: '🔮 30-Day Forecast',
      icon: BarChart3,
      description: 'AI-powered payout projections',
      color: 'from-green-500/20 to-green-600/10'
    },
    {
      id: 'earnings',
      label: '💰 Earnings History',
      icon: DollarSign,
      description: 'Past payouts & transactions',
      color: 'from-amber-500/20 to-amber-600/10'
    },
    {
      id: 'methods',
      label: '🏦 Payout Methods',
      icon: CreditCard,
      description: 'Bank, PayPal, crypto setup',
      color: 'from-purple-500/20 to-purple-600/10'
    },
    {
      id: 'subscriptions',
      label: '📦 Subscription Tiers',
      icon: Gift,
      description: 'Creator monetization tiers',
      color: 'from-pink-500/20 to-pink-600/10'
    },
    {
      id: 'referrals',
      label: '👥 Referral Program',
      icon: Users,
      description: 'Earned via creator invites',
      color: 'from-cyan-500/20 to-cyan-600/10'
    },
    {
      id: 'analytics',
      label: '📈 Revenue Analytics',
      icon: BarChart3,
      description: 'Detailed breakdown & trends',
      color: 'from-indigo-500/20 to-indigo-600/10'
    },
    {
      id: 'settings',
      label: '⚙️ Payout Settings',
      icon: Settings,
      description: 'Configure & manage payouts',
      color: 'from-gray-500/20 to-gray-600/10'
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
              <p className="text-2xl font-bold text-green-400">${(creatorData?.total_earnings_denarii || 0 / 65).toFixed(2)}</p>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30 p-5">
              <p className="text-xs text-blue-300/70 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-blue-400">${(walletData?.denarii_balance || 0 / 65).toFixed(2)}</p>
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

        {/* Menu Grid */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {menuItems.map((item) => (
              <Card 
                key={item.id}
                className={`bg-gradient-to-br ${item.color} border-white/10 p-4 cursor-pointer hover:border-white/30 transition-all group`}
                onClick={() => setActiveTab(item.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <item.icon className="w-6 h-6 text-white/60 group-hover:text-white/80" />
                  <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
                <h3 className="font-semibold text-white mb-1">{item.label}</h3>
                <p className="text-xs text-white/60">{item.description}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
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
              <PayoutForecast />
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
              <h2 className="text-2xl font-bold text-white mb-4">Earnings History</h2>
              <p className="text-gray-400 mb-4">Track all your payouts and earnings transactions</p>
              <Button 
                className="gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50"
                onClick={() => navigate(createPageUrl('CreatorPayouts'))}
              >
                <Download className="w-4 h-4" />
                View Full Payout History
              </Button>
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
              <h2 className="text-2xl font-bold text-white mb-4">Revenue Analytics</h2>
              <p className="text-gray-400 mb-6">Detailed breakdown of earnings by source</p>
              <Button 
                className="gap-2"
                onClick={() => navigate(createPageUrl('CreatorAnalytics'))}
              >
                <BarChart3 className="w-4 h-4" />
                View Analytics Dashboard
              </Button>
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