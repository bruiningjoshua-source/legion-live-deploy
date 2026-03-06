import { useEffect, useRef } from 'react';
import { createPageUrl } from '@/utils';

// Shared scroll position map — exported so BottomNav can also use it
export const scrollPositions = new Map();

// Bottom tab root paths for independent stack detection
const BOTTOM_TAB_ROOTS = [
  createPageUrl('Home'),
  createPageUrl('Explore'),
  createPageUrl('GoLive'),
  createPageUrl('TheAmphitheatre'),
  createPageUrl('Profile'),
].map(p => p.split('?')[0]);

export function isBottomTabRoot(pathname) {
  return BOTTOM_TAB_ROOTS.includes(pathname);
}

export default function useScrollPreservation() {
  // Use window.location directly instead of useLocation() to avoid
  // requiring a Router context (Layout renders outside the Router).
  const getPathname = () => window.location.pathname;
  const location = { pathname: getPathname() };
  const prevPathRef = useRef(location.pathname);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const prevPath = prevPathRef.current;
    const nextPath = location.pathname;

    if (prevPath !== nextPath) {
      // Save previous page's scroll position
      scrollPositions.set(prevPath, window.scrollY);
      prevPathRef.current = nextPath;
    }

    // Restore or reset scroll
    const saved = scrollPositions.get(nextPath);
    isRestoringRef.current = true;

    // Double-rAF ensures the DOM has fully painted before restoring scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (saved !== undefined) {
          window.scrollTo(0, saved);
        } else {
          window.scrollTo(0, 0);
        }
        isRestoringRef.current = false;
      });
    });
  }, [location.pathname]);

  // Persist on beforeunload
  useEffect(() => {
    const handler = () => scrollPositions.set(location.pathname, window.scrollY);
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [location.pathname]);
}