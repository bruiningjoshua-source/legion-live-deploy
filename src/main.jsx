import React from 'react'
import { initSentry } from './lib/sentry.js';
initSentry();
import { initColorScheme } from './lib/darkMode.js';
initColorScheme();
import { initAccentColor } from './lib/accentTheme.js';
initAccentColor();
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// ── Auto-recover from stale deploys ──────────────────────────────────────────
// After a new deploy, a browser holding a stale index.html may request chunk
// files that no longer exist ("Failed to fetch dynamically imported module" /
// "'text/html' is not a valid JavaScript MIME type"). Catch that and reload
// ONCE against fresh assets, clearing caches first. A sessionStorage guard
// prevents reload loops.
function isStaleChunkError(msg = '') {
  return /dynamically imported module|valid JavaScript MIME type|Importing a module script failed|error loading dynamically imported/i.test(msg);
}
async function recoverFromStaleDeploy() {
  if (sessionStorage.getItem('ll_chunk_recovered')) return; // already tried this session
  sessionStorage.setItem('ll_chunk_recovered', '1');
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.update()));
    }
  } catch (_) { /* best effort */ }
  window.location.reload();
}
window.addEventListener('error', (e) => {
  if (isStaleChunkError(e?.message)) recoverFromStaleDeploy();
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e?.reason?.message || String(e?.reason || '');
  if (isStaleChunkError(msg)) recoverFromStaleDeploy();
});

// ── PWA Service Worker Registration ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}
