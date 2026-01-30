import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Check, 
  Star, 
  Zap, 
  DollarSign,
  Radio,
  Gift,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const SUBSCRIPTION_FEATURES = [
  { icon: Gift, text: 'Receive gifts and tips from viewers' },
  { icon: DollarSign, text: 'Cash out your earnings (50% revenue share)' },
  { icon: TrendingUp, text: 'Access analytics and growth tools' },
  { icon: Star, text: 'Priority support and verification eligibility' },
];

export default function HostSubscriptionGate({ user, creator, subscription, onSubscribed }) {
  const isSubscribed = subscription?.status === 'active';

  const subscribeMutation = useMutation({
    mutationFn: async (plan) => {
      // Check if running in iframe
      if (window.self !== window.top) {
        throw new Error('IFRAME_BLOCKED');
      }

      const response = await base44.functions.invoke('createHostSubscription', {
        plan,
        creatorId: creator?.id
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to create checkout');
      }
    },
    onError: (error) => {
      if (error.message === 'IFRAME_BLOCKED') {
        toast.error('Please open the app directly to subscribe');
      } else {
        toast.error('Failed to start checkout');
      }
    }
  });

  if (isSubscribed) {
    return (
      <Card className="bg-gradient-to-br from-green-900/40 to-stone-900 border-green-600/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-green-100 font-bold text-lg">Host Subscription Active</h3>
              <p className="text-green-400/70 text-sm">
                Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
            <Check className="w-3 h-3 mr-1" />
            All monetization features unlocked
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/60 via-stone-900 to-purple-900/40 border border-amber-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(251,191,36,0.15),_transparent)]" />
        
        <div className="relative p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <Crown className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-amber-100 mb-2">
            Unlock Monetization
          </h2>
          <p className="text-amber-300/80 max-w-md mx-auto mb-6">
            You can broadcast for free! Subscribe to receive gifts, tips, and start earning from your streams.
          </p>

          {/* Features */}
          <div className="grid gap-3 max-w-sm mx-auto mb-8">
            {SUBSCRIPTION_FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-amber-200 text-sm">{feature.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
            {/* Monthly */}
            <Card className="bg-stone-800/50 border-amber-600/30 hover:border-amber-500/50 transition-all cursor-pointer"
                  onClick={() => subscribeMutation.mutate('monthly')}>
              <CardContent className="p-6">
                <p className="text-amber-300 font-semibold mb-2">Monthly</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-white">$5</span>
                  <span className="text-amber-400/70">/month</span>
                </div>
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  disabled={subscribeMutation.isPending}
                >
                  {subscribeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Subscribe Monthly'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Yearly */}
            <Card className="bg-gradient-to-br from-amber-800/30 to-stone-800/50 border-amber-500/50 hover:border-amber-400/70 transition-all cursor-pointer relative"
                  onClick={() => subscribeMutation.mutate('yearly')}>
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white border-0">
                Save 80%
              </Badge>
              <CardContent className="p-6">
                <p className="text-amber-300 font-semibold mb-2">Yearly</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-white">$12</span>
                  <span className="text-amber-400/70">/year</span>
                </div>
                <p className="text-green-400 text-xs mb-4">= $1/month</p>
                <Button 
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  disabled={subscribeMutation.isPending}
                >
                  {subscribeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Subscribe Yearly
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="text-amber-400/50 text-xs mt-6">
            Cancel anytime. No hidden fees.
          </p>
        </div>
      </div>

      {/* What you can do without subscription */}
      <Card className="bg-stone-800/30 border-amber-600/20">
        <CardContent className="p-6">
          <h4 className="text-amber-100 font-semibold mb-3">Free for Everyone</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-amber-300/80">
              <Check className="w-4 h-4 text-green-400" />
              Go live & broadcast
            </div>
            <div className="flex items-center gap-2 text-amber-300/80">
              <Check className="w-4 h-4 text-green-400" />
              Watch live streams
            </div>
            <div className="flex items-center gap-2 text-amber-300/80">
              <Check className="w-4 h-4 text-green-400" />
              Chat in streams
            </div>
            <div className="flex items-center gap-2 text-amber-300/80">
              <Check className="w-4 h-4 text-green-400" />
              Follow creators
            </div>
            <div className="flex items-center gap-2 text-amber-300/80">
              <Check className="w-4 h-4 text-green-400" />
              Send gifts to others
            </div>
            <div className="flex items-center gap-2 text-amber-300/80">
              <Check className="w-4 h-4 text-green-400" />
              Build your audience
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}