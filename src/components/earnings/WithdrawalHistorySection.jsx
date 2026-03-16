import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Clock, XCircle, Inbox } from 'lucide-react';

const STATUS_CONFIG = {
  completed:  { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20 text-emerald-300' },
  processing: { icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-500/20 text-amber-300' },
  pending:    { icon: Clock,       color: 'text-blue-400',    bg: 'bg-blue-500/20 text-blue-300' },
  rejected:   { icon: XCircle,     color: 'text-red-400',     bg: 'bg-red-500/20 text-red-300' },
};

const METHOD_LABELS = {
  paypal: 'PayPal',
  venmo: 'Venmo',
  cashapp: 'Cash App',
  bank_transfer: 'Bank Transfer',
  stripe_connect: 'Stripe',
};

export default function WithdrawalHistorySection() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ['withdrawal-history', user?.email],
    queryFn: () => base44.entities.CreatorPayout.filter(
      { user_email: user.email },
      '-created_date',
      20
    ),
    enabled: !!user?.email,
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div>
        <h3 className="font-semibold text-white mb-3">Recent Withdrawals</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-white/5" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-white mb-3">Recent Withdrawals</h3>
      {withdrawals.length === 0 ? (
        <Card className="bg-white/5 border-white/10 p-8 text-center">
          <Inbox className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">No withdrawals yet</p>
          <p className="text-white/30 text-xs mt-1">Your withdrawal history will appear here</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {withdrawals.map((w) => {
            const cfg = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const amount = w.payout_usd || ((w.amount_denarii || 0) / 65);
            return (
              <Card key={w.id} className="bg-white/5 border-white/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${cfg.color} ${w.status === 'processing' ? 'animate-spin' : ''}`} />
                  <div>
                    <p className="font-semibold text-white">${amount.toFixed(2)}</p>
                    <p className="text-xs text-white/50">
                      {METHOD_LABELS[w.payout_method] || w.payout_method} • {new Date(w.created_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${cfg.bg}`}>
                  {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                </span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}