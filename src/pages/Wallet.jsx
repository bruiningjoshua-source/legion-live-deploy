import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowDownRight, 
  History,
  Crown,
  Gift,
  CreditCard,
  Coins
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import CurrencyPackages from '@/components/wallet/CurrencyPackages';
import GlassCard from '@/components/shared/GlassCard';
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
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 mb-2">
            Treasury
          </h1>
          <p className="text-white/60">Manage your Roman fortune</p>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="mb-8 relative overflow-hidden" padding="p-0" glow glowColor="amber">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <p className="text-white/50 text-sm font-medium">Total Balance</p>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <motion.span 
                      className="text-5xl"
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      🪙
                    </motion.span>
                    <span className="text-5xl md:text-6xl font-black text-white">
                      {(wallet?.denarii_balance || 0).toLocaleString()}
                    </span>
                    <span className="text-white/50 font-medium">Denarii</span>
                  </div>

                  {/* Secondary currencies */}
                  <div className="flex items-center gap-3 mt-5">
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                      <span>🥈</span>
                      <span className="text-white/80 font-medium">{wallet?.sestertii_balance || 0}</span>
                      <span className="text-white/40 text-sm">Sestertii</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                      <span>🥉</span>
                      <span className="text-white/80 font-medium">{wallet?.as_balance || 0}</span>
                      <span className="text-white/40 text-sm">As</span>
                    </div>
                  </div>

                  {/* Conversion info */}
                  <p className="text-white/30 text-xs mt-4">
                    Total value: {((wallet?.denarii_balance || 0) * 100 + (wallet?.as_balance || 0)).toLocaleString()} As
                  </p>
                </div>

                {/* VIP Level */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 min-w-[220px]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Crown className="w-7 h-7 text-white drop-shadow-lg" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-xl">{vipNames[vipLevel]}</p>
                      <p className="text-white/40 text-xs">VIP Level {vipLevel}</p>
                    </div>
                  </div>
                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.min(((wallet?.total_spent || 0) - vipLevelThresholds[vipLevel]) / 
                          (vipLevelThresholds[vipLevel + 1] - vipLevelThresholds[vipLevel]) * 100, 100)}%` 
                      }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                    />
                  </div>
                  <p className="text-white/40 text-xs mt-3">
                    ${((vipLevelThresholds[vipLevel + 1] || vipLevelThresholds[vipLevel]) - (wallet?.total_spent || 0)).toLocaleString()} to {vipNames[vipLevel + 1] || 'max'}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl mb-8">
            <TabsList className="bg-transparent p-0 gap-1">
              <TabsTrigger 
                value="buy"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-2.5 text-white/60 hover:text-white transition-all"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Buy Denarii
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-2.5 text-white/60 hover:text-white transition-all"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="buy" className="mt-0">
            <CurrencyPackages 
              onPurchase={purchaseMutation.mutate}
              isProcessing={purchaseMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <GlassCard>
              <div className="flex items-center gap-2 mb-6">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="text-white font-semibold text-lg">Transaction History</h3>
              </div>

              {/* Purchases */}
              {purchases.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-white/50 font-medium text-sm mb-4">Purchases</h4>
                  <div className="space-y-3">
                    {purchases.map((purchase, i) => (
                      <motion.div
                        key={purchase.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-4 bg-green-500/10 rounded-xl border border-green-500/20"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <ArrowDownRight className="w-6 h-6 text-green-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{purchase.package_name}</p>
                            <p className="text-white/40 text-xs">
                              {format(new Date(purchase.created_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold text-lg">+{(purchase.denarii_amount + (purchase.bonus_denarii || 0)).toLocaleString()}</p>
                          <p className="text-white/40 text-xs">${purchase.price_usd?.toFixed(2)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gifts Sent */}
              {transactions.length > 0 && (
                <div>
                  <h4 className="text-white/50 font-medium text-sm mb-4">Gifts Sent</h4>
                  <div className="space-y-3">
                    {transactions.map((tx, i) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-4 bg-amber-500/10 rounded-xl border border-amber-500/20"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Gift className="w-6 h-6 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {tx.quantity > 1 && `${tx.quantity}x `}{tx.gift_name}
                            </p>
                            <p className="text-white/40 text-xs">
                              {format(new Date(tx.created_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-400 font-bold text-lg">-{tx.total_as_value?.toLocaleString()}</p>
                          <p className="text-white/40 text-xs">As</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {purchases.length === 0 && transactions.length === 0 && (
                <div className="text-center py-16">
                  <History className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40">No transactions yet</p>
                  <p className="text-white/30 text-sm mt-1">Purchase Denarii to get started!</p>
                </div>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}