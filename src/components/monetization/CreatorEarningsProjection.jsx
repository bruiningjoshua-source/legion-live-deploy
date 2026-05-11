/**
 * CreatorEarningsProjection
 * ─────────────────────────
 * Shows a tiered pay chart of what creators can realistically expect at each
 * growth stage, starting from 20-30 gifters @ $20-30/mo and scaling to
 * platform-wide population benchmarks.
 *
 * Math basis:
 *   - 1 Denarii = $0.01 base value
 *   - Creator share: 50% of gift value
 *   - $1 USD ≈ 180 Denarii at purchase (package blended rate)
 *   - A viewer spending $25/mo buys ≈ 4,500 Denarii → gifts ≈ 4,500 Denarii
 *   - Creator receives 50% of gift value = 2,250 Denarii ≈ $22.50 per active gifter/mo
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TrendingUp, Users, ChevronDown, ChevronUp, Info } from 'lucide-react';

// ── Constants (keep in sync with CreatorPayoutSettings) ──
const CREATOR_SHARE   = 0.50;   // Platform: 50% / Creator: 50%
const DENARII_TO_USD  = 0.01;   // 1 Denarii = $0.01 base value
const DENARII_PER_USD = 180;    // Blended purchase-package rate

// Convert viewer monthly USD spend → creator monthly USD earnings
function creatorEarnings(viewers, avgMonthlySpendUSD) {
  const denariiBought = viewers * avgMonthlySpendUSD * DENARII_PER_USD;
  const creatorDenarii = denariiBought * CREATOR_SHARE;
  const creatorUSD = creatorDenarii * DENARII_TO_USD;
  return { creatorUSD, creatorDenarii: Math.round(creatorDenarii) };
}

// ── Tier definitions — realistic growth milestones ──
const TIERS = [
  {
    label: 'Launch',
    emoji: '🌱',
    viewers: 25,
    avgSpend: 22,
    description: 'Your first wave — friends, early supporters, niche community.',
    color: '#6ee7b7',      // emerald-300
    accent: 'emerald',
  },
  {
    label: 'Momentum',
    emoji: '🔥',
    viewers: 75,
    avgSpend: 24,
    description: 'Word spreads. Clips go viral. Loyal base forming.',
    color: '#fcd34d',      // amber-300
    accent: 'amber',
  },
  {
    label: 'Growth',
    emoji: '📈',
    viewers: 200,
    avgSpend: 26,
    description: 'You\'re consistent. Algorithm rewards you. New subs every week.',
    color: '#93c5fd',      // blue-300
    accent: 'blue',
  },
  {
    label: 'Rising',
    emoji: '⚡',
    viewers: 600,
    avgSpend: 27,
    description: 'Featured on Explore. Collabs incoming. Revenue enables reinvestment.',
    color: '#c4b5fd',      // violet-300
    accent: 'violet',
  },
  {
    label: 'Established',
    emoji: '👑',
    viewers: 1500,
    avgSpend: 28,
    description: 'Brand deals. Podcast listeners. Recognizable name in the space.',
    color: '#fb923c',      // orange-400
    accent: 'orange',
  },
  {
    label: 'Elite',
    emoji: '🏆',
    viewers: 5000,
    avgSpend: 30,
    description: 'Top-tier creator. Multiple income streams. Full-time operation.',
    color: '#f472b6',      // pink-400
    accent: 'pink',
  },
  {
    label: 'Legend',
    emoji: '🌟',
    viewers: 15000,
    avgSpend: 30,
    description: 'Platform centrepiece. Event headliner. Generational brand.',
    color: '#fbbf24',      // amber-400
    accent: 'amber',
  },
];

// ── Custom recharts tooltip ──
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-sm min-w-[200px]">
      <p className="text-white font-bold mb-2">{d?.emoji} {label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-white/40">Active Gifters</span>
          <span className="text-white font-semibold">{d?.viewers?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-white/40">Avg Spend</span>
          <span className="text-white font-semibold">${d?.avgSpend}/mo</span>
        </div>
        <div className="border-t border-white/10 my-2" />
        <div className="flex justify-between gap-6">
          <span className="text-amber-400/80">Creator Earnings</span>
          <span className="text-amber-300 font-black">${d?.creatorUSD?.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-white/30">In Denarii</span>
          <span className="text-white/60 font-semibold">{d?.creatorDenarii?.toLocaleString()} 🪙</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-white/30">Annual Est.</span>
          <span className="text-green-400 font-bold">${(d?.creatorUSD * 12)?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
    </div>
  );
}

export default function CreatorEarningsProjection() {
  const [expanded, setExpanded] = useState(false);

  const chartData = useMemo(() =>
    TIERS.map(t => {
      const { creatorUSD, creatorDenarii } = creatorEarnings(t.viewers, t.avgSpend);
      return {
        label:        t.label,
        emoji:        t.emoji,
        viewers:      t.viewers,
        avgSpend:     t.avgSpend,
        creatorUSD:   Math.round(creatorUSD),
        creatorDenarii,
        color:        t.color,
      };
    }),
    []
  );

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">Creator Earnings Projection</h3>
            <p className="text-white/40 text-xs">50% creator share · Based on real platform economics</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Area Chart ── */}
      <div className="px-4 pt-6 pb-2">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
            <ReferenceLine y={1000} stroke="rgba(245,158,11,0.2)" strokeDasharray="4 4" label={{ value: '$1k/mo', fill: 'rgba(245,158,11,0.4)', fontSize: 10 }} />
            <Area
              type="monotone"
              dataKey="creatorUSD"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fill="url(#earningsGrad)"
              dot={{ fill: '#f59e0b', r: 4, strokeWidth: 0 }}
              activeDot={{ fill: '#fbbf24', r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tier Cards ── */}
      <div className="px-4 pb-4">
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${expanded ? '' : 'hidden sm:grid'}`}>
          {TIERS.slice(0, expanded ? 7 : 4).map((tier, i) => {
            const { creatorUSD, creatorDenarii } = creatorEarnings(tier.viewers, tier.avgSpend);
            return (
              <motion.div
                key={tier.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl">{tier.emoji}</span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ color: tier.color, backgroundColor: `${tier.color}18`, border: `1px solid ${tier.color}30` }}>
                    {tier.label}
                  </span>
                </div>
                <div className="mb-2">
                  <p className="text-white font-black text-2xl leading-none">
                    ${Math.round(creatorUSD).toLocaleString()}
                    <span className="text-white/30 text-sm font-normal">/mo</span>
                  </p>
                  <p className="text-white/40 text-xs mt-1">{creatorDenarii.toLocaleString()} 🪙 Denarii</p>
                </div>
                <div className="text-white/30 text-xs space-y-0.5">
                  <div className="flex gap-1"><Users className="w-3 h-3 mt-0.5" />{tier.viewers.toLocaleString()} gifters @ ${tier.avgSpend}/mo</div>
                </div>
                <p className="text-white/25 text-[10px] mt-2 leading-relaxed">{tier.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile collapsed fallback — always show first 2 */}
        <div className={`grid grid-cols-2 gap-3 sm:hidden ${expanded ? 'hidden' : ''}`}>
          {TIERS.slice(0, 2).map((tier) => {
            const { creatorUSD } = creatorEarnings(tier.viewers, tier.avgSpend);
            return (
              <div key={tier.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                <p className="text-lg mb-1">{tier.emoji}</p>
                <p className="text-white font-black text-xl">${Math.round(creatorUSD).toLocaleString()}</p>
                <p className="text-white/40 text-[10px]">{tier.viewers} gifters</p>
                <p className="text-white/30 text-[10px]">{tier.label}</p>
              </div>
            );
          })}
        </div>

        {/* Expand toggle for mobile */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="sm:hidden w-full mt-3 py-2.5 text-white/40 hover:text-white text-sm flex items-center justify-center gap-1.5 transition-colors"
        >
          {expanded ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> Show All Tiers</>}
        </button>
      </div>

      {/* ── Methodology note ── */}
      <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.05] flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-white/25 mt-0.5 flex-shrink-0" />
        <p className="text-white/25 text-[10px] leading-relaxed">
          Projections assume gifters spend their budgeted amount monthly. Creator receives 50% of all gift value. 
          Denarii-to-USD: 1 Denarii = $0.01 · Platform rate: $1 USD ≈ 180 Denarii purchased.
          Actual earnings depend on stream consistency, content quality, and community engagement.
        </p>
      </div>
    </div>
  );
}