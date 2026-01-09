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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-stone-950 via-stone-950/98 to-stone-950/95 border-t border-amber-600/20 pb-safe backdrop-blur-lg">
      <div className="flex items-center justify-around min-h-[64px] max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath.includes(item.path.split('?')[0]);
          
          return (
            <Link key={item.path} to={item.path} className="flex-1 flex flex-col items-center justify-center gap-1 group">
              {item.highlight ? (
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-14 h-14 -mt-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 border-4 border-stone-950"
                >
                  <Icon className="w-6 h-6 text-white" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-stone-950 animate-pulse" />
                </motion.div>
              ) : (
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <div className={`p-2 rounded-xl transition-all ${
                    isActive ? 'bg-amber-600/20' : ''
                  }`}>
                    <Icon className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-amber-400' : 'text-amber-400/50 group-hover:text-amber-400/80'
                    }`} />
                  </div>
                  <span className={`text-[10px] transition-colors ${
                    isActive ? 'text-amber-400 font-semibold' : 'text-amber-400/50 group-hover:text-amber-400/80'
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