import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { initLegionForge, legionBus, legionStorage } from '@/components/core/legion';
import Navbar from '@/components/layout/Navbar.jsx';
import BottomNav from '@/components/layout/BottomNav.jsx';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ShieldMenu from '@/components/shared/ShieldMenu.jsx';
import AnimatedBackground from '@/components/shared/AnimatedBackground';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import NetworkStatus from '@/components/shared/NetworkStatus';
import { RateLimitProvider } from '@/components/security/RateLimiter';
import { CSRFProvider } from '@/components/security/CSRFProtection';
import { ErrorTrackerProvider } from '@/components/monitoring/ErrorTracker';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import CustomerSupport from '@/components/support/CustomerSupport';
import AgeVerificationGate from '@/components/auth/AgeVerificationGate';
import AdvancedThemeCustomizer from '@/components/settings/AdvancedThemeCustomizer';
import GettingStartedTutorial from '@/components/onboarding/GettingStartedTutorial';
import CreatorOnboarding from '@/components/onboarding/CreatorOnboarding';
import useScrollPreservation from '@/components/navigation/useScrollPreservation';
import NotificationService from '@/components/services/NotificationService';
import OfflineService from '@/components/services/OfflineService';
import { Toaster } from 'sonner';
import { AnimatePresence } from 'framer-motion';

