import React, { memo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { scrollPositions } from '@/components/navigation/useScrollPreservation';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { QK, STALE } from '@/components/core/queryKeys';
import { Home, Compass, Wallet, User, Radio } from 'lucide-react';

const BottomNav = memo(function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const { data: currentUser } = useQuery({
    queryKey: QK.user(),
    queryFn: () => base44.auth.me(),
    staleTime: STALE.SLOW,
    retry: 1,
  });

  const { data: creator } = useQuery({
    queryKey: QK.creators.byEmail(currentUser?.email),
    queryFn: () =>
      base44.entities.Creator.filter({ user_email: currentUser.email }, null, 1).then(r => r[0] || null),
    enabled: !!currentUser?.email,
    staleTime: STALE.MEDIUM,
    retry: 1,
  });

  const isLive = creator?.is_live === true;
  const isAuthenticated = !!currentUser;

  const navItems = [
    { label: 'Home',    path: createPageUrl('Home'),     icon: Home,    key: 'home' },
    { label: 'Explore', path: createPageUrl('Explore'),  icon: Compass, key: 'explore' },
    { label: isLive ? 'Live' : 'Go Live', path: createPageUrl('GoLive'), icon: Radio, highlight: true, key: 'golive' },
    isAuthenticated
      ? { label: 'Wallet',  path: createPageUrl('Wallet'),   icon: Wallet, key: 'wallet' }
      : { label: 'Explore', path: createPageUrl('Explore'),  icon: Compass, key: 'explore2' },
    { label: 'Profile', path: createPageUrl('Profile'),  icon: User,    key: 'profile' },
  ];

  const isActivePath = (itemPath) => currentPath === itemPath.split('?')[0];

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
      {/* Roman-themed background */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0804] via-[#0a0804]/97 to-[#0a0804]/80 backdrop-blur-2xl" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-600/30 to-transparent" />

      <div className="relative flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(item.path);

          if (item.highlight) {
            return (
              <a
                key={item.key}
                href={item.path}
                onClick={(e) => handleTabPress(item.path, e)}
                className="flex items-center justify-center -mt-5"
              >
                <div className="relative active:scale-90 transition-transform">
                  {/* Gold ring around live button */}
                  <div className={`absolute inset-0 rounded-3xl ${isLive ? 'ring-2 ring-green-400/50' : 'ring-2 ring-amber-500/40'} rounded-3xl`} />
                  <div className={`relative w-14 h-14 rounded-3xl flex items-center justify-center shadow-2xl border ${
                    isLive
                      ? 'bg-gradient-to-br from-green-500 to-emerald-700 border-green-400/30 shadow-green-500/30'
                      : 'bg-gradient-to-br from-red-600 to-rose-700 border-red-400/30 shadow-red-500/30'
                  }`}>
                    <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0804] ${isLive ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              </a>
            );
          }

          return (
            <a
              key={item.key}
              href={item.path}
              onClick={(e) => handleTabPress(item.path, e)}
              className="flex-1 flex flex-col items-center justify-center py-1.5 active:scale-95 transition-all"
            >
              <div className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all ${
                active ? 'bg-amber-500/15' : ''
              }`}>
                <Icon className={`w-5 h-5 transition-all ${active ? 'text-amber-400' : 'text-white/30'}`} strokeWidth={2} />
                <span className={`text-[9px] font-bold tracking-wide ${active ? 'text-amber-400' : 'text-white/30'}`}>
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