import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Users, CreditCard, Shield, AlertTriangle, Scale, ChevronDown, ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    icon: Users,
    title: '1. Account Terms',
    content: [
      { heading: '1.1 Eligibility', body: 'You must be at least 18 years old to create an account and use Legion Live. By creating an account, you represent that you meet this age requirement and have the legal capacity to enter into this agreement.' },
      { heading: '1.2 Account Responsibility', body: 'You are solely responsible for maintaining the security of your credentials, all activity under your account, and ensuring your account information is accurate and up to date. Do not share account access with others.' },
      { heading: '1.3 Account Termination', body: 'We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, harm the community, or otherwise compromise platform integrity. Serious violations result in immediate permanent bans.' },
    ]
  },
  {
    icon: FileText,
    title: '2. Content Guidelines',
    content: [
      { heading: '2.1 Prohibited Content', body: 'Strictly prohibited: nudity or sexual content; violence, gore, or content promoting self-harm; harassment, bullying, or hate speech targeting any group; illegal activities; copyrighted material without permission; spam, scams, or deceptive content; any content involving minors in inappropriate contexts.' },
      { heading: '2.2 Content Ownership', body: 'You retain full ownership of content you create. By posting content on Legion Live, you grant us a non-exclusive, worldwide, royalty-free license to display, distribute, and promote your content on the platform. We may remove any content that violates these guidelines without prior notice.' },
      { heading: '2.3 DMCA Compliance', body: 'Legion Live complies with the Digital Millennium Copyright Act (DMCA). Copyright holders may submit takedown notices to legal@legionlive.com. Counter-notices may be submitted as permitted by law.' },
    ]
  },
  {
    icon: CreditCard,
    title: '3. Payments & Monetization',
    content: [
      { heading: '3.1 Virtual Currency', body: 'Legion Live uses Denarii as its virtual currency. The rate is 65 Denarii = $1 USD. Denarii are used for in-app transactions including gifts, fan club subscriptions, and PPV events. Virtual currency has no independent monetary value outside the platform and cannot be redeemed for cash by viewers.' },
      { heading: '3.2 Creator Earnings', body: 'Creators earn 70% of the face value of virtual gifts received. For every 65 Denarii gifted, creators receive $0.70 USD. Earnings are subject to a minimum payout threshold of 650 Denarii (~$10 USD). Payouts may be withheld for suspected fraud, chargebacks, or policy violations.' },
      { heading: '3.3 Subscriptions & Fan Clubs', body: 'Fan club subscriptions are billed on the cycle selected. Cancellation takes effect at the end of the current billing period. Refunds are evaluated on a case-by-case basis by our support team.' },
      { heading: '3.4 Chargebacks & Fraud', body: 'Fraudulent chargebacks will result in immediate account suspension, reversal of associated Denarii, and potential permanent ban. Legion Live cooperates fully with payment processors and law enforcement to investigate financial fraud.' },
    ]
  },
  {
    icon: Shield,
    title: '4. Privacy & Data',
    content: [
      { heading: '4.1 Data Collection', body: 'We collect account information, usage data, payment details (processed via Stripe), content you create, and device/location data as described fully in our Privacy Policy.' },
      { heading: '4.2 Data Use', body: 'Your data is used to provide and improve our services, process transactions, facilitate creator payouts, enforce these terms, and communicate with you about the platform.' },
      { heading: '4.3 Data Protection', body: 'We implement AES-256 encryption at rest and TLS 1.3 in transit. For full details, see our Privacy Policy. You may request your data, corrections, or deletion at privacy@legionlive.com.' },
    ]
  },
  {
    icon: AlertTriangle,
    title: '5. Disclaimers & Limitations',
    content: [
      { heading: '5.1 Service Availability', body: 'We target 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance, third-party outages (streaming infrastructure, payment processors), or unforeseen technical events may temporarily affect access.' },
      { heading: '5.2 Limitation of Liability', body: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW: Legion Live is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, special, exemplary, or consequential damages. Our total aggregate liability is limited to the greater of $100 USD or the amount you paid us in the preceding 12 months.' },
      { heading: '5.3 Indemnification', body: 'You agree to indemnify, defend, and hold harmless Legion Live Inc., Legion Software Smiths, and their officers from any claims, liabilities, damages, and expenses arising from your use of the service, your content, or your violation of these Terms.' },
    ]
  },
  {
    icon: Scale,
    title: '6. Dispute Resolution',
    content: [
      { heading: '6.1 Governing Law', body: 'These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law provisions.' },
      { heading: '6.2 Binding Arbitration', body: 'Any dispute, claim, or controversy arising from these Terms or your use of Legion Live will be resolved by binding individual arbitration under the AAA Consumer Arbitration Rules, except claims eligible for small claims court.' },
      { heading: '6.3 Class Action Waiver', body: 'You expressly waive any right to participate as a plaintiff or class member in any class, collective, or representative action or proceeding against Legion Live.' },
      { heading: '6.4 Contact', body: 'Questions about these Terms? Contact: legal@legionlive.com' },
    ]
  }
];

function SectionCard({ icon: Icon, title, content }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-amber-400" />
        </div>
        <span className="text-white font-bold text-sm flex-1">{title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="w-4 h-4 text-white/30" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/[0.05]">
              {content.map((item, i) => (
                <div key={i} className="pt-4">
                  <p className="text-amber-300 text-xs font-bold uppercase tracking-wide mb-1.5">{item.heading}</p>
                  <p className="text-white/60 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen pt-16 pb-24 bg-[#09090b]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-amber-500/[0.04] rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">
        <Link to={createPageUrl('HelpAndInfo')} className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Help
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 text-sm font-medium">Legal</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Terms of Service</h1>
          <p className="text-white/35 text-sm">Last updated: March 11, 2026</p>
        </div>

        <div className="rounded-2xl bg-amber-900/15 border border-amber-500/20 p-5 mb-6">
          <p className="text-white/70 text-sm leading-relaxed">
            Welcome to Legion Live. By accessing or using our platform, you agree to be bound by these Terms of Service.
            Please read them carefully. If you do not agree, you may not use Legion Live.
            Legion Live is operated by Legion Live Inc., built by Legion Software Smiths.
          </p>
        </div>

        <div className="space-y-3">
          {SECTIONS.map((s, i) => <SectionCard key={i} {...s} />)}
        </div>

        <p className="text-center text-white/20 text-xs mt-8 pb-4">
          © 2026 Legion Live Inc. · Built by Legion Software Smiths · All rights reserved.
        </p>
      </div>
    </div>
  );
}