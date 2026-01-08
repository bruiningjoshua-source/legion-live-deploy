import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Home, 
  Compass, 
  Radio,
  MessageCircle,
  User,
  Network,
  Music,
  Gamepad2
} from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { label: 'Home', path: createPageUrl('Home'), icon: Home },
    { label: 'Explore', path: createPageUrl('Explore'), icon: Compass },
    { label: 'Go Live', path: createPageUrl('GoLive'), icon: Radio, highlight: true },
    { label: 'Gaming', path: createPageUrl('TheGamingHub'), icon: Gamepad2 },
    { label: 'Profile', path: createPageUrl('Profile'), icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950 border-t border-amber-600/20 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath.includes(item.path);
          
          return (
            <Link key={item.path} to={item.path} className="flex-1 flex flex-col items-center justify-center gap-1 group">
              {item.highlight ? (
                <div className="w-12 h-12 -mt-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              ) : (
                <>
                  <Icon className={`w-6 h-6 transition-colors ${
                    isActive ? 'text-amber-400' : 'text-amber-400/50 group-hover:text-amber-400/80'
                  }`} />
                  <span className={`text-xs transition-colors ${
                    isActive ? 'text-amber-400 font-semibold' : 'text-amber-400/50 group-hover:text-amber-400/80'
                  }`}>
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}