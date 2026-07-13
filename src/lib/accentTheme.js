/**
 * accentTheme — applies a user-chosen accent color across the app by overriding
 * the real CSS variables the UI uses (--ll-gold and its shades). Derives
 * bright/dim/ghost variants from the base color so the whole accent family
 * shifts together. Persisted in localStorage and re-applied on load.
 */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  const int = parseInt(n, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

function shade(hex, factor) {
  // factor > 1 lightens, < 1 darkens
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => clamp(factor > 1 ? c + (255 - c) * (factor - 1) : c * factor);
  return `#${[f(r), f(g), f(b)].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

export function applyAccentColor(hex) {
  if (!hex) return;
  const root = document.documentElement.style;
  const { r, g, b } = hexToRgb(hex);
  root.setProperty('--accent-color', hex);
  root.setProperty('--ll-gold', hex);
  root.setProperty('--ll-gold-bright', shade(hex, 1.25));
  root.setProperty('--ll-gold-dim', shade(hex, 0.75));
  root.setProperty('--ll-gold-ghost', `rgba(${r},${g},${b},0.08)`);
  root.setProperty('--ll-accent-rgb', `${r}, ${g}, ${b}`);
}

export function resetAccentColor() {
  const root = document.documentElement.style;
  ['--accent-color', '--ll-gold', '--ll-gold-bright', '--ll-gold-dim', '--ll-gold-ghost', '--ll-accent-rgb']
    .forEach(v => root.removeProperty(v));
  localStorage.removeItem('legion_accent_color');
}

// Apply any saved accent immediately on app boot.
export function initAccentColor() {
  const saved = localStorage.getItem('legion_accent_color');
  if (saved) applyAccentColor(saved);
}
