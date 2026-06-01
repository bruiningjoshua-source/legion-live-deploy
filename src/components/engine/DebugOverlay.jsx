/**
 * DebugOverlay — Hidden developer diagnostics panel.
 * Toggle with triple-tap on FPS badge or console: window.__legionDebug()
 * Shows: FPS, memory, GPU budget, stream health, tier, dropped frames.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PerfMonitor from '@/components/engine/PerformanceMonitor';
import AdaptiveQuality from '@/components/engine/AdaptiveQuality';
import EffectBudget from '@/components/engine/EffectBudget';
import StreamHealth from '@/components/engine/StreamHealthMonitor';
import Disposer from '@/components/engine/ResourceDisposer';

export default function DebugOverlay() {
  const [visible, setVisible] = useState(false);
  const [perf, setPerf] = useState(null);
  const [health, setHealth] = useState(null);
  const [tier, setTier] = useState(AdaptiveQuality.getTier());
  const [budget, setBudget] = useState({ usage: 0, budget: 10 });

  // Global toggle
  useEffect(() => {
    window.__legionDebug = () => setVisible(v => !v);
    return () => { delete window.__legionDebug; };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const unsub1 = PerfMonitor.onUpdate(snap => setPerf(snap));
    const unsub2 = AdaptiveQuality.onChange((t) => setTier(t));
    const unsub3 = EffectBudget.onChange(state => setBudget(state));
    const unsub4 = StreamHealth.onUpdate(() => setHealth(StreamHealth.getHealth()));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [visible]);

  if (!visible) return null;

  const tierColor = {
    ultra: '#a78bfa', high: '#34d399', medium: '#fbbf24', low: '#f97316', battery_saver: '#ef4444',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed top-16 right-2 z-[9999] w-64 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 text-[10px] font-mono text-white/80 space-y-2 pointer-events-auto"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="text-amber-400 font-bold text-xs">LEGION DEBUG</span>
        <button onClick={() => setVisible(false)} className="text-white/40 hover:text-white">✕</button>
      </div>

      {/* Performance */}
      <div className="space-y-0.5">
        <div className="text-white/40 uppercase tracking-wider">Performance</div>
        <Row label="FPS" value={perf?.fps ?? '-'} warn={perf?.fps < 25} />
        <Row label="Avg FPS" value={perf?.avgFps ?? '-'} warn={perf?.avgFps < 25} />
        <Row label="Memory" value={`${perf?.memoryMB ?? '-'} MB`} warn={perf?.memoryMB > 500} />
        <Row label="Peak Mem" value={`${perf?.peakMemoryMB ?? '-'} MB`} />
        <Row label="Dropped" value={perf?.droppedFrames ?? 0} warn={perf?.droppedFrames > 20} />
        <Row label="Jank" value={perf?.jankFrames ?? 0} />
        <Row label="Uptime" value={`${perf?.uptimeMinutes ?? 0} min`} />
      </div>

      {/* Quality Tier */}
      <div className="space-y-0.5">
        <div className="text-white/40 uppercase tracking-wider">Quality</div>
        <div className="flex items-center gap-2">
          <span className="text-white/60">Tier:</span>
          <span className="font-bold" style={{ color: tierColor[tier] || '#fff' }}>{tier.toUpperCase()}</span>
        </div>
        <Row label="Effects" value={`${budget.usage}/${budget.budget}`} warn={budget.usage >= budget.budget} />
      </div>

      {/* Stream Health */}
      {health && (
        <div className="space-y-0.5">
          <div className="text-white/40 uppercase tracking-wider">Stream</div>
          <Row label="Health" value={`${health.score}/100`} warn={health.score < 60} />
          <Row label="Status" value={health.status} warn={health.status === 'poor'} />
          <Row label="Frozen" value={health.frozen ? 'YES' : 'No'} warn={health.frozen} />
          <Row label="Reconnects" value={health.reconnects} warn={health.reconnects > 2} />
        </div>
      )}

      {/* Resources */}
      <div className="space-y-0.5">
        <div className="text-white/40 uppercase tracking-wider">Resources</div>
        {Object.entries(Disposer.getStats()).map(([scope, count]) => (
          <Row key={scope} label={scope} value={count} />
        ))}
      </div>
    </motion.div>
  );
}

function Row({ label, value, warn }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/50">{label}</span>
      <span className={warn ? 'text-red-400 font-bold' : 'text-white/80'}>{value}</span>
    </div>
  );
}