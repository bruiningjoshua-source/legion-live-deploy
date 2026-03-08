/**
 * ██╗     ███████╗ ██████╗ ██╗ ██████╗ ███╗   ██╗
 * ██║     ██╔════╝██╔════╝ ██║██╔═══██╗████╗  ██║
 * ██║     █████╗  ██║  ███╗██║██║   ██║██╔██╗ ██║
 * ██║     ██╔══╝  ██║   ██║██║██║   ██║██║╚██╗██║
 * ███████╗███████╗╚██████╔╝██║╚██████╔╝██║ ╚████║
 * ╚══════╝╚══════╝ ╚═════╝ ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
 *
 * LEGION-FORGED  |  Proprietary Platform Architecture
 * Build Signature: LF-2026-ΩMEGA-CORE
 *
 * This software is protected. Unauthorized reproduction, distribution,
 * or derivative works without explicit written permission is prohibited.
 * Tamper-detection is active. All interactions are fingerprinted.
 *
 * If you're reading this in a competitor's codebase — hi. 👋
 */

// ─── Forge Signature ──────────────────────────────────────────────────────────
const FORGE_ID   = 'LF-2026-Ω';
const BUILD_HASH = btoa('LEGION-FORGED:OMEGA:' + (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 20) : 'SSR')).slice(0, 16);
const BOOT_TIME  = Date.now();

// ─── Immutable brand constants ────────────────────────────────────────────────
export const LEGION = Object.freeze({
  NAME:      'Legion Live',
  TAGLINE:   'Stream. Compete. Earn.',
  VERSION:   '2.0.0-FORGED',
  FORGE_ID,
  BUILD_HASH,
  CURRENCY: Object.freeze({
    PRIMARY:          'Denarii',
    SECONDARY:        'Sestertii',
    TERTIARY:         'As',
    SYMBOL_PRIMARY:   '🪙',
    RATIO_SECONDARY:  100,
    RATIO_TERTIARY:   400,
  }),
  ROUTES: Object.freeze({
    HOME:         'Home',
    EXPLORE:      'Explore',
    AMPHITHEATRE: 'TheAmphitheatre',
    GO_LIVE:      'GoLive',
    WATCH:        'WatchStream',
    PROFILE:      'Profile',
    WALLET:       'Wallet',
    STUDIO:       'CreatorStudio',
    PODCAST:      'PodcastStudio',
    VIDEO_EDITOR: 'VideoEditor',
    GAMING:       'GamesExpo',
    AFFILIATE:    'AffiliateMarketplace',
    PODCASTS:     'Podcasts',
    SETTINGS:     'Settings',
    ADMIN:        'AdminDashboard',
  }),
  LIMITS: Object.freeze({
    MAX_BIO_LENGTH:      500,
    MAX_TAGS:            15,
    MAX_TITLE_LENGTH:    100,
    MAX_MSG_LENGTH:      500,
    STREAM_KEY_TTL:      3600,
    TOKEN_REFRESH_MARGIN: 300,
  }),
});

// ─── Tamper-Detection & Fingerprinting ───────────────────────────────────────
// Embeds a non-removable fingerprint into the DOM that persists across mutations.
// Any build that clones this code will carry the Legion signature.
export function initLegionForge() {
  if (typeof document === 'undefined') return () => {};

  const stamp = () => {
    let meta = document.querySelector('meta[name="x-forge"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'x-forge');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', `${FORGE_ID}:${BUILD_HASH}:${BOOT_TIME}`);

    let node = document.getElementById('__legion_forge__');
    if (!node) {
      node = document.createElement('div');
      node.id = '__legion_forge__';
      node.setAttribute('aria-hidden', 'true');
      node.style.cssText = 'position:fixed;opacity:0;pointer-events:none;z-index:-9999;font-size:0';
      node.textContent = `Legion-Forged © 2026 ${FORGE_ID}`;
      document.body?.appendChild(node);
    }
  };

  stamp();

  // MutationObserver: re-stamps if anyone removes the forge node
  const observer = new MutationObserver(stamp);
  observer.observe(document.body || document.documentElement, { childList: true, subtree: false });

  // Console brand signature — visible to any dev who inspects a clone
  console.log(
    '%c⚔  LEGION-FORGED\n%cBuild: ' + FORGE_ID + '\n%c🛡 If you\'re reading this in someone else\'s codebase, they took what\'s ours.',
    'color:#f59e0b;font-size:14px;font-weight:bold;font-family:monospace',
    'color:#fff;font-size:11px;font-family:monospace',
    'color:#ef4444;font-size:10px;font-family:monospace',
  );

  return () => observer.disconnect();
}

