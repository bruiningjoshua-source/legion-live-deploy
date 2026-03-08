import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Copy, Share2, Gift, CheckCircle2, Loader2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function CreatorReferralProgram() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: referrals = [], refetch: refetchReferrals } = useQuery({
    queryKey: ['creator-referrals', user?.email],
    queryFn: () => base44.entities.CreatorReferral.filter({ referrer_id: user.email }, '-created_date', 100),
    enabled: !!user?.email
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('processCreatorReferral', { action: 'generate' });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Your referral code: ${data.code}`);
      refetchReferrals();
    },
    onError: () => toast.error('Failed to generate code')
  });

  const claimMutation = useMutation({
    mutationFn: async (referralId) => {
      const res = await base44.functions.invoke('processCreatorReferral', { action: 'claim_reward' });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`+${data.reward} Denarii claimed!`);
      refetchReferrals();
    },
    onError: () => toast.error('Failed to claim reward')
  });

  const claimableRewards = referrals.filter(r => r.status === 'signed_up' && !r.reward_claimed);

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Referral Program</h3>
            <p className="text-white/50 text-sm">Invite creators → Earn 5,000 Denarii per signup</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Generate Code */}
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:shadow-lg hover:shadow-amber-500/40 transition-all disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </span>
            ) : (
              'Generate Referral Code'
            )}
          </button>

          {/* Active Codes */}
          {referrals.length > 0 && (
            <div className="space-y-2">
              <p className="text-white/60 font-medium text-sm">Your Referral Codes</p>
              {referrals.map((ref) => (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3"
                >
                  <code className="flex-1 text-amber-300 font-mono text-sm">{ref.referral_code}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ref.referral_code);
                      toast.success('Copied!');
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 text-white/50 hover:text-white" />
                  </button>
                  {ref.status === 'signed_up' && (
                    <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      Redeemed
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Claimable Rewards */}
          {claimableRewards.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-green-400" />
                  <span className="text-white font-bold">
                    {claimableRewards.length} reward{claimableRewards.length > 1 ? 's' : ''} to claim!
                  </span>
                </div>
                <button
                  onClick={() => claimMutation.mutate(claimableRewards[0].id)}
                  disabled={claimMutation.isPending}
                  className="px-4 py-1.5 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {claimMutation.isPending ? 'Claiming...' : 'Claim All'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}