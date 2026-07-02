import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from 'lucide-react';
import CreatorPayoutSettings from '@/components/creator/CreatorPayoutSettings';
import CancelSubscriptionModal from '@/components/monetization/CancelSubscriptionModal';

export default function CreatorPayouts() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: activeSubscription, refetch: refetchSub } = useQuery({
    queryKey: ['my-host-sub', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const subs = await base44.entities.CreatorSubscription.filter(
        { user_email: user.email, status: 'active' }, '-created_date', 1
      );
      return subs[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: creator, isLoading } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!user || !creator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="py-12 text-center">
              <p className="text-amber-400/70">Creator profile not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2">Creator Payouts</h1>
          <p className="text-amber-400/70">Manage your earnings and withdrawal methods</p>
        </div>

        {/* Active subscription management */}
        {activeSubscription && (
          <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-amber-100 font-medium">Legion Host Subscription</p>
                <p className="text-amber-400/60 text-sm">
                  {activeSubscription.plan_type} plan
                  {activeSubscription.cancel_at_period_end && ' · Cancels at end of period'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-600/20 text-green-300 border-green-500/30">Active</Badge>
                {!activeSubscription.cancel_at_period_end && (
                  <CancelSubscriptionModal
                    subscription={activeSubscription}
                    onCancelled={() => refetchSub()}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <CreatorPayoutSettings creator={creator} user={user} />
      </div>
    </div>
  );
}