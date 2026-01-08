import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Sparkles, Crown, Star, Zap, Shield, Check } from 'lucide-react';

const packages = [
  {
    id: 'starter',
    name: 'Recruit\'s Pouch',
    denarii: 1000,
    bonus: 0,
    price: 1.00,
    icon: '🪙',
    popular: false,
    color: 'from-stone-600 to-stone-700',
    border: 'border-stone-500'
  },
  {
    id: 'basic',
    name: 'Soldier\'s Chest',
    denarii: 5500,
    bonus: 500,
    price: 5.00,
    icon: '💰',
    popular: false,
    color: 'from-green-700 to-green-800',
    border: 'border-green-500'
  },
  {
    id: 'popular',
    name: 'Centurion\'s Treasury',
    denarii: 12000,
    bonus: 2000,
    price: 10.00,
    icon: '⚔️',
    popular: true,
    color: 'from-amber-600 to-amber-700',
    border: 'border-amber-400'
  },
  {
    id: 'premium',
    name: 'Praetor\'s Vault',
    denarii: 30000,
    bonus: 5000,
    price: 25.00,
    icon: '🏛️',
    popular: false,
    color: 'from-purple-700 to-purple-800',
    border: 'border-purple-500'
  },
  {
    id: 'elite',
    name: 'Senator\'s Fortune',
    denarii: 65000,
    bonus: 15000,
    price: 50.00,
    icon: '👑',
    popular: false,
    color: 'from-rose-600 to-rose-700',
    border: 'border-rose-400'
  },
  {
    id: 'ultimate',
    name: 'Emperor\'s Legacy',
    denarii: 150000,
    bonus: 50000,
    price: 100.00,
    icon: '✨',
    popular: false,
    color: 'from-amber-500 via-rose-500 to-purple-600',
    border: 'border-amber-300',
    premium: true
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
      <div className="bg-stone-800/50 rounded-xl p-4 border border-amber-600/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-100 font-medium mb-1">Secure Digital Purchases</p>
            <p className="text-amber-300/70 text-xs">
              Denarii are virtual currency for use within Legion Live only. All purchases are final. 
              By purchasing, you agree to our Terms of Service. Must be 18+ or have parental consent.
              Denarii have no real-world value and cannot be exchanged for real currency.
            </p>
          </div>
        </div>
      </div>

      {/* Currency Exchange Info */}
      <div className="flex items-center justify-center gap-6 text-sm text-amber-300/80">
        <div className="flex items-center gap-2">
          <span className="text-lg">🪙</span>
          <span>1 Denarii = 100 As</span>
        </div>
        <div className="w-px h-4 bg-amber-600/30" />
        <div className="flex items-center gap-2">
          <span className="text-lg">🥈</span>
          <span>1 Sestertius = 4 As</span>
        </div>
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
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      <Sparkles className="w-3 h-3 mr-1" />
                      +{pkg.bonus.toLocaleString()} BONUS
                    </Badge>
                  )}
                </div>

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
            <Check className="w-4 h-4 text-green-400 mt-0.5" />
            <p className="text-amber-200/80 text-sm">Support your favorite creators with amazing animated gifts</p>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-400 mt-0.5" />
            <p className="text-amber-200/80 text-sm">Unlock VIP badges and exclusive chat privileges</p>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-400 mt-0.5" />
            <p className="text-amber-200/80 text-sm">Influence PK battles and make your presence known</p>
          </div>
        </div>
      </div>
    </div>
  );
}