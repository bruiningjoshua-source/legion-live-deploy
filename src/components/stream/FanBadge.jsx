import React from 'react';

const TIERS = [
  { min: 50000, badge: '👑', label: 'Legion VIP', color: '#f5a623', glow: true  },
  { min: 10000, badge: '❤️',  label: 'Elite Fan',  color: '#ef4444', glow: false },
  { min: 2000,  badge: '💜', label: 'Super Fan',  color: '#a855f7', glow: false },
  { min: 500,   badge: '💙', label: 'Loyal Fan',  color: '#60a5fa', glow: false },
  { min: 100,   badge: '🌟', label: 'Supporter',  color: '#f5a623', glow: false },
  { min: 0,     badge: '⚪',       label: 'Fan',        color: '#9ca3af', glow: false },
];

export function getBadgeTier(totalDenarii = 0) {
  return TIERS.find(t => totalDenarii >= t.min) || TIERS[TIERS.length - 1];
}

export default function FanBadge({ totalDenarii = 0, size = 'sm', showLabel = false }) {
  const tier = getBadgeTier(totalDenarii);
  if (totalDenarii === 0 && !showLabel) return null;

  const paddings = {
    xs: { padding: '0.1rem 0.4rem', fontSize: '10px' },
    sm: { padding: '0.15rem 0.5rem', fontSize: '11px' },
    md: { padding: '0.25rem 0.7rem', fontSize: '13px' },
  };

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full font-bold"
      style={{
        backgroundColor: tier.color + '20',
        border: `1px solid ${tier.color}45`,
        color: tier.color,
        animation: tier.glow ? 'll-pulse 1.8s ease-in-out infinite' : 'none',
        ...(paddings[size] || paddings.sm),
      }}
      title={tier.label}
    >
      <span>{tier.badge}</span>
      {showLabel && <span style={{ fontSize: "inherit" }}>{tier.label}</span>}
    </span>
  );
}