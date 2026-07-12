/**
 * Legion Live Service Worker v7
 * 
 * CRITICAL LESSON: Never cache JS chunks by filename.
 * Vite content-hashes chunk filenames on every build, so any cached
 * chunk becomes a 404 after the next deploy. This caused repeated
 * "Failed to fetch dynamically imported module" errors.
 *
 * Strategy:
 * - JS/CSS chunks: NEVER cache (always network, they have content hashes so CDN handles it)
 * - HTML navigation: network-first, fallback to cache
 * - Images/fonts: cache-first (stable URLs)
 * - API calls: never cache
 */

const CACHE = 'legion-live-v45';
const NEVER_CACHE = ['.js', '.css']; // Vite chunks — content-hashed, let CDN handle them
const CACHE_FOREVER = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.woff2', '.woff', '.mp4'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/manifest.json']))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and external API calls
  if (request.method !== 'GET') return;
  if (url.hostname !== self.location.hostname) return;
  if (url.pathname.startsWith('/.netlify/')) return;

  const ext = url.pathname.substring(url.pathname.lastIndexOf('.'));

  // JS and CSS: ALWAYS network. Never serve from cache.
  // These are content-hashed by Vite — a stale cache entry = guaranteed 404.
  if (NEVER_CACHE.includes(ext)) {
    e.respondWith(fetch(request));
    return;
  }

  // Images and fonts: cache-first (stable, never change)
  if (CACHE_FOREVER.includes(ext)) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // HTML navigation: network-first so deploys are always picked up immediately
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok && request.mode === 'navigate') {
          caches.open(CACHE).then(c => c.put(request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(request).then(c => c || caches.match('/')))
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
