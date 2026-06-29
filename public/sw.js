/**
 * Legion Live Service Worker
 * Strategy: Network-first for API/streams, Cache-first for static assets.
 * Offline shell: serves cached index.html when network unavailable.
 *
 * Apple / Google compliance:
 * - iOS Safari: supports install, offline shell, no background push
 * - Android Chrome: full PWA — install, push, background sync
 */

const CACHE_NAME     = 'legion-live-v1';
const OFFLINE_URL    = '/';

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip: non-GET, cross-origin, Supabase, ZEGOCLOUD, Stripe APIs
  if (request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin) &&
      !url.hostname.endsWith('supabase.co') === false) return;

  // Skip streaming and API calls — always go to network
  if (url.pathname.startsWith('/.netlify/functions/') ||
      url.pathname.startsWith('/api/') ||
      url.hostname.includes('supabase') ||
      url.hostname.includes('zego') ||
      url.hostname.includes('stripe')) {
    return; // Let browser handle natively
  }

  // Static assets (JS/CSS/fonts/images): Cache-first
  if (url.pathname.match(/\.(js|css|woff2?|png|jpg|webp|svg|ico)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // HTML navigation: Network-first, fall back to offline shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
});

// ── Push notifications (Android Chrome / desktop) ─────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Legion Live', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Legion Live', {
      body:    data.body    || 'You have a new notification',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-96.png',
      tag:     data.tag     || 'legion-notification',
      data:    data.url ? { url: data.url } : {},
      actions: data.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const existing = cls.find(c => c.url === url);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
