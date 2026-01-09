import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const PAYOUT_METHODS = [
  { id: 'paypal', name: 'PayPal', icon: '💳', placeholder: 'your@email.com' },
  { id: 'venmo', name: 'Venmo', icon: '📱', placeholder: '@username' },
  { id: 'cashapp', name: 'Cash App', icon: '💵', placeholder: '$cashtag' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', placeholder: 'Contact support to set up' }
];

// Platform takes 60%, creator gets 40%
const CREATOR_SHARE = 0.40;
const DENARII_TO_USD = 0.01; // 1 Denarii = $0.01 base value
const MIN_PAYOUT_DENARII = 1000; // Minimum 1000 Denarii ($4 payout)

export default function CreatorPayoutSettings({ creator, user }) {
  const queryClient = useQueryClient();
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [showCashout, setShowCashout] = useState(false);
  const [newMethod, setNewMethod] = useState({ type: '', identifier: '', displayName: '' });
  const [cashoutAmount, setCashoutAmount] = useState('');

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
      const payoutUsd = amount * DENARII_TO_USD * CREATOR_SHARE;
      
      // Deduct from creator earnings
      await base44.entities.Creator.update(creator.id, {
        total_earnings_denarii: (creator.total_earnings_denarii || 0) - amount,
        pending_withdrawal: (creator.pending_withdrawal || 0) + payoutUsd
      });

      return base44.entities.CreatorPayout.create({
        creator_id: creator.id,
        user_email: user.email,
        amount_denarii: amount,
        payout_usd: payoutUsd,
        payout_method: method.method_type,
        payout_identifier: method.identifier,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payout-history']);
      queryClient.invalidateQueries(['my-creator']);
      setShowCashout(false);
      setCashoutAmount('');
      toast.success('Payout request submitted! Processing within 3-5 business days.');
    }
  });

  const availableBalance = creator?.total_earnings_denarii || 0;
  const cashoutNum = parseInt(cashoutAmount) || 0;
  const estimatedPayout = cashoutNum * DENARII_TO_USD * CREATOR_SHARE;
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
                ≈ ${(availableBalance * DENARII_TO_USD * CREATOR_SHARE).toFixed(2)} USD (40% creator share)
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
                <p className="font-semibold mb-1">Revenue Split: 60% Platform / 40% Creator</p>
                <p>For every $1.00 of gift value received, you earn $0.40. Minimum cashout: {MIN_PAYOUT_DENARII.toLocaleString()} Denarii (${(MIN_PAYOUT_DENARII * DENARII_TO_USD * CREATOR_SHARE).toFixed(2)})</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Methods */}
      <Card className="bg-stone-800/30 border-amber-600/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            Payout Methods
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
              {payoutMethods.map((method) => {
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
                  {PAYOUT_METHODS.map(method => (
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
                  ({cashoutNum.toLocaleString()} × $0.01 × 40%)
                </p>
              </div>
            )}

            {defaultMethod && (
              <div className="p-3 bg-stone-800/50 rounded-lg">
                <p className="text-amber-300/70 text-xs mb-1">Payout to</p>
                <p className="text-amber-100 font-medium flex items-center gap-2">
                  {PAYOUT_METHODS.find(m => m.id === defaultMethod.method_type)?.icon}
                  {defaultMethod.identifier}
                </p>
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