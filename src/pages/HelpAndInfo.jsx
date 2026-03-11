import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, Shield, FileText, Mail, MessageSquare,
  ChevronDown, ChevronRight, Info, Lock, Scale, Heart,
  Zap, Gift, Radio, Wallet, Users, AlertTriangle, Sword,
  Globe, Star, Code2, Building2, Phone, ExternalLink
} from 'lucide-react';

const FAQ_ITEMS = [
  {
    category: 'Getting Started',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    questions: [
      { q: 'How do I start streaming on Legion Live?', a: 'Tap "Go Live" in the navigation bar. Grant camera and microphone permissions, set your stream title, select a category, then hit Start Broadcast. You\'re live in under 30 seconds.' },
      { q: 'What are Denarii and how do I get them?', a: 'Denarii is Legion Live\'s official virtual currency. 65 Denarii = $1 USD. New users receive 500 free Denarii on sign-up. You can purchase more in the Wallet section, and creators earn Denarii when fans send gifts.' },
      { q: 'How do I follow and discover creators?', a: 'Visit any creator\'s profile or live stream and tap the Follow button. Use the Explore page to discover new creators by category, trending, or search. You\'ll be notified when followed creators go live.' },
      { q: 'Is Legion Live free to use?', a: 'Yes — watching streams, following creators, and using the forums is completely free. Denarii purchases and fan club subscriptions are optional and support your favourite creators.' },
    ]
  },
  {
    category: 'Wallet & Payments',
    icon: Wallet,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    questions: [
      { q: 'How do I buy Denarii?', a: 'Go to your Wallet page and select any Denarii package. Payments are processed securely via Stripe. 65 Denarii = $1 USD, with bonus Denarii on larger packages (up to +35%).' },
      { q: 'How do creators get paid?', a: 'Creators earn 70% of all gift value received. For every 65 Denarii gifted, creators keep $0.70 USD. Minimum payout threshold is 650 Denarii (~$10). Payouts are processed via Stripe Connect, PayPal, Venmo, or CashApp.' },
      { q: 'Are Denarii purchases refundable?', a: 'Virtual currency purchases are generally non-refundable once Denarii are delivered to your account. Contact support@legionlive.com for special circumstances or billing errors.' },
      { q: 'What is the VIP system?', a: 'Every Denarii purchase earns VIP points. Accumulate points to unlock VIP levels (1–8), each granting progressively exclusive perks: priority chat, animated badges, custom emotes, creator DM access, and DIVINE aura at max level.' },
    ]
  },
  {
    category: 'Gifting & Fan Clubs',
    icon: Gift,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    questions: [
      { q: 'How do gifts work during a live stream?', a: 'Tap the gift icon during any live stream to open the gift panel. Select a gift, confirm, and it plays an animation on the creator\'s stream. The creator sees your name and earns 70% of the gift\'s Denarii value.' },
      { q: 'What are Fan Clubs?', a: 'Fan Clubs are monthly subscriptions to specific creators offering exclusive perks: private chat rooms, custom emotes, badges, direct messaging, ad-free streams, and early access to content.' },
      { q: 'What are PK Battles?', a: 'PK (Player Kill) Battles are head-to-head competitions between two live creators. Viewers support their side with gifts. The creator who receives more gifts in the time limit wins a raised share split.' },
    ]
  },
  {
    category: 'Safety & Moderation',
    icon: Shield,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    questions: [
      { q: 'How do I report inappropriate content?', a: 'Tap the flag/report icon on any stream, comment, or profile. Our moderation team reviews all reports within 24 hours. Serious violations are escalated immediately.' },
      { q: 'Is my personal data safe?', a: 'Absolutely. Legion Live uses industry-standard TLS encryption for all data in transit and AES-256 at rest. We never sell personal data. See our Privacy Policy for full details.' },
      { q: 'What content is strictly prohibited?', a: 'Violence, harassment, hate speech, illegal activity, explicit sexual content, and content involving minors are all strictly prohibited and result in immediate account termination. See Community Guidelines for the full list.' },
      { q: 'How do I block or mute another user?', a: 'Visit the user\'s profile or tap their name in chat. Select "Block" or "Mute". Blocked users cannot view your profile, send you messages, or interact with your streams.' },
    ]
  },
  {
    category: 'Creator Tools',
    icon: Radio,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    questions: [
      { q: 'What streaming quality does Legion Live support?', a: 'Legion Live supports up to 1080p60 for live broadcasts via ZegoCloud infrastructure. The mobile app automatically adapts bitrate based on connection strength for optimal viewer experience.' },
      { q: 'How do I set up affiliate products in my stream?', a: 'Go to Creator Studio → Affiliate Hub. Connect your affiliate accounts, add products to your showcase, and they\'ll appear in your live stream for viewers to purchase directly.' },
      { q: 'How does the Video Editor work?', a: 'The built-in video editor supports multi-track timelines, colour grading, transitions, text overlays, audio EQ, and AI-powered title optimization. Access it from Creator Studio after uploading a VOD.' },
    ]
  },
];