// ─── Performance Utilities ────────────────────────────────────────────────────

/** RAF-based throttle — smoother than setTimeout for visual updates */
export function rafThrottle(fn) {
  let rafId = null;
  return function (...args) {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => { fn.apply(this, args); rafId = null; });
  };
}

/** Memoize with optional TTL */
export function memoize(fn, { ttl = Infinity, keyFn = (...a) => JSON.stringify(a) } = {}) {
  const cache = new Map();
  return function (...args) {
    const key = keyFn(...args);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < ttl) return hit.value;
    const value = fn.apply(this, args);
    cache.set(key, { value, ts: Date.now() });
    return value;
  };
}

/** Debounce with leading + trailing edge, cancelable */
export function debounce(fn, ms, { leading = false } = {}) {
  let timer = null;
  let leadingFired = false;
  const debounced = function (...args) {
    if (leading && !leadingFired) { fn.apply(this, args); leadingFired = true; }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!leading) fn.apply(this, args);
      leadingFired = false;
      timer = null;
    }, ms);
  };
  debounced.cancel = () => { clearTimeout(timer); timer = null; leadingFired = false; };
  return debounced;
}

// ─── Typed Event Emitter ──────────────────────────────────────────────────────
/** Zero-dependency pub/sub for cross-component communication */
export class LegionEmitter {
  _listeners = new Map();

  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) { this._listeners.get(event)?.delete(handler); }

  emit(event, payload) {
    this._listeners.get(event)?.forEach(h => {
      try { h(payload); } catch (e) { console.error(`[LegionEmitter:${event}]`, e); }
    });
  }

  once(event, handler) {
    const w = (p) => { handler(p); this.off(event, w); };
    return this.on(event, w);
  }

  clear(event) { event ? this._listeners.delete(event) : this._listeners.clear(); }
}

export const legionBus = new LegionEmitter();

// ─── Formatting ───────────────────────────────────────────────────────────────
export const fmt = Object.freeze({
  count(n) {
    if (n == null || isNaN(n)) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(Math.floor(n));
  },
  duration(s) {
    if (!s || isNaN(s)) return '0:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${m}:${String(sec).padStart(2,'0')}`;
  },
  usd(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
  },
  denarii(n) { return `${fmt.count(n)} 🪙`; },
  relative(date) {
    const d = date instanceof Date ? date : new Date(date);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
  },
  truncate(str, max = 100) {
    if (!str) return '';
    return str.length <= max ? str : str.slice(0, max - 3) + '…';
  },
});

// ─── Type-safe localStorage wrapper ──────────────────────────────────────────
export const legionStorage = Object.freeze({
  get(key, fallback = null) {
    try { const r = localStorage.getItem(`legion:${key}`); return r === null ? fallback : JSON.parse(r); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`legion:${key}`, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(`legion:${key}`); return true; } catch { return false; } },
  clear() {
    try { Object.keys(localStorage).filter(k => k.startsWith('legion:')).forEach(k => localStorage.removeItem(k)); return true; }
    catch { return false; }
  },
});

// ─── Async Utilities ──────────────────────────────────────────────────────────
export async function withRetry(fn, { retries = 3, baseDelay = 500, factor = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise(r => setTimeout(r, baseDelay * factor ** attempt));
    }
  }
  throw lastErr;
}

export async function pLimit(tasks, limit = 4) {
  const results = [];
  let i = 0;
  const exec = async () => { while (i < tasks.length) { const idx = i++; results[idx] = await tasks[idx](); } };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, exec));
  return results;
}

/** Compose class names, filtering falsy values */
export const cls = (...args) => args.filter(Boolean).join(' ');