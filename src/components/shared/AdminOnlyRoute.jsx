import React from 'react';
import { useCurrentUser } from '@/components/hooks/useStreamData';

/**
 * AdminOnlyRoute — wraps internal/QA-only pages so they aren't publicly
 * reachable in production. Test harnesses are useful but shouldn't be open to
 * anyone who guesses the URL.
 *
 * Renders the page only for users with role === 'admin'; everyone else gets a
 * plain not-found style message (no hint that the route exists).
 */
export default function AdminOnlyRoute({ children }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8dcc8',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <span style={{ opacity: 0.5, fontSize: 14 }}>Loading…</span>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8dcc8',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, fontFamily: 'system-ui', padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Page not found</h1>
        <p style={{ fontSize: 13, opacity: 0.5 }}>This page doesn&apos;t exist or you don&apos;t have access.</p>
      </div>
    );
  }

  return children;
}
