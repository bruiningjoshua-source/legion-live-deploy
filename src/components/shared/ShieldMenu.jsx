import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  X, Home, Radio, Film, Gamepad2, ShoppingBag, Users, Heart,
  Trophy, Wallet, Settings, ChevronDown, MessageSquare, Calendar,
  Target, Award, Crown, Clock, History, Star, HelpCircle, FileText,
  Lock, Headphones, Mic, Video, Sword, BarChart3, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Navigation Architecture ───────────────────────────────────────────────────
// CORE: The livestreaming hub — this is the center of the platform
// PLATFORMS: Segregated sub-platforms orbiting around live
// CREATOR: Creator tools
// PERSONAL: User account links
// META: Help/legal
// ─────────────────────────────────────────────────────────────────────────────

const CORE = [
  { name: 'Home',          path: 'Home',          icon: Home,         color: 'text-amber-400' },
  { name: 'Live Streams',  path: 'Explore',        icon: Radio,        color: 'text-red-400'   },
  { name: 'Events',        path: 'Events',         icon: Trophy,       color: 'text-yellow-400' },
  { name: 'Following',     path: 'Following',      icon: Heart,        color: 'text-pink-400'  },
];

const PLATFORMS = [
  {
    id: 'colosseum',
    name: 'The Colosseum',
    subtitle: 'Video & Shorts Platform',
    icon: Film,
    color: 'text-blue-400',
    accent: 'bg-blue-500/10 border-blue-500/20',
    path: 'TheAmphitheatre',
    children: [
      { name: 'All Videos',    path: 'TheAmphitheatre', icon: Film     },
      { name: 'Upload Video',  path: 'VideoUpload',     icon: Video    },
      { name: 'Watch Later',   path: 'WatchLater',      icon: Clock    },
      { name: 'History',       path: 'WatchHistory',    icon: History  },
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming Arena',
    subtitle: 'Live Gaming & Streams',
    icon: Gamepad2,
    color: 'text-purple-400',
    accent: 'bg-purple-500/10 border-purple-500/20',
    path: 'TheGamingHub',
    children: [
      { name: 'Gaming Hub',    path: 'TheGamingHub',   icon: Gamepad2  },
      { name: 'Games Expo',    path: 'GamesExpo',      icon: Sword     },
      { name: 'Tournaments',   path: 'GamesExpo',      icon: Trophy    },
    ],
  },
  {
    id: 'forums',
    name: 'The Senate',
    subtitle: 'Community Forums',
    icon: MessageSquare,
    color: 'text-cyan-400',
    accent: 'bg-cyan-500/10 border-cyan-500/20',
    path: 'CommunityForums',
    children: [
      { name: 'All Discussions', path: 'CommunityForums', icon: MessageSquare },
      { name: 'Fan Clubs',       path: 'FanClubs',         icon: Heart        },
      { name: 'Watch Parties',   path: 'WatchParties',     icon: Users        },
      { name: 'Events',          path: 'Events',           icon: Calendar     },
    ],
  },
  {
    id: 'affiliate',
    name: 'Merchant Hub',
    subtitle: 'Affiliate & Brand Deals',
    icon: ShoppingBag,
    color: 'text-emerald-400',
    accent: 'bg-emerald-500/10 border-emerald-500/20',
    path: 'AffiliateHub',
    children: [
      { name: 'Affiliate Hub',    path: 'AffiliateHub',       icon: ShoppingBag },
      { name: 'Marketplace',      path: 'AffiliateMarketplace', icon: Star       },
      { name: 'Brand Campaigns',  path: 'BrandCampaigns',      icon: Target      },
    ],
  },
];

const CREATOR_TOOLS = [
  { name: 'Creator Studio', path: 'CreatorStudio',  icon: Video,      color: 'text-amber-400' },
  { name: 'Go Live',        path: 'GoLive',         icon: Radio,      color: 'text-red-400'   },
  { name: 'Podcast Studio', path: 'PodcastStudio',  icon: Mic,        color: 'text-rose-400'  },
  { name: 'Analytics',      path: 'CreatorAnalytics', icon: BarChart3, color: 'text-blue-400' },
  { name: 'Monetization',   path: 'CreatorPayouts', icon: Zap,        color: 'text-green-400' },
];

const REWARDS = [
  { name: 'Daily Quests',   path: 'Quests',         icon: Target },
  { name: 'Achievements',   path: 'Achievements',   icon: Award  },
  { name: 'Leaderboard',    path: 'Leaderboard',    icon: Crown  },
];

const META = [
  { name: 'Help & FAQ',      path: 'HelpAndInfo',   icon: HelpCircle },
  { name: 'Terms of Service', path: 'TermsOfService', icon: FileText  },
  { name: 'Privacy Policy',  path: 'PrivacyPolicy', icon: Lock       },
];

export default function ShieldMenu({ isOpen, onClose }) {
  const [expandedPlatform, setExpandedPlatform] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const go = (path) => {
    onClose();
    navigate(createPageUrl(path));
  };

  const isActive = (path) => location.pathname === createPageUrl(path);

  const SectionHeader = ({ label }) => (
    <p className="px-3 pt-4 pb-1.5 text-amber-600/60 text-[10px] font-bold uppercase tracking-widest">{label}</p>
  );

  const NavItem = ({ item, indent = false }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <button
        key={item.path}
        onClick={() => go(item.path)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
          active
            ? 'bg-amber-500/15 border border-amber-500/20'
            : 'hover:bg-white/[0.04]'
        } ${indent ? 'pl-10' : ''}`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${item.color || (active ? 'text-amber-400' : 'text-white/40')}`} />
        <span className={`text-sm font-medium ${active ? 'text-amber-300' : 'text-white/70'}`}>{item.name}</span>
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed top-0 left-0 bottom-0 z-[61] w-72 flex flex-col"
            style={{ background: 'linear-gradient(160deg, #0f0c06 0%, #0d0b07 40%, #0a0804 100%)' }}
          >
            {/* Roman border decoration */}
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-amber-700/0 via-amber-700/40 to-amber-700/0" />

            {/* Header */}
            <div className="px-4 py-4 border-b border-amber-700/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🛡️</span>
                <div>
                  <p className="text-white font-black text-sm leading-none">LEGION LIVE</p>
                  <p className="text-amber-600/60 text-[10px] tracking-widest mt-0.5">PLATFORM NAVIGATION</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">

              {/* Core Navigation */}
              <SectionHeader label="Home Base" />
              {CORE.map(item => <NavItem key={item.path} item={item} />)}

              {/* ── Platforms ── */}
              <SectionHeader label="Platforms" />
              {PLATFORMS.map((platform) => {
                const PIcon = platform.icon;
                const isExpanded = expandedPlatform === platform.id;

                return (
                  <div key={platform.id}>
                    <button
                      onClick={() => setExpandedPlatform(isExpanded ? null : platform.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                        isExpanded ? 'bg-white/[0.05]' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${platform.accent} border flex items-center justify-center shrink-0`}>
                          <PIcon className={`w-4 h-4 ${platform.color}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-white/80 text-sm font-semibold leading-tight">{platform.name}</p>
                          <p className="text-white/30 text-[10px]">{platform.subtitle}</p>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4 text-white/30" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-3 pb-1 space-y-0.5">
                            {platform.children.map(child => {
                              const CIcon = child.icon;
                              return (
                                <button
                                  key={child.path + child.name}
                                  onClick={() => go(child.path)}
                                  className="w-full flex items-center gap-2.5 pl-10 pr-3 py-2 rounded-xl text-left text-white/55 hover:text-white/90 hover:bg-white/[0.04] transition-all"
                                >
                                  <CIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="text-xs font-medium">{child.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Creator Tools */}
              <SectionHeader label="Creator Tools" />
              <button
                onClick={() => setShowCreator(!showCreator)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <Video className="w-4 h-4 text-amber-400" />
                  <span className="text-white/70 text-sm font-medium">Creator Suite</span>
                </div>
                <motion.div animate={{ rotate: showCreator ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 text-white/30" />
                </motion.div>
              </button>
              <AnimatePresence>
                {showCreator && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-3 pb-1 space-y-0.5"
                  >
                    {CREATOR_TOOLS.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => go(item.path)}
                          className="w-full flex items-center gap-2.5 pl-10 pr-3 py-2 rounded-xl text-left text-white/55 hover:text-white/90 hover:bg-white/[0.04] transition-all"
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                          <span className="text-xs font-medium">{item.name}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rewards */}
              <SectionHeader label="Rewards" />
              <button
                onClick={() => setShowRewards(!showRewards)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-white/70 text-sm font-medium">Rewards & Progress</span>
                </div>
                <motion.div animate={{ rotate: showRewards ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 text-white/30" />
                </motion.div>
              </button>
              <AnimatePresence>
                {showRewards && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-3 pb-1 space-y-0.5"
                  >
                    {REWARDS.map(item => {
                      const Icon = item.icon;
                      return (
                        <button key={item.path} onClick={() => go(item.path)} className="w-full flex items-center gap-2.5 pl-10 pr-3 py-2 rounded-xl text-left text-white/55 hover:text-white/90 hover:bg-white/[0.04] transition-all">
                          <Icon className="w-3.5 h-3.5 shrink-0 text-yellow-500/70" />
                          <span className="text-xs font-medium">{item.name}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Account */}
              <SectionHeader label="Account" />
              <NavItem item={{ name: 'Wallet', path: 'Wallet', icon: Wallet, color: 'text-emerald-400' }} />
              <NavItem item={{ name: 'Settings', path: 'Settings', icon: Settings, color: 'text-white/40' }} />

              {/* Help */}
              <SectionHeader label="Info" />
              {META.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.path} onClick={() => go(item.path)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-all">
                    <Icon className="w-4 h-4 text-white/25" />
                    <span className="text-white/40 text-sm">{item.name}</span>
                  </button>
                );
              })}

              {/* Roman ornament footer */}
              <div className="py-6 flex items-center justify-center">
                <span className="text-amber-700/30 text-sm tracking-[0.4em]">⚔ · SPQR · ⚔</span>
              </div>
            </div>

            {/* Go Live CTA */}
            <div className="p-4 border-t border-amber-700/20 shrink-0">
              <motion.button
                onClick={() => go('GoLive')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-red-500/20 transition-all border border-red-500/30"
              >
                <Radio className="w-4 h-4" />
                Go Live Now
              </motion.button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}