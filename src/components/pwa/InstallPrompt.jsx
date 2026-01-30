import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Smartphone, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after user has been on the site for a bit
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      
      if (!dismissed || daysSinceDismissed > 7) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show custom prompt
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem('pwa_ios_prompt_dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      
      if (!dismissed || daysSinceDismissed > 30) {
        setTimeout(() => setShowPrompt(true), 10000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(
      isIOS ? 'pwa_ios_prompt_dismissed' : 'pwa_prompt_dismissed', 
      Date.now().toString()
    );
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
        >
          <Card className="bg-stone-900/95 border-amber-500/30 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-4">
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-amber-400/70 hover:text-amber-200"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-amber-100 font-semibold mb-1">Install Legion Live</h3>
                  <p className="text-amber-200/60 text-sm mb-3">
                    {isIOS 
                      ? 'Add to your home screen for the best experience'
                      : 'Install our app for faster access and offline features'
                    }
                  </p>

                  {isIOS ? (
                    <div className="text-amber-200/70 text-xs space-y-1">
                      <p className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-amber-600/20 flex items-center justify-center">1</span>
                        Tap <Share className="w-4 h-4 inline mx-1" /> Share button
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-amber-600/20 flex items-center justify-center">2</span>
                        Scroll and tap "Add to Home Screen"
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleInstall}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Install App
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}