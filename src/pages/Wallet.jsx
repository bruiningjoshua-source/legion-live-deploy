import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowDownRight, 
  History,
  Gift,
  CreditCard,
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

// Generate a unique token for checkout deduplication (not true CSRF — server validates via Stripe session)
function generateCheckoutToken() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,14)}`;
}

export default function Wallet() {
  const [showTosGate, setShowTosGate] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(() => !!localStorage.getItem('tos_accepted'));
  const [checkoutToken, setCheckoutToken] = useState(() => generateCheckoutToken());

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

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('buy');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Show the ToS gate only if the user has NEVER accepted — checks both the
  // account record (durable) and localStorage (fast path). Declared AFTER `user`
  // to avoid a temporal-dead-zone crash.
  useEffect(() => {
    if (user === undefined) return; // wait for user to load
    const acceptedOnAccount = user?.tos_accepted === true;
    const acceptedLocally = !!localStorage.getItem('tos_accepted');
    if (acceptedOnAccount) {
      if (!acceptedLocally) localStorage.setItem('tos_accepted', 'true');
      setTosAccepted(true);
      return;
    }
    if (!acceptedLocally) setShowTosGate(true);
  }, [user, tosAccepted]);

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, '-created_date', 1);
      if (wallets.length > 0) return wallets[0];
      return base44.entities.Wallet.create({ user_email: user.email, denarii_balance: 500, sestertii_balance: 0, as_balance: 0 });
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  // Real-time wallet updates — balance shows instantly after Stripe webhook credits
  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = base44.entities.Wallet.subscribe((event) => {
      if (event.data?.user_email === user.email) {
        queryClient.setQueryData(['wallet', user.email], event.data);
        // Also refresh purchase history when wallet changes (likely new purchase)
        queryClient.invalidateQueries({ queryKey: ['currency-purchases', user.email] });
      }
    });
    return unsubscribe;
  }, [user?.email, queryClient]);

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

      // Generate fresh token per checkout to prevent replay
      const token = generateCheckoutToken();
      setCheckoutToken(token);

      const response = await base44.functions.invoke('createDenariiCheckout', {
        packageId: pkg.id,
        denarii: pkg.denarii,
        bonus: pkg.bonus || 0,
        price: pkg.price,
        packageName: pkg.name,
        vipPoints: pkg.vipPoints || 0,
        csrfToken: token
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
        // Show the REAL error so failures are diagnosable instead of a generic message
        toast.error(`Purchase failed: ${error?.message || 'unknown error'}`);
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
      <div className="ll-page-enter min-h-screen pb-24">
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
    <div className="min-h-screen pb-24">
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
          <div className="ll-card mb-6 relative overflow-hidden p-0"
            style={{ border:'1px solid rgba(245,166,35,0.2)', background:'rgba(245,166,35,0.04)' }}>
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background:'radial-gradient(ellipse at 80% 20%, rgba(245,166,35,0.08) 0%, transparent 60%)' }} />

            <div className="relative p-5">
              {/* Label */}
              <p className="ll-label text-white/30 mb-3">YOUR BALANCE</p>

              {/* Main balance */}
              <div className="flex items-end gap-3 mb-4">
                <span className="text-4xl leading-none">🪙</span>
                <div>
                  <div className="ll-display text-5xl text-white leading-none">
                    {formatCount(wallet?.denarii_balance || 0)}
                  </div>
                  <p className="text-white/35 text-sm mt-1">
                    Denarii · ≈ ${((wallet?.denarii_balance || 0) / DENARII_PER_DOLLAR).toFixed(2)} USD
                  </p>
                </div>
              </div>

              {/* Secondary balances */}
              <div className="flex gap-2 mb-4">
                {[
                  { emoji:'🥈', val: wallet?.sestertii_balance || 0, label:'Sestertii' },
                  { emoji:'🥉', val: wallet?.as_balance || 0, label:'As' },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-2 ll-card-inset px-3 py-2">
                    <span className="text-sm">{c.emoji}</span>
                    <span className="text-white/70 text-sm font-semibold">{c.val}</span>
                    <span className="text-white/30 text-xs">{c.label}</span>
                  </div>
                ))}
              </div>

              {/* VIP tier */}
              <div className="ll-card-inset p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${vipTier.bgColor}`}>
                  {vipTier.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className={`text-sm font-bold ${vipTier.color}`}>{vipTier.name}</p>
                    <p className="text-white/30 text-xs">{vipPoints.toLocaleString()} pts</p>
                  </div>
                  <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
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
          </div>
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