import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'

function renderFatalError(error) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
                background:#050508;color:#fff;font-family:system-ui,sans-serif;padding:24px;text-align:center;">
      <div style="max-width:420px;">
        <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
        <h1 style="font-size:18px;font-weight:700;margin-bottom:8px;">Legion Live failed to load</h1>
        <p style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:16px;">
          ${error?.message ? String(error.message).slice(0, 200) : 'An unexpected error occurred while starting the app.'}
        </p>
        <button onclick="window.location.reload()"
          style="padding:10px 20px;border-radius:12px;background:#f5a623;color:#000;
                 font-weight:700;border:none;font-size:14px;">
          Reload
        </button>
      </div>
    </div>
  `;
}

async function boot() {
  // Theme init wrapped — must never block app mount even if it throws
  try {
    const { initColorScheme } = await import('./lib/darkMode.js');
    initColorScheme();
  } catch (e) {
    console.warn('[main] Theme init failed, continuing with default styling:', e);
  }

  try {
    const { default: App } = await import('@/App.jsx');
    ReactDOM.createRoot(document.getElementById('root')).render(
      <App />
    );
  } catch (error) {
    // If the app fails to even mount, show a real error instead of a blank
    // screen — this is the failure mode that previously produced a totally
    // silent black page with no diagnostic information at all.
    console.error('[main] Fatal: app failed to mount:', error);
    renderFatalError(error);
  }
}

boot();

// ── PWA Service Worker Registration ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}
