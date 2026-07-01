/**
 * Legion Live Service Worker v5
 * Network-first for HTML, cache-first for static assets.
 * Auto-updates when a new version deploys.
 */

const CACHE = 'legion-live-v6';
const STATIC_EXTS = ['.js', '.css', '.woff2', '.png', '.svg', '.mp4'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/', '/manifest.json']))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin API calls
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase') || 
      url.hostname.includes('zego') || 
      url.hostname.includes('stripe') ||
      url.pathname.startsWith('/.netlify/')) return;

  const isStatic = STATIC_EXTS.some(ext => url.pathname.endsWith(ext));

  if (isStatic) {
    // Cache-first for static assets (they have content hashes)
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return res;
        });
      })
    );
  } else {
    // Network-first for HTML/navigation
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok && request.mode === 'navigate') {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request) || caches.match('/'))
    );
  }
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
