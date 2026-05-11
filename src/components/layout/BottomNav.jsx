import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Home, Compass, Radio, Tv, ShoppingBag } from 'lucide-react';

const TABS = [
  { id: "home",    label: "Home",    icon: Home,        path: createPageUrl("Home")            },
  { id: "explore", label: "Explore", icon: Compass,     path: createPageUrl("Explore")         },
  { id: "golive",  label: "Go Live", icon: Radio,       path: createPageUrl("GoLive"), live: true },
  { id: "watch",   label: "Watch",   icon: Tv,          path: createPageUrl("TheAmphitheatre") },
  { id: "market",  label: "Market",  icon: ShoppingBag, path: createPageUrl("AffiliateHub")    },
];

export default function BottomNav() {
  const location = useLocation();

  const isActive = (tab) => {
    if (tab.path.includes("?")) return location.search.includes(tab.path.split("?")[1]);
    return location.pathname === tab.path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div
        className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
        style={{ background: "linear-gradient(0deg, rgba(5,5,8,0.98) 0%, transparent 100%)" }}
      />
      <div
        className="relative mx-3 mb-3 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(13,13,20,0.92)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 -1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-center h-16 px-2">
          {TABS.map((tab) => {
            const active = isActive(tab);
            const Icon   = tab.icon;

            if (tab.live) {
              return (
                <Link key={tab.id} to={tab.path}
                  className="flex-1 flex flex-col items-center justify-center gap-1 h-full">
                  <motion.div
                    whileTap={{ scale: 0.86 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="relative"
                  >
                    <div
                      className="absolute -inset-1 rounded-2xl opacity-60"
                      style={{ background: "radial-gradient(circle, rgba(230,57,70,0.45) 0%, transparent 70%)", filter: "blur(6px)" }}
                    />
                    <div
                      className="relative w-14 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #e63946 0%, #c1121f 100%)", boxShadow: "0 4px 16px rgba(230,57,70,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" }}
                    >
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                  </motion.div>
                  <span className="text-[9px] font-bold tracking-wide" style={{ color: '#ff6b76', fontFamily: 'DM Sans, sans-serif' }}>
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link key={tab.id} to={tab.path}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 h-full relative">
                {active && (
                  <motion.div
                    layoutId="ll-nav-line"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent, #f5a623, transparent)' }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.82 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="w-10 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: active ? "rgba(245,166,35,0.12)" : "transparent",
                    boxShadow: active ? "0 0 12px rgba(245,166,35,0.15)" : "none",
                  }}
                >
                  <Icon
                    className="w-[18px] h-[18px] transition-all duration-200"
                    style={{
                      color: active ? '#f5a623' : 'rgba(255,255,255,0.35)',
                      filter: active ? 'drop-shadow(0 0 4px rgba(245,166,35,0.5))' : 'none',
                    }}
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                </motion.div>
                <span
                  className="text-[9px] tracking-wide transition-all duration-200"
                  style={{
                    color: active ? '#f5a623' : 'rgba(255,255,255,0.30)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {tab.label}
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