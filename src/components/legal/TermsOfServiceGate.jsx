import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';

export default function TermsOfServiceGate({ isOpen, onAccept, onDismiss }) {
  const [agreed, setAgreed] = useState(false);

  const handleAccept = async () => {
    if (!agreed) return;
    try {
      await base44.auth.updateMe({
        tos_accepted: true,
        tos_accepted_at: new Date().toISOString()
      });
      onAccept?.();
    } catch (error) {
      console.error('TOS acceptance failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss?.()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-300">
            <AlertCircle className="w-5 h-5" />
            Terms of Service & Virtual Currency Disclosure
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm text-white/80">
          <section>
            <h3 className="font-semibold text-white mb-2">Virtual Currency Policy</h3>
            <p>
              Denarii and other virtual currencies purchased on Legion Live are non-refundable digital assets.
              All transactions are final. By purchasing virtual currency, you acknowledge and accept this policy.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Use of Funds</h3>
            <p>
              Virtual currency can only be used to send gifts to creators and engage with platform features.
              Unused balances do not accrue interest and do not represent claims on Legion Live assets.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Creator Earnings</h3>
            <p>
              Creators earn 60% of gift values (after platform fees) in the form of Denarii.
              At the time of withdrawal, Denarii are converted to USD at the rate of 180 Denarii = $1 USD.
              All withdrawals require KYC (Know Your Customer) verification.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Chargeback & Disputes</h3>
            <p>
              Fraudulent chargebacks will result in immediate account suspension and reversal of all associated Denarii.
              Repeated chargebacks may result in permanent ban.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Account Responsibility</h3>
            <p>
              You are responsible for all activity on your account. Legion Live is not liable for unauthorized access.
              Protect your login credentials and enable two-factor authentication when available.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Content & Conduct</h3>
            <p>
              Users must comply with all platform community guidelines. Harassment, hate speech, or illegal activity
              will result in account termination and forfeiture of all virtual currency balances.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Changes to Terms</h3>
            <p>
              Legion Live reserves the right to modify these terms at any time. Continued use of the platform
              constitutes acceptance of updated terms.
            </p>
          </section>

          <div className="border-t border-white/10 pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox 
                checked={agreed} 
                onCheckedChange={setAgreed}
                className="mt-1"
              />
              <span className="text-xs">
                I agree to the Terms of Service and understand that all virtual currency purchases are final and non-refundable.
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onDismiss}
            className="flex-1"
          >
            Decline & Exit
          </Button>
          <Button 
            onClick={handleAccept}
            disabled={!agreed}
            className="flex-1 bg-amber-700 hover:bg-amber-600"
          >
            Accept & Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}