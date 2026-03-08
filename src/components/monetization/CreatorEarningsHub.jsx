import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, DollarSign, Lock } from 'lucide-react';

const DENARII_PER_USD = 180;
const CREATOR_SHARE = 0.60;

export default function CreatorEarningsHub({ creatorId }) {
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  const { data: creator, isLoading: creatorLoading } = useQuery({
    queryKey: ['creator', creatorId],
    queryFn: () => base44.asServiceRole.entities.Creator.filter({ id: creatorId }, null, 1).then(r => r[0]),
    enabled: !!creatorId
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ['creator-payouts', creatorId],
    queryFn: () => base44.asServiceRole.entities.CreatorPayout.filter({ creator_id: creatorId }, '-created_date', 50),
    enabled: !!creatorId
  });

  const { data: kycStatus } = useQuery({
    queryKey: ['kyc-status', creatorId],
    queryFn: async () => {
      if (!creator) return null;
      const response = await base44.functions.invoke('enforceKycGate', {});
      return response.data;
    },
    enabled: !!creator
  });

  if (creatorLoading) return <div className="p-4 text-center">Loading earnings...</div>;
  if (!creator) return <div className="p-4 text-center text-red-400">Creator not found</div>;

  const totalEarningsDenarii = creator.total_earnings_denarii || 0;
  const totalEarningsUsd = totalEarningsDenarii / DENARII_PER_USD;
  const isKycVerified = kycStatus?.kyc_verified === true;

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <Card className="border-amber-500/20 bg-gradient-to-r from-amber-950 to-orange-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-200">
            <TrendingUp className="w-5 h-5" />
            Total Lifetime Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/60">Denarii</p>
                <p className="text-3xl font-bold text-amber-300">{totalEarningsDenarii.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">USD Equivalent</p>
                <p className="text-3xl font-bold text-amber-300">${totalEarningsUsd.toFixed(2)}</p>
              </div>
            </div>
            <div className="text-xs text-white/50 border-t border-white/10 pt-3">
              Exchange rate: 180 Denarii = $1 USD · You earn 60% from gifts after platform fees
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KYC Status Alert */}
      {!isKycVerified && (
        <Card className="border-red-500/30 bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-300 mb-1">KYC Verification Required</p>
                <p className="text-sm text-white/70 mb-3">
                  Complete identity verification to enable payouts and withdraw your earnings.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-red-500/50 text-red-300 hover:bg-red-900/30"
                >
                  Complete KYC Verification
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Request Form */}
      {isKycVerified && (
        <Card className="border-green-500/20 bg-green-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-300">
              <DollarSign className="w-5 h-5" />
              Request Payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Denarii to withdraw"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white placeholder-white/40"
              />
              <div className="text-xs text-white/60">
                {payoutAmount && (
                  <>
                    → ${(Number(payoutAmount) / DENARII_PER_USD).toFixed(2)} USD
                  </>
                )}
              </div>
              <Button 
                className="w-full bg-green-700 hover:bg-green-600"
                disabled={!payoutAmount || Number(payoutAmount) <= 0}
              >
                Submit Payout Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payouts */}
      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payoutsLoading ? (
            <p className="text-center text-white/50">Loading payouts...</p>
          ) : payouts && payouts.length > 0 ? (
            <div className="space-y-2">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10">
                  <div>
                    <p className="font-semibold text-white">${payout.amount_usd.toFixed(2)}</p>
                    <p className="text-xs text-white/50">{payout.status}</p>
                  </div>
                  <div className="text-right text-xs text-white/50">
                    {new Date(payout.initiated_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-white/50 py-4">No payouts yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}