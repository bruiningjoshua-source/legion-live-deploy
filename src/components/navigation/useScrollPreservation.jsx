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

  // Poll for navigation changes since we can't use React Router hooks here
  useEffect(() => {
    let currentPath = getPathname();
    prevPathRef.current = currentPath;

    const checkNavigation = () => {
      const nextPath = getPathname();
      if (currentPath !== nextPath) {
        scrollPositions.set(currentPath, window.scrollY);
        currentPath = nextPath;
        prevPathRef.current = nextPath;

        const saved = scrollPositions.get(nextPath);
        isRestoringRef.current = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo(0, saved !== undefined ? saved : 0);
            isRestoringRef.current = false;
          });
        });
      }
    };

    // Listen to popstate + use a short interval as fallback for programmatic navigation
    window.addEventListener('popstate', checkNavigation);
    const interval = setInterval(checkNavigation, 200);

    return () => {
      window.removeEventListener('popstate', checkNavigation);
      clearInterval(interval);
    };
  }, []);

  // Persist on beforeunload
  useEffect(() => {
    const handler = () => scrollPositions.set(getPathname(), window.scrollY);
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
}