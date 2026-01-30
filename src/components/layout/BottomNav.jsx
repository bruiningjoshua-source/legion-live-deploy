import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  Home, 
  Radio,
  Film,
  Compass,
  User,
  Plus
} from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { label: 'Home', path: createPageUrl('Home'), icon: Home, key: 'home' },
    { label: 'Explore', path: createPageUrl('Explore'), icon: Compass, key: 'explore' },
    { label: 'Go Live', path: createPageUrl('GoLive'), icon: Plus, highlight: true, key: 'golive' },
    { label: 'Videos', path: createPageUrl('TheAmphitheatre'), icon: Film, key: 'videos' },
    { label: 'Profile', path: createPageUrl('Profile'), icon: User, key: 'profile' }
  ];

  const isActivePath = (itemPath) => {
    const pathPart = itemPath.split('?')[0];
    return currentPath === pathPart || currentPath.startsWith(pathPart + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(item.path);
          
          if (item.highlight) {
            return (
              <Link key={item.key} to={item.path} className="flex items-center justify-center -mt-4">
                <motion.div 
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="relative w-14 h-14 bg-gradient-to-br from-red-500 via-rose-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/40 border border-red-400/30"
                >
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black animate-pulse" />
                </motion.div>
              </Link>
            );
          }
          
          return (
            <Link key={item.key} to={item.path} className="flex-1 flex flex-col items-center justify-center py-2 min-w-0">
              <motion.div 
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1"
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-white/10' : ''
                }`}>
                  <Icon className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-white/40'
                  }`} />
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-white/40'
                }`}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}