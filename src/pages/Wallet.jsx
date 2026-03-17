import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowDownRight, 
  History,
  Crown,
  Gift,
  CreditCard,
  Coins,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import CurrencyPackages, { getVipTier, getNextVipTier, DENARII_PER_DOLLAR } from '@/components/wallet/CurrencyPackages';
import GlassCard from '@/components/shared/GlassCard';
import TermsOfServiceGate from '@/components/legal/TermsOfServiceGate';
import CreatorEarningsHub from '@/components/monetization/CreatorEarningsHub';
import { toast } from 'sonner';
import formatCount from '@/components/shared/FormatCount';
import RetryPaymentPanel from '@/components/wallet/RetryPaymentPanel';
import FailedPaymentRetry from '@/components/wallet/FailedPaymentRetry';

// CSRF token generation
function generateCSRFToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default function Wallet() {
  const [showTosGate, setShowTosGate] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(() => !!localStorage.getItem('tos_accepted'));
  const [csrfToken, setCsrfToken] = useState('');

  // Generate CSRF token on mount
  useEffect(() => {
    const token = generateCSRFToken();
    setCsrfToken(token);
  }, []);

  // Handle successful purchase redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast.success('🎉 Purchase successful! Your Denarii have been added to your wallet.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('cancelled') === 'true') {
      toast.info('Purchase cancelled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check if user has accepted TOS on first load
  useEffect(() => {
    if (!tosAccepted && !localStorage.getItem('tos_accepted')) {
      setShowTosGate(true);
    }
  }, [tosAccepted]);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('buy');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, '-created_date', 1);
      if (wallets.length > 0) return wallets[0];
      return base44.entities.Wallet.create({ user_email: user.email, denarii_balance: 0 });
    },
    enabled: !!user?.email,
    staleTime: 30_000,
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

      if (!csrfToken) {
        throw new Error('Security token missing. Please refresh the page.');
      }

      // Create Stripe checkout session with CSRF token
      const response = await base44.functions.invoke('createDenariiCheckout', {
        packageId: pkg.id,
        denarii: pkg.denarii,
        bonus: pkg.bonus || 0,
        price: pkg.price,
        packageName: pkg.name,
        vipPoints: pkg.vipPoints || 0,
        csrfToken: csrfToken
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
        toast.error('Checkout is only available in the published app. Please open the app directly.');
      } else {
        console.error('Purchase error:', error);
        toast.error('Purchase failed. Please try again.');
      }
    }
  });

  const vipPoints = wallet?.vip_points || 0;
  const vipTier = getVipTier(vipPoints);
  const nextTier = getNextVipTier(vipPoints);
  const vipProgress = nextTier
    ? ((vipPoints - vipTier.minPoints) / (nextTier.minPoints - vipTier.minPoints)) * 100
    : 100;

  // Loading state
  if (walletLoading) {
    return (
      <div className="min-h-screen pt-20 pb-24">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <Skeleton className="h-12 w-48 bg-white/5" />
          <Skeleton className="h-4 w-32 bg-white/5" />
          <Skeleton className="h-56 w-full rounded-2xl bg-white/5" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-2xl bg-white/5" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24">
      <TermsOfServiceGate
        isOpen={showTosGate && !tosAccepted}
        onAccept={() => {
          setTosAccepted(true);
          setShowTosGate(false);
          localStorage.setItem('tos_accepted', 'true');
        }}
        onDismiss={() => setShowTosGate(false)}
      />
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 mb-2">
              Treasury
            </h1>
            <p className="text-white/60">Manage your Roman fortune</p>
          </div>
          <button 
            onClick={() => { 
              Promise.all([
                refetchWallet(), 
                queryClient.invalidateQueries({ queryKey: ['currency-purchases'] }), 
                queryClient.invalidateQueries({ queryKey: ['gift-transactions'] })
              ]).then(() => toast.success('Wallet refreshed'));
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.3 }}
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
                      {formatCount(wallet?.denarii_balance || 0)}
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
                    ≈ ${((wallet?.denarii_balance || 0) / DENARII_PER_DOLLAR).toFixed(2)} USD value
                    {(wallet?.total_purchased_usd || 0) > 0 && ` · $${(wallet.total_purchased_usd).toFixed(2)} lifetime spend`}
                  </p>
                </div>

                {/* VIP Panel */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 min-w-[240px]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl ${vipTier.bgColor} flex items-center justify-center text-2xl shadow-lg`}>
                      {vipTier.icon}
                    </div>
                    <div>
                      <p className={`font-bold text-lg ${vipTier.color}`}>{vipTier.name}</p>
                      <p className="text-white/40 text-xs">{vipPoints.toLocaleString()} VIP points</p>
                    </div>
                  </div>
                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(vipProgress, 100)}%` }}
                      transition={{ duration: 1, delay: 0.4 }}
                      className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${
                        vipTier.level >= 4 ? 'from-amber-400 to-orange-500' : 'from-blue-400 to-indigo-500'
                      }`}
                    />
                  </div>
                  {nextTier ? (
                    <p className="text-white/40 text-xs">
                      {(nextTier.minPoints - vipPoints).toLocaleString()} pts to <span className={nextTier.color}>{nextTier.name}</span>
                    </p>
                  ) : (
                    <p className="text-amber-400 text-xs font-bold">⚡ DIVINE — Maximum tier reached!</p>
                  )}
                  <div className="mt-3 space-y-1">
                    {vipTier.perks.map((perk, i) => (
                      <p key={i} className="text-white/50 text-[11px] flex items-center gap-1">
                        <span className="text-green-400">✓</span> {perk}
                      </p>
                    ))}
                  </div>
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

          <TabsContent value="history" className="mt-0 space-y-6">
            {/* Creator Earnings (if creator) */}
            {user && (
              <CreatorEarningsHub creatorId={user.email} />
            )}

            {/* Failed payment retry widget */}
            {user?.email && <FailedPaymentRetry userEmail={user.email} />}

            {/* Retry failed/incomplete payments */}
            {user?.email && <RetryPaymentPanel userEmail={user.email} />}

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
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
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
                          <p className="text-green-400 font-bold text-lg">+{formatCount(purchase.denarii_amount + (purchase.bonus_denarii || 0))}</p>
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
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
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
                          <p className="text-amber-400 font-bold text-lg">-{formatCount(tx.total_as_value)}</p>
                          <p className="text-white/40 text-xs">Denarii</p>
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