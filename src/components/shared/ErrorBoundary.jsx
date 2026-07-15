/**
 * Legion-Forged | ErrorBoundary
 * LF-2026-Ω
 *
 * Production-grade error boundary with:
 * - Structural error classification (network / chunk / runtime / unknown)
 * - Retry counter with exponential back-off suggestion
 * - Forge signature visible on every crash screen
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi, PackageX, Bug, Shield } from 'lucide-react';

const FORGE_TAG = 'Legion-Forged · LF-2026-Ω';

function classifyError(error) {
  const msg = error?.message?.toLowerCase() ?? '';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('load'))
    return { type: 'network', icon: Wifi, label: 'Network Error', color: 'blue', hint: 'Check your connection and try again.' };
  if (msg.includes('chunk') || msg.includes('module') || msg.includes('import'))
    return { type: 'chunk', icon: PackageX, label: 'Module Load Error', color: 'yellow', hint: 'A page module failed to load. Try a hard refresh (Ctrl+Shift+R).' };
  if (msg.includes('undefined') || msg.includes('null') || msg.includes('cannot read'))
    return { type: 'runtime', icon: Bug, label: 'Runtime Error', color: 'red', hint: 'Unexpected data caused a crash. Our team has been notified.' };
  return { type: 'unknown', icon: AlertTriangle, label: 'Unexpected Error', color: 'amber', hint: 'Something went wrong. Please refresh and try again.' };
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retries: 0 };
    this._retryTimeout = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // If the app crashed because it's running a STALE deploy (old chunks whose
    // code no longer matches the current build), auto-recover once: clear caches
    // and hard-reload against fresh assets. Guarded so it can't loop.
    this._maybeRecoverStaleDeploy();

    try {
      console.error(
        `%c[Legion-Forged] Error Boundary Caught\n${FORGE_TAG}`,
        'color:#ef4444;font-weight:bold;font-family:monospace',
        '\nError:', error?.message,
        '\nStack:', error?.stack?.split('\n').slice(0,4).join('\n'),
      );
      import('@/components/monitoring/ErrorTracker').then(({ default: errorTracker }) => {
        errorTracker.captureError(error, {
          source: 'ErrorBoundary',
          componentStack: errorInfo?.componentStack?.split('\n').slice(0, 6).join('\n'),
          label: this.props.label || 'unknown',
        });
      }).catch(() => {});
    } catch {}
  }

  async _maybeRecoverStaleDeploy() {
    if (sessionStorage.getItem('ll_stale_recovered')) return;
    try {
      // Fetch the freshest index.html (bypass cache) and compare its referenced
      // asset hashes against the scripts currently running.
      const res = await fetch('/?_=' + Date.now(), { cache: 'no-store' });
      const html = await res.text();
      const freshAssets = new Set((html.match(/assets\/[A-Za-z0-9_-]+\.js/g) || []));
      const loaded = Array.from(document.querySelectorAll('script[src]'))
        .map(s => (s.getAttribute('src') || '').match(/assets\/[A-Za-z0-9_-]+\.js/)?.[0])
        .filter(Boolean);
      const isStale = loaded.some(src => freshAssets.size && !freshAssets.has(src));
      if (isStale) {
        sessionStorage.setItem('ll_stale_recovered', '1');
        if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
        if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.update())); }
        window.location.reload();
      }
    } catch (_) { /* best effort */ }
  }

  componentWillUnmount() {
    clearTimeout(this._retryTimeout);
  }

  handleRetry = () => {
    this.setState(s => ({ hasError: false, error: null, errorInfo: null, retries: s.retries + 1 }));
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Inline mode: used when ErrorBoundary wraps a sub-section (not the whole page)
    if (this.props.inline) {
      return (
        <div className="flex items-center justify-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="text-center">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-1" />
            <p className="text-red-300 text-xs">Section unavailable</p>
            <button onClick={this.handleRetry} className="text-white/40 text-xs mt-1 hover:text-white/70 underline">
              Retry
            </button>
          </div>
        </div>
      );
    }

    const { icon: Icon, label, color, hint } = classifyError(this.state.error);
    const msg = this.state.error?.message ?? 'Unknown error';
    const retries = this.state.retries;

    const colorMap = {
      blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: 'text-blue-400',   badge: 'bg-blue-500/10 text-blue-400' },
      yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: 'text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400' },
      red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: 'text-red-400',    badge: 'bg-red-500/10 text-red-400' },
      amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: 'text-amber-400',  badge: 'bg-amber-500/10 text-amber-400' },
    };
    const c = colorMap[color];

    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Forge badge */}
          <div className="flex items-center justify-center gap-2 text-white/20 text-xs font-mono">
            <Shield className="w-3 h-3" /> {FORGE_TAG}
          </div>

          {/* Error card */}
          <div className={`rounded-2xl border ${c.border} ${c.bg} p-8 text-center`}>
            <div className={`w-16 h-16 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center mx-auto mb-5`}>
              <Icon className={`w-8 h-8 ${c.icon}`} />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">{label}</h2>
            <p className="text-white/40 text-sm mb-4">{hint}</p>

            <div className="bg-black/30 rounded-xl p-3 mb-5 text-left">
              <p className="text-red-400/70 text-xs font-mono break-all line-clamp-3">{msg}</p>
            </div>

            {retries > 0 && (
              <p className="text-white/20 text-xs mb-3">Attempted {retries} time{retries > 1 ? 's' : ''}</p>
            )}

            <div className="flex gap-3">
              <Button
                onClick={this.handleRetry}
                className="flex-1 bg-white/[0.06] hover:bg-white/10 text-white border border-white/10"
                variant="ghost"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
              >
                Hard Reload
              </Button>
            </div>
          </div>

          {this.state.errorInfo && (
            <details className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4" open>
              <summary className="text-white/30 text-xs cursor-pointer select-none">Component Stack (tap to share with support)</summary>
              <pre className="text-white/40 text-[10px] mt-2 overflow-auto max-h-56 whitespace-pre-wrap">
                {String(this.state.error?.stack || this.state.error?.message || '')}
                {'\n---\n'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;