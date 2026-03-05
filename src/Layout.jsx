import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ShieldMenu from '@/components/shared/ShieldMenu';
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
import useScrollPreservation from '@/components/navigation/useScrollPreservation';
import { Toaster } from 'sonner';

export default function Layout({ children, currentPageName }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [showShieldMenu, setShowShieldMenu] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('legion_theme') || 'roman');
  const [particleIntensity, setParticleIntensity] = useState(() => localStorage.getItem('legion_particles') || 'medium');
  const [animatedBg, setAnimatedBg] = useState(() => localStorage.getItem('legion_animated_bg') !== 'false');

  // Preserve scroll positions across navigation for native-like back stack
  useScrollPreservation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
      
      const lastLoadTime = localStorage.getItem('lastAppLoadTime');
      const now = Date.now();
      if (!lastLoadTime || (now - parseInt(lastLoadTime)) > 5000) {
        setShowLoadingScreen(true);
      }
      localStorage.setItem('lastAppLoadTime', now.toString());
    };
    checkAuth();
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
    if (user && user.role !== 'admin' && !user.age_verified) {
      setShowAgeVerification(true);
    } else {
      setShowAgeVerification(false);
    }
  }, [user]);

  // Show tutorial for new users
  useEffect(() => {
    if (user && !localStorage.getItem('legion_tutorial_completed')) {
      const timer = setTimeout(() => setShowTutorial(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const { data: wallet } = useQuery({
    queryKey: ['user-wallet', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      try {
        const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
        if (wallets.length > 0) return wallets[0];
        // Seed new users with 500 free Denarii to boost economy
        return base44.entities.Wallet.create({ 
          user_email: user.email, 
          denarii_balance: 500,
          sestertii_balance: 0,
          as_balance: 0
        });
      } catch (error) {
        console.error('Wallet fetch failed:', error);
        return null;
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
  const needsAnimatedBg = !['GoLive', 'WatchStream'].includes(currentPageName);
  const optimizedParticles = isMobile ? 'low' : particleIntensity;

  // CSS variables and animations are now in globals.css

  const handleTutorialComplete = () => {
    localStorage.setItem('legion_tutorial_completed', 'true');
    setShowTutorial(false);
  };

  const renderContent = () => (
    <>
      {showLoadingScreen && <LoadingScreen onComplete={() => setShowLoadingScreen(false)} />}
      
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
      
      <Navbar user={user} wallet={wallet} currentPageName={currentPageName} onOpenShieldMenu={() => setShowShieldMenu(true)} />
      
      <main className={`min-h-screen ${currentPageName === 'GoLive' || currentPageName === 'WatchStream' ? '' : 'pb-20'}`}>
        {children}
      </main>
      
      {currentPageName !== 'GoLive' && currentPageName !== 'WatchStream' && <BottomNav />}
      
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