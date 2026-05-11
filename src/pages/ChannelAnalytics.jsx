import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, TrendingUp, Gift, Users, Eye, DollarSign, Zap, Crown } from 'lucide-react';

const COLORS = ["#f5a623","#e63946","#8b5cf6","#10b981","#3b82f6","#ec4899"];

function StatCard({ icon: Icon, label, value, sub, color = "#f5a623" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: "rgba(17,17,28,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.50)", fontFamily: "DM Sans, sans-serif" }}>{label}</span>
      </div>
      <p className="text-white font-black text-xl leading-none" style={{ fontFamily: "Syne, sans-serif" }}>{value}</p>
      {sub && <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{sub}</p>}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "rgba(13,13,20,0.95)", border: "1px solid rgba(245,166,35,0.25)" }}>
      <p className="text-amber-400 text-xs font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white text-xs">{p.name}: <span style={{ color: p.color }}>{p.value?.toLocaleString()}</span></p>
      ))}
    </div>
  );
};

export default function ChannelAnalytics() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('7d');

  const { data: creator } = useQuery({
    queryKey: ['my-creator'],
    queryFn: async () => {
      const me = await base44.auth.me();
      const creators = await base44.entities.Creator.filter({ user_email: me.email }, null, 1);
      return creators[0] || null;
    },
  });

  const { data: streams = [] } = useQuery({
    queryKey: ['creator-streams', creator?.id, period],
    queryFn: () => base44.entities.Stream.filter(
      { creator_id: creator?.id, platform_type: "legion_live" },
      '-created_date',
      period === "7d" ? 7 : period === "30d" ? 30 : 90
    ),
    enabled: !!creator?.id,
  });

  const { data: giftTxns = [] } = useQuery({
    queryKey: ['creator-gifts', creator?.id, period],
    queryFn: () => base44.entities.GiftTransaction.filter(
      { creator_id: creator?.id },
      '-created_date',
      200
    ),
    enabled: !!creator?.id,
  });

  // ── Derived metrics ──────────────────────────────────────────────────
  const totalEarnings   = giftTxns.reduce((s, t) => s + (t.creator_cut_denarii || 0), 0);
  const totalViewers    = streams.reduce((s, st) => s + (st.viewer_count || 0), 0);
  const avgViewers      = streams.length ? Math.round(totalViewers / streams.length) : 0;
  const totalStreams     = streams.length;
  const peakViewers     = Math.max(...streams.map(s => s.viewer_count || 0), 0);

  // Earnings per stream chart data
  const earningsData = streams.slice(0, 14).reverse().map((s, i) => ({
    name:     `S${i + 1}`,
    earnings: giftTxns
      .filter(t => t.stream_id === s.id)
      .reduce((sum, t) => sum + (t.creator_cut_denarii || 0), 0),
    viewers:  s.viewer_count || 0,
  }));

  // Gift by hour of day (24-hour heatmap)
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    hour:  `${h}:00`,
    gifts: giftTxns.filter(t => new Date(t.created_date).getHours() === h).length,
  }));

  // Top gifters
  const gifterMap = {};
  giftTxns.forEach(t => {
    if (!t.sender_email) return;
    gifterMap[t.sender_email] = (gifterMap[t.sender_email] || { name: t.sender_name || t.sender_email, total: 0 });
    gifterMap[t.sender_email].total += t.amount_denarii || 0;
  });
  const topGifters = Object.values(gifterMap).sort((a, b) => b.total - a.total).slice(0, 5);

  // Peak hour insight
  const peakHour = hourData.reduce((best, h) => h.gifts > best.gifts ? h : best, hourData[0] || { hour: "N/A", gifts: 0 });

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--ll-void, #050508)" }}>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3" style={{ background: "rgba(5,5,8,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div>
            <h1 className="text-white font-black text-lg leading-none" style={{ fontFamily: "Syne, sans-serif" }}>Channel Analytics</h1>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{creator?.display_name || "Your channel"}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">

        {/* Period selector */}
        <div className="flex gap-2">
          {[["7d","7 Days"],["30d","30 Days"],["90d","90 Days"]].map(([val, label]) => (
            <button key={val} onClick={() => setPeriod(val)}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                background:   period === val ? "#f5a623" : "rgba(255,255,255,0.06)",
                color:        period === val ? "#000" : "rgba(255,255,255,0.55)",
                boxShadow:    period === val ? "0 0 12px rgba(245,166,35,0.30)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={DollarSign} label="Denarii Earned"  value={totalEarnings.toLocaleString() + " ◆"} sub="Creator cut"      color="#f5a623" />
          <StatCard icon={Eye}        label="Total Viewers"   value={totalViewers.toLocaleString()}              sub={`Avg ${avgViewers}/stream`} color="#3b82f6" />
          <StatCard icon={TrendingUp} label="Peak Viewers"    value={peakViewers.toLocaleString()}               sub="Single stream"   color="#10b981" />
          <StatCard icon={Users}      label="Streams"         value={totalStreams.toString()}                     sub={`Last ${period}`} color="#ec4899" />
        </div>

        {/* Earnings per stream chart */}
        {earningsData.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(17,17,28,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="text-white font-bold text-sm mb-4" style={{ fontFamily: "Syne, sans-serif" }}>Earnings Per Stream</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={earningsData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="earnings" name="Denarii" fill="#f5a623" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gift activity by hour */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(17,17,28,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-sm" style={{ fontFamily: "Syne, sans-serif" }}>Gift Activity by Hour</h2>
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "#10b981" }}>
              <Zap className="w-3 h-3" />
              Peak: {peakHour.hour}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={hourData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 8 }} interval={3} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="gifts" name="Gifts" stroke="#e63946" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top gifters */}
        {topGifters.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(17,17,28,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2" style={{ fontFamily: "Syne, sans-serif" }}>
              <Crown className="w-4 h-4 text-amber-400" />
              Top Supporters
            </h2>
            {topGifters.map((g, i) => (
              <div key={g.name} className="flex items-center gap-3 mb-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-black shrink-0"
                  style={{ backgroundColor: i === 0 ? "#f5a623" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "rgba(255,255,255,0.10)", color: i < 3 ? "#000" : "rgba(255,255,255,0.6)" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{g.name}</p>
                  <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round((g.total / (topGifters[0]?.total || 1)) * 100)}%`, background: "linear-gradient(90deg,#f5a623,#e07b0e)" }}
                    />
                  </div>
                </div>
                <span className="text-amber-400 text-xs font-bold shrink-0 ll-mono">{g.total.toLocaleString()} ◆</span>
              </div>
            ))}
          </div>
        )}

        {/* Insight card */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(245,166,35,0.10) 0%, rgba(245,166,35,0.04) 100%)", border: "1px solid rgba(245,166,35,0.20)" }}>
          <h3 className="text-amber-400 font-bold text-sm mb-2" style={{ fontFamily: "Syne, sans-serif" }}>⚡ AI Insight</h3>
          <p className="text-white/70 text-xs leading-relaxed">
            {totalEarnings > 0
              ? `Your peak gifting hour is ${peakHour.hour}. Stream at this time to maximise earnings. Your top supporter has gifted ${topGifters[0]?.total?.toLocaleString() || 0} Denarii — acknowledge them by name when they join.`
              : "Start streaming to unlock AI-powered insights about your audience and earnings patterns."
            }
          </p>
        </div>
      </div>
    </div>
  );
}