import React, { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Crown, Star, Shield, Gift, TrendingUp, Lock, Loader2, Zap, Coins, Trophy, Flame, Check } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

// ── Pricing Philosophy ──────────────────────────────────────────────────────
// Single rate:    180 Denarii = $1 USD  (purchase and earnings base)
// Creators earn:  60% of face value = $0.60 per $1 gifted
// Platform keeps: 40%
// Bonuses:        Scale from 10% → 35% (35% on all packs $100+)
// Top pack:       $999.99
// ─────────────────────────────────────────────────────────────────────────────
export const DENARII_PER_DOLLAR = 180;        // unified rate for purchase and earnings
export const PURCHASE_RATE = 180;             // Denarii buyers receive per $1 before bonus
export const CREATOR_SHARE = 0.60;            // 60% of face value goes to creator

export const packages = [
  {
    // $0.99 → 178 base + 10%
    id: 'micro',
    name: 'Rookie Pack',
    denarii: 178,
    bonus: 18,
    bonusPercent: 10,
    price: 0.99,
    vipPoints: 15,
    icon: '🪙',
    popular: false,
    color: 'from-slate-700 to-slate-800',
    border: 'border-slate-500/40',
    tag: null,
    perks: ['+10% bonus Denarii', '+15 VIP points']
  },
  {
    // $4.99 → 898 base + 12%
    id: 'starter',
    name: 'Recruit Pack',
    denarii: 898,
    bonus: 108,
    bonusPercent: 12,
    price: 4.99,
    vipPoints: 75,
    icon: '💰',
    popular: false,
    color: 'from-emerald-700 to-emerald-900',
    border: 'border-emerald-500/40',
    tag: null,
    perks: ['+12% bonus Denarii', '+75 VIP points']
  },
  {
    // $9.99 → 1,798 base + 15%
    id: 'basic',
    name: 'Soldier Pack',
    denarii: 1798,
    bonus: 270,
    bonusPercent: 15,
    price: 9.99,
    vipPoints: 160,
    icon: '⚔️',
    popular: false,
    color: 'from-blue-700 to-blue-900',
    border: 'border-blue-500/40',
    tag: null,
    perks: ['+15% bonus', '+160 VIP pts', '1 lotto ticket']
  },
  {
    // $19.99 → 3,598 base + 20%
    id: 'popular',
    name: 'Centurion Pack',
    denarii: 3598,
    bonus: 720,
    bonusPercent: 20,
    price: 19.99,
    vipPoints: 350,
    icon: '🏛️',
    popular: true,
    color: 'from-amber-600 to-orange-700',
    border: 'border-amber-400',
    tag: 'MOST POPULAR',
    perks: ['+20% bonus', '+350 VIP pts', '3 lotto tickets', 'VIP1 fast track']
  },
  {
    // $49.99 → 8,998 base + 25%
    id: 'premium',
    name: 'Praetorian Pack',
    denarii: 8998,
    bonus: 2250,
    bonusPercent: 25,
    price: 49.99,
    vipPoints: 850,
    icon: '🏆',
    popular: false,
    color: 'from-purple-700 to-violet-900',
    border: 'border-purple-400/60',
    tag: null,
    perks: ['+25% bonus', '+850 VIP pts', '6 lotto tickets', 'VIP badge']
  },
  {
    // $99.99 → 17,998 base + 30%
    id: 'elite',
    name: 'Senator Pack',
    denarii: 17998,
    bonus: 5400,
    bonusPercent: 30,
    price: 99.99,
    vipPoints: 1800,
    icon: '👑',
    popular: false,
    color: 'from-rose-600 to-rose-900',
    border: 'border-rose-400/50',
    tag: 'GREAT VALUE',
    perks: ['+30% bonus', '+1800 VIP pts', '12 lotto tickets', 'SVIP fast track']
  },
  {
    // $149.99 → 26,998 base + 35%
    id: 'whale',
    name: 'Consul Pack',
    denarii: 26998,
    bonus: 9450,
    bonusPercent: 35,
    price: 149.99,
    vipPoints: 3000,
    icon: '🦅',
    popular: false,
    color: 'from-cyan-600 to-teal-800',
    border: 'border-cyan-400/50',
    tag: null,
    premium: true,
    whale: true,
    perks: ['+35% MEGA bonus', '+3000 VIP pts', '20 lotto tickets', 'SVIP badge']
  },
  {
    // $299.99 → 53,998 base + 35%
    id: 'ultimate',
    name: 'Imperator Pack',
    denarii: 53998,
    bonus: 18900,
    bonusPercent: 35,
    price: 299.99,
    vipPoints: 7000,
    icon: '✨',
    popular: false,
    color: 'from-amber-500 via-rose-500 to-purple-600',
    border: 'border-amber-300',
    tag: 'LEGENDARY',
    premium: true,
    whale: true,
    perks: ['+35% LEGENDARY bonus', '+7000 VIP pts', '40 lotto tickets', 'DIVINE badge']
  },
  {
    // $499.99 → 89,998 base + 35%
    id: 'titan',
    name: 'Triumvir Pack',
    denarii: 89998,
    bonus: 31500,
    bonusPercent: 35,
    price: 499.99,
    vipPoints: 14000,
    icon: '🔱',
    popular: false,
    color: 'from-orange-500 via-yellow-500 to-amber-600',
    border: 'border-orange-300',
    tag: '🔱 TITAN',
    premium: true,
    whale: true,
    perks: ['+35% TITAN bonus', '+14K VIP pts', '80 lotto tickets', 'Emperor crown']
  },
  {
    // $999.99 → 179,998 base + 35%
    id: 'emperor',
    name: "Emperor's Ascension",
    denarii: 179998,
    bonus: 63000,
    bonusPercent: 35,
    price: 999.99,
    vipPoints: 32000,
    icon: '⚡',
    popular: false,
    color: 'from-yellow-400 via-red-500 to-pink-600',
    border: 'border-yellow-300',
    tag: '⚡ DIVINE',
    premium: true,
    whale: true,
    perks: ['+35% DIVINE bonus', '+32K VIP pts', '200 lotto tickets', 'Divine Emperor status']
  }
];

