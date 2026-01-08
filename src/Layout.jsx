import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';

export default function Layout({ children, currentPageName }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    checkAuth();
  }, []);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

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
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Legion Live" />
        <meta name="theme-color" content="#0c0a09" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>🏛️</text></svg>" />
      </head>
      <style>{`
        :root {
          --background: 12 10 9;
          --foreground: 254 243 199;
          --card: 28 25 23;
          --card-foreground: 254 243 199;
          --popover: 28 25 23;
          --popover-foreground: 254 243 199;
          --primary: 217 119 6;
          --primary-foreground: 255 255 255;
          --secondary: 68 64 60;
          --secondary-foreground: 254 243 199;
          --muted: 68 64 60;
          --muted-foreground: 161 161 170;
          --accent: 68 64 60;
          --accent-foreground: 254 243 199;
          --destructive: 239 68 68;
          --destructive-foreground: 254 243 199;
          --border: 68 64 60;
          --input: 68 64 60;
          --ring: 217 119 6;
          --radius: 0.75rem;
        }
        
        body {
          background: linear-gradient(to bottom, #0c0a09, #1c1917, #0c0a09);
          color: #fef3c7;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #1c1917;
        }

        ::-webkit-scrollbar-thumb {
          background: #78350f;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #92400e;
        }

        /* Custom animations */
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
          50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.5); }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
      
      <Navbar user={user} wallet={wallet} />
      
      <main className="pb-20">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}