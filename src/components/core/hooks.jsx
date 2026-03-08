/**
 * Legion-Forged | Custom React Hooks Library
 * LF-2026-Ω — Veteran-grade, zero-bloat React primitives
 */
import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { debounce, rafThrottle, legionStorage, legionBus } from './legion';

// ─── usePersistentState ───────────────────────────────────────────────────────
export function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => legionStorage.get(key, initialValue));
  const set = useCallback((value) => {
    const resolved = typeof value === 'function' ? value(state) : value;
    legionStorage.set(key, resolved);
    setState(resolved);
  }, [key, state]);
  return [state, set];
}

// ─── useDebounce ──────────────────────────────────────────────────────────────
export function useDebounce(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ─── useMediaQuery ────────────────────────────────────────────────────────────
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export const useIsMobile  = () => useMediaQuery('(max-width: 767px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

// ─── useIntersection ─────────────────────────────────────────────────────────
export function useIntersection(ref, options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0.1, ...options }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return isIntersecting;
}

// ─── usePrevious ─────────────────────────────────────────────────────────────
export function usePrevious(value) {
  const ref = useRef(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}

// ─── useStableCallback ────────────────────────────────────────────────────────
/** Returns a stable callback ref that always calls the latest version — kills stale closure bugs */
export function useStableCallback(fn) {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return useCallback((...args) => ref.current?.(...args), []);
}

// ─── useAnimationFrame ────────────────────────────────────────────────────────
export function useAnimationFrame(callback, active = true) {
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const stableCb = useStableCallback(callback);
  useEffect(() => {
    if (!active) { cancelAnimationFrame(rafRef.current); lastTimeRef.current = null; return; }
    const loop = (time) => {
      const delta = lastTimeRef.current !== null ? time - lastTimeRef.current : 0;
      lastTimeRef.current = time;
      stableCb(delta, time);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, stableCb]);
}

// ─── useClickOutside ─────────────────────────────────────────────────────────
export function useClickOutside(ref, handler) {
  const stableHandler = useStableCallback(handler);
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      stableHandler(e);
    };
    document.addEventListener('pointerdown', listener, { passive: true });
    return () => document.removeEventListener('pointerdown', listener);
  }, [ref]);
}

// ─── useKeyboardShortcut ──────────────────────────────────────────────────────
export function useKeyboardShortcut(shortcuts, enabled = true) {
  const ref = useRef(shortcuts);
  useLayoutEffect(() => { ref.current = shortcuts; });
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      const key = [e.ctrlKey&&'Ctrl', e.metaKey&&'Meta', e.shiftKey&&'Shift', e.altKey&&'Alt', e.key].filter(Boolean).join('+');
      const fn = ref.current[key] || ref.current[e.key];
      if (fn) { e.preventDefault(); fn(e); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}

// ─── useCountdown ─────────────────────────────────────────────────────────────
export function useCountdown(targetDate) {
  const calc = () => {
    const diff = Math.max(0, new Date(targetDate) - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      done: diff === 0,
    };
  };
  const [remaining, setRemaining] = useState(calc);
  useEffect(() => { const t = setInterval(() => setRemaining(calc()), 1000); return () => clearInterval(t); }, [targetDate]);
  return remaining;
}

// ─── useWindowSize ────────────────────────────────────────────────────────────
export function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = debounce(() => setSize({ width: window.innerWidth, height: window.innerHeight }), 150);
    window.addEventListener('resize', handler);
    return () => { window.removeEventListener('resize', handler); handler.cancel(); };
  }, []);
  return size;
}

// ─── useNetworkStatus ────────────────────────────────────────────────────────
export function useNetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [effectiveType, setEffectiveType] = useState(navigator.connection?.effectiveType ?? '4g');
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const change = () => setEffectiveType(navigator.connection?.effectiveType ?? '4g');
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    navigator.connection?.addEventListener('change', change);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      navigator.connection?.removeEventListener('change', change);
    };
  }, []);
  return { online, effectiveType, slow: effectiveType === 'slow-2g' || effectiveType === '2g' };
}

// ─── useLegionEvent ───────────────────────────────────────────────────────────
/** Subscribe to the global Legion event bus — auto-unsubscribes on unmount */
export function useLegionEvent(event, handler) {
  const stableHandler = useStableCallback(handler);
  useEffect(() => legionBus.on(event, stableHandler), [event]);
}

// ─── useAsync ────────────────────────────────────────────────────────────────
/** Fire an async fn, track its lifecycle — lightweight alternative to React Query for one-off calls */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const stableFn = useStableCallback(fn);
  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    stableFn()
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch(error => { if (!cancelled) setState({ data: null, loading: false, error }); });
    return () => { cancelled = true; };
  }, deps);
  return state;
}

// ─── useScrollPosition ───────────────────────────────────────────────────────
export function useScrollPosition(ref) {
  const [pos, setPos] = useState({ x: 0, y: 0, atTop: true, atBottom: false });
  useEffect(() => {
    const el = ref?.current ?? window;
    const handler = rafThrottle(() => {
      const x = el.scrollX ?? el.scrollLeft ?? 0;
      const y = el.scrollY ?? el.scrollTop ?? 0;
      const maxY = el === window
        ? document.documentElement.scrollHeight - window.innerHeight
        : el.scrollHeight - el.clientHeight;
      setPos({ x, y, atTop: y <= 0, atBottom: y >= maxY - 5 });
    });
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [ref]);
  return pos;
}

// ─── useLocalStorage (thin wrapper for non-legion keys) ──────────────────────
export function useLocalStorage(key, fallback) {
  const [val, setVal] = useState(() => {
    try { const r = localStorage.getItem(key); return r === null ? fallback : JSON.parse(r); }
    catch { return fallback; }
  });
  const set = useCallback((v) => {
    const resolved = typeof v === 'function' ? v(val) : v;
    try { localStorage.setItem(key, JSON.stringify(resolved)); } catch {}
    setVal(resolved);
  }, [key, val]);
  return [val, set];
}