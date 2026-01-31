import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  HelpCircle, 
  Shield, 
  FileText, 
  Mail, 
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Lock,
  Scale,
  Heart,
  Zap,
  Gift,
  Radio,
  Wallet,
  Users,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';

const FAQ_ITEMS = [
  {
    category: 'Getting Started',
    icon: Zap,
    questions: [
      { q: 'How do I start streaming?', a: 'Tap the "Go Live" button in the navigation. Grant camera/mic permissions, add a title and category, then start your broadcast!' },
      { q: 'What are Denarii?', a: 'Denarii is our virtual currency. You can use it to send gifts to creators, unlock exclusive content, and more. New users receive 500 free Denarii!' },
      { q: 'How do I follow creators?', a: 'Visit any creator\'s profile or stream and tap the heart/follow button. You\'ll be notified when they go live.' }
    ]
  },
  {
    category: 'Wallet & Payments',
    icon: Wallet,
    questions: [
      { q: 'How do I buy Denarii?', a: 'Go to your Wallet page and select a Denarii package. Payments are processed securely via Stripe.' },
      { q: 'How do creators get paid?', a: 'Creators earn 50% of gift value. They can request payouts via PayPal, Venmo, CashApp, or Stripe Connect once they reach the minimum threshold.' },
      { q: 'Are purchases refundable?', a: 'Virtual currency purchases are generally non-refundable. Contact support for special circumstances.' }
    ]
  },
  {
    category: 'Gifts & Support',
    icon: Gift,
    questions: [
      { q: 'How do gifts work?', a: 'During a live stream, tap the gift icon to send virtual gifts. The creator sees your gift on screen and earns Denarii!' },
      { q: 'What are Fan Clubs?', a: 'Fan Clubs are monthly subscriptions that give you exclusive perks like VIP chat rooms, badges, and direct access to your favorite creators.' },
      { q: 'How do tipping goals work?', a: 'Creators can set goals during streams. When viewers collectively reach the goal, the creator performs a special reward!' }
    ]
  },
  {
    category: 'Safety & Moderation',
    icon: Shield,
    questions: [
      { q: 'How do I report inappropriate content?', a: 'Tap the flag icon on any stream or profile to report. Our moderation team reviews all reports within 24 hours.' },
      { q: 'Is my information safe?', a: 'Yes! We use industry-standard encryption and never sell your personal data. See our Privacy Policy for details.' },
      { q: 'What content is prohibited?', a: 'Violence, harassment, adult content, and illegal activities are strictly prohibited. See Community Guidelines for full details.' }
    ]
  }
];

function FAQSection({ category, icon: Icon, questions }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <GlassCard className="mb-4" padding="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <Icon className="w-5 h-5 text-amber-400" />
        </div>
        <h3 className="text-white font-semibold">{category}</h3>
      </div>
      <div className="space-y-2">
        {questions.map((item, i) => (
          <div key={i} className="border-b border-white/5 last:border-0">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between py-3 text-left"
            >
              <span className="text-white/80 text-sm">{item.q}</span>
              <motion.div animate={{ rotate: expanded === i ? 180 : 0 }}>
                <ChevronDown className="w-4 h-4 text-white/40" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expanded === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-white/50 text-sm pb-3">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export default function HelpAndInfo() {
  const [activeTab, setActiveTab] = useState('help');

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <HelpCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-white mb-2">Help & Information</h1>
          <p className="text-white/50">Everything you need to know about Legion Live</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
          {[
            { id: 'help', label: 'Help & FAQ', icon: HelpCircle },
            { id: 'about', label: 'About', icon: Info },
            { id: 'legal', label: 'Legal', icon: Scale }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-amber-500 text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Help Tab */}
        {activeTab === 'help' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {FAQ_ITEMS.map((section, i) => (
              <FAQSection key={i} {...section} />
            ))}

            {/* Contact Support */}
            <GlassCard className="text-center" glowColor="amber">
              <MessageSquare className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">Still need help?</h3>
              <p className="text-white/50 text-sm mb-4">Our support team is here 24/7</p>
              <a href="mailto:support@legionlive.com" className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors">
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
            </GlassCard>
          </motion.div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <GlassCard>
              <div className="text-center mb-6">
                <span className="text-5xl mb-4 block">🛡️</span>
                <h2 className="text-2xl font-bold text-white mb-2">Legion Live</h2>
                <p className="text-white/50">Version 1.0.0</p>
              </div>
              <p className="text-white/70 text-center leading-relaxed">
                Legion Live is the ultimate platform for live streaming, gaming, and community building. 
                Connect with creators, send virtual gifts, join fan clubs, and be part of an amazing community.
              </p>
            </GlassCard>

            <GlassCard>
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" />
                Our Mission
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                We believe everyone has a story to share. Legion Live empowers creators to build meaningful 
                connections with their audience through live streaming, interactive features, and fair monetization. 
                Our platform is built on trust, creativity, and community.
              </p>
            </GlassCard>

            <GlassCard>
              <h3 className="text-white font-semibold mb-4">Platform Features</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Radio, label: 'Live Streaming', desc: 'Go live in seconds' },
                  { icon: Gift, label: 'Virtual Gifts', desc: 'Support creators' },
                  { icon: Users, label: 'Fan Clubs', desc: 'Exclusive communities' },
                  { icon: Wallet, label: 'Creator Payouts', desc: 'Fair monetization' }
                ].map((feature, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3">
                    <feature.icon className="w-5 h-5 text-amber-400 mb-2" />
                    <p className="text-white text-sm font-medium">{feature.label}</p>
                    <p className="text-white/40 text-xs">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Legal Tab */}
        {activeTab === 'legal' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <GlassCard>
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                Legal Documents
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Terms of Service', path: 'TermsOfService', icon: FileText },
                  { label: 'Privacy Policy', path: 'PrivacyPolicy', icon: Lock },
                  { label: 'Community Guidelines', path: 'CommunityGuidelines', icon: Users },
                  { label: 'Data Privacy (GDPR)', path: 'DataPrivacy', icon: Shield }
                ].map((doc, i) => (
                  <Link
                    key={i}
                    to={createPageUrl(doc.path)}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <doc.icon className="w-5 h-5 text-white/40" />
                      <span className="text-white/80">{doc.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </Link>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-white font-semibold mb-4">Company Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Company Name</span>
                  <span className="text-white">Legion Live Inc.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Registered Address</span>
                  <span className="text-white text-right">123 Creator Blvd<br/>San Francisco, CA 94105</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Support Email</span>
                  <a href="mailto:support@legionlive.com" className="text-amber-400">support@legionlive.com</a>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Business Email</span>
                  <a href="mailto:business@legionlive.com" className="text-amber-400">business@legionlive.com</a>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-medium mb-1">Age Requirement</h4>
                  <p className="text-white/50 text-sm">
                    You must be at least 18 years old to use Legion Live. By using our services, 
                    you confirm that you meet this age requirement.
                  </p>
                </div>
              </div>
            </GlassCard>

            <p className="text-white/30 text-xs text-center">
              © 2026 Legion Live Inc. All rights reserved.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}