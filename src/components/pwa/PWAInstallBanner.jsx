/**
 * PWAInstallBanner — Shows install prompt on Android/Chrome.
 * On iOS, shows "Add to Home Screen" instructions since Apple
 * doesn't support the beforeinstallprompt API.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';

export default function PWAInstallBanner() {
  const [prompt, setPrompt]   = useState(null);  // beforeinstallprompt event
  const [show, setShow]       = useState(false);
  const [isIOS, setIsIOS]     = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) { setInstalled(true); return; }
    if (localStorage.getItem('pwa_dismissed')) return;

    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after 30s on first visit
      const shown = localStorage.getItem('pwa_ios_shown');
      if (!shown) setTimeout(() => setShow(true), 30000);
      return;
    }

    // Android/Chrome: listen for install prompt
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setShow(false); setInstalled(true); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_dismissed', '1');
    if (isIOS) localStorage.setItem('pwa_ios_shown', '1');
  };

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setShow(false);
  };

  if (installed || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-20 left-3 right-3 z-50 pointer-events-auto">
        <div className="ll-card p-4 flex items-center gap-3"
          style={{ background:'rgba(10,10,20,0.97)', borderColor:'rgba(245,166,35,0.3)', backdropFilter:'blur(16px)' }}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            {isIOS ? <Share className="w-5 h-5 text-amber-400" /> : <Download className="w-5 h-5 text-amber-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Install Legion Live</p>
            {isIOS ? (
              <p className="text-white/40 text-xs mt-0.5">
                Tap <Share className="w-3 h-3 inline" /> then "Add to Home Screen"
              </p>
            ) : (
              <p className="text-white/40 text-xs mt-0.5">Add to your home screen for the best experience</p>
            )}
          </div>
          {!isIOS && (
            <button onClick={install}
              className="px-3 py-2 rounded-xl text-xs font-bold ll-interactive shrink-0"
              style={{ background:'rgba(245,166,35,0.2)', border:'1px solid rgba(245,166,35,0.4)', color:'#f5a623' }}>
              Install
            </button>
          )}
          <button onClick={dismiss} className="ll-interactive shrink-0 p-1">
            <X className="w-4 h-4 text-white/30" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
