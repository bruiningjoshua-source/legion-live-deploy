import React, { useMemo } from 'react';

/**
 * ThemeScope — applies a creator's saved theme colors ONLY within this
 * component's own subtree, via CSS custom properties on a wrapping div. This
 * is the scoped counterpart to accentTheme.js (which is intentionally global —
 * a personal Settings preference for the viewer's own app). A creator's
 * profile/stream theme should style THEIR page for THEIR visitors, not bleed
 * into every other page the visitor looks at next.
 *
 * Usage: wrap a page's content in <ThemeScope theme={creatorTheme}>...
 * Anywhere inside can use Tailwind arbitrary values like
 * text-[var(--scope-gold)] or bg-[var(--scope-gold)].
 */
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const int = parseInt(n, 16);
  if (Number.isNaN(int)) return null;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function shade(hex, factor) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = (c) => clamp(factor > 1 ? c + (255 - c) * (factor - 1) : c * factor);
  return `#${[f(rgb.r), f(rgb.g), f(rgb.b)].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

export default function ThemeScope({ theme, className = '', children, as: Tag = 'div' }) {
  const vars = useMemo(() => {
    if (!theme) return {};
    const primary = theme.primaryColor || theme.accentColor;
    const accent = theme.accentColor || theme.primaryColor;
    const rgb = hexToRgb(accent);
    const style = {};
    if (primary) style['--scope-primary'] = primary;
    if (accent) {
      style['--scope-gold'] = accent;
      style['--scope-gold-bright'] = shade(accent, 1.25);
      style['--scope-gold-dim'] = shade(accent, 0.75);
      if (rgb) style['--scope-gold-ghost'] = `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`;
    }
    if (theme.backgroundColor) style['--scope-bg'] = theme.backgroundColor;
    if (theme.cardColor) style['--scope-card'] = theme.cardColor;
    if (theme.textColor) style['--scope-text'] = theme.textColor;
    if (theme.borderRadius != null) style['--scope-radius'] = `${theme.borderRadius}px`;
    return style;
  }, [theme]);

  return (
    <Tag className={className} style={vars}>
      {children}
    </Tag>
  );
}
