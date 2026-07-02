import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, Database, Share2, Lock, Bell, Globe, Trash2, ChevronDown, ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    icon: Database,
    title: '1. Information We Collect',
    content: [
      { heading: '1.1 Information You Provide', body: 'Account data (email, display name, profile photo, date of birth); payment details processed securely by Stripe; content you create (streams, videos, chat, comments); and communications you send us or other users.' },
      { heading: '1.2 Automatically Collected', body: 'Device information (type, OS, browser, IP address); usage data (pages visited, features used, stream history, interaction patterns); general location from IP (no GPS data); cookies and similar tracking technologies for experience improvement.' },
      { heading: '1.3 From Third Parties', body: 'Social media profiles if you choose to link them; payment verification from Stripe; age verification services; analytics from streaming infrastructure providers.' },
    ]
  },
  {
    icon: Eye,
    title: '2. How We Use Your Information',
    content: [
      { heading: '2.1 Core Services', body: 'Providing, maintaining, and improving Legion Live; processing Denarii transactions and creator payouts; enabling communication between users; recommending content based on your interests.' },
      { heading: '2.2 Safety & Compliance', body: 'Detecting and preventing fraud, abuse, and security threats; enforcing our Terms of Service and Community Guidelines; verifying age for appropriate content; moderating streams and chat in real time.' },
      { heading: '2.3 Communications', body: 'Service-related announcements; responses to support requests; marketing communications only with your explicit consent, which you may withdraw at any time.' },
    ]
  },
  {
    icon: Share2,
    title: '3. Information Sharing',
    content: [
      { heading: '3.1 Public Information', body: 'Your username, display name, profile photo, bio, public streams, follower counts, and public content are visible to all users by default. You may adjust privacy settings to limit visibility.' },
      { heading: '3.2 Service Providers', body: 'We share necessary data with Stripe (payments), ZegoCloud (live streaming infrastructure), and cloud hosting providers under strict data processing agreements.' },
      { heading: '3.3 Legal Requirements', body: 'We may disclose information when required by law, court order, or to protect the rights, safety, and property of Legion Live, its users, or the public.' },
      { heading: '3.4 No Data Sales', body: 'We never sell, rent, or trade your personal data to third parties for their marketing purposes. This is an absolute commitment.' },
    ]
  },
  {
    icon: Lock,
    title: '4. Data Security',
    content: [
      { heading: '4.1 Security Measures', body: 'TLS 1.3 encryption for all data in transit; AES-256 encryption for sensitive data at rest; regular security audits; strict access controls; 24/7 monitoring for suspicious activity and breach detection.' },
      { heading: '4.2 Breach Response', body: 'In the event of a data breach affecting your personal information, we will notify affected users within 72 hours, report to relevant authorities as required by law, and provide guidance on protective steps.' },
      { heading: '4.3 Your Responsibilities', body: 'Use a strong unique password; never share your credentials; report suspicious activity to security@legionlive.com immediately.' },
    ]
  },
  {
    icon: Bell,
    title: '5. Your Rights & Choices',
    content: [
      { heading: '5.1 Access & Portability', body: 'You may request a copy of your personal data at any time. Contact privacy@legionlive.com and we will respond within 30 days.' },
      { heading: '5.2 Correction & Deletion', body: 'Update profile information directly in Settings. Request full account and data deletion via Settings → Account → Delete Account. Some data may be retained for legal compliance.' },
      { heading: '5.3 Opt-Out & Restriction', body: 'Unsubscribe from marketing emails via any email link; disable personalized recommendations in Privacy settings; manage cookie preferences via browser settings.' },
      { heading: '5.4 GDPR Rights (EU/UK)', body: 'If you are in the EU or UK, you have rights to access, rectify, erase, restrict, object to, and port your data. Contact our DPO at dpo@legionlive.com. You may also lodge a complaint with your national supervisory authority.' },
    ]
  },
  {
    icon: Trash2,
    title: '6. Data Retention',
    content: [
      { heading: '6.1 Retention Periods', body: 'Account data: retained while active, plus 30 days post-deletion. Content: retained until you delete it. Transaction records: 7 years for tax and legal compliance. Security logs: 12 months. Aggregated analytics: indefinitely (anonymized).' },
      { heading: '6.2 Deletion Process', body: 'When you delete your account: your profile becomes inaccessible immediately; personal data is deleted within 30 days; some data may persist in encrypted backups for up to 90 days; anonymized/aggregated data may be retained.' },
    ]
  },
];

function SectionCard({ icon: Icon, title, content }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-green-400" />
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
                  <p className="text-green-400 text-xs font-bold uppercase tracking-wide mb-1.5">{item.heading}</p>
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

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen pb-24 bg-[#09090b]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-green-500/[0.04] rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">
        <Link to={createPageUrl('HelpAndInfo')} className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Help
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-4">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-green-300 text-sm font-medium">Privacy</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
          <p className="text-white/35 text-sm">Last updated: March 11, 2026</p>
        </div>

        {/* GDPR Notice */}
        <div className="rounded-2xl bg-blue-900/15 border border-blue-500/20 p-4 mb-4 flex gap-3">
          <Globe className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-300 text-sm font-semibold mb-1">EU/UK Residents — GDPR Rights Apply</p>
            <p className="text-white/50 text-xs leading-relaxed">
              Legion Live acts as data controller. Our Data Protection Officer is available at dpo@legionlive.com.
              You have rights to access, correct, delete, restrict, port, and object to processing of your data.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-green-900/15 border border-green-500/20 p-5 mb-6">
          <p className="text-white/70 text-sm leading-relaxed">
            At Legion Live, your privacy is foundational — not an afterthought. This Policy explains exactly how we collect,
            use, protect, and respect your personal information. We never sell your data. Period.
            By using Legion Live, you agree to the practices described here.
          </p>
        </div>

        <div className="space-y-3">
          {SECTIONS.map((s, i) => <SectionCard key={i} {...s} />)}
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 mt-6">
          <h3 className="text-white font-bold mb-3">Contact Privacy Team</h3>
          <div className="space-y-1.5 text-sm">
            {[
              { label: 'General Privacy', email: 'privacy@legionlive.com' },
              { label: 'Data Protection Officer', email: 'dpo@legionlive.com' },
              { label: 'Security Reports', email: 'security@legionlive.com' },
            ].map(({ label, email }) => (
              <div key={email} className="flex justify-between">
                <span className="text-white/40">{label}</span>
                <a href={`mailto:${email}`} className="text-green-400 hover:text-green-300 transition-colors">{email}</a>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6 pb-4">
          © 2026 Legion Live Inc. · Built by Legion Software Smiths · All rights reserved.
        </p>
      </div>
    </div>
  );
}