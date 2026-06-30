/**
 * Legion Live Service Worker v4
 * This version AGGRESSIVELY clears all old caches and forces fresh loads.
 * Deployed to fix stale cache black-screen issue.
 */

const CACHE_NAME = 'legion-live-v4';

// On install: claim immediately, cache nothing
self.addEventListener('install', event => {
  console.log('[SW v4] Installing — clearing all old caches');
  self.skipWaiting();
});

// On activate: nuke EVERYTHING, claim all clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      console.log('[SW v4] Clearing caches:', keys);
      return Promise.all(keys.map(k => caches.delete(k)));
    }).then(() => {
      console.log('[SW v4] All caches cleared — claiming clients');
      return self.clients.claim();
    }).then(() => {
      // Tell all open tabs to reload with fresh content
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          console.log('[SW v4] Sending RELOAD to client');
          client.postMessage({ type: 'SW_UPDATED', action: 'reload' });
        });
      });
    })
  );
});

// Fetch: ALWAYS go to network, never serve from cache
// This is intentionally aggressive — fixes the stale cache issue
self.addEventListener('fetch', event => {
  // Only handle same-origin requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  
  // Always network-first, no caching at all for now
  event.respondWith(
    fetch(event.request).catch(() => {
      // If offline, return a simple offline message
      return new Response(
        '<html><body style="background:#050508;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center"><div><h2>You\'re offline</h2><p>Check your connection and reload.</p><button onclick="location.reload()" style="background:#f5a623;color:#000;border:none;padding:12px 24px;border-radius:8px;font-weight:bold;cursor:pointer">Reload</button></div></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    })
  );
});

// Handle reload message from activate
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
