import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wallet, 
  Check,
  Plus,
  Trash2,
  Shield,
  Zap,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PAYOUT_METHODS = [
  { id: 'paypal', name: 'PayPal', icon: '💳', placeholder: 'PayPal email address' },
  { id: 'venmo', name: 'Venmo', icon: '📱', placeholder: '@username' },
  { id: 'cashapp', name: 'Cash App', icon: '💵', placeholder: '$cashtag' },
];

export default function DirectDonationSettings({ creator, subscription }) {
  const [newMethod, setNewMethod] = useState({ type: '', identifier: '' });
  const [enableDirectTips, setEnableDirectTips] = useState(creator?.direct_tips_enabled || false);
  const queryClient = useQueryClient();
  const isSubscribed = subscription?.status === 'active';

  const { data: payoutMethods = [] } = useQuery({
    queryKey: ['payout-methods', creator?.id],
    queryFn: () => base44.entities.CreatorPayoutMethod.filter({ creator_id: creator.id }),
    enabled: !!creator?.id
  });

  const addMethodMutation = useMutation({
    mutationFn: async () => {
      if (!newMethod.type || !newMethod.identifier) {
        throw new Error('Please select a method and enter your details');
      }
      await base44.entities.CreatorPayoutMethod.create({
        creator_id: creator.id,
        user_email: creator.user_email,
        method_type: newMethod.type,
        identifier: newMethod.identifier.trim(),
        is_default: payoutMethods.length === 0,
        display_name: PAYOUT_METHODS.find(m => m.id === newMethod.type)?.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payout-methods']);
      setNewMethod({ type: '', identifier: '' });
      toast.success('Payout method added - viewers can now tip you directly!');
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (methodId) => base44.entities.CreatorPayoutMethod.delete(methodId),
    onSuccess: () => {
      queryClient.invalidateQueries(['payout-methods']);
      toast.success('Payout method removed');
    }
  });

  const toggleDirectTipsMutation = useMutation({
    mutationFn: async (enabled) => {
      await base44.entities.Creator.update(creator.id, { direct_tips_enabled: enabled });
      return enabled;
    },
    onSuccess: (enabled) => {
      setEnableDirectTips(enabled);
      queryClient.invalidateQueries(['my-creator']);
      toast.success(enabled ? 'Direct tips enabled!' : 'Direct tips disabled');
    }
  });

  if (!isSubscribed) {
    return (
      <Card className="bg-stone-800/30 border-amber-600/20">
        <CardContent className="p-8 text-center">
          <Lock className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-amber-100 mb-2">Host Subscription Required</h3>
          <p className="text-amber-400/70 mb-4">
            Subscribe to unlock direct viewer donations to your linked wallets
          </p>
          <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30">
            $5/month or $48/year
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-green-100 font-bold">Direct Viewer Tips</h3>
                <p className="text-green-400/70 text-sm">
                  Viewers can send tips directly to your linked wallets during streams
                </p>
              </div>
            </div>
            <Switch
              checked={enableDirectTips}
              onCheckedChange={(checked) => toggleDirectTipsMutation.mutate(checked)}
              disabled={payoutMethods.length === 0}
            />
          </div>
          {payoutMethods.length === 0 && (
            <p className="text-amber-400 text-xs mt-3">
              Add a payout method below to enable direct tips
            </p>
          )}
        </CardContent>
      </Card>

      {/* Linked Wallets */}
      <Card className="bg-stone-800/30 border-amber-600/20">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            Linked Payout Wallets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {payoutMethods.map((method, i) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-4 bg-stone-900/50 rounded-xl border border-amber-600/20"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {PAYOUT_METHODS.find(m => m.id === method.method_type)?.icon || '💳'}
                </span>
                <div>
                  <p className="text-amber-100 font-semibold">{method.display_name || method.method_type}</p>
                  <p className="text-amber-400/70 text-sm">{method.identifier}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {method.is_default && (
                  <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                    <Check className="w-3 h-3 mr-1" />
                    Primary
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMethodMutation.mutate(method.id)}
                  className="text-red-400 hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}

          {/* Add New Method */}
          <div className="pt-4 border-t border-amber-600/20">
            <Label className="text-amber-200 mb-3 block">Add Payout Method</Label>
            <div className="flex gap-3 flex-wrap">
              <Select value={newMethod.type} onValueChange={(v) => setNewMethod({ ...newMethod, type: v })}>
                <SelectTrigger className="w-40 bg-stone-900/50 border-amber-600/20 text-amber-100">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-600/30">
                  {PAYOUT_METHODS.map(method => (
                    <SelectItem key={method.id} value={method.id} className="text-amber-100">
                      {method.icon} {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={PAYOUT_METHODS.find(m => m.id === newMethod.type)?.placeholder || 'Enter details...'}
                value={newMethod.identifier}
                onChange={(e) => setNewMethod({ ...newMethod, identifier: e.target.value })}
                className="flex-1 bg-stone-900/50 border-amber-600/20 text-amber-100"
              />
              <Button
                onClick={() => addMethodMutation.mutate()}
                disabled={!newMethod.type || !newMethod.identifier || addMethodMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mt-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-blue-200 font-semibold text-sm">How Direct Tips Work</h4>
                <p className="text-blue-300/70 text-xs mt-1">
                  When viewers send a direct tip, they'll see your linked wallet info and can send payment outside the platform. 
                  This is in addition to in-app gifting. Direct tips bypass platform fees - you keep 100%!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}