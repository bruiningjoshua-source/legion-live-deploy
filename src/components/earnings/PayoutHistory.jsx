import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Pending' },
  processing: { icon: Loader2, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Processing' },
  completed: { icon: CheckCircle, color: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Completed' },
  rejected: { icon: XCircle, color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Rejected' },
};

export default function PayoutHistory({ payouts }) {
  if (!payouts || payouts.length === 0) {
    return (
      <Card className="bg-stone-800/40 border-amber-600/20">
        <CardContent className="py-8 text-center">
          <History className="w-10 h-10 text-amber-400/30 mx-auto mb-3" />
          <p className="text-amber-400/60 text-sm">No payout history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-stone-800/40 border-amber-600/20">
      <CardHeader>
        <CardTitle className="text-amber-100 text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          Payout History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
          {payouts.map(payout => {
            const config = statusConfig[payout.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <div key={payout.id} className="flex items-center justify-between bg-stone-900/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <StatusIcon className={`w-4 h-4 ${payout.status === 'processing' ? 'animate-spin' : ''} ${config.color.split(' ')[1]}`} />
                  <div>
                    <p className="text-amber-100 text-sm font-medium">
                      ${payout.payout_usd?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-amber-400/50 text-xs">
                      {payout.payout_method} • {payout.created_date ? format(new Date(payout.created_date), 'MMM d, yyyy') : ''}
                    </p>
                  </div>
                </div>
                <Badge className={config.color}>{config.label}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}