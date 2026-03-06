import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import EarningsBalanceCard from './EarningsBalanceCard';
import RevenueBreakdownChart from './RevenueBreakdownChart';
import WithdrawalForm from './WithdrawalForm';
import PayoutHistory from './PayoutHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

export default function EarningsDashboard({ creator, user }) {
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['broadcaster-earnings', creator?.id],
    queryFn: async () => {
      const results = await base44.entities.BroadcasterEarnings.filter({ creator_id: creator.id }, '-created_date', 1);
      return results[0] || null;
    },
    enabled: !!creator?.id,
    staleTime: 2 * 60 * 1000
  });

  const { data: gifts = [] } = useQuery({
    queryKey: ['creator-gifts', creator?.id],
    queryFn: () => base44.entities.GiftTransaction.filter({ receiver_creator_id: creator.id }, '-created_date', 200),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000
  });

  const { data: tips = [] } = useQuery({
    queryKey: ['creator-tips', creator?.id],
    queryFn: () => base44.entities.Tip.filter({ receiver_creator_id: creator.id }, '-created_date', 200),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['creator-payouts', creator?.id],
    queryFn: () => base44.entities.CreatorPayout.filter({ creator_id: creator.id }, '-created_date', 50),
    enabled: !!creator?.id,
    staleTime: 2 * 60 * 1000
  });

  const { data: payoutMethods = [] } = useQuery({
    queryKey: ['creator-payout-methods', creator?.id],
    queryFn: () => base44.entities.CreatorPayoutMethod.filter({ creator_id: creator.id }),
    enabled: !!creator?.id,
    staleTime: 5 * 60 * 1000
  });

  if (earningsLoading) {
    return (
      <Card className="bg-stone-800/40 border-amber-600/20">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <EarningsBalanceCard earnings={earnings} payouts={payouts} />

      <RevenueBreakdownChart gifts={gifts} tips={tips} earnings={earnings} />

      <Tabs defaultValue="withdraw" className="space-y-4">
        <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1 rounded-xl">
          <TabsTrigger value="withdraw" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg text-xs">
            Withdraw
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg text-xs">
            Payout History
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg text-xs">
            Recent Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="withdraw">
          <WithdrawalForm creator={creator} earnings={earnings} payoutMethods={payoutMethods} />
        </TabsContent>

        <TabsContent value="history">
          <PayoutHistory payouts={payouts} />
        </TabsContent>

        <TabsContent value="transactions">
          <RecentTransactions gifts={gifts} tips={tips} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecentTransactions({ gifts, tips }) {
  // Merge and sort by date
  const all = [
    ...(gifts || []).map(g => ({ type: 'gift', name: g.gift_name || 'Gift', value: g.total_as_value || 0, date: g.created_date, from: g.sender_email })),
    ...(tips || []).map(t => ({ type: 'tip', name: 'Tip', value: t.amount_usd ? `$${t.amount_usd.toFixed(2)}` : '$0', date: t.created_date, from: t.is_anonymous ? 'Anonymous' : t.sender_email })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 30);

  if (all.length === 0) {
    return (
      <Card className="bg-stone-800/40 border-amber-600/20">
        <CardContent className="py-8 text-center">
          <p className="text-amber-400/60 text-sm">No transactions yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-stone-800/40 border-amber-600/20">
      <CardContent className="p-4">
        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
          {all.map((tx, i) => (
            <div key={i} className="flex items-center justify-between bg-stone-900/50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{tx.type === 'gift' ? '🎁' : '💰'}</span>
                <div>
                  <p className="text-amber-100 text-sm">{tx.name}</p>
                  <p className="text-amber-400/50 text-xs">{tx.from?.split('@')[0] || 'Unknown'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-amber-100 text-sm font-medium">
                  {tx.type === 'gift' ? `🪙 ${tx.value}` : tx.value}
                </p>
                <p className="text-amber-400/50 text-xs">
                  {tx.date ? new Date(tx.date).toLocaleDateString() : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}