function FAQSection({ category, icon: Icon, color, bg, questions }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden mb-3">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05]">
        <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <h3 className="text-white font-semibold text-sm">{category}</h3>
        <span className="ml-auto text-white/25 text-xs">{questions.length} questions</span>
      </div>
      <div>
        {questions.map((item, i) => (
          <div key={i} className="border-b border-white/[0.04] last:border-0">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-white/80 text-sm pr-4">{item.q}</span>
              <motion.div animate={{ rotate: expanded === i ? 180 : 0 }} className="flex-shrink-0">
                <ChevronDown className="w-4 h-4 text-white/30" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expanded === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="text-white/50 text-sm px-4 pb-4 leading-relaxed">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Radio, label: 'Live Streaming', desc: 'ZegoCloud-powered 1080p60 broadcasts', color: 'text-red-400', bg: 'bg-red-500/10' },
  { icon: Gift, label: 'Virtual Gifting', desc: 'Animated gifts with 70% creator share', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { icon: Users, label: 'Fan Clubs', desc: 'Exclusive creator subscription tiers', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  { icon: Wallet, label: 'Creator Payouts', desc: 'Multi-method payouts via Stripe Connect', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: Zap, label: 'Gaming Arena', desc: 'Tournaments with live prize pools', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { icon: Star, label: 'Affiliate Hub', desc: 'Earn commissions on product sales', color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

export default function HelpAndInfo() {
  const [activeTab, setActiveTab] = useState('help');

  const tabs = [
    { id: 'help', label: 'Help & FAQ', icon: HelpCircle },
    { id: 'about', label: 'About', icon: Info },
    { id: 'legal', label: 'Legal', icon: Scale },
  ];

  return (
    <div className="min-h-screen pt-16 pb-24 bg-[#09090b]">
      {/* Ambient bg */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#09090b] to-transparent" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/25">
            <Sword className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Help & Information</h1>
          <p className="text-white/40 text-sm">Everything you need to know about Legion Live</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.04] p-1 rounded-2xl mb-6 border border-white/[0.06]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Help Tab */}
        {activeTab === 'help' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {FAQ_ITEMS.map((section, i) => (
              <FAQSection key={i} {...section} />
            ))}
            {/* Contact */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-900/30 to-orange-900/20 border border-amber-500/20 p-6 text-center mt-4">
              <MessageSquare className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-1">Still need help?</h3>
              <p className="text-white/45 text-sm mb-4">Our support team responds within 24 hours</p>
              <a
                href="mailto:support@legionlive.com"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                <Mail className="w-4 h-4" /> Email Support
              </a>
            </div>
          </motion.div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Hero card */}
            <div className="rounded-2xl bg-gradient-to-br from-[#1a0a00]/60 via-[#100600]/40 to-white/[0.02] border border-amber-500/15 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30">
                <Sword className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">Legion Live</h2>
              <p className="text-amber-400 text-sm font-medium mb-1">Platform Version 2.0 · Omega Build</p>
              <p className="text-white/40 text-xs">Built by Legion Software Smiths</p>
            </div>

            {/* Mission */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" /> Our Mission
              </h3>
              <p className="text-white/55 text-sm leading-relaxed">
                Legion Live was built for creators who want more than a platform — they want an empire.
                We combine the energy of live streaming, the depth of a gaming arena, the reach of an affiliate marketplace,
                and the power of community forums into one Roman-inspired ecosystem. We believe creators deserve
                70% of what their audience gives — and the tools to grow without limits.
              </p>
            </div>

            {/* Features grid */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5">
              <h3 className="text-white font-bold mb-4">Platform Capabilities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FEATURES.map((f, i) => (
                  <div key={i} className={`rounded-xl ${f.bg} border border-white/[0.06] p-3`}>
                    <f.icon className={`w-5 h-5 ${f.color} mb-2`} />
                    <p className="text-white text-xs font-semibold">{f.label}</p>
                    <p className="text-white/40 text-[10px] mt-0.5 leading-tight">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech stack / builder */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-400" /> Built With
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Developer', value: 'Legion Software Smiths' },
                  { label: 'Streaming', value: 'ZegoCloud' },
                  { label: 'Payments', value: 'Stripe (Live Mode)' },
                  { label: 'Currency', value: '65 Denarii = $1 USD' },
                  { label: 'Creator Share', value: '70% of all gifts' },
                  { label: 'Platform', value: 'React · Tailwind CSS' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-white/30 text-xs">{label}</span>
                    <span className="text-white/80 text-xs font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Legal Tab */}
        {activeTab === 'legal' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Legal documents */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" /> Legal Documents
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Terms of Service', path: 'TermsOfService', icon: FileText, desc: 'Platform rules and user agreement' },
                  { label: 'Privacy Policy', path: 'PrivacyPolicy', icon: Lock, desc: 'How we collect and use your data' },
                  { label: 'Community Guidelines', path: 'CommunityGuidelines', icon: Users, desc: 'Content standards and conduct rules' },
                  { label: 'Data Privacy (GDPR)', path: 'DataPrivacy', icon: Shield, desc: 'EU/UK data rights and compliance' },
                ].map((doc, i) => (
                  <Link key={i} to={createPageUrl(doc.path)}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.12] transition-all group">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <doc.icon className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/85 text-sm font-medium">{doc.label}</p>
                      <p className="text-white/35 text-xs">{doc.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-amber-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Company info */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" /> Company Information
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Company', value: 'Legion Live Inc.' },
                  { label: 'Developer', value: 'Legion Software Smiths' },
                  { label: 'Platform', value: 'Legion Live' },
                  { label: 'Support Email', value: 'support@legionlive.com', href: 'mailto:support@legionlive.com' },
                  { label: 'Business Email', value: 'business@legionlive.com', href: 'mailto:business@legionlive.com' },
                  { label: 'Legal Email', value: 'legal@legionlive.com', href: 'mailto:legal@legionlive.com' },
                  { label: 'Privacy / DPO', value: 'privacy@legionlive.com', href: 'mailto:privacy@legionlive.com' },
                ].map(({ label, value, href }) => (
                  <div key={label} className="flex justify-between items-start gap-3">
                    <span className="text-white/40 flex-shrink-0">{label}</span>
                    {href ? (
                      <a href={href} className="text-amber-400 hover:text-amber-300 transition-colors text-right">{value}</a>
                    ) : (
                      <span className="text-white/75 text-right">{value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Age requirement */}
            <div className="rounded-2xl bg-red-900/15 border border-red-500/20 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Age Requirement — 18+</h4>
                <p className="text-white/50 text-xs leading-relaxed">
                  You must be at least 18 years old to create an account and use Legion Live. By accessing the platform you confirm you meet this requirement. Age verification may be required for creators.
                </p>
              </div>
            </div>

            <p className="text-white/20 text-xs text-center pb-4">
              © 2026 Legion Live Inc. · Built by Legion Software Smiths · All rights reserved.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}