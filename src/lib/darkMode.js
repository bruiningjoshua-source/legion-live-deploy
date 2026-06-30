/**
 * Dark/Light mode utility for Legion Live.
 * Persists to localStorage, respects system preference on first visit.
 */

const KEY = 'legion_color_scheme';

export function getColorScheme() {
  const saved = localStorage.getItem(KEY);
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function setColorScheme(scheme) {
  localStorage.setItem(KEY, scheme);
  applyColorScheme(scheme);
  window.dispatchEvent(new CustomEvent('legion-theme-change', { detail: { colorScheme: scheme } }));
}

export function toggleColorScheme() {
  const current = getColorScheme();
  setColorScheme(current === 'dark' ? 'light' : 'dark');
}

export function applyColorScheme(scheme) {
  if (scheme === 'light') {
    document.documentElement.classList.add('ll-light');
    document.documentElement.classList.remove('ll-dark');
  } else {
    document.documentElement.classList.remove('ll-light');
    document.documentElement.classList.add('ll-dark');
  }
}

// Apply on load
export function initColorScheme() {
  applyColorScheme(getColorScheme());
}
