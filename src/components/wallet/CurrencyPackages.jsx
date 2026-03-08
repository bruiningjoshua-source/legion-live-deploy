import React, { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { Sparkles, Crown, Star, Shield, Gift, TrendingUp, Lock, Loader2, Zap } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

// Currency ratio: 180 Denarii per $1 USD
const DENARII_PER_DOLLAR = 180;

const packages = [
  {
    id: 'micro',
    name: 'Bronze Pouch',
    denarii: 99,
    bonus: 0,
    bonusPercent: 0,
    price: 0.99,
    icon: '🪙',
    popular: false,
    color: 'from-stone-600 to-stone-700',
    border: 'border-stone-500/50',
    value: 'Try it out'
  },
  {
    id: 'starter',
    name: 'Soldier\'s Chest',
    denarii: 520,
    bonus: 70,
    bonusPercent: 13,
    price: 2.99,
    icon: '💰',
    popular: false,
    color: 'from-emerald-700 to-emerald-800',
    border: 'border-emerald-500/50',
    value: '13% bonus'
  },
  {
    id: 'basic',
    name: 'Centurion\'s Bounty',
    denarii: 900,
    bonus: 180,
    bonusPercent: 20,
    price: 4.99,
    icon: '⚔️',
    popular: false,
    color: 'from-blue-700 to-blue-800',
    border: 'border-blue-500/50',
    value: '20% bonus'
  },
  {
    id: 'popular',
    name: 'Praetorian Treasury',
    denarii: 1800,
    bonus: 540,
    bonusPercent: 30,
    price: 9.99,
    icon: '🏛️',
    popular: true,
    color: 'from-amber-600 to-amber-700',
    border: 'border-amber-400',
    value: 'Best value — 30% bonus'
  },
  {
    id: 'premium',
    name: 'Senator\'s Vault',
    denarii: 3600,
    bonus: 1260,
    bonusPercent: 35,
    price: 19.99,
    icon: '🏆',
    popular: false,
    color: 'from-purple-700 to-purple-800',
    border: 'border-purple-500/50',
    value: '35% bonus'
  },
  {
    id: 'elite',
    name: 'Consul\'s Fortune',
    denarii: 5400,
    bonus: 2160,
    bonusPercent: 40,
    price: 29.99,
    icon: '👑',
    popular: false,
    color: 'from-rose-600 to-rose-700',
    border: 'border-rose-400/50',
    value: '40% bonus'
  },
  {
    id: 'whale',
    name: 'Imperator\'s Hoard',
    denarii: 9000,
    bonus: 4050,
    bonusPercent: 45,
    price: 49.99,
    icon: '🦅',
    popular: false,
    color: 'from-cyan-600 to-teal-700',
    border: 'border-cyan-400/50',
    value: '45% bonus + VIP boost'
  },
  {
    id: 'ultimate',
    name: 'Emperor\'s Legacy',
    denarii: 18000,
    bonus: 9000,
    bonusPercent: 50,
    price: 99.99,
    icon: '✨',
    popular: false,
    color: 'from-amber-500 via-rose-500 to-purple-600',
    border: 'border-amber-300',
    premium: true,
    value: '50% LEGENDARY bonus'
  },
  {
    id: 'titan',
    name: 'Divine Ascension',
    denarii: 90000,
    bonus: 54000,
    bonusPercent: 60,
    price: 499.99,
    icon: '⚡',
    popular: false,
    color: 'from-yellow-500 via-red-500 to-pink-600',
    border: 'border-yellow-300',
    premium: true,
    value: '60% DIVINE bonus — top supporter'
  }
];

export default function CurrencyPackages({ onPurchase, isProcessing }) {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, []);

  const handlePurchase = (pkg) => {
    setSelectedPackage(pkg.id);
    onPurchase(pkg);
  };

  return (
    <div className="space-y-6">
      {/* Legal Notice */}
      <GlassCard padding="p-4" animate={false}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-sm">
            <p className="text-white font-medium mb-1">Secure Digital Purchases</p>
            <p className="text-white/50 text-xs leading-relaxed">
              Denarii are virtual currency for use within Legion Live only. All purchases are final. 
              By purchasing, you agree to our Terms of Service. Must be 18+ or have parental consent.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Currency Exchange Info */}
      <div className="flex flex-col items-center justify-center gap-3 text-sm">
        <div className="flex items-center gap-4 bg-white/5 rounded-full px-6 py-2">
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-lg">🪙</span>
            <span>180 Denarii = $1 USD</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Creators earn 60% of all gifts • Bigger packages = better value</span>
        </div>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={isMobile ? {} : { y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handlePurchase(pkg)}
            className="cursor-pointer"
          >
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${pkg.color} 
              ${pkg.popular ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black shadow-xl shadow-amber-500/30' : 'shadow-xl'}
              ${pkg.premium ? 'shadow-2xl shadow-purple-500/30' : ''}
              border ${pkg.border} transition-all duration-300`}
            >
              {pkg.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-center py-1.5">
                  <span className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                    <Star className="w-3.5 h-3.5" /> MOST POPULAR
                  </span>
                </div>
              )}
              
              {pkg.premium && (
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              <div className={`p-5 ${pkg.popular ? 'pt-10' : ''} relative`}>
                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <motion.span 
                    className="text-4xl drop-shadow-lg"
                    animate={pkg.premium ? { rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {pkg.icon}
                  </motion.span>
                  <div>
                    <h3 className="text-white font-bold text-base">{pkg.name}</h3>
                    <p className="text-white/50 text-xs">{pkg.value}</p>
                  </div>
                </div>

                {/* Denarii Amount */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white drop-shadow-lg">{pkg.denarii.toLocaleString()}</span>
                    <span className="text-white/60 font-medium text-sm">Denarii</span>
                  </div>
                  
                  {pkg.bonus > 0 && (
                    <motion.div 
                      className="inline-flex items-center gap-1.5 bg-green-500/30 text-green-200 border border-green-400/40 rounded-full px-3 py-1 text-xs font-bold"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      +{pkg.bonus.toLocaleString()} BONUS ({pkg.bonusPercent}%)
                    </motion.div>
                  )}
                </div>

                {/* Total value */}
                <p className="text-white/40 text-xs text-center mb-3">
                  Total: {(pkg.denarii + pkg.bonus).toLocaleString()} Denarii
                  {pkg.price > 0 && ` · $${((pkg.denarii + pkg.bonus) / DENARII_PER_DOLLAR).toFixed(2)} value`}
                </p>

                {/* Price Button */}
                <motion.button 
                  className="w-full py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/30 font-bold text-lg transition-all flex items-center justify-center gap-2"
                  disabled={isProcessing && selectedPackage === pkg.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isProcessing && selectedPackage === pkg.id ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `$${pkg.price.toFixed(2)}`
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Benefits */}
      <GlassCard padding="p-6" animate={false} glowColor="amber">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          Why Purchase Denarii?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Gift, color: 'pink', text: 'Send stunning animated gifts — creators keep 60%' },
            { icon: TrendingUp, color: 'green', text: 'Climb VIP ranks for exclusive badges and perks' },
            { icon: Star, color: 'amber', text: 'Influence PK battles and stand out in chat' }
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-${item.color}-500/20`}>
                <item.icon className={`w-4 h-4 text-${item.color}-400`} />
              </div>
              <p className="text-white/70 text-sm">{item.text}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-8 pt-4">
        {[
          { icon: Lock, text: 'Secure Payment' },
          { icon: Shield, text: 'Stripe Protected' },
          { icon: Sparkles, text: 'Instant Delivery' }
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-white/40 text-xs">
            <item.icon className="w-4 h-4" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}