// VIP tier definitions — mirrors BigO Live SVIP/VIP system
export const VIP_TIERS = [
  { level: 0,  name: 'Bronze',    minPoints: 0,      icon: '🪙', color: 'text-stone-400',  bgColor: 'bg-stone-500/20',  perks: ['Basic chat'] },
  { level: 1,  name: 'VIP 1',    minPoints: 500,    icon: '⭐', color: 'text-blue-400',   bgColor: 'bg-blue-500/20',   perks: ['Blue VIP badge', 'Chat highlight'] },
  { level: 2,  name: 'VIP 2',    minPoints: 1500,   icon: '🌟', color: 'text-blue-300',   bgColor: 'bg-blue-400/20',   perks: ['Priority chat', 'Exclusive emotes'] },
  { level: 3,  name: 'VIP 3',    minPoints: 4000,   icon: '💎', color: 'text-purple-400', bgColor: 'bg-purple-500/20', perks: ['Purple VIP badge', 'Skip queue', '2x lotto entries'] },
  { level: 4,  name: 'SVIP 1',   minPoints: 10000,  icon: '👑', color: 'text-amber-400',  bgColor: 'bg-amber-500/20',  perks: ['Gold SVIP crown', 'Creator DM access', '3x lotto'] },
  { level: 5,  name: 'SVIP 2',   minPoints: 25000,  icon: '🔱', color: 'text-amber-300',  bgColor: 'bg-amber-400/25',  perks: ['Animated entry banner', '5x lotto', 'Custom badge'] },
  { level: 6,  name: 'SVIP 3',   minPoints: 60000,  icon: '🏅', color: 'text-orange-400', bgColor: 'bg-orange-500/20', perks: ['Nameplate effects', '10x lotto', 'Monthly bonus coins'] },
  { level: 7,  name: 'SVIP 4',   minPoints: 150000, icon: '🌠', color: 'text-rose-400',   bgColor: 'bg-rose-500/20',   perks: ['Rose diamond badge', '20x lotto', 'Private creator events'] },
  { level: 8,  name: 'DIVINE',   minPoints: 500000, icon: '⚡', color: 'text-yellow-300', bgColor: 'bg-yellow-400/20', perks: ['Divine aura', 'Unlimited lotto', 'Platform co-host status'] },
];

export function getVipTier(points) {
  let tier = VIP_TIERS[0];
  for (const t of VIP_TIERS) {
    if (points >= t.minPoints) tier = t;
  }
  return tier;
}

export function getNextVipTier(points) {
  for (const t of VIP_TIERS) {
    if (points < t.minPoints) return t;
  }
  return null;
}

