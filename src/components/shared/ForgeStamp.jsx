/**
 * Legion-Forged | ForgeStamp
 * LF-2026-Ω
 *
 * Visible watermark component — renders the Legion-Forged signature
 * in footers, credit screens, and error pages.
 * Subtle enough not to distract; prominent enough to be undeniable.
 */
import React from 'react';
import { Shield } from 'lucide-react';

/**
 * @param {'full'|'minimal'|'badge'} variant
 * @param {string} className
 */
export default function ForgeStamp({ variant = 'minimal', className = '' }) {
  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
          bg-amber-500/10 border border-amber-500/20 text-amber-400/60
          text-[10px] font-mono tracking-wide select-none ${className}`}
        title="Legion-Forged — Proprietary Platform Build LF-2026-Ω"
      >
        <Shield className="w-2.5 h-2.5" />
        Legion-Forged
      </span>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center gap-1 select-none ${className}`}>
        <div className="flex items-center gap-2 text-amber-400/40">
          <Shield className="w-4 h-4" />
          <span className="font-mono font-bold text-sm tracking-widest">LEGION-FORGED</span>
          <Shield className="w-4 h-4" />
        </div>
        <p className="text-white/15 text-[10px] font-mono tracking-widest">
          LF-2026-Ω · Proprietary Platform Architecture
        </p>
        <p className="text-white/10 text-[9px] font-mono">
          © 2026 Legion Live. Unauthorized reproduction prohibited.
        </p>
      </div>
    );
  }

  // minimal (default)
  return (
    <p
      className={`text-white/10 text-[9px] font-mono tracking-widest select-none ${className}`}
      title="Legion-Forged LF-2026-Ω"
    >
      ⚔ Legion-Forged · LF-2026-Ω
    </p>
  );
}