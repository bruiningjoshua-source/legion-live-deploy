import React, { memo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { scrollPositions } from '@/components/navigation/useScrollPreservation';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, 
  Compass,
  Wallet,
  Film,
  User,
  Radio
} from 'lucide-react';

const BottomNav = memo(function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Check if user is authenticated and if they're live
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: creator } = useQuery({
    queryKey: ['bottom-nav-creator', currentUser?.email],
    queryFn: () => base44.entities.Creator.filter({ user_email: currentUser.email }, null, 1).then(r => r[0] || null),
    enabled: !!currentUser?.email,
    staleTime: 60000,
    retry: 1,
  });

  const isLive = creator?.is_live === true;
  const isAuthenticated = !!currentUser;

  // Swap Videos for Wallet when authenticated
  const navItems = [
    { label: 'Home', path: createPageUrl('Home'), icon: Home, key: 'home' },
    { label: 'Explore', path: createPageUrl('Explore'), icon: Compass, key: 'explore' },
    { label: isLive ? 'Live' : 'Go Live', path: createPageUrl('GoLive'), icon: Radio, highlight: true, key: 'golive' },
    isAuthenticated
      ? { label: 'Wallet', path: createPageUrl('Wallet'), icon: Wallet, key: 'wallet' }
      : { label: 'Videos', path: createPageUrl('TheAmphitheatre'), icon: Film, key: 'videos' },
    { label: 'Profile', path: createPageUrl('Profile'), icon: User, key: 'profile' }
  ];

  // Exact match for top-level routes
  const isActivePath = (itemPath) => {
    const pathPart = itemPath.split('?')[0];
    return currentPath === pathPart;
  };

  const handleTabPress = useCallback((targetPath, e) => {
    e.preventDefault();
    const targetClean = targetPath.split('?')[0];
    const currentClean = currentPath.split('?')[0];
    scrollPositions.set(currentClean, window.scrollY);

    if (currentClean === targetClean) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(targetPath, { replace: true });
    }
  }, [currentPath, navigate]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Background */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
      
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/[0.06]" />
      
      <div className="relative flex items-center justify-around h-16 max-w-lg mx-auto px-4 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(item.path);
          
          if (item.highlight) {
            return (
              <a key={item.key} href={item.path} onClick={(e) => handleTabPress(item.path, e)} className="flex items-center justify-center -mt-6">
                <div className="relative active:scale-95 transition-transform">
                  {/* Outer glow */}
                  <div className={`absolute -inset-1 rounded-2xl blur opacity-50 ${
                    isLive 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                      : 'bg-gradient-to-br from-red-500 to-orange-500'
                  }`} />
                  
                  {/* Main button */}
                  <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl border ${
                    isLive
                      ? 'bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 border-green-400/40'
                      : 'bg-gradient-to-br from-red-500 via-rose-500 to-orange-600 border-red-400/40'
                  }`}>
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
                    
                    {/* Indicator dot: pulsing red when not live, solid green when live */}
                    {isLive ? (
                      <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4">
                        <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-green-500 border-2 border-black" />
                      </span>
                    ) : (
                      <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-red-500 border-2 border-black" />
                      </span>
                    )}
                  </div>
                </div>
              </a>
            );
          }
          
          return (
            <a key={item.key} href={item.path} onClick={(e) => handleTabPress(item.path, e)} className="flex-1 flex flex-col items-center justify-center py-1 min-w-0 active:scale-95 transition-transform">
              <div className="flex flex-col items-center gap-0.5">
                <Icon className={`w-[22px] h-[22px] transition-colors ${
                  isActive ? 'text-white' : 'text-white/35'
                }`} />
                <span className={`text-[10px] font-medium ${
                  isActive ? 'text-white' : 'text-white/35'
                }`}>
                  {item.label}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </nav>
  );
});

export default BottomNav;