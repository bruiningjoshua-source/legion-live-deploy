import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import NetworkStatus from '@/components/shared/NetworkStatus';
import AgeVerificationGate from '@/components/auth/AgeVerificationGate';
import { Toaster } from 'sonner';

export default function Layout({ children, currentPageName }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
      
      // Always show loading screen on app load (not stored in session)
      // This ensures it shows on every browser refresh/close-reopen
      const lastLoadTime = localStorage.getItem('lastAppLoadTime');
      const now = Date.now();
      // Show loading screen if more than 5 seconds since last load (covers refresh/reopen)
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Check age verification for non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin' && !user.age_verified) {
      setShowAgeVerification(true);
    } else {
      setShowAgeVerification(false);
    }
  }, [user]);

  const { data: wallet } = useQuery({
    queryKey: ['user-wallet', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      try {
        const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
        if (wallets.length > 0) return wallets[0];
        // Create wallet lazily in background
        return base44.entities.Wallet.create({ 
          user_email: user.email, 
          denarii_balance: 100,
          sestertii_balance: 0,
          as_balance: 0
        });
      } catch (error) {
        console.error('Wallet fetch failed:', error);
        return null;
      }
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1
  });

  // Removed authentication gate - app is publicly accessible

  return (
    <ErrorBoundary>
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
      <div className="min-h-screen bg-[#0f0f12]">
        {showLoadingScreen && <LoadingScreen onComplete={() => setShowLoadingScreen(false)} />}
      
      {/* Age Verification Gate - Admin users are excluded */}
      {showAgeVerification && user && user.role !== 'admin' && (
        <AgeVerificationGate 
          user={user} 
          onVerified={() => {
            setShowAgeVerification(false);
            refetchUser();
          }} 
        />
      )}

      <style>{`
        :root {
          --background: 15 15 18;
          --foreground: 245 245 250;
          --card: 22 22 28;
          --card-foreground: 245 245 250;
          --popover: 22 22 28;
          --popover-foreground: 245 245 250;
          --primary: 217 119 6;
          --primary-foreground: 255 255 255;
          --secondary: 35 35 42;
          --secondary-foreground: 245 245 250;
          --muted: 35 35 42;
          --muted-foreground: 140 140 150;
          --accent: 35 35 42;
          --accent-foreground: 245 245 250;
          --destructive: 220 38 38;
          --destructive-foreground: 255 255 255;
          --border: 45 45 55;
          --input: 35 35 42;
          --ring: 217 119 6;
          --radius: 0.75rem;
        }
        
        body {
          background: #0f0f12;
          color: #f5f5fa;
        }

        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        ::-webkit-scrollbar-track {
          background: #16161c;
        }

        ::-webkit-scrollbar-thumb {
          background: #3a3a48;
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #4a4a58;
        }

        /* Custom animations */
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 15px rgba(217, 119, 6, 0.2); }
          50% { box-shadow: 0 0 25px rgba(217, 119, 6, 0.35); }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
      
      <Navbar user={user} wallet={wallet} currentPageName={currentPageName} />
      
      <main className={`min-h-screen ${currentPageName === 'GoLive' || currentPageName === 'WatchStream' ? '' : 'pb-20'}`}>
        {children}
      </main>

      {currentPageName !== 'GoLive' && currentPageName !== 'WatchStream' && <BottomNav />}
      </div>
      </ErrorBoundary>
  );
}