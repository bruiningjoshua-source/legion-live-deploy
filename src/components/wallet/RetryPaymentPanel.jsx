import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RetryPaymentPanel({ userEmail }) {
  const [retrying, setRetrying] = useState(null);

  const { data: failedLogs = [], refetch } = useQuery({
    queryKey: ['incomplete-payments', userEmail],
    queryFn: () => base44.entities.WalletAuditLog.filter(
      { user_email: userEmail, action: 'purchase' },
      '-timestamp_utc',
      20
    ).catch(() => []),
    enabled: !!userEmail,
    staleTime: 30000
  });

  // Filter to purchase audit logs that indicate incomplete/failed transactions
  const { data: confirmedPurchases = [] } = useQuery({
    queryKey: ['confirmed-purchases', userEmail],
    queryFn: () => base44.entities.CurrencyPurchase.filter({ user_email: userEmail }, '-created_date', 50).catch(() => []),
    enabled: !!userEmail,
    staleTime: 30000
  });

  const confirmedIntents = new Set(confirmedPurchases.map(p => p.stripe_payment_intent).filter(Boolean));

  // Show only logs where the related session has no confirmed CurrencyPurchase record
  // and the log is from the last 7 days
  const retryablePayments = failedLogs.filter(log => {
    const sessionId = log.related_entity_id;
    if (!sessionId || confirmedIntents.has(sessionId)) return false;
    const ts = log.timestamp_utc || log.created_date;
    if (!ts) return false;
    const age = Date.now() - new Date(ts).getTime();
    return age < 7 * 24 * 60 * 60 * 1000;
  });

  if (retryablePayments.length === 0) return null;

  const handleRetry = async (log) => {
    setRetrying(log.id);
    try {
      const sessionId = log.related_entity_id;
      const response = await base44.functions.invoke('checkPaymentStatus', { paymentIntentId: sessionId });
      const result = response.data;

      if (result.status === 'confirmed') {
        toast.success('Payment was already confirmed! Refreshing...');
        refetch();
        return;
      }

      if (result.status === 'requires_action' && result.clientSecret) {
        // Re-surface 3DS flow
        if (window.Stripe) {
          const stripeJs = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
          const { error } = await stripeJs.handleNextAction({ clientSecret: result.clientSecret });
          if (error) {
            toast.error(`Payment action failed: ${error.message}`);
          } else {
            toast.success('Payment action completed!');
            refetch();
          }
        } else {
          toast.error('Please refresh the page to complete 3D Secure authentication.');
        }
        return;
      }

      if (result.status === 'requires_payment_method' || result.status === 'canceled') {
        // Parse amount from reason field: "Denarii checkout: $X.XX | ..."
        const amountMatch = log.reason?.match(/\$([0-9.]+)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

        if (!amount) {
          toast.error('Cannot determine original amount. Please start a new purchase.');
          return;
        }

        // Redirect to a new Denarii checkout for the same amount
        const csrfToken = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const denarii = Math.round(amount * 180); // base rate: 180 Denarii/$1 (matches constants.js)
        const checkoutRes = await base44.functions.invoke('createDenariiCheckout', {
          packageId: 'retry',
          denarii,
          bonus: 0,
          price: amount,
          packageName: 'Retry Purchase',
          csrfToken
        });
        if (checkoutRes.data?.url) {
          window.location.href = checkoutRes.data.url;
        } else {
          toast.error('Failed to create retry checkout. Please try a fresh purchase.');
        }
        return;
      }

      if (result.status === 'processing') {
        toast.info('Payment is still processing. Please check back in a few minutes.');
        return;
      }

      toast.error(`Payment status: ${result.status}. Please contact support if this persists.`);
    } catch (e) {
      toast.error(e.message || 'Retry failed. Please try again.');
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-orange-400" />
        <h4 className="text-orange-300 font-semibold text-sm">Incomplete Payments</h4>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {retryablePayments.map((log) => {
            const amountMatch = log.reason?.match(/\$([0-9.]+)/);
            const amount = amountMatch ? `$${amountMatch[1]}` : 'Unknown amount';
            const isCurrentlyRetrying = retrying === log.id;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center justify-between p-3 bg-orange-500/10 rounded-xl border border-orange-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{amount} — Incomplete</p>
                    <p className="text-white/40 text-xs">{format(new Date(log.timestamp_utc || log.created_date), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleRetry(log)}
                  disabled={!!retrying}
                  className="bg-orange-500 hover:bg-orange-600 text-white h-8 px-3 text-xs gap-1.5 flex-shrink-0"
                >
                  {isCurrentlyRetrying ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  {isCurrentlyRetrying ? 'Checking...' : 'Retry'}
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}