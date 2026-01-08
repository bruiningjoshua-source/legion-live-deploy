import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';

export default function Layout({ children, currentPageName }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (!authenticated) {
        base44.auth.redirectToLogin();
      }
    };
    checkAuth();
  }, []);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated
  });

  const { data: wallet } = useQuery({
    queryKey: ['user-wallet', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
      if (wallets.length > 0) return wallets[0];
      // Create wallet if doesn't exist
      return base44.entities.Wallet.create({ 
        user_email: user.email, 
        denarii_balance: 100, // Starting bonus
        sestertii_balance: 0,
        as_balance: 0
      });
    },
    enabled: !!user?.email
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">🏛️</span>
          </div>
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Legion Live</h1>
          <p className="text-amber-400/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950">
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
      
      <main>
        {children}
      </main>
    </div>
  );
}