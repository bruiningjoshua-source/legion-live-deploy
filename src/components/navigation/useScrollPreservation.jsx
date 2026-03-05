import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Stores scroll positions per route path
const scrollPositions = new Map();

export default function useScrollPreservation() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  // Save scroll position before navigating away
  const saveScroll = useCallback(() => {
    scrollPositions.set(prevPathRef.current, window.scrollY);
  }, []);

  useEffect(() => {
    // Save the previous page's scroll position
    if (prevPathRef.current !== location.pathname) {
      scrollPositions.set(prevPathRef.current, window.scrollY);
      prevPathRef.current = location.pathname;
    }

    // Restore scroll position for the new page (if we have one saved)
    const saved = scrollPositions.get(location.pathname);
    if (saved !== undefined) {
      // Use requestAnimationFrame to ensure DOM has rendered
      requestAnimationFrame(() => {
        window.scrollTo(0, saved);
      });
    } else {
      // New page - scroll to top
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Also save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      scrollPositions.set(location.pathname, window.scrollY);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.pathname]);

  return { saveScroll };
}