export default function Layout({ children, currentPageName }) {
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [showShieldMenu, setShowShieldMenu] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Single initializer for all localStorage-backed preferences (via legionStorage)
  const [prefs, setPrefs] = useState(() => ({
    theme:      legionStorage.get('theme', 'roman'),
    particles:  legionStorage.get('particles', 'medium'),
    animatedBg: legionStorage.get('animated_bg', true),
  }));
  const currentTheme = prefs.theme;
  const particleIntensity = prefs.particles;
  const animatedBg = prefs.animatedBg;
  const setCurrentTheme     = useCallback((v) => { legionStorage.set('theme', v);       setPrefs(p => ({ ...p, theme: v })); }, []);
  const setParticleIntensity= useCallback((v) => { legionStorage.set('particles', v);    setPrefs(p => ({ ...p, particles: v })); }, []);
  const setAnimatedBg       = useCallback((v) => { legionStorage.set('animated_bg', v);  setPrefs(p => ({ ...p, animatedBg: v })); }, []);

  // Boot the Legion forge fingerprint + tamper detection
  useEffect(() => {
    const cleanup = initLegionForge();
    return cleanup;
  }, []);

  // Preserve scroll positions across navigation for native-like back stack
  useScrollPreservation();

  // Initialize offline support
  useEffect(() => {
    OfflineService.init();
  }, []);

  // Layout is only rendered when user is authenticated (App.jsx gates this).
  // Skip redundant base44.auth.isAuthenticated() — trust the parent auth context.
  const isAuthenticated = true;

  useEffect(() => {
    // Show loading screen on fresh app load; suppress on navigations within session
    const sessionKey = window.__legionSessionStarted;
    if (!sessionKey) {
      window.__legionSessionStarted = true;
      setShowLoadingScreen(true);
    }
  }, []);

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1
  });

  useEffect(() => {
    // Age verification gate disabled — all users set to verified in DB
    setShowAgeVerification(false);
  }, [user]);

  // Show tutorial for new users — cleanup ensures it only fires once
  useEffect(() => {
    if (user && !localStorage.getItem('legion_tutorial_completed')) {
      const timer = setTimeout(() => setShowTutorial(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user?.email]);

  // Start live notification monitoring for followed creators
  useEffect(() => {
    if (user?.email) {
      NotificationService.startMonitoring(user.email);
      return () => NotificationService.stopMonitoring();
    }
  }, [user?.email]);

  const walletCreatingRef = useRef(false);
  const { data: wallet } = useQuery({
    queryKey: ['user-wallet', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      // Mutex via ref to prevent race-condition double-create
      if (walletCreatingRef.current) return null;
      try {
        const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
        if (wallets.length > 0) return wallets[0];
        walletCreatingRef.current = true;
        // Double-check after acquiring mutex (another query could have created it)
        const recheck = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
        if (recheck.length > 0) {
          walletCreatingRef.current = false;
          return recheck[0];
        }
        const newWallet = await base44.entities.Wallet.create({ 
          user_email: user.email, 
          denarii_balance: 500,
          sestertii_balance: 0,
          as_balance: 0
        });
        walletCreatingRef.current = false;
        return newWallet;
      } catch (error) {
        walletCreatingRef.current = false;
        console.error('Wallet fetch failed:', error);
        // One more attempt to fetch in case create failed due to race
        const fallback = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1).catch(() => []);
        return fallback[0] || null;
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1
  });

  // Disable heavy animations on mobile for performance
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const needsAnimatedBg = !['GoLive', 'WatchStream', 'LegionAI'].includes(currentPageName);
  const optimizedParticles = isMobile ? 'low' : particleIntensity;

  // CSS variables and animations are now in globals.css

  // Listen for theme changes via the Legion event bus (Settings page)
  useEffect(() => {
    const unsub = legionBus.on('theme-change', ({ theme, particles, animatedBg: bg }) => {
      if (theme)             setCurrentTheme(theme);
      if (particles)         setParticleIntensity(particles);
      if (bg !== undefined)  setAnimatedBg(bg);
    });
    // Also keep the legacy DOM-event listener for backward compat
    const domHandler = (e) => {
      if (e.detail?.theme)              setCurrentTheme(e.detail.theme);
      if (e.detail?.particles)          setParticleIntensity(e.detail.particles);
      if (e.detail?.animatedBg !== undefined) setAnimatedBg(e.detail.animatedBg);
    };
    window.addEventListener('legion-theme-change', domHandler);
    return () => { unsub(); window.removeEventListener('legion-theme-change', domHandler); };
  }, [setCurrentTheme, setParticleIntensity, setAnimatedBg]);

  const handleTutorialComplete = () => {
    localStorage.setItem('legion_tutorial_completed', 'true');
    setShowTutorial(false);
  };

  const renderContent = () => (
    <>
      <AnimatePresence>
        {showLoadingScreen && <LoadingScreen onComplete={() => setShowLoadingScreen(false)} />}
      </AnimatePresence>

      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Creator Onboarding — shown once on first login */}
      <AnimatePresence>
        {showOnboarding && user && (
          <CreatorOnboarding user={user} onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('legion_onboarding_done', '1');
          }} />
        )}
      </AnimatePresence>
      
      {showTutorial && (
        <GettingStartedTutorial 
          onComplete={handleTutorialComplete} 
          onDismiss={handleTutorialComplete} 
        />
      )}
      
      <ShieldMenu isOpen={showShieldMenu} onClose={() => setShowShieldMenu(false)} />
      
      {showAgeVerification && user && user.role !== 'admin' && (
        <AgeVerificationGate 
          user={user} 
          onVerified={() => { setShowAgeVerification(false); refetchUser(); }} 
        />
      )}
      
      {/* Theme variables are now in globals.css */}
      
      {currentPageName !== 'VideoEditor' && (
        <Navbar user={user} wallet={wallet} currentPageName={currentPageName} onOpenShieldMenu={() => setShowShieldMenu(true)} />
      )}
      
      <main className={`${
        ['GoLive', 'WatchStream', 'VideoEditor'].includes(currentPageName)
          ? 'h-screen overflow-hidden'
        : currentPageName === 'LegionAI'
          ? 'h-screen overflow-hidden pb-16'
          : 'min-h-screen pb-24'
      }`}>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-white/40 text-xs font-medium">Loading…</span>
            </div>
          </div>
        }>
          {children}
        </Suspense>
      </main>
      
      {!['GoLive', 'WatchStream', 'VideoEditor'].includes(currentPageName) && <BottomNav />}
      
      <InstallPrompt />
      
      <div className="fixed bottom-24 left-4 z-40">
        <CustomerSupport user={user} />
      </div>
    </>
  );

  return (
    <ErrorBoundary>
      <CSRFProvider>
        <RateLimitProvider>
          <ErrorTrackerProvider user={user}>
            <NetworkStatus />
            <Toaster 
              position="top-center" 
              toastOptions={{
                style: {
                  background: '#1c1917',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  color: '#fef3c7'
                }
              }}
            />
            
            {needsAnimatedBg ? (
              <AnimatedBackground 
                theme={currentTheme} 
                intensity={optimizedParticles}
                showParticles={optimizedParticles !== 'off'}
              >
                <div className="min-h-screen">
                  <div className="fixed bottom-24 right-4 z-40">
                    <AdvancedThemeCustomizer
                      currentTheme={currentTheme}
                      onThemeChange={setCurrentTheme}
                      particleIntensity={particleIntensity}
                      onParticleChange={setParticleIntensity}
                      animatedBg={animatedBg}
                      onAnimatedBgChange={setAnimatedBg}
                      user={user}
                    />
                  </div>
                  {renderContent()}
                </div>
              </AnimatedBackground>
            ) : (
              <div className="min-h-screen bg-[#0f0f12]">
                {renderContent()}
              </div>
            )}
          </ErrorTrackerProvider>
        </RateLimitProvider>
      </CSRFProvider>
    </ErrorBoundary>
  );
}