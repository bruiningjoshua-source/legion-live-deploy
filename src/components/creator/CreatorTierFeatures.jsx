import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, Check } from 'lucide-react';

/**
 * Creator Tier-Based Feature Unlocks
 * Shows which features are available based on subscription tier
 */

const FEATURE_TIERS = {
  free: {
    name: 'Free Tier',
    features: [
      { name: 'Stream for free', enabled: true },
      { name: 'Receive tips', enabled: true },
      { name: 'Custom bio', enabled: false },
      { name: 'Advanced analytics', enabled: false },
      { name: 'Custom theme', enabled: false },
      { name: 'Multistream', enabled: false }
    ]
  },
  basic: {
    name: 'Basic ($5/month)',
    features: [
      { name: 'Stream for free', enabled: true },
      { name: 'Receive tips', enabled: true },
      { name: 'Custom bio', enabled: true },
      { name: 'Advanced analytics', enabled: false },
      { name: 'Custom theme', enabled: false },
      { name: 'Multistream', enabled: false }
    ]
  },
  pro: {
    name: 'Pro ($15/month)',
    features: [
      { name: 'Stream for free', enabled: true },
      { name: 'Receive tips', enabled: true },
      { name: 'Custom bio', enabled: true },
      { name: 'Advanced analytics', enabled: true },
      { name: 'Custom theme', enabled: true },
      { name: 'Multistream', enabled: false }
    ]
  },
  elite: {
    name: 'Elite ($50/month)',
    features: [
      { name: 'Stream for free', enabled: true },
      { name: 'Receive tips', enabled: true },
      { name: 'Custom bio', enabled: true },
      { name: 'Advanced analytics', enabled: true },
      { name: 'Custom theme', enabled: true },
      { name: 'Multistream', enabled: true }
    ]
  }
};

export default function CreatorTierFeatures({ creatorEmail }) {
  const { data: subscription } = useQuery({
    queryKey: ['creator-subscription', creatorEmail],
    queryFn: async () => {
      if (!creatorEmail) return null;
      const subs = await base44.entities.CreatorSubscription.filter(
        { user_email: creatorEmail, status: 'active' }, null, 1
      );
      return subs[0] || null;
    },
    enabled: !!creatorEmail,
    staleTime: 300000
  });

  const tier = subscription?.tier || 'free';
  const tierInfo = FEATURE_TIERS[tier] || FEATURE_TIERS.free;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white font-semibold mb-3">Your Features</h3>
        <div className="inline-block bg-white/10 px-3 py-1 rounded-lg border border-white/20">
          <p className="text-sm font-medium text-white/80">{tierInfo.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tierInfo.features.map((feature, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              feature.enabled
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-white/5 border-white/10 opacity-60'
            }`}
          >
            {feature.enabled ? (
              <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            ) : (
              <Lock className="w-5 h-5 text-white/30 flex-shrink-0" />
            )}
            <span className={`text-sm ${feature.enabled ? 'text-white' : 'text-white/50'}`}>
              {feature.name}
            </span>
          </div>
        ))}
      </div>

      {tier === 'free' && (
        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-400">
            💡 Upgrade to unlock custom themes, analytics, and multistream features!
          </p>
        </div>
      )}
    </div>
  );
}