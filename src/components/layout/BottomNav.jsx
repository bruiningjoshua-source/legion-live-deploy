import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  Home, 
  Compass,
  Film,
  User,
  Plus,
  Radio
} from 'lucide-react';

export default function BottomNav() {
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
                <motion.div 
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  {/* Outer glow ring */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl blur opacity-60" />
                  
                  {/* Main button */}
                  <div className="relative w-16 h-16 bg-gradient-to-br from-red-500 via-rose-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/50 border border-red-400/40">
                    <Icon className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={2.5} />
                    
                    {/* Live pulse indicator */}
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-black" />
                    </span>
                  </div>
                </motion.div>
              </Link>
            );
          }
          
          return (
            <Link key={item.key} to={item.path} className="flex-1 flex flex-col items-center justify-center py-1 min-w-0">
              <motion.div 
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1"
              >
                <motion.div 
                  className={`p-2 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 shadow-lg shadow-amber-500/10' 
                      : 'hover:bg-white/5'
                  }`}
                  animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Icon className={`w-5 h-5 transition-all duration-300 ${
                    isActive 
                      ? 'text-amber-400 drop-shadow-lg' 
                      : 'text-white/40 group-hover:text-white/60'
                  }`} />
                </motion.div>
                <span className={`text-[10px] font-semibold tracking-wide transition-colors duration-300 ${
                  isActive ? 'text-amber-400' : 'text-white/40'
                }`}>
                  {item.label}
                </span>
                
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}