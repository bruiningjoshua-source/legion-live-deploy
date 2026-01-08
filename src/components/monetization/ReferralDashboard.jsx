import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Share2,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  Zap,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function ReferralDashboard({ creatorId }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: referralCode } = useQuery({
    queryKey: ['referral-code', creatorId],
    queryFn: async () => {
      const codes = await base44.entities.ReferralCode.filter(
        { referrer_creator_id: creatorId },
        '-created_date',
        1
      );
      return codes[0] || null;
    },
    enabled: !!creatorId
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', creatorId],
    queryFn: () =>
      base44.entities.ReferralCode.filter(
        { referrer_creator_id: creatorId },
        '-created_date',
        100
      ),
    enabled: !!creatorId
  });

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const code = `REF${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      return base44.entities.ReferralCode.create({
        referrer_creator_id: creatorId,
        code
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-code', creatorId] });
      queryClient.invalidateQueries({ queryKey: ['referrals', creatorId] });
      toast.success('Referral code generated!');
    }
  });

  const claimBonusMutation = useMutation({
    mutationFn: (referralId) =>
      base44.entities.ReferralCode.update(referralId, {
        referrer_bonus_claimed: true
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals', creatorId] });
      toast.success('Bonus claimed!');
    }
  });

  const referralUrl = referralCode
    ? `${window.location.origin}?referral=${referralCode.code}`
    : '';

  const stats = {
    pending: referrals.filter(r => r.status === 'pending').length,
    onboarded: referrals.filter(r => r.status === 'onboarded').length,
    monetized: referrals.filter(r => r.status === 'monetized').length,
    totalEarned: referrals
      .filter(r => r.referrer_bonus_claimed)
      .reduce((sum, r) => sum + (r.referrer_bonus_amount || 50), 0)
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Referral Code Section */}
      {referralCode ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl p-6"
        >
          <h3 className="text-blue-100 font-bold text-lg mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Your Referral Link
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={referralUrl}
                className="bg-stone-900/50 border-blue-600/20 text-amber-100 text-sm"
              />
              <Button
                onClick={copyToClipboard}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
              >
                <Copy className="w-4 h-4 mr-1" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-stone-900/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-300">{referralCode.code}</div>
                <div className="text-xs text-blue-400/70">Your Code</div>
              </div>

              <div className="bg-stone-900/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-300">$50</div>
                <div className="text-xs text-green-400/70">You Earn</div>
              </div>

              <div className="bg-stone-900/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-300">$50</div>
                <div className="text-xs text-purple-400/70">They Get</div>
              </div>
            </div>

            <p className="text-blue-200/70 text-sm">
              Share your code with others. When they sign up and activate monetization, you both earn bonuses!
            </p>
          </div>
        </motion.div>
      ) : (
        <Button
          onClick={() => generateCodeMutation.mutate()}
          disabled={generateCodeMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Generate Your Referral Code
        </Button>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Pending', value: stats.pending, color: 'from-yellow-500' },
          { icon: Clock, label: 'Onboarded', value: stats.onboarded, color: 'from-blue-500' },
          { icon: CheckCircle, label: 'Monetized', value: stats.monetized, color: 'from-green-500' },
          { icon: DollarSign, label: 'Earned', value: `$${stats.totalEarned}`, color: 'from-amber-500' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} bg-opacity-10 border border-current border-opacity-20 rounded-lg p-3`}
            >
              <Icon className="w-4 h-4 mb-2 opacity-70" />
              <div className="text-2xl font-bold text-amber-100">{stat.value}</div>
              <div className="text-xs text-amber-400/70">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Referrals List */}
      {referrals.length > 0 && (
        <Card className="bg-stone-800/50 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Your Referrals ({referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatePresence>
              {referrals.map((referral, i) => (
                <motion.div
                  key={referral.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between bg-stone-900/50 rounded-lg p-4 border border-amber-600/10"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-100 font-semibold truncate">
                        {referral.referred_email || 'Pending...'}
                      </span>
                      <Badge
                        className={
                          referral.status === 'monetized'
                            ? 'bg-green-600 text-white'
                            : referral.status === 'onboarded'
                            ? 'bg-blue-600 text-white'
                            : 'bg-yellow-600 text-white'
                        }
                      >
                        {referral.status}
                      </Badge>
                    </div>
                    <p className="text-amber-400/60 text-xs">
                      {referral.onboarded_date
                        ? new Date(referral.onboarded_date).toLocaleDateString()
                        : 'Not joined yet'}
                    </p>
                  </div>

                  <div className="text-right ml-4">
                    {referral.status === 'monetized' && !referral.referrer_bonus_claimed ? (
                      <Button
                        size="sm"
                        onClick={() => claimBonusMutation.mutate(referral.id)}
                        disabled={claimBonusMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Claim $50
                      </Button>
                    ) : referral.referrer_bonus_claimed ? (
                      <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                        ✓ Earned $50
                      </Badge>
                    ) : (
                      <span className="text-amber-400/70 text-xs">Awaiting monetization</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-stone-800/50 border-amber-600/20">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-amber-200/80 text-sm">
          <div className="flex gap-3">
            <span className="font-bold text-amber-400 flex-shrink-0">1.</span>
            <span>Share your referral code with creators you know</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-amber-400 flex-shrink-0">2.</span>
            <span>They sign up using your code</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-amber-400 flex-shrink-0">3.</span>
            <span>When they activate monetization, you both get $50 bonuses</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-amber-400 flex-shrink-0">4.</span>
            <span>You earn 5% of their revenue for 30 days</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}