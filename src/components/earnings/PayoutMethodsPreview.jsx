import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Plus } from 'lucide-react';

const METHOD_META = {
  paypal:         { icon: '💳', label: 'PayPal' },
  venmo:          { icon: '📱', label: 'Venmo' },
  cashapp:        { icon: '💵', label: 'Cash App' },
  bank_transfer:  { icon: '🏦', label: 'Bank Transfer' },
  stripe_connect: { icon: '⚡', label: 'Stripe Connect' },
};

export default function PayoutMethodsPreview({ userEmail, onManage }) {
  const { data: methods = [] } = useQuery({
    queryKey: ['payout-methods', userEmail],
    queryFn: () => base44.entities.CreatorPayoutMethod.filter({ user_email: userEmail }),
    enabled: !!userEmail,
    staleTime: 60 * 1000,
  });

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white">Connected Payout Methods</h3>
        <Button variant="ghost" size="sm" className="text-amber-400 text-xs" onClick={onManage}>
          Manage All →
        </Button>
      </div>
      {methods.length === 0 ? (
        <Card className="bg-white/5 border-white/10 border-dashed p-6 text-center">
          <Plus className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <p className="text-white/50 text-sm mb-2">No payout methods configured</p>
          <Button size="sm" onClick={onManage}>Set Up Payout Method</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {methods.map((m) => {
            const meta = METHOD_META[m.method_type] || { icon: '💰', label: m.method_type };
            return (
              <Card key={m.id} className={`p-4 border ${m.is_verified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{meta.icon}</span>
                    <div>
                      <p className="font-semibold text-white">{m.display_name || meta.label}</p>
                      <p className={`text-xs ${m.is_verified ? 'text-emerald-300' : 'text-white/50'}`}>
                        {m.is_verified ? '✓ Verified' : 'Pending verification'}
                        {m.is_default && ' • Default'}
                      </p>
                    </div>
                  </div>
                  {m.is_verified && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}