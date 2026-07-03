import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Home, Compass, Radio, MessageCircle, User } from 'lucide-react';

const TABS = [
  { id: 'home',     label: 'Home',     icon: Home,          path: createPageUrl('Home') },
  { id: 'explore',  label: 'Explore',  icon: Compass,       path: createPageUrl('Explore') },
  { id: 'watch',    label: 'Watch',    icon: Radio,         path: createPageUrl('TheAmphitheatre'), center: true },
  { id: 'messages', label: 'Messages', icon: MessageCircle, path: createPageUrl('DirectMessages') },
  { id: 'me',       label: 'Me',       icon: User,          path: createPageUrl('Profile') },
];

export default function BottomNav() {
  const location = useLocation();

  const isActive = (tab) => {
    const tabPath = tab.path.split('?')[0];
    return location.pathname === tabPath;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div
        className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
        style={{ background: 'linear-gradient(0deg, rgba(10,10,15,0.98) 0%, transparent 100%)' }}
      />
      <div
        className="relative backdrop-blur-xl" style={{ background: "rgba(10,8,4,0.97)", borderTop: "1px solid rgba(200,135,26,0.12)" }}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center h-14 px-1">
          {TABS.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;

            /* ── Center Amphitheatre button ── */
            if (tab.center) {
              const amphActive = location.pathname === createPageUrl('TheAmphitheatre');
              return (
                <Link key={tab.id} to={tab.path} className="flex-1 flex items-center justify-center">
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="relative -mt-4"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: amphActive
                          ? 'linear-gradient(135deg, #8b1a1a 0%, #c42a2a 100%)'
                          : 'linear-gradient(180deg, #c8871a 0%, #8a5a0e 100%)',
                        boxShadow: amphActive ? '0 4px 20px rgba(139,26,26,0.6)' : '0 4px 20px rgba(200,135,26,0.4)',
                      }}
                    >
                      {/* Pulse dot when on amphitheatre */}
                      {amphActive && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white animate-pulse" />
                      )}
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <p className="text-[9px] text-center text-white/40 mt-0.5 font-medium">Watch</p>
                  </motion.div>
                </Link>
              );
            }

            /* ── Regular tabs ── */
            return (
              <Link key={tab.id} to={tab.path}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <Icon
                    className="w-[22px] h-[22px] transition-colors duration-200"
                    style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
                    strokeWidth={active ? 2.2 : 1.6}
                  />
                </motion.div>
                <span
                  className="text-[10px] transition-colors duration-200"
                  style={{
                    color: active ? '#ffffff' : 'rgba(255,255,255,0.35)',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
