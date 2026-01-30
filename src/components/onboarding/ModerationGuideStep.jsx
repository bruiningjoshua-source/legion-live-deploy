import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  Bot,
  Users,
  Ban,
  MessageSquareX,
  Eye,
  Check,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import OnboardingTooltip, { OnboardingBanner } from './OnboardingTooltip';

const FEATURES = [
  {
    icon: Bot,
    title: 'AI Auto-Moderation',
    description: 'Our AI automatically detects and removes hate speech, spam, and inappropriate content in real-time.',
    color: 'cyan',
    tips: [
      'Monitors all chat messages',
      'Flags suspicious behavior',
      'Learns from your preferences'
    ]
  },
  {
    icon: Ban,
    title: 'User Bans & Timeouts',
    description: 'Instantly ban disruptive users or give them temporary timeouts from your stream.',
    color: 'red',
    tips: [
      'One-click temporary bans',
      'Permanent bans for repeat offenders',
      'Ban history tracking'
    ]
  },
  {
    icon: Users,
    title: 'Assign Moderators',
    description: 'Promote trusted viewers to moderators who can help manage your chat.',
    color: 'purple',
    tips: [
      'Give mod powers to trusted fans',
      'Mods can timeout users',
      'Manage mod team easily'
    ]
  },
  {
    icon: MessageSquareX,
    title: 'Word Filters',
    description: 'Set up custom word filters to automatically block specific phrases or spam patterns.',
    color: 'orange',
    tips: [
      'Block offensive words',
      'Filter link spam',
      'Custom block lists'
    ]
  }
];

const QUICK_ACTIONS = [
  { icon: Ban, label: 'Tap user → Ban', desc: 'Quick ban from viewer list' },
  { icon: MessageSquareX, label: 'Long-press message → Delete', desc: 'Remove inappropriate messages' },
  { icon: Users, label: 'Tap user → Make Mod', desc: 'Promote to moderator' }
];

export default function ModerationGuideStep() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Moderation Tools</h2>
        <p className="text-white/60">Keep your community safe and welcoming</p>
      </div>

      <OnboardingBanner
        title="AI-Powered Protection"
        content="Legion Live uses advanced AI to automatically protect your stream from toxic behavior, spam, and explicit content."
        variant="info"
        icon={Shield}
      />

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEATURES.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-white/5 border-white/10 h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 text-${feature.color}-400`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium text-sm">{feature.title}</h3>
                        <OnboardingTooltip
                          title={feature.title}
                          content={feature.description}
                          tips={feature.tips}
                        />
                      </div>
                      <p className="text-white/50 text-xs">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions Guide */}
      <Card className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-amber-500/30">
        <CardContent className="p-4">
          <h3 className="text-amber-200 font-medium mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Quick Actions During Stream
          </h3>
          <div className="space-y-3">
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{action.label}</p>
                    <p className="text-white/50 text-xs">{action.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* What Gets Auto-Moderated */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            What AI Moderation Catches
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Hate speech & slurs',
              'Harassment & threats',
              'Spam & scam links',
              'Explicit content',
              'Personal info sharing',
              'Impersonation attempts'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Warning Note */}
      <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-orange-200 font-medium text-sm">Your Responsibility</h4>
          <p className="text-orange-300/70 text-xs mt-0.5">
            While AI helps, you're ultimately responsible for your stream's content. Review flagged content when possible and report serious violations.
          </p>
        </div>
      </div>
    </div>
  );
}