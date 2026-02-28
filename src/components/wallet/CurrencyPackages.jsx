import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { Sparkles, Crown, Star, Shield, Gift, TrendingUp, Lock, Loader2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

// Currency ratio: 200 coins per $1 USD
const COINS_PER_DOLLAR = 200;

const packages = [
  {
    id: 'starter',
    name: 'Recruit\'s Pouch',
    denarii: 200,        // $0.99 × 200 = 198, rounded to 200
    bonus: 50,
    bonusPercent: 25,
    price: 0.99,
    icon: '🪙',
    popular: false,
    color: 'from-stone-600 to-stone-700',
    border: 'border-stone-500',
    value: 'Starter pack'
  },
  {
    id: 'basic',
    name: 'Soldier\'s Chest',
    denarii: 1000,       // $4.99 × 200 = 998, rounded to 1000
    bonus: 250,
    bonusPercent: 25,
    price: 4.99,
    icon: '💰',
    popular: false,
    color: 'from-green-700 to-green-800',
    border: 'border-green-500',
    value: 'Great starter'
  },
  {
    id: 'popular',
    name: 'Centurion\'s Treasury',
    denarii: 2000,       // $9.99 × 200 = 1998, rounded to 2000
    bonus: 660,
    bonusPercent: 33,
    price: 9.99,
    icon: '⚔️',
    popular: true,
    color: 'from-amber-600 to-amber-700',
    border: 'border-amber-400',
    value: '33% bonus + best value'
  },
  {
    id: 'premium',
    name: 'Praetor\'s Vault',
    denarii: 5000,       // $24.99 × 200 = 4998, rounded to 5000
    bonus: 1850,
    bonusPercent: 37,
    price: 24.99,
    icon: '🏛️',
    popular: false,
    color: 'from-purple-700 to-purple-800',
    border: 'border-purple-500',
    value: '37% bonus savings'
  },
  {
    id: 'elite',
    name: 'Senator\'s Fortune',
    denarii: 10000,      // $49.99 × 200 = 9998, rounded to 10000
    bonus: 4000,
    bonusPercent: 40,
    price: 49.99,
    icon: '👑',
    popular: false,
    color: 'from-rose-600 to-rose-700',
    border: 'border-rose-400',
    value: '40% bonus + VIP status'
  },
  {
    id: 'ultimate',
    name: 'Emperor\'s Legacy',
    denarii: 20000,      // $99.99 × 200 = 19998, rounded to 20000
    bonus: 10000,
    bonusPercent: 50,
    price: 99.99,
    icon: '✨',
    popular: false,
    color: 'from-amber-500 via-rose-500 to-purple-600',
    border: 'border-amber-300',
    premium: true,
    value: '50% LEGENDARY bonus'
  }
];

export default function CurrencyPackages({ onPurchase, isProcessing }) {
  const [selectedPackage, setSelectedPackage] = useState(null);

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
            <span>200 Denarii = $1 USD</span>
          </div>
        </div>
        <p className="text-white/40 text-xs">Buy more, save more • Larger packages = better value</p>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
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

              <div className={`p-6 ${pkg.popular ? 'pt-10' : ''} relative`}>
                {/* Icon & Name */}
                <div className="flex items-center gap-4 mb-5">
                  <motion.span 
                    className="text-5xl drop-shadow-lg"
                    animate={pkg.premium ? { rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {pkg.icon}
                  </motion.span>
                  <div>
                    <h3 className="text-white font-bold text-lg">{pkg.name}</h3>
                    <p className="text-white/50 text-xs">One-time purchase</p>
                  </div>
                </div>

                {/* Denarii Amount */}
                <div className="space-y-3 mb-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white drop-shadow-lg">{pkg.denarii.toLocaleString()}</span>
                    <span className="text-white/60 font-medium">Denarii</span>
                  </div>
                  
                  {pkg.bonus > 0 && (
                    <div className="space-y-2">
                      <motion.div 
                        className="inline-flex items-center gap-1.5 bg-green-500/30 text-green-200 border border-green-400/40 rounded-full px-3 py-1 text-xs font-bold"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        +{pkg.bonusPercent}% BONUS ({pkg.bonus.toLocaleString()})
                      </motion.div>
                      <p className="text-xs text-green-200/90 font-semibold">{pkg.value}</p>
                    </div>
                  )}
                </div>

                {/* Total value */}
                <p className="text-white/40 text-xs text-center mb-4">
                  Total: {(pkg.denarii + pkg.bonus).toLocaleString()} Denarii
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
            { icon: Gift, color: 'pink', text: 'Send stunning animated gifts to your favorite creators' },
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