export default function CurrencyPackages({ onPurchase, isProcessing }) {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showVipInfo, setShowVipInfo] = useState(false);
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, []);

  const handlePurchase = (pkg) => {
    setSelectedPackage(pkg.id);
    onPurchase(pkg);
  };

  return (
    <div className="space-y-5">
      {/* VIP Points Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-900/60 via-orange-900/60 to-rose-900/60 border border-amber-500/30 p-4 cursor-pointer"
        onClick={() => setShowVipInfo(!showVipInfo)}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-rose-500/5 pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-amber-500/40">
              👑
            </div>
            <div>
              <p className="text-amber-200 font-bold text-sm">VIP & SVIP Rewards System</p>
              <p className="text-amber-400/70 text-xs">Every purchase earns VIP points → unlock exclusive perks</p>
            </div>
          </div>
          <Zap className={`w-5 h-5 text-amber-400 transition-transform ${showVipInfo ? 'rotate-180' : ''}`} />
        </div>

        <AnimatePresence>
          {showVipInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 grid grid-cols-3 gap-2"
            >
              {VIP_TIERS.slice(0, 6).map(tier => (
                <div key={tier.level} className={`rounded-xl p-2 ${tier.bgColor} border border-white/10`}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-base">{tier.icon}</span>
                    <span className={`text-xs font-bold ${tier.color}`}>{tier.name}</span>
                  </div>
                  <p className="text-white/50 text-[10px]">{tier.minPoints.toLocaleString()} pts</p>
                  <p className="text-white/70 text-[10px] mt-0.5">{tier.perks[0]}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Exchange rate */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-4 bg-white/5 rounded-full px-6 py-2 border border-white/10">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="text-base">🪙</span>
            <span>260 Denarii = $1 spent</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="text-base">🎁</span>
            <span>Creators earn 60%</span>
          </div>
        </div>
        <p className="text-white/40 text-xs flex items-center gap-1">
          <Flame className="w-3 h-3 text-amber-400" />
          180 Denarii = $1 internal rate · Creators earn 60% · VIP points on every purchase
        </p>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={isMobile ? {} : { y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handlePurchase(pkg)}
            className="cursor-pointer"
          >
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${pkg.color} 
              ${pkg.popular ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black shadow-2xl shadow-amber-500/40' : 'shadow-xl'}
              border ${pkg.border} transition-all duration-300`}
            >
              {pkg.tag && (
                <div className={`absolute top-0 left-0 right-0 text-center py-1.5 ${
                  pkg.tag === '⚡ DIVINE' ? 'bg-gradient-to-r from-yellow-500 to-pink-500' :
                  pkg.tag === 'LEGENDARY' ? 'bg-gradient-to-r from-amber-500 to-purple-600' :
                  pkg.tag === 'GREAT VALUE' ? 'bg-gradient-to-r from-rose-500 to-rose-700' :
                  pkg.tag === 'MOST POPULAR' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-white/10'
                }`}>
                  <span className="text-xs font-black text-white flex items-center justify-center gap-1.5">
                    <Star className="w-3 h-3" /> {pkg.tag}
                  </span>
                </div>
              )}

              {pkg.premium && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10"
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              )}

              <div className={`p-4 ${pkg.tag ? 'pt-9' : ''} relative`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <motion.span
                      className="text-3xl drop-shadow-lg"
                      animate={pkg.premium ? { rotate: [0, 5, -5, 0] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {pkg.icon}
                    </motion.span>
                    <div>
                      <h3 className="text-white font-bold text-sm leading-tight">{pkg.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Coins className="w-3 h-3 text-amber-300" />
                        <span className="text-amber-300 text-xs font-semibold">+{pkg.vipPoints} VIP pts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Denarii amount */}
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-2xl font-black text-white">{(pkg.denarii + pkg.bonus).toLocaleString()}</span>
                  <span className="text-white/50 text-xs">Denarii total</span>
                </div>

                {pkg.bonus > 0 && (
                  <motion.div
                    className="inline-flex items-center gap-1 bg-green-500/25 text-green-200 border border-green-400/30 rounded-full px-2 py-0.5 text-[10px] font-bold mb-3"
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {pkg.denarii.toLocaleString()} + {pkg.bonus.toLocaleString()} FREE ({pkg.bonusPercent}%)
                  </motion.div>
                )}

                {/* Perks */}
                <div className="space-y-0.5 mb-3">
                  {pkg.perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-green-400 shrink-0" />
                      <span className="text-white/60 text-[11px]">{perk}</span>
                    </div>
                  ))}
                </div>

                <motion.button
                  className="w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/25 font-black text-lg transition-all"
                  disabled={isProcessing && selectedPackage === pkg.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isProcessing && selectedPackage === pkg.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-base">Processing...</span>
                    </div>
                  ) : (
                    `$${pkg.price.toFixed(2)}`
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lotto info callout */}
      <GlassCard padding="p-4" animate={false} glowColor="amber">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🎟️</div>
          <div>
            <p className="text-amber-200 font-bold text-sm mb-1">Live Stream Lotto — Every Pack Includes Tickets</p>
            <p className="text-white/50 text-xs leading-relaxed">
              Lotto tickets are automatically entered into active stream lottos. Win Denarii, exclusive badges, and creator shoutouts.
              VIP3+ members get 2× entries. SVIP1+ get 3× entries per ticket purchased.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Legal + Trust */}
      <GlassCard padding="p-4" animate={false}>
        <div className="flex items-start gap-3 mb-3">
          <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-white/50 text-xs leading-relaxed">
            Denarii are virtual currency for use within Legion Live only. All purchases are final and non-refundable.
            Must be 18+ or have parental consent. By purchasing you agree to our Terms of Service.
          </p>
        </div>
        <div className="flex items-center justify-center gap-8">
          {[
            { icon: Lock, text: 'Secure Payment' },
            { icon: Shield, text: 'Stripe Protected' },
            { icon: Sparkles, text: 'Instant Delivery' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-white/40 text-xs">
              <item.icon className="w-3.5 h-3.5" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}