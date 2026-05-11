import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import GlassCard from '@/components/shared/GlassCard';
import { format } from 'date-fns';

export default function FailedPaymentRetry({ userEmail }) {
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState(null);

  // Fetch failed/incomplete payments from WalletAuditLog
  const { data: failedPayments = [], isLoading } = useQuery({
    queryKey: ['failed-payments', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const logs = await base44.entities.WalletAuditLog.filter(
        { 
          user_email: userEmail, 
          action: 'payment_failed',
          reason: 'retryable'
        }, 
        '-created_date', 
        10
      ).catch(() => []);
      return logs;
    },
    enabled: !!userEmail,
    staleTime: 30000
  });

  const retryMutation = useMutation({
    mutationFn: async (paymentId) => {
      try {
        // Check payment status first
        const result = await base44.functions.invoke('checkPaymentStatus', {
          paymentIntentId: paymentId
        });

        if (result.data?.status === 'succeeded') {
          toast.success('Payment already completed!');
          return { success: true, status: 'succeeded' };
        }

        if (result.data?.requiresRetry) {
          // Attempt to retry the payment
          const retryResult = await base44.functions.invoke('retryPayment', {
            paymentIntentId: paymentId,
            userEmail
          });
          return retryResult.data;
        }

        return result.data;
      } catch (error) {
        throw new Error(error.message || 'Retry failed');
      }
    },
    onSuccess: (data) => {
      setRetryingId(null);
      if (data?.success) {
        toast.success('Payment retry successful!');
        queryClient.invalidateQueries({ queryKey: ['failed-payments', userEmail] });
        queryClient.invalidateQueries({ queryKey: ['wallet', userEmail] });
      } else {
        toast.info('Payment requires manual intervention. Contact support.');
      }
    },
    onError: (error) => {
      setRetryingId(null);
      toast.error(error.message || 'Retry failed');
    }
  });

  if (isLoading) return null;

  if (failedPayments.length === 0) {
    return null;
  }

  return (
    <GlassCard className="mb-6 border-red-500/20 bg-red-500/5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-3">
            {failedPayments.length} Failed Payment{failedPayments.length > 1 ? 's' : ''}
          </h4>
          <div className="space-y-3">
            {failedPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-red-500/10">
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium">
                    {payment.related_entity_id?.substring(0, 16)}...
                  </p>
                  <p className="text-white/40 text-xs">
                    {format(new Date(payment.created_date), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setRetryingId(payment.id);
                    retryMutation.mutate(payment.related_entity_id);
                  }}
                  disabled={retryMutation.isPending}
                  className="gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                >
                  <RefreshCw className={`w-4 h-4 ${retryingId === payment.id && retryMutation.isPending ? 'animate-spin' : ''}`} />
                  Retry
                </Button>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-4">
            💡 Tip: Ensure your card details are correct. Contact support if issues persist.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}