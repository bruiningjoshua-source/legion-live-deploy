/**
 * sentry — production error monitoring. Initializes the Sentry React SDK so
 * unhandled errors, promise rejections, and React render crashes are reported
 * automatically with stack traces (instead of relying on user screenshots).
 *
 * DSN comes from VITE_SENTRY_DSN when set; falls back to the project DSN so it
 * works out of the box. Only enabled in production builds to avoid noise from
 * local dev.
 */
import * as Sentry from '@sentry/react';

const DSN =
  import.meta.env.VITE_SENTRY_DSN ||
  'https://c16ce9958b1df151e9de11e369235109@o4511394910699520.ingest.us.sentry.io/4511848475394048';

let started = false;

export function initSentry() {
  if (started || !DSN) return;
  // Skip in local dev unless explicitly forced.
  const isProd = import.meta.env.PROD;
  if (!isProd && !import.meta.env.VITE_SENTRY_FORCE) return;

  try {
    Sentry.init({
      dsn: DSN,
      environment: isProd ? 'production' : 'development',
      // Performance: sample a small % of transactions to stay in the free tier.
      tracesSampleRate: 0.1,
      // Session replay on errors only (light footprint).
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.0,
      // Trim noisy, non-actionable errors.
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error promise rejection captured',
        /Failed to fetch dynamically imported module/,
        /Load failed/,
      ],
      beforeSend(event) {
        // Drop events that are just stale-chunk reloads (handled elsewhere).
        const msg = event.exception?.values?.[0]?.value || '';
        if (/is not a valid JavaScript MIME type/i.test(msg)) return null;
        return event;
      },
    });
    started = true;
  } catch (e) {
    console.warn('[sentry] init failed:', e?.message);
  }
}

/** Attach the signed-in user to error reports (call after auth resolves). */
export function setSentryUser(user) {
  if (!started) return;
  try {
    if (user?.email) Sentry.setUser({ email: user.email, id: user.id || user.email });
    else Sentry.setUser(null);
  } catch (_) {}
}

/** Manually report an error (used by ErrorTracker bridge). */
export function reportError(error, context = {}) {
  if (!started) return;
  try { Sentry.captureException(error, { extra: context }); } catch (_) {}
}

export { Sentry };
