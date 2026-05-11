import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  Camera,
  Gift,
  Crown,
  Shield,
  Sparkles,
  PartyPopper
} from 'lucide-react';

export default function OnboardingComplete({ profileData, monetizationData, onComplete, isPending }) {
  const enabledFeatures = [
    { label: 'Virtual Gifts', enabled: monetizationData.gifts_enabled, icon: Gift },
    { label: 'Direct Tips', enabled: monetizationData.tips_enabled, icon: '💵' },
    { label: 'Subscriptions', enabled: monetizationData.subscriptions_enabled, icon: Crown },
    { label: 'Gift Goal', enabled: !!monetizationData.gift_goal, icon: '🎯' },
  ].filter(f => f.enabled);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6"
        >
          <PartyPopper className="w-12 h-12 text-white" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-white mb-3"
        >
          You're All Set!
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/60 max-w-md mx-auto"
        >
          Your creator profile is ready. Here's a summary of what you've set up:
        </motion.p>
      </div>

      {/* Profile Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 overflow-hidden">
                {profileData.avatar_url ? (
                  <img src={profileData.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-amber-400">
                    {profileData.display_name?.[0] || '?'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">{profileData.display_name}</h3>
                <p className="text-white/50 text-sm capitalize">{profileData.category?.replace('_', ' ')} Creator</p>
                {profileData.bio && (
                  <p className="text-white/40 text-xs mt-1 line-clamp-2">{profileData.bio}</p>
                )}
              </div>
              <Check className="w-6 h-6 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enabled Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h4 className="text-white/60 text-sm mb-3">Monetization Enabled:</h4>
        <div className="grid grid-cols-2 gap-2">
          {enabledFeatures.map((feature, i) => (
            <div 
              key={i}
              className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
            >
              {typeof feature.icon === 'string' ? (
                <span className="text-lg">{feature.icon}</span>
              ) : (
                <feature.icon className="w-5 h-5 text-green-400" />
              )}
              <span className="text-green-200 text-sm">{feature.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Protection Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl"
      >
        <Shield className="w-8 h-8 text-cyan-400" />
        <div>
          <h4 className="text-cyan-200 font-medium">AI Protection Active</h4>
          <p className="text-cyan-300/70 text-xs">Your streams are protected by AI moderation</p>
        </div>
      </motion.div>

      {/* Next Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h4 className="text-white/60 text-sm mb-3">What's Next:</h4>
        <div className="space-y-2">
          {[
            { icon: Camera, label: 'Go live and start streaming', primary: true },
            { icon: Sparkles, label: 'Customize your subscription tiers' },
            { icon: '📱', label: 'Share your profile on social media' }
          ].map((item, i) => (
            <div 
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                item.primary ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5'
              }`}
            >
              {typeof item.icon === 'string' ? (
                <span className="text-lg">{item.icon}</span>
              ) : (
                <item.icon className={`w-5 h-5 ${item.primary ? 'text-amber-400' : 'text-white/60'}`} />
              )}
              <span className={item.primary ? 'text-amber-200' : 'text-white/70'}>{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}