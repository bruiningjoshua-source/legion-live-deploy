import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Home, Compass, Video, Bot, User } from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { id: 'live',    label: 'Live',    icon: Home,    path: createPageUrl('Home') },
  { id: 'explore', label: 'Explore', icon: Compass, path: createPageUrl('Explore') },
  { id: 'golive',  label: '',        icon: Video,   path: createPageUrl('GoLive'), center: true },
  { id: 'legion',  label: 'Legion',  icon: Bot,     path: createPageUrl('LegionAI') },
  { id: 'me',      label: 'Me',      icon: User,    path: createPageUrl('Profile') },
];

export default function BottomNav() {
  const location = useLocation();

  const isActive = (tab) => {
    if (tab.path.includes('?')) return location.search.includes(tab.path.split('?')[1]);
    return location.pathname === tab.path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Fade gradient above the bar */}
      <div
        className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
        style={{ background: 'linear-gradient(0deg, rgba(10,10,15,0.98) 0%, transparent 100%)' }}
      />
      <div
        className="relative bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.06]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center h-14 px-1">
          {TABS.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;

            /* ── Center broadcast button ── */
            if (tab.center) {
              return (
                <Link key={tab.id} to={tab.path} className="flex-1 flex items-center justify-center">
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="relative -mt-4"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
                        boxShadow: '0 4px 20px rgba(6,182,212,0.45)',
                      }}
                    >
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
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