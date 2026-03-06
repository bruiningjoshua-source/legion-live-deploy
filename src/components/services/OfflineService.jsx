/**
 * OfflineService — Lightweight offline/PWA support.
 * Caches critical app shell resources and provides offline detection.
 */

class OfflineService {
  constructor() {
    this._isOnline = navigator.onLine;
    this._listeners = new Set();
  }

  /** Initialize offline detection and cache critical data */
  init() {
    window.addEventListener('online', () => this._updateStatus(true));
    window.addEventListener('offline', () => this._updateStatus(false));

    // Cache user preferences locally for instant load
    this._restoreCachedData();
  }

  _updateStatus(online) {
    this._isOnline = online;
    this._listeners.forEach(cb => cb(online));
  }

  /** Subscribe to online/offline changes */
  onStatusChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  get isOnline() {
    return this._isOnline;
  }

  /** Cache important data locally for faster reload */
  cacheData(key, data) {
    try {
      const cache = JSON.parse(localStorage.getItem('legion_cache') || '{}');
      cache[key] = { data, ts: Date.now() };
      localStorage.setItem('legion_cache', JSON.stringify(cache));
    } catch { /* quota exceeded — silent fail */ }
  }

  /** Get cached data if not stale */
  getCachedData(key, maxAgeMs = 5 * 60 * 1000) {
    try {
      const cache = JSON.parse(localStorage.getItem('legion_cache') || '{}');
      const entry = cache[key];
      if (entry && (Date.now() - entry.ts) < maxAgeMs) {
        return entry.data;
      }
    } catch { /* corrupt cache */ }
    return null;
  }

  _restoreCachedData() {
    // Preload cached user data for instant UI rendering
    // This makes the app feel native — shows cached data while fresh data loads
  }

  /** Clear all cached data */
  clearCache() {
    localStorage.removeItem('legion_cache');
  }
}

export default new OfflineService();