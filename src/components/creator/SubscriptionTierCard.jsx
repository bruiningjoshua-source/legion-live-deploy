import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const tierConfig = {
  bronze: {
    icon: Star,
    color: 'from-amber-700 to-amber-600',
    badgeClass: 'bg-amber-700/30 text-amber-300',
    buttonClass: 'bg-amber-600 hover:bg-amber-700'
  },
  silver: {
    icon: Sparkles,
    color: 'from-slate-400 to-slate-500',
    badgeClass: 'bg-slate-400/30 text-slate-300',
    buttonClass: 'bg-slate-400 hover:bg-slate-500'
  },
  gold: {
    icon: Crown,
    color: 'from-yellow-400 to-yellow-500',
    badgeClass: 'bg-yellow-400/30 text-yellow-300',
    buttonClass: 'bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-600 hover:to-yellow-500'
  }
};

export default function SubscriptionTierCard({ tier, creatorId, isSubscribed }) {
  const queryClient = useQueryClient();
  const config = tierConfig[tier.tier_name?.toLowerCase()] || tierConfig.bronze;
  const Icon = config.icon;

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (window.self !== window.top) {
        throw new Error('IFRAME_BLOCKED');
      }

      const csrfToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      const response = await base44.functions.invoke('createFanClubCheckout', {
        creator_id: creatorId,
        tier: tier.tier_level || 1,
        price_usd: tier.price_usd,
        tier_name: tier.display_name || tier.tier_name,
        perks: tier.perks?.map(p => typeof p === 'string' ? p : p.name) || [],
        csrfToken
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.data?.error || 'Failed to create checkout session');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-subscription'] });
    },
    onError: (error) => {
      if (error.message === 'IFRAME_BLOCKED') {
        toast.warning('Subscriptions are only available in the published app. Please open the app directly.');
      } else {
        toast.error(error.message || 'Subscription failed. Please try again.');
      }
    }
  });

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className={`bg-gradient-to-br ${config.color} border-0 relative overflow-hidden`}>
        {isSubscribed && (
          <Badge className="absolute top-3 right-3 bg-green-600 text-white">
            Subscribed
          </Badge>
        )}
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-white capitalize">{tier.display_name || tier.tier_name}</CardTitle>
              <p className="text-white/80 text-sm">${tier.price_usd}/month</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-6">
            {tier.perks?.map((perk, idx) => (
              <div key={idx} className="flex items-start gap-2 text-white/90 text-sm">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{typeof perk === 'string' ? perk : perk.name}</span>
              </div>
            ))}
          </div>
          <Button
            onClick={() => subscribeMutation.mutate()}
            disabled={isSubscribed || subscribeMutation.isPending}
            className={`w-full ${config.buttonClass} text-white`}
          >
            {subscribeMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
            ) : isSubscribed ? 'Subscribed' : 'Subscribe'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}