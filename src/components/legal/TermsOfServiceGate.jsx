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
            <h3 className="font-semibold text-white mb-2">1. VIRTUAL CURRENCY PRODUCTS</h3>
            <p className="mb-2">
              Legion Live offers virtual currency products, including but not limited to "Denarii," "Sestertii," and "As." 
              These are non-refundable digital tokens for use exclusively on the Legion Live platform.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Non-Refundable:</strong> All virtual currency purchases are final. No refunds, returns, or exchanges are permitted except as required by law.</li>
              <li><strong>No Monetary Value:</strong> Virtual currencies have no cash value and cannot be exchanged for real currency except through creator earning programs.</li>
              <li><strong>Platform Proprietary:</strong> Legion Live retains all intellectual property rights to virtual currencies.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">2. PURCHASE TERMS & CONDITIONS</h3>
            <p className="mb-2">
              By purchasing virtual currency, you agree to the following:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Age Requirement:</strong> You must be at least 18 years old to purchase virtual currency.</li>
              <li><strong>Responsible Adult:</strong> If under 18, a parent or legal guardian must authorize the purchase.</li>
              <li><strong>No Refunds:</strong> Purchases are final. Refund requests will be denied unless required by law or for fraud.</li>
              <li><strong>Account Accuracy:</strong> You are responsible for accurate payment information. Fraudulent charges will result in account termination.</li>
              <li><strong>Payment Authorization:</strong> You authorize Legion Live and Stripe to process charges to your payment method.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">3. USE RESTRICTIONS</h3>
            <p className="mb-2">
              Virtual currency may only be used for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Sending gifts to creators during live streams or on content</li>
              <li>Accessing premium features and exclusive content</li>
              <li>Participating in platform events and rewards programs</li>
            </ul>
            <p className="mt-2">
              <strong>Prohibited:</strong> You may not sell, trade, or transfer virtual currency to other accounts or real-world parties.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">4. CREATOR EARNINGS & CONVERSION</h3>
            <p className="mb-2">
              <strong>Revenue Share:</strong> Creators earn 60% of gift values in Denarii currency after platform processing fees.
            </p>
            <p className="mb-2">
              <strong>Exchange Rate:</strong> Virtual currency conversion rates are as follows:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Denarii: 180 Denarii = $1 USD (base rate, subject to change with notice)</li>
              <li>Conversion upon withdrawal at current market rate on withdrawal date</li>
              <li>Legion Live reserves the right to adjust rates with 30 days' notice</li>
            </ul>
            <p className="mt-2">
              <strong>Withdrawal Requirements:</strong> All creator earnings withdrawals require KYC (Know Your Customer) verification and tax identification.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">5. CHARGEBACKS & FRAUD PREVENTION</h3>
            <p className="mb-2">
              <strong>Dispute Resolution:</strong> Chargeback disputes will be handled per Stripe's dispute process.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Fraudulent Chargebacks:</strong> Initiating chargebacks for transactions you authorized will result in immediate account suspension and reversal of all associated Denarii.</li>
              <li><strong>Repeated Violations:</strong> Multiple chargebacks or fraud attempts result in permanent account termination and forfeiture of all virtual currency.</li>
              <li><strong>Legal Action:</strong> Legion Live may pursue legal recovery for fraudulent activity.</li>
              <li><strong>Monitoring:</strong> All transactions are monitored for fraud using real-time risk assessment.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">6. ACCOUNT SECURITY & RESPONSIBILITY</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Your Responsibility:</strong> You are solely responsible for all activity on your account.</li>
              <li><strong>Password Security:</strong> Protect your login credentials and enable two-factor authentication when available.</li>
              <li><strong>No Liability:</strong> Legion Live is not liable for unauthorized account access, except in cases of our security negligence.</li>
              <li><strong>Unauthorized Access:</strong> Report any unauthorized access immediately to support@legionlive.com.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">7. ACCOUNT TERMINATION & FORFEITURE</h3>
            <p className="mb-2">
              Legion Live reserves the right to terminate accounts for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Violation of community guidelines (harassment, hate speech, illegal activity)</li>
              <li>Chargebacks or fraudulent payment activity</li>
              <li>Account manipulation or circumvention of platform rules</li>
              <li>Repeated violations after warning</li>
            </ul>
            <p className="mt-2">
              <strong>Forfeiture:</strong> Upon termination, all virtual currency balances are forfeited and non-recoverable.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">8. LIMITATION OF LIABILITY</h3>
            <p>
              Legion Live provides virtual currency "as-is." To the maximum extent permitted by law, Legion Live is not liable for:
              service interruptions, lost earnings, lost virtual currency balances, unauthorized access, or technical failures.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">9. CHANGES TO TERMS & SERVICES</h3>
            <p>
              Legion Live reserves the right to modify these terms, exchange rates, and services at any time with 30 days' notice.
              Continued use of the platform constitutes acceptance of updated terms. Critical changes will be communicated via email.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">10. LEGAL COMPLIANCE</h3>
            <p className="mb-2">
              This agreement is governed by the laws of Delaware, USA. By using Legion Live, you consent to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Age verification and KYC compliance</li>
              <li>Tax reporting on creator earnings (Form 1099 for eligible creators)</li>
              <li>Anti-money laundering (AML) compliance</li>
              <li>GDPR and data privacy regulations where applicable</li>
            </ul>
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