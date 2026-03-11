import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CancelSubscriptionModal({ subscription, onCancelled }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!subscription?.stripe_subscription_id) {
        throw new Error('No subscription ID found. Please contact support.');
      }
      const response = await base44.functions.invoke('cancelSubscription', {
        subscriptionId: subscription.stripe_subscription_id,
        subscriptionDbId: subscription.id
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Subscription cancelled. Access continues until the end of your billing period.');
      queryClient.invalidateQueries({ queryKey: ['creator-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['fan-club-memberships'] });
      setOpen(false);
      onCancelled?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Cancellation failed. Please try again or contact support.');
    }
  });

  const isHost = subscription?.subscription_type === 'host' || subscription?.plan_type;
  const label = isHost ? 'Host Subscription' : 'Fan Club Membership';

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
          <XCircle className="w-4 h-4 mr-2" />
          Cancel {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-stone-900 border-stone-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Cancel {label}?</AlertDialogTitle>
          <AlertDialogDescription className="text-stone-400">
            Your access will continue until the end of the current billing period. After that, your {label.toLowerCase()} will not renew.
            {isHost && ' You will lose the ability to go live and receive gifts.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-stone-800 border-stone-700 text-white hover:bg-stone-700">
            Keep Subscription
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); cancelMutation.mutate(); }}
            disabled={cancelMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {cancelMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelling...</>
            ) : 'Yes, Cancel'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}