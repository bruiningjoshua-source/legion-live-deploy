import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const DENARII_TO_USD = 0.01;
const CREATOR_SHARE = 0.40;
const MIN_WITHDRAWAL_DENARII = 5000; // Minimum ~$20

export default function WithdrawalForm({ creator, earnings, payoutMethods }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');

  const availableBalance = Math.max(0, 
    (earnings?.total_earnings_denarii || 0) - 
    (earnings?.pending_payout_denarii || 0) - 
    (earnings?.lifetime_payout_denarii || 0)
  );

  const amountNum = parseInt(amount) || 0;
  const usdValue = (amountNum * DENARII_TO_USD * CREATOR_SHARE).toFixed(2);

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const selectedMethod = (payoutMethods || []).find(m => m.id === method);
      if (!selectedMethod) throw new Error('Select a payout method');

      return base44.entities.CreatorPayout.create({
        creator_id: creator.id,
        user_email: creator.user_email,
        amount_denarii: amountNum,
        payout_usd: parseFloat(usdValue),
        payout_method: selectedMethod.method_type,
        payout_identifier: selectedMethod.identifier || selectedMethod.stripe_account_id || '',
        status: 'pending'
      });
    },
    onSuccess: () => {
      toast.success(`Withdrawal of $${usdValue} submitted!`);
      setAmount('');
      setMethod('');
      queryClient.invalidateQueries(['creator-payouts']);
      queryClient.invalidateQueries(['broadcaster-earnings']);
    }
  });

  const canWithdraw = amountNum >= MIN_WITHDRAWAL_DENARII && amountNum <= availableBalance && method;

  return (
    <Card className="bg-stone-800/40 border-amber-600/20">
      <CardHeader>
        <CardTitle className="text-amber-100 text-sm flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-green-400" />
          Request Withdrawal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-amber-200 text-xs">Amount (Denarii)</Label>
          <Input
            type="number"
            placeholder={`Min ${MIN_WITHDRAWAL_DENARII.toLocaleString()}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-stone-900 border-amber-600/20 text-amber-100"
          />
          {amountNum > 0 && (
            <p className="text-amber-400/60 text-xs mt-1">≈ ${usdValue} USD (40% creator share)</p>
          )}
          <p className="text-amber-400/50 text-xs mt-1">Available: 🪙 {availableBalance.toLocaleString()}</p>
        </div>

        <div>
          <Label className="text-amber-200 text-xs">Payout Method</Label>
          {(payoutMethods || []).length > 0 ? (
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="bg-stone-900 border-amber-600/20 text-amber-100">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-amber-600/30">
                {payoutMethods.map(m => (
                  <SelectItem key={m.id} value={m.id} className="text-amber-100">
                    {m.display_name || m.method_type} — {m.identifier || m.stripe_account_id || 'Setup needed'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2 text-amber-400/60 text-xs mt-2">
              <AlertCircle className="w-3 h-3" />
              Set up a payout method in your payout settings first.
            </div>
          )}
        </div>

        <Button
          onClick={() => withdrawMutation.mutate()}
          disabled={!canWithdraw || withdrawMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40"
        >
          {withdrawMutation.isPending ? 'Submitting...' : `Withdraw $${amountNum > 0 ? usdValue : '0.00'}`}
        </Button>

        {amountNum > 0 && amountNum < MIN_WITHDRAWAL_DENARII && (
          <p className="text-red-400 text-xs">Minimum withdrawal: 🪙 {MIN_WITHDRAWAL_DENARII.toLocaleString()}</p>
        )}
        {amountNum > availableBalance && (
          <p className="text-red-400 text-xs">Exceeds available balance</p>
        )}
      </CardContent>
    </Card>
  );
}