import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Scale } from 'lucide-react';

// ── Legion Live — Virtual Currency & Platform Terms of Service ─────────────
// Last Updated: March 2026
// Effective Date: March 1, 2026
// Governing Law: State of Delaware, USA
// ──────────────────────────────────────────────────────────────────────────

export default function TermsOfServiceGate({ isOpen, onAccept, onDismiss }) {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!agreed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await base44.auth.updateMe({
        tos_accepted: true,
        tos_accepted_at: new Date().toISOString(),
        tos_version: '2026-03-01',
      });
      onAccept?.();
    } catch (error) {
      console.error('TOS acceptance failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss?.()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#111114] border border-amber-500/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-300 text-lg">
            <Scale className="w-5 h-5" />
            Legion Live — Terms of Service &amp; Virtual Currency Agreement
          </DialogTitle>
          <p className="text-white/40 text-xs mt-1">
            Effective: March 1, 2026 · Governing Law: State of Delaware, USA · Version 2026-03-01
          </p>
        </DialogHeader>

        <div className="space-y-5 text-sm text-white/80 leading-relaxed">

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 inline mr-1.5 mb-0.5" />
            <strong>IMPORTANT NOTICE:</strong> This agreement contains binding arbitration clauses, class action waivers, 
            and a no-refund policy on virtual currency. Please read carefully before purchasing.
          </div>

          {/* 1 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">1. PARTIES & AGREEMENT</h3>
            <p>
              This Terms of Service Agreement ("Agreement") is a legally binding contract between you ("User," "you," "your") 
              and Legion Live, Inc., a Delaware corporation ("Legion Live," "we," "us," "our"), governing your access to and 
              use of the Legion Live streaming platform, website, mobile applications, and all associated services 
              (collectively, the "Platform").
            </p>
            <p className="mt-2">
              By accessing the Platform, creating an account, or purchasing virtual currency, you represent that 
              (a) you are at least 18 years of age, (b) you have the legal capacity to enter into binding contracts, 
              and (c) you have read, understood, and agree to be bound by this Agreement in its entirety.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">2. VIRTUAL CURRENCY — DESCRIPTION & NATURE</h3>
            <p className="mb-2">
              Legion Live offers purchasable virtual currency units, including <strong>Denarii</strong>, <strong>Sestertii</strong>, and <strong>As</strong> 
              (collectively, "Virtual Currency"). Virtual Currency is a digital commodity that exists solely within the Platform ecosystem 
              and is subject to the following material disclosures:
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong>Not Legal Tender:</strong> Virtual Currency is not real money, not a financial instrument, and has no monetary value outside the Platform.</li>
              <li><strong>Non-Transferable:</strong> Virtual Currency may not be sold, traded, gifted, or transferred between user accounts or to third parties.</li>
              <li><strong>Non-Refundable:</strong> All purchases of Virtual Currency are <em>final and non-refundable</em> except as required by applicable consumer protection law.</li>
              <li><strong>No Guarantee of Value:</strong> Legion Live does not guarantee the continued existence, availability, or value of Virtual Currency.</li>
              <li><strong>Platform Ownership:</strong> You acquire a limited, non-exclusive license to use Virtual Currency within the Platform. Legion Live retains all intellectual property rights.</li>
              <li><strong>No Interest Accrual:</strong> Virtual Currency balances do not earn interest or appreciation.</li>
            </ul>
            <p className="mt-2 text-amber-200/80 text-xs bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
              ⚠️ Virtual Currency has no cash value to the user and cannot be withdrawn or converted to real currency by viewers. 
              Only verified creators may convert earned Denarii to USD through the creator earnings program.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">3. PURCHASE AGREEMENT & PAYMENT TERMS</h3>
            <p className="mb-2">When you purchase Virtual Currency, you agree to the following:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong>Authorization:</strong> You authorize Legion Live and its payment processor (Stripe, Inc.) to charge your designated payment method for the stated purchase price, inclusive of any applicable taxes.</li>
              <li><strong>Pricing:</strong> Prices for Virtual Currency packages are denominated in USD and may vary by package size. Bonus Denarii awarded in promotional packages are subject to the same terms as purchased Denarii.</li>
              <li><strong>Exchange Rate:</strong> The standard conversion rate is <strong>180 Denarii = $1.00 USD</strong>. This rate governs all purchasing and creator payout calculations. Legion Live reserves the right to adjust this rate with 30 days' written notice.</li>
              <li><strong>All Sales Final:</strong> Once a purchase is confirmed, it is final. Legion Live does not issue refunds, credits, or exchanges for Virtual Currency, except as required by applicable law or in cases of verified technical error on Legion Live's part.</li>
              <li><strong>Failed Transactions:</strong> If a transaction fails after your payment method is charged, Legion Live will make commercially reasonable efforts to credit your account or refund the charge.</li>
              <li><strong>Currency Fluctuation:</strong> The USD price you pay is fixed at time of purchase. Virtual Currency bonus tiers and exchange rates are subject to change for future purchases only.</li>
              <li><strong>Tax Responsibility:</strong> You are solely responsible for any taxes, duties, or levies arising from your purchase of Virtual Currency.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">4. PERMITTED USE OF VIRTUAL CURRENCY</h3>
            <p className="mb-2">Virtual Currency may be used exclusively for the following purposes on the Platform:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Sending virtual gifts to creators during live streams or on published content</li>
              <li>Unlocking premium platform features, exclusive content, or creator subscriptions</li>
              <li>Participating in Platform-hosted events, lotteries, giveaways, and reward programs</li>
              <li>Fan club memberships and creator-specific benefits</li>
            </ul>
            <p className="mt-2">
              <strong>Prohibited Uses:</strong> You may not use Virtual Currency for money laundering, structuring transactions to evade reporting requirements, circumventing account bans, or any activity that violates applicable law.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">5. STREAM LOTTERIES & IN-PLATFORM EVENTS</h3>
            <p className="mb-2">
              Legion Live offers in-stream lottery features ("Stream Lottos") where creators or hosts may fund a Denarii prize pool and viewers may enter by completing designated tasks (gifting a specific item, sharing the stream, or providing a password).
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong>Skill &amp; Chance:</strong> Stream Lottos are games of chance. Winners are selected at random from eligible entries. Legion Live makes no guarantee of winning.</li>
              <li><strong>Entry Costs:</strong> Some entry methods require spending Denarii (e.g., sending a gift). These expenditures are non-refundable regardless of lottery outcome.</li>
              <li><strong>Prize Pool Funding:</strong> Prize pools are funded by creators/hosts from their own Denarii balance. Legion Live does not guarantee prize delivery if a creator account has insufficient funds.</li>
              <li><strong>VIP Multipliers:</strong> Users with VIP status may receive bonus entries at no additional cost per the VIP tier program.</li>
              <li><strong>No Real-Money Gambling:</strong> Stream Lottos do not constitute gambling as defined under applicable law, as entry does not require a monetary purchase and prizes are Virtual Currency with no cash value to viewers.</li>
              <li><strong>Platform Discretion:</strong> Legion Live reserves the right to suspend or modify lottery features at any time.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">6. CREATOR EARNINGS & PAYOUT PROGRAM</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong>Revenue Share:</strong> Eligible creators earn 60% of gift values received in Denarii, after platform processing fees. This rate may be temporarily increased for new creators during promotional guarantee periods.</li>
              <li><strong>Conversion Rate:</strong> Creator Denarii earnings convert at 180 Denarii = $1.00 USD at time of withdrawal.</li>
              <li><strong>KYC Requirement:</strong> All creator withdrawals require completion of Know Your Customer (KYC) identity verification and submission of applicable tax documentation (IRS Form W-9 or W-8BEN for international creators).</li>
              <li><strong>Minimum Payout:</strong> A minimum payout threshold applies and is communicated within the creator dashboard.</li>
              <li><strong>Tax Reporting:</strong> Legion Live will issue IRS Form 1099-NEC to eligible US creators earning above $600 USD in a calendar year. Creators are responsible for reporting all income to applicable tax authorities.</li>
              <li><strong>Payment Processing:</strong> Payouts are processed via Stripe Connect or other designated payment processors. Processing times may vary.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">7. CHARGEBACKS, FRAUD & DISPUTE RESOLUTION</h3>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong>Chargeback Policy:</strong> Initiating a credit card or bank chargeback for a legitimate, authorized Virtual Currency purchase is a material breach of this Agreement. Upon a chargeback, Legion Live will immediately suspend the associated account, reverse any Denarii associated with the disputed transaction, and report the activity to payment networks.</li>
              <li><strong>Fraudulent Activity:</strong> Any fraudulent, dishonest, or deceptive activity — including account takeover, payment fraud, unauthorized chargebacks, or manipulation of Platform features — will result in immediate permanent account termination and forfeiture of all Virtual Currency balances.</li>
              <li><strong>Legal Recourse:</strong> Legion Live reserves the right to pursue civil and criminal legal remedies against users who engage in fraudulent activity, including but not limited to recovery of damages, legal fees, and cooperation with law enforcement.</li>
              <li><strong>Transaction Monitoring:</strong> All transactions are subject to real-time fraud risk assessment. Legion Live may place holds on accounts displaying high-risk transaction patterns pending review.</li>
              <li><strong>Legitimate Disputes:</strong> If you believe you were charged in error, contact <strong>support@legionlive.com</strong> within 30 days of the transaction. Legion Live will investigate and respond within 10 business days.</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">8. VIP PROGRAM & LOYALTY REWARDS</h3>
            <p>
              Legion Live offers a VIP tier program based on accumulated VIP Points earned through purchases and platform activity.
              VIP benefits (bonus entries, multipliers, exclusive features) are provided at Legion Live's discretion and may be 
              modified, suspended, or discontinued at any time with reasonable notice. VIP Points have no monetary value and cannot 
              be transferred or redeemed for cash.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">9. ACCOUNT TERMINATION & BALANCE FORFEITURE</h3>
            <p className="mb-2">Legion Live reserves the right to suspend or permanently terminate accounts for:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Violation of Platform community guidelines or this Agreement</li>
              <li>Fraudulent payment activity, chargebacks, or payment disputes</li>
              <li>Harassment, hate speech, illegal content, or conduct violating applicable law</li>
              <li>Account manipulation, ban evasion, or creation of duplicate accounts</li>
              <li>Any conduct Legion Live determines to be harmful to the Platform or its community</li>
            </ul>
            <p className="mt-2">
              <strong>Forfeiture of Balances:</strong> Upon account termination for cause, all Virtual Currency balances, VIP Points, 
              and any accrued creator earnings not yet withdrawn are permanently forfeited. Legion Live is under no obligation to 
              compensate terminated users for forfeited balances.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">10. ACCOUNT SECURITY</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>You are solely responsible for all activity conducted under your account.</li>
              <li>You must maintain the confidentiality of your login credentials and enable available security features.</li>
              <li>You must notify Legion Live immediately at <strong>support@legionlive.com</strong> of any unauthorized account access.</li>
              <li>Legion Live is not liable for losses resulting from unauthorized account access caused by your failure to maintain credential security.</li>
            </ul>
          </section>

          {/* 11 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">11. LIMITATION OF LIABILITY</h3>
            <p className="mb-2">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, LEGION LIVE, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, 
              AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, 
              INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Loss of Virtual Currency due to account termination, service interruption, or technical failure</li>
              <li>Loss of creator earnings due to payment processing issues beyond Legion Live's control</li>
              <li>Unauthorized access to your account not caused by Legion Live's negligence</li>
              <li>Platform downtime, data loss, or service discontinuation</li>
            </ul>
            <p className="mt-2">
              IN NO EVENT SHALL LEGION LIVE'S AGGREGATE LIABILITY EXCEED THE GREATER OF (A) $100 USD OR (B) THE TOTAL AMOUNT 
              YOU PAID TO LEGION LIVE IN THE 90 DAYS PRECEDING THE CLAIM.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">12. BINDING ARBITRATION & CLASS ACTION WAIVER</h3>
            <p className="mb-2">
              ANY DISPUTE, CLAIM, OR CONTROVERSY ARISING FROM OR RELATING TO THIS AGREEMENT OR THE PLATFORM SHALL BE RESOLVED 
              BY BINDING INDIVIDUAL ARBITRATION ADMINISTERED BY THE AMERICAN ARBITRATION ASSOCIATION (AAA) UNDER ITS CONSUMER 
              ARBITRATION RULES, AND NOT IN COURT.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>No Class Actions:</strong> You waive the right to participate in class action lawsuits or class-wide arbitration.</li>
              <li><strong>Location:</strong> Arbitration shall take place in Wilmington, Delaware, USA unless otherwise agreed.</li>
              <li><strong>Exception:</strong> Either party may seek injunctive relief in a court of competent jurisdiction to prevent irreparable harm.</li>
              <li><strong>Opt-Out:</strong> You may opt out of arbitration within 30 days of first accepting this Agreement by emailing <strong>legal@legionlive.com</strong> with the subject "Arbitration Opt-Out."</li>
            </ul>
          </section>

          {/* 13 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">13. PRIVACY & DATA</h3>
            <p>
              Your use of the Platform is governed by our Privacy Policy, which is incorporated into this Agreement by reference. 
              By accepting these terms, you consent to the collection and processing of your data as described in the Privacy Policy, 
              including for fraud prevention, KYC compliance, tax reporting, and platform improvement purposes. Legion Live complies 
              with applicable data protection laws including GDPR (for EU users) and CCPA (for California residents).
            </p>
          </section>

          {/* 14 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">14. CHANGES TO TERMS</h3>
            <p>
              Legion Live reserves the right to modify these terms at any time. For material changes — including changes to pricing, 
              exchange rates, or refund policies — we will provide at least 30 days' advance notice via email and/or prominent 
              in-app notification. Your continued use of the Platform after the effective date of updated terms constitutes acceptance. 
              If you do not agree to updated terms, you must discontinue use of the Platform.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">15. GOVERNING LAW & JURISDICTION</h3>
            <p>
              This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, USA, 
              without regard to conflict of law principles. Subject to the arbitration clause above, you consent to exclusive 
              jurisdiction of the state and federal courts located in Wilmington, Delaware for any matters not subject to arbitration.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h3 className="font-bold text-white mb-2 text-sm tracking-wide">16. CONTACT INFORMATION</h3>
            <div className="space-y-0.5 text-white/60 text-xs">
              <p><strong className="text-white/80">General Support:</strong> support@legionlive.com</p>
              <p><strong className="text-white/80">Legal & Compliance:</strong> legal@legionlive.com</p>
              <p><strong className="text-white/80">KYC / Creator Payments:</strong> payments@legionlive.com</p>
              <p><strong className="text-white/80">Unauthorized Access Reports:</strong> security@legionlive.com</p>
              <p><strong className="text-white/80">Mailing Address:</strong> Legion Live, Inc. · 1209 Orange Street · Wilmington, DE 19801 · USA</p>
            </div>
          </section>

          {/* Checkbox */}
          <div className="border-t border-white/10 pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={agreed}
                onCheckedChange={setAgreed}
                className="mt-1 shrink-0"
              />
              <span className="text-xs text-white/70 leading-relaxed">
                I am 18 years of age or older. I have read, understood, and agree to be bound by the Legion Live 
                Terms of Service and Virtual Currency Agreement, including the <strong>no-refund policy</strong> on all virtual 
                currency purchases, the <strong>binding arbitration clause</strong>, and the <strong>class action waiver</strong>. 
                I understand that virtual currency has no monetary value to viewers and all purchases are final.
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onDismiss}
            className="flex-1 border-white/20 text-white/60 hover:text-white"
          >
            Decline & Exit
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!agreed || isSubmitting}
            className="flex-1 bg-amber-700 hover:bg-amber-600 disabled:opacity-40"
          >
            {isSubmitting ? 'Saving...' : 'I Agree — Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}