import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet as WalletIcon, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  History,
  Crown,
  Sparkles,
  Gift,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import CurrencyPackages from '@/components/wallet/CurrencyPackages';
import { toast } from 'sonner';

export default function Wallet() {
  // Handle successful purchase redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast.success('🎉 Purchase successful! Your Denarii have been added to your wallet.');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('cancelled') === 'true') {
      toast.info('Purchase cancelled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('buy');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, '-created_date', 1);
      if (wallets.length > 0) return wallets[0];
      // Create wallet if doesn't exist
      return base44.entities.Wallet.create({ user_email: user.email, denarii_balance: 0 });
    },
    enabled: !!user?.email
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['gift-transactions', user?.email],
    queryFn: () => base44.entities.GiftTransaction.filter({ sender_email: user.email }, '-created_date', 20),
    enabled: !!user?.email
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['currency-purchases', user?.email],
    queryFn: () => base44.entities.CurrencyPurchase.filter({ user_email: user.email }, '-created_date', 20),
    enabled: !!user?.email
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg) => {
      // Check if running in iframe
      if (window.self !== window.top) {
        throw new Error('IFRAME_BLOCKED');
      }

      // Create Stripe checkout session
      const response = await base44.functions.invoke('createDenariiCheckout', {
        packageId: pkg.id,
        denarii: pkg.denarii,
        bonus: pkg.bonus || 0,
        price: pkg.price,
        packageName: pkg.name
      });

      // Redirect to Stripe checkout
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    },
    onError: (error) => {
      if (error.message === 'IFRAME_BLOCKED') {
        alert('⚠️ Checkout is only available in the published app.\n\nPlease open the app directly (not in preview mode) to complete your purchase.');
      } else {
        console.error('Purchase error:', error);
        alert('Purchase failed. Please try again.');
      }
    }
  });

  const vipLevelThresholds = [0, 100, 500, 2000, 5000, 10000, 25000, 50000, 100000, 250000, 500000];
  const getVIPLevel = (spent) => {
    for (let i = vipLevelThresholds.length - 1; i >= 0; i--) {
      if (spent >= vipLevelThresholds[i]) return i;
    }
    return 0;
  };

  const vipLevel = getVIPLevel(wallet?.total_spent || 0);
  const vipNames = ['Recruit', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Royal', 'Centurion', 'Praetor', 'Senator', 'Augustus', 'Divine'];
  const vipColors = ['stone', 'amber', 'gray', 'amber', 'cyan', 'purple', 'red', 'pink', 'blue', 'orange', 'yellow'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Treasury</h1>
          <p className="text-amber-400/70">Manage your Roman fortune</p>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-amber-900/40 to-stone-900 border-amber-600/30 mb-8 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_rgba(251,191,36,0.3),_transparent)]" />
          </div>
          
          <CardContent className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-amber-300/70 text-sm mb-1">Total Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl">🪙</span>
                  <span className="text-4xl md:text-5xl font-bold text-amber-100">
                    {(wallet?.denarii_balance || 0).toLocaleString()}
                  </span>
                  <span className="text-amber-300/70">Denarii</span>
                </div>

                {/* Secondary currencies */}
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span>🥈</span>
                    <span className="text-amber-200">{wallet?.sestertii_balance || 0} Sestertii</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>🥉</span>
                    <span className="text-amber-200/70">{wallet?.as_balance || 0} As</span>
                  </div>
                </div>
              </div>

              {/* VIP Level */}
              <div className="bg-stone-800/50 rounded-2xl p-4 border border-amber-600/20">
                <div className="flex items-center gap-3 mb-2">
                  <Crown className={`w-8 h-8 text-${vipColors[vipLevel]}-400`} />
                  <div>
                    <p className="text-amber-100 font-bold text-lg">{vipNames[vipLevel]}</p>
                    <p className="text-amber-400/60 text-xs">VIP Level {vipLevel}</p>
                  </div>
                </div>
                <div className="w-full bg-stone-700 rounded-full h-2 mt-3">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(((wallet?.total_spent || 0) - vipLevelThresholds[vipLevel]) / 
                        (vipLevelThresholds[vipLevel + 1] - vipLevelThresholds[vipLevel]) * 100, 100)}%` 
                    }}
                  />
                </div>
                <p className="text-amber-400/60 text-xs mt-2">
                  ${((vipLevelThresholds[vipLevel + 1] || vipLevelThresholds[vipLevel]) - (wallet?.total_spent || 0)).toLocaleString()} to next level
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1 rounded-xl mb-6">
            <TabsTrigger 
              value="buy"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg px-6"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Buy Denarii
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg px-6"
            >
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="mt-0">
            <CurrencyPackages 
              onPurchase={purchaseMutation.mutate}
              isProcessing={purchaseMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Purchases */}
                {purchases.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-amber-300 font-medium text-sm mb-3">Purchases</h4>
                    <div className="space-y-3">
                      {purchases.map((purchase, i) => (
                        <motion.div
                          key={purchase.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-3 bg-green-900/20 rounded-xl border border-green-600/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
                              <ArrowDownRight className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                              <p className="text-amber-100 font-medium">{purchase.package_name}</p>
                              <p className="text-amber-400/60 text-xs">
                                {format(new Date(purchase.created_date), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold">+{(purchase.denarii_amount + (purchase.bonus_denarii || 0)).toLocaleString()}</p>
                            <p className="text-amber-400/60 text-xs">${purchase.price_usd?.toFixed(2)}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gifts Sent */}
                {transactions.length > 0 && (
                  <div>
                    <h4 className="text-amber-300 font-medium text-sm mb-3">Gifts Sent</h4>
                    <div className="space-y-3">
                      {transactions.map((tx, i) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-3 bg-amber-900/20 rounded-xl border border-amber-600/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center">
                              <Gift className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-amber-100 font-medium">
                                {tx.quantity > 1 && `${tx.quantity}x `}{tx.gift_name}
                              </p>
                              <p className="text-amber-400/60 text-xs">
                                {format(new Date(tx.created_date), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-amber-400 font-bold">-{tx.total_as_value?.toLocaleString()}</p>
                            <p className="text-amber-400/60 text-xs">As</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {purchases.length === 0 && transactions.length === 0 && (
                  <div className="text-center py-12 text-amber-400/60">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}