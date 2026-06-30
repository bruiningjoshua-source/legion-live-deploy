/**
 * Dark/Light mode utility for Legion Live.
 * Persists to localStorage, respects system preference on first visit.
 */

const KEY = 'legion_color_scheme';

export function getColorScheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
  } catch (_) {
    // localStorage can throw (private browsing, blocked storage, sandboxed
    // iframe, restricted WebView) — this must never crash the whole app
    // before React even mounts.
  }
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch (_) {
    return 'dark';
  }
}

export function setColorScheme(scheme) {
  try {
    localStorage.setItem(KEY, scheme);
  } catch (_) { /* storage unavailable — theme just won't persist, non-fatal */ }
  applyColorScheme(scheme);
  try {
    window.dispatchEvent(new CustomEvent('legion-theme-change', { detail: { colorScheme: scheme } }));
  } catch (_) { /* non-fatal */ }
}

export function toggleColorScheme() {
  const current = getColorScheme();
  setColorScheme(current === 'dark' ? 'light' : 'dark');
}

export function applyColorScheme(scheme) {
  try {
    if (scheme === 'light') {
      document.documentElement.classList.add('ll-light');
      document.documentElement.classList.remove('ll-dark');
    } else {
      document.documentElement.classList.remove('ll-light');
      document.documentElement.classList.add('ll-dark');
    }
  } catch (_) { /* non-fatal — worst case, default styling applies */ }
}

// Apply on load — wrapped so a theme-init failure can never block the app
// from mounting. This runs before ReactDOM.render in main.jsx.
export function initColorScheme() {
  try {
    applyColorScheme(getColorScheme());
  } catch (_) { /* non-fatal */ }
}
