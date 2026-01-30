import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  Home, 
  Radio,
  Film,
  ShoppingBag,
  User
} from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  // 4 Main Platforms + Profile
  const navItems = [
    { label: 'Home', path: createPageUrl('Home'), icon: Home },
    { label: 'Live', path: createPageUrl('Explore'), icon: Radio },
    { label: 'Go Live', path: createPageUrl('GoLive'), icon: Radio, highlight: true },
    { label: 'Videos', path: createPageUrl('TheAmphitheatre'), icon: Film },
    { label: 'Profile', path: createPageUrl('Profile'), icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath.includes(item.path.split('?')[0]);
          
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center justify-center flex-1 h-full">
              {item.highlight ? (
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative w-12 h-12 -mt-6 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30"
                >
                  <Icon className="w-5 h-5 text-white" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                </motion.div>
              ) : (
                <motion.div 
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <Icon className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-white' : 'text-white/40'
                  }`} />
                  <span className={`text-[10px] transition-colors ${
                    isActive ? 'text-white font-medium' : 'text-white/40'
                  }`}>
                    {item.label}
                  </span>
                </motion.div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}