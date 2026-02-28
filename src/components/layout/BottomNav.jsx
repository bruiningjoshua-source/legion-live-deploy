import React, { memo, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Home, 
  Compass,
  Film,
  User,
  Radio
} from 'lucide-react';

const BottomNav = memo(function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { label: 'Home', path: createPageUrl('Home'), icon: Home, key: 'home' },
    { label: 'Explore', path: createPageUrl('Explore'), icon: Compass, key: 'explore' },
    { label: 'Go Live', path: createPageUrl('GoLive'), icon: Radio, highlight: true, key: 'golive' },
    { label: 'Videos', path: createPageUrl('TheAmphitheatre'), icon: Film, key: 'videos' },
    { label: 'Profile', path: createPageUrl('Profile'), icon: User, key: 'profile' }
  ];

  const isActivePath = (itemPath) => {
    const pathPart = itemPath.split('?')[0];
    return currentPath === pathPart || currentPath.startsWith(pathPart + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
      {/* Gradient blur background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/98 to-transparent backdrop-blur-2xl" />
      
      {/* Subtle top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      
      <div className="relative flex items-center justify-around h-18 max-w-lg mx-auto px-4 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(item.path);
          
          if (item.highlight) {
            return (
              <Link key={item.key} to={item.path} className="flex items-center justify-center -mt-6">
                <div className="relative active:scale-95 transition-transform">
                  {/* Outer glow */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl blur opacity-50" />
                  
                  {/* Main button */}
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-red-500 via-rose-500 to-orange-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl border border-red-400/40">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
                    
                    {/* Live indicator */}
                    <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-green-500 border-2 border-black" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          }
          
          return (
            <Link key={item.key} to={item.path} className="flex-1 flex flex-col items-center justify-center py-1 min-w-0 active:scale-95 transition-transform">
              <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors ${
                  isActive ? 'bg-amber-500/15' : ''
                }`}>
                  <Icon className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-amber-400' : 'text-white/40'
                  }`} />
                </div>
                <span className={`text-[9px] sm:text-[10px] font-semibold ${
                  isActive ? 'text-amber-400' : 'text-white/40'
                }`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

export default BottomNav;