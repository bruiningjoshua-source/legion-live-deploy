import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Tv, Gamepad2, Search, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { name: 'Home',    path: createPageUrl('Home'),            icon: Home,     label: 'Home' },
  { name: 'Gaming',  path: createPageUrl('GamingHub'),       icon: Gamepad2, label: 'Gaming' },
  { name: 'GoLive',  path: createPageUrl('GoLive'),          icon: Radio,    label: 'Go Live', highlight: true },
  { name: 'Live',    path: createPageUrl('TheAmphitheatre'), icon: Tv,       label: 'Live' },
  { name: 'Explore', path: createPageUrl('Explore'),         icon: Search,   label: 'Explore' },
];

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path) => {
    const pagePart = path.split('page=')[1];
    if (pagePart) return location.search.includes(`page=${pagePart}`);
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="bg-[#0a0a0d]/95 backdrop-blur-2xl border-t border-amber-500/10 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-around px-2 h-16">
          {tabs.map(({ name, path, icon: Icon, label, highlight }) => {
            const active = isActive(path);
            return (
              <Link
                key={name}
                to={path}
                className="flex flex-col items-center justify-center flex-1 h-full relative gap-1 group"
              >
                {/* Active indicator bar */}
                {active && !highlight && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {highlight ? (
                  <div className={`w-12 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                    active
                      ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/40'
                      : 'bg-gradient-to-br from-red-500/80 to-red-600/80 hover:from-red-500 hover:to-red-600 shadow-red-500/25'
                  }`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className={`w-10 h-8 rounded-xl flex items-center justify-center transition-all ${
                    active ? 'bg-amber-500/15 border border-amber-400/25' : 'group-active:bg-white/[0.06]'
                  }`}>
                    <Icon className={`w-5 h-5 transition-colors ${
                      active ? 'text-amber-300' : 'text-white/40 group-hover:text-white/70'
                    }`} />
                  </div>
                )}

                <span className={`text-[10px] font-medium leading-none transition-colors ${
                  highlight
                    ? 'text-red-300'
                    : active ? 'text-amber-300' : 'text-white/35'
                }`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="h-safe-area-bottom" />
      </div>
    </nav>
  );
}