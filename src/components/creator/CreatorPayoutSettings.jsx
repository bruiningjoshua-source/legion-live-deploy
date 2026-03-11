import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSignedRequest } from '@/components/security/RequestSigner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle,
  DollarSign,
  ArrowRight,
  Loader2,
  Info,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import StripeConnectKYC from './StripeConnectKYC';
import CancelSubscriptionModal from '@/components/monetization/CancelSubscriptionModal';

const PAYOUT_METHODS = [
  { id: 'stripe_connect', name: 'Bank Account (Stripe)', icon: '🏦', placeholder: 'Connect your bank', recommended: true },
  { id: 'paypal', name: 'PayPal', icon: '💳', placeholder: 'your@email.com' },
  { id: 'venmo', name: 'Venmo', icon: '📱', placeholder: '@username' },
  { id: 'cashapp', name: 'Cash App', icon: '💵', placeholder: '$cashtag' }
];

// 260 Denarii sold per $1 USD; creator earns 60% of gift value
const CREATOR_SHARE = 0.60;
const DENARII_TO_USD = (1 / 260) * CREATOR_SHARE; // ~$0.002308 per Denarii
const MIN_PAYOUT_DENARII = 2600; // ~$6 minimum payout

export default function CreatorPayoutSettings({ creator, user }) {
  const queryClient = useQueryClient();
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [showCashout, setShowCashout] = useState(false);
  const [newMethod, setNewMethod] = useState({ type: '', identifier: '', displayName: '' });
  const [cashoutAmount, setCashoutAmount] = useState('');
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null);

  const { data: payoutMethods = [], isLoading: methodsLoading } = useQuery({
    queryKey: ['payout-methods', creator?.id],
    queryFn: () => base44.entities.CreatorPayoutMethod.filter({ creator_id: creator.id }, '-created_date', 10),
    enabled: !!creator?.id
  });

  const { data: payoutHistory = [] } = useQuery({
    queryKey: ['payout-history', creator?.id],
    queryFn: () => base44.entities.CreatorPayout.filter({ creator_id: creator.id }, '-created_date', 20),
    enabled: !!creator?.id
  });

  // Check Stripe Connect status on load
  React.useEffect(() => {
    const checkStripeStatus = async () => {
      if (!creator?.id) return;
      const stripeMethod = payoutMethods.find(m => m.method_type === 'stripe_connect');
      if (stripeMethod) {
        const response = await base44.functions.invoke('stripeConnectOnboard', {
          action: 'check_status',
          creatorId: creator.id
        });
        setStripeStatus(response.data);
      }
    };
    checkStripeStatus();
  }, [creator?.id, payoutMethods]);

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    const response = await base44.functions.invoke('stripeConnectOnboard', {
      action: 'create_account',
      creatorId: creator.id
    });
    
    if (response.data?.url) {
      window.location.href = response.data.url;
    } else {
      toast.error('Failed to start Stripe setup');
      setStripeLoading(false);
    }
  };

  const handleStripeLogin = async () => {
    setStripeLoading(true);
    const response = await base44.functions.invoke('stripeConnectOnboard', {
      action: 'create_login_link',
      creatorId: creator.id
    });
    
    if (response.data?.url) {
      window.open(response.data.url, '_blank');
    }
    setStripeLoading(false);
  };

  const addMethodMutation = useMutation({
    mutationFn: async (data) => {
      // Set as default if first method
      const isFirst = payoutMethods.length === 0;
      return base44.entities.CreatorPayoutMethod.create({
        creator_id: creator.id,
        user_email: user.email,
        method_type: data.type,
        identifier: data.identifier,
        display_name: data.displayName || data.identifier,
        is_default: isFirst,
        is_verified: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payout-methods']);
      setShowAddMethod(false);
      setNewMethod({ type: '', identifier: '', displayName: '' });
      toast.success('Payout method added');
    }
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (methodId) => base44.entities.CreatorPayoutMethod.delete(methodId),
    onSuccess: () => {
      queryClient.invalidateQueries(['payout-methods']);
      toast.success('Payout method removed');
    }
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async ({ amount, method }) => {
      // DENARII_TO_USD already includes CREATOR_SHARE — do NOT multiply again
      const amountUsd = amount * DENARII_TO_USD;

      // Create signed request for sensitive payout operation
      const signedPayload = createSignedRequest(
        { amount_usd: amountUsd },
        user.email
      );

      // Use processPayoutWithKyc endpoint
      const response = await base44.functions.invoke('processPayoutWithKyc', signedPayload);
      
      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['payout-history']);
      queryClient.invalidateQueries(['my-creator']);
      setShowCashout(false);
      setCashoutAmount('');
      toast.success(data?.message || 'Payout request submitted!');
    },
    onError: (error) => {
      const errorMsg = error.message || 'Payout failed';
      // Handle rate limit errors specially
      if (errorMsg.includes('Rate limited')) {
        toast.error('You can only request one payout per 24 hours');
      } else if (errorMsg.includes('KYC')) {
        toast.error('Complete KYC verification to request payouts');
      } else {
        toast.error(errorMsg);
      }
    }
  });

  const availableBalance = creator?.total_earnings_denarii || 0;
  const cashoutNum = parseInt(cashoutAmount) || 0;
  // DENARII_TO_USD already includes CREATOR_SHARE — do NOT multiply again
  const estimatedPayout = cashoutNum * DENARII_TO_USD;
  const defaultMethod = payoutMethods.find(m => m.is_default) || payoutMethods[0];

  const canCashout = cashoutNum >= MIN_PAYOUT_DENARII && 
                     cashoutNum <= availableBalance && 
                     defaultMethod;

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <Card className="bg-gradient-to-br from-green-900/40 to-stone-900 border-green-600/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-green-300/70 text-sm mb-1">Available for Cashout</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl">🪙</span>
                <span className="text-4xl font-bold text-green-100">
                  {availableBalance.toLocaleString()}
                </span>
                <span className="text-green-300/70">Denarii</span>
              </div>
              <p className="text-green-400/60 text-sm mt-2">
                ≈ ${(availableBalance * DENARII_TO_USD).toFixed(2)} USD (60% creator share)
              </p>
            </div>
            
            <Button
              onClick={() => setShowCashout(true)}
              disabled={availableBalance < MIN_PAYOUT_DENARII || !defaultMethod}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-8"
            >
              <DollarSign className="w-5 h-5 mr-2" />
              Cash Out
            </Button>
          </div>

          {/* Revenue Split Info */}
          <div className="mt-4 p-3 bg-stone-800/50 rounded-lg border border-amber-600/20">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="text-xs text-amber-300/80">
                <p className="font-semibold mb-1">Revenue Split: 40% Platform / 60% Creator</p>
                <p>For every $1.00 of gift value received, you earn $0.60. Minimum cashout: {MIN_PAYOUT_DENARII.toLocaleString()} Denarii (≈${(MIN_PAYOUT_DENARII * DENARII_TO_USD).toFixed(2)})</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Connect KYC */}
      <Tabs defaultValue="kyc" className="w-full">
        <TabsList className="bg-stone-800/50 border border-amber-600/20 w-full">
          <TabsTrigger value="kyc" className="flex-1 data-[state=active]:bg-indigo-700">
            <ShieldCheck className="w-4 h-4 mr-2" /> KYC & Bank Verification
          </TabsTrigger>
          <TabsTrigger value="other" className="flex-1 data-[state=active]:bg-amber-700">
            <Wallet className="w-4 h-4 mr-2" /> Other Methods
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kyc" className="mt-4">
          <StripeConnectKYC
            creator={creator}
            onStatusChange={(s) => setStripeStatus(s)}
          />
        </TabsContent>
        <TabsContent value="other" className="mt-4">
          {/* Other Payout Methods */}
      <Card className="bg-stone-800/30 border-amber-600/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            Other Payout Methods
          </CardTitle>
          <Button
            onClick={() => setShowAddMethod(true)}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Method
          </Button>
        </CardHeader>
        <CardContent>
          {methodsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
            </div>
          ) : payoutMethods.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
              <p className="text-amber-400/70 mb-4">No payout methods linked</p>
              <Button onClick={() => setShowAddMethod(true)} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {payoutMethods.filter(m => m.method_type !== 'stripe_connect').map((method) => {
                const methodInfo = PAYOUT_METHODS.find(m => m.id === method.method_type);
                return (
                  <motion.div
                    key={method.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl border border-amber-600/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{methodInfo?.icon || '💳'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-amber-100 font-medium">{methodInfo?.name || method.method_type}</p>
                          {method.is_default && (
                            <Badge className="bg-green-600/20 text-green-300 border-green-500/30 text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-amber-400/60 text-sm">{method.identifier}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMethodMutation.mutate(method.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      {/* Payout History */}
      {payoutHistory.length > 0 && (
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100">Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payoutHistory.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 bg-stone-800/50 rounded-xl"
                >
                  <div>
                    <p className="text-amber-100 font-medium">
                      {payout.amount_denarii.toLocaleString()} Denarii → ${payout.payout_usd.toFixed(2)}
                    </p>
                    <p className="text-amber-400/60 text-xs">
                      {new Date(payout.created_date).toLocaleDateString()} via {payout.payout_method}
                    </p>
                  </div>
                  <Badge className={
                    payout.status === 'completed' ? 'bg-green-600/20 text-green-300 border-green-500/30' :
                    payout.status === 'rejected' ? 'bg-red-600/20 text-red-300 border-red-500/30' :
                    'bg-amber-600/20 text-amber-300 border-amber-500/30'
                  }>
                    {payout.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Method Dialog */}
      <Dialog open={showAddMethod} onOpenChange={setShowAddMethod}>
        <DialogContent className="bg-stone-900 border-amber-600/30">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Add Payout Method</DialogTitle>
            <DialogDescription className="text-amber-400/70">
              Link an account to receive your earnings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-amber-200">Method Type</Label>
              <Select value={newMethod.type} onValueChange={(v) => setNewMethod({ ...newMethod, type: v })}>
                <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-600/30">
                  {PAYOUT_METHODS.filter(m => m.id !== 'stripe_connect').map(method => (
                    <SelectItem key={method.id} value={method.id} className="text-amber-100">
                      <span className="flex items-center gap-2">
                        <span>{method.icon}</span>
                        {method.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newMethod.type && (
              <div>
                <Label className="text-amber-200">
                  {PAYOUT_METHODS.find(m => m.id === newMethod.type)?.name} Details
                </Label>
                <Input
                  value={newMethod.identifier}
                  onChange={(e) => setNewMethod({ ...newMethod, identifier: e.target.value })}
                  placeholder={PAYOUT_METHODS.find(m => m.id === newMethod.type)?.placeholder}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                />
              </div>
            )}

            <Button
              onClick={() => addMethodMutation.mutate(newMethod)}
              disabled={!newMethod.type || !newMethod.identifier || addMethodMutation.isPending}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {addMethodMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Method
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cashout Dialog */}
      <Dialog open={showCashout} onOpenChange={setShowCashout}>
        <DialogContent className="bg-stone-900 border-amber-600/30">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Request Cashout</DialogTitle>
            <DialogDescription className="text-amber-400/70">
              Convert your Denarii to real money
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-amber-200">Amount (Denarii)</Label>
              <Input
                type="number"
                value={cashoutAmount}
                onChange={(e) => setCashoutAmount(e.target.value)}
                placeholder={`Min ${MIN_PAYOUT_DENARII.toLocaleString()}`}
                max={availableBalance}
                className="bg-stone-800 border-amber-600/20 text-amber-100 text-lg"
              />
              <p className="text-amber-400/60 text-xs mt-1">
                Available: {availableBalance.toLocaleString()} Denarii
              </p>
            </div>

            {cashoutNum > 0 && (
              <div className="p-4 bg-green-900/20 rounded-xl border border-green-600/30">
                <p className="text-green-300/70 text-sm mb-1">You'll receive</p>
                <p className="text-3xl font-bold text-green-100">${estimatedPayout.toFixed(2)}</p>
                <p className="text-green-400/60 text-xs mt-1">
                  ({cashoutNum.toLocaleString()} Denarii × 60% share ÷ 260)
                </p>
              </div>
            )}

            {defaultMethod && (
              <div className="p-3 bg-stone-800/50 rounded-lg">
                <p className="text-amber-300/70 text-xs mb-1">Payout to</p>
                <p className="text-amber-100 font-medium flex items-center gap-2">
                  {PAYOUT_METHODS.find(m => m.id === defaultMethod.method_type)?.icon}
                  {defaultMethod.method_type === 'stripe_connect' ? 'Your Bank Account' : defaultMethod.identifier}
                </p>
                {defaultMethod.method_type === 'stripe_connect' && defaultMethod.stripe_payouts_enabled && (
                  <p className="text-green-400 text-xs mt-1">⚡ Instant payout - arrives in 1-2 days</p>
                )}
              </div>
            )}

            <Button
              onClick={() => requestPayoutMutation.mutate({ amount: cashoutNum, method: defaultMethod })}
              disabled={!canCashout || requestPayoutMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 font-bold"
            >
              {requestPayoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <DollarSign className="w-4 h-4 mr-2" />
              )}
              Request ${estimatedPayout.toFixed(2)} Cashout
            </Button>

            <p className="text-amber-400/50 text-xs text-center">
              Payouts are processed within 3-5 business days
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}