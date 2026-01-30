import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { Sparkles, Crown, Star, Shield, Gift, TrendingUp, Lock, Loader2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

// Denarii Crypto Trajectory: Current baseline $0.001/Denarii, targeting $0.01 in 6 months
// Early adopters get maximum value before crypto launch
const CURRENT_DENARII_VALUE_USD = 0.001; // Will increase to $0.01 at crypto launch

const packages = [
  {
    id: 'starter',
    name: 'Recruit\'s Pouch',
    denarii: 2000,
    bonus: 500,
    bonusPercent: 25,
    price: 0.99,
    icon: '🪙',
    popular: false,
    color: 'from-stone-600 to-stone-700',
    border: 'border-stone-500',
    usdPerDenarii: 0.000396,
    value: 'Early adopter rate',
    futureValue: '$25 at crypto launch'
  },
  {
    id: 'basic',
    name: 'Soldier\'s Chest',
    denarii: 12000,
    bonus: 3000,
    bonusPercent: 25,
    price: 4.99,
    icon: '💰',
    popular: false,
    color: 'from-green-700 to-green-800',
    border: 'border-green-500',
    usdPerDenarii: 0.000333,
    value: 'Great starter',
    futureValue: '$150 at crypto launch'
  },
  {
    id: 'popular',
    name: 'Centurion\'s Treasury',
    denarii: 30000,
    bonus: 10000,
    bonusPercent: 33,
    price: 9.99,
    icon: '⚔️',
    popular: true,
    color: 'from-amber-600 to-amber-700',
    border: 'border-amber-400',
    usdPerDenarii: 0.00025,
    value: '33% bonus + best value',
    futureValue: '$400 at crypto launch'
  },
  {
    id: 'premium',
    name: 'Praetor\'s Vault',
    denarii: 80000,
    bonus: 30000,
    bonusPercent: 37,
    price: 24.99,
    icon: '🏛️',
    popular: false,
    color: 'from-purple-700 to-purple-800',
    border: 'border-purple-500',
    usdPerDenarii: 0.000227,
    value: '37% bonus savings',
    futureValue: '$1,100 at crypto launch'
  },
  {
    id: 'elite',
    name: 'Senator\'s Fortune',
    denarii: 200000,
    bonus: 80000,
    bonusPercent: 40,
    price: 49.99,
    icon: '👑',
    popular: false,
    color: 'from-rose-600 to-rose-700',
    border: 'border-rose-400',
    usdPerDenarii: 0.000178,
    value: '40% bonus + VIP status',
    futureValue: '$2,800 at crypto launch'
  },
  {
    id: 'ultimate',
    name: 'Emperor\'s Legacy',
    denarii: 500000,
    bonus: 250000,
    bonusPercent: 50,
    price: 99.99,
    icon: '✨',
    popular: false,
    color: 'from-amber-500 via-rose-500 to-purple-600',
    border: 'border-amber-300',
    premium: true,
    usdPerDenarii: 0.000133,
    value: '50% LEGENDARY bonus',
    futureValue: '$7,500 at crypto launch'
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

      {/* Crypto Launch Notice */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/30 via-purple-500/30 to-pink-500/30 animate-pulse" />
        <div className="relative bg-black/40 backdrop-blur-sm border border-amber-500/40 rounded-2xl p-5">
          <p className="text-white font-bold text-center">
            🚀 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-purple-200">CRYPTO LAUNCH IN 6 MONTHS</span>
          </p>
          <p className="text-white/60 text-center text-sm mt-2">
            Denarii converting to blockchain token at <span className="text-green-400 font-bold">10x</span> current value!
          </p>
          <div className="flex items-center justify-center gap-3 mt-3 text-xs">
            <span className="px-3 py-1 rounded-full bg-white/10 text-white/70">Current: $0.001</span>
            <span className="text-amber-400">→</span>
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/30 to-purple-500/30 text-amber-200 font-bold">Launch: $0.01</span>
          </div>
        </div>
      </motion.div>

      {/* Currency Exchange Info */}
      <div className="flex flex-col items-center justify-center gap-3 text-sm">
        <div className="flex items-center gap-4 bg-white/5 rounded-full px-6 py-2">
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-lg">🪙</span>
            <span>1 Denarii = 100 As</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-lg">🥈</span>
            <span>1 Sestertius = 4 As</span>
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
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`relative overflow-hidden bg-gradient-to-br ${pkg.color} ${pkg.border} border-2 
                ${pkg.popular ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-900' : ''}
                ${pkg.premium ? 'shadow-xl shadow-amber-500/20' : ''}
                hover:scale-[1.02] transition-transform cursor-pointer`}
              onClick={() => handlePurchase(pkg)}
            >
              {pkg.popular && (
                <div className="absolute top-0 left-0 right-0 bg-amber-500 text-center py-1">
                  <span className="text-xs font-bold text-white flex items-center justify-center gap-1">
                    <Star className="w-3 h-3" /> MOST POPULAR
                  </span>
                </div>
              )}
              
              {pkg.premium && (
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 animate-pulse" />
              )}

              <div className={`p-5 ${pkg.popular ? 'pt-8' : ''} relative`}>
                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{pkg.icon}</span>
                  <div>
                    <h3 className="text-white font-bold text-lg">{pkg.name}</h3>
                    <p className="text-white/70 text-xs">One-time purchase</p>
                  </div>
                </div>

                {/* Denarii Amount */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{pkg.denarii.toLocaleString()}</span>
                    <span className="text-white/60">Denarii</span>
                  </div>
                  
                  {pkg.bonus > 0 && (
                    <div className="space-y-1">
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 animate-pulse w-full justify-center">
                        <Sparkles className="w-3 h-3 mr-1" />
                        +{pkg.bonusPercent}% BONUS ({pkg.bonus.toLocaleString()})
                      </Badge>
                      <p className="text-xs text-green-300/80 text-center font-semibold">{pkg.value}</p>
                      {pkg.futureValue && (
                        <p className="text-xs text-purple-300/80 text-center">📈 {pkg.futureValue}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Value per denarii */}
                <p className="text-white/60 text-xs text-center mb-3">
                  ${(pkg.usdPerDenarii * 100).toFixed(3)}/100 Denarii
                </p>

                {/* Price */}
                <Button 
                  className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 font-bold"
                  disabled={isProcessing && selectedPackage === pkg.id}
                >
                  {isProcessing && selectedPackage === pkg.id ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `$${pkg.price.toFixed(2)}`
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-r from-amber-900/30 to-stone-900/30 rounded-xl p-5 border border-amber-600/20">
        <h4 className="text-amber-100 font-semibold mb-3 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          Why Purchase Denarii?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-2">
            <Gift className="w-4 h-4 text-pink-400 mt-0.5" />
            <p className="text-amber-200/80 text-sm">Send stunning animated gifts to your favorite creators</p>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-green-400 mt-0.5" />
            <p className="text-amber-200/80 text-sm">Climb VIP ranks for exclusive badges and perks</p>
          </div>
          <div className="flex items-start gap-2">
            <Star className="w-4 h-4 text-amber-400 mt-0.5" />
            <p className="text-amber-200/80 text-sm">Influence PK battles and stand out in chat</p>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-amber-600/20">
        <div className="flex items-center gap-2 text-amber-400/60 text-xs">
          <Lock className="w-4 h-4" />
          <span>Secure Payment</span>
        </div>
        <div className="flex items-center gap-2 text-amber-400/60 text-xs">
          <Shield className="w-4 h-4" />
          <span>Stripe Protected</span>
        </div>
        <div className="flex items-center gap-2 text-amber-400/60 text-xs">
          <Check className="w-4 h-4" />
          <span>Instant Delivery</span>
        </div>
      </div>
    </div>
  );
}