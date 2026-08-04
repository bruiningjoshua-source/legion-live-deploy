import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Crown, Shield, Lock, Loader2, Zap } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

// ── Pricing Philosophy ──────────────────────────────────────────────────────
// Single rate:    180 Denarii = $1 USD (canonical, matches constants.js)
// Creators earn:  60% of gift face value
// Platform keeps: 40%
// Bonuses:        Scale from 10% → 35% (35% on all packs $100+)
// Top pack:       $999.99
// ─────────────────────────────────────────────────────────────────────────────
export const DENARII_PER_DOLLAR = 180;        // unified rate: 180 Denarii = $1 USD (matches constants.js)
export const PURCHASE_RATE = 180;             // Denarii buyers receive per $1 before bonus
export const CREATOR_SHARE = 0.60;            // 60% of gift face value goes to creator (matches constants.js)

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
  const [selectedTier, setSelectedTier] = useState('popular');
  const [showVipInfo, setShowVipInfo] = useState(false);
  const [showWhale, setShowWhale] = useState(false);
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, []);

  const visiblePackages = showWhale ? packages : packages.filter(p => !p.whale);

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

      {/* Support message */}
      <div className="flex items-center justify-center gap-2 bg-white/5 rounded-full px-6 py-2.5 border border-white/10">
        <span className="text-base">🪙</span>
        <span className="text-white/70 text-sm">Buy Denarii to support your favorite creators</span>
      </div>

      {/* Package Grid */}
      {/* Coin-tier grid — tap to select, purchase at bottom (clean layout) */}
      <div className="grid grid-cols-3 gap-2.5">
        {visiblePackages.map((pkg, index) => {
          const isSelected = selectedTier === pkg.id;
          const total = pkg.denarii + pkg.bonus;
          return (
            <motion.button
              key={pkg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedTier(pkg.id)}
              className="relative rounded-2xl overflow-hidden text-center transition-all"
              style={{
                background: isSelected ? 'rgba(200,135,26,0.10)' : 'rgba(255,255,255,0.03)',
                border: isSelected ? '2px solid #d99a2b' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isSelected ? '0 8px 28px rgba(200,135,26,0.25)' : 'none',
              }}
            >
              {pkg.tag && (
                <div className="absolute top-0 inset-x-0 py-0.5 text-[8px] font-black tracking-wide"
                  style={{ background: 'linear-gradient(90deg,#d99a2b,#b06f12)', color: '#1a1206' }}>
                  {pkg.tag}
                </div>
              )}
              <div className={`px-2 pt-5 pb-2 ${pkg.tag ? '' : 'pt-4'}`}>
                <div className="text-4xl mb-1 leading-none">{pkg.icon || '🪙'}</div>
                <div className="text-white font-black text-lg leading-none">{total.toLocaleString()}</div>
                {pkg.bonus > 0 && (
                  <div className="text-[9px] font-bold mt-0.5" style={{ color: '#5fd08a' }}>
                    +{pkg.bonus.toLocaleString()} free
                  </div>
                )}
              </div>
              {/* Price footer */}
              <div className="py-1.5 text-sm font-bold"
                style={{
                  background: isSelected ? 'linear-gradient(180deg,#f5c674,#d99a2b)' : 'rgba(0,0,0,0.25)',
                  color: isSelected ? '#1a1206' : 'rgba(255,255,255,0.85)',
                }}>
                ${pkg.price.toFixed(2)}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Terms line */}
      <p className="text-white/40 text-[11px] text-center leading-relaxed px-2">
        By continuing, you verify that you are at least 18 years old and agree to{' '}
        <Link to={createPageUrl('TermsOfService')} className="text-amber-400">these terms</Link> and{' '}
        <Link to={createPageUrl('PrivacyPolicy')} className="text-amber-400">Privacy Policy</Link>.
      </p>

      {/* Single purchase button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        disabled={!selectedTier || isProcessing}
        onClick={() => { const p = visiblePackages.find(x => x.id === selectedTier); if (p) handlePurchase(p); }}
        className="ll-btn ll-btn-primary w-full !h-14 !rounded-full text-lg disabled:opacity-40"
      >
        {isProcessing ? (
          <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing…</span>
        ) : selectedTier ? (
          `Purchase ${(() => { const p = visiblePackages.find(x => x.id === selectedTier); return p ? (p.denarii + p.bonus).toLocaleString() : ''; })()} Denarii`
        ) : (
          'Select a pack'
        )}
      </motion.button>

      {/* Whale packs toggle */}
      <motion.button
        onClick={() => setShowWhale(!showWhale)}
        className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 text-sm font-semibold transition-all flex items-center justify-center gap-2"
        whileTap={{ scale: 0.98 }}
      >
        <Crown className="w-4 h-4 text-amber-400" />
        {showWhale ? 'Hide Premium Packs' : 'Show Whale Packs ($149 – $999)'}
        <Zap className={`w-4 h-4 text-amber-400 transition-transform ${showWhale ? 'rotate-180' : ''}`} />
      </motion.button>

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