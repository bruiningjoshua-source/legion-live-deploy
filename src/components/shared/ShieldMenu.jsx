import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  X, 
  Home, 
  Radio, 
  Film, 
  Gamepad2, 
  ShoppingBag, 
  Users, 
  Heart,
  Trophy,
  Wallet,
  Settings,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Calendar,
  Target,
  Ticket,
  Sparkles,
  Crown,
  Award,
  Clock,
  History,
  Star,
  HelpCircle,
  FileText,
  Lock,
  Headphones,
  Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mainItems = [
  { name: 'Home', path: 'Home', icon: Home, color: 'text-amber-400' },
  { name: 'Live Streams', path: 'Explore', icon: Radio, color: 'text-red-400' },
  { name: 'Videos', path: 'TheAmphitheatre', icon: Film, color: 'text-blue-400' },
  { name: 'Gaming Hub', path: 'TheGamingHub', icon: Gamepad2, color: 'text-purple-400' },
  { name: 'Marketplace', path: 'AffiliateMarketplace', icon: ShoppingBag, color: 'text-emerald-400' },
  { name: 'Podcasts', path: 'Podcasts', icon: Headphones, color: 'text-orange-400' },
  { name: 'Podcast Studio', path: 'PodcastStudio', icon: Mic, color: 'text-rose-400' },
];

const expandableSections = [
  {
    title: 'Community',
    icon: Users,
    color: 'text-cyan-400',
    items: [
      { name: 'Fan Clubs', path: 'FanClubs', icon: Heart },
      { name: 'Watch Parties', path: 'WatchParties', icon: Users },
      { name: 'Forums', path: 'CommunityForums', icon: MessageSquare },
      { name: 'Events', path: 'Events', icon: Calendar },
    ]
  },
  {
    title: 'Rewards',
    icon: Trophy,
    color: 'text-yellow-400',
    items: [
      { name: 'Daily Quests', path: 'Quests', icon: Target },
      { name: 'Achievements', path: 'Achievements', icon: Award },
      { name: 'Leaderboard', path: 'Leaderboard', icon: Crown },
    ]
  },
  {
    title: 'Your Library',
    icon: Star,
    color: 'text-pink-400',
    items: [
      { name: 'Following', path: 'Following', icon: Heart },
      { name: 'Watch Later', path: 'WatchLater', icon: Clock },
      { name: 'History', path: 'WatchHistory', icon: History },
    ]
  },
  {
    title: 'Help & Info',
    icon: HelpCircle,
    color: 'text-white/60',
    items: [
      { name: 'Help & FAQ', path: 'HelpAndInfo', icon: HelpCircle },
      { name: 'Terms of Service', path: 'TermsOfService', icon: FileText },
      { name: 'Privacy Policy', path: 'PrivacyPolicy', icon: Lock },
    ]
  }
];

export default function ShieldMenu({ isOpen, onClose }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  const toggleSection = (title) => {
    setExpandedSection(expandedSection === title ? null : title);
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-gradient-to-b from-[#0f0f12] to-[#111114] border-r border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <span className="text-white font-bold">Legion Live</span>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Nav */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {mainItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.path} onClick={() => handleNavigate(createPageUrl(item.path))} className="w-full text-left">
                    <motion.div
                      whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    >
                      <Icon className={`w-5 h-5 ${item.color}`} />
                      <span className="text-white/80 font-medium">{item.name}</span>
                    </motion.div>
                  </button>
                );
              })}

              <div className="h-px bg-white/10 my-3" />

              {/* Expandable Sections */}
              {expandableSections.map((section) => {
                const SectionIcon = section.icon;
                const isExpanded = expandedSection === section.title;

                return (
                  <div key={section.title}>
                    <button
                      onClick={() => toggleSection(section.title)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <SectionIcon className={`w-5 h-5 ${section.color}`} />
                        <span className="text-white/80 font-medium">{section.title}</span>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-white/40" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-6 py-1 space-y-1">
                            {section.items.map((item) => {
                              const ItemIcon = item.icon;
                              return (
                                <button key={item.path} onClick={() => handleNavigate(createPageUrl(item.path))} className="w-full text-left">
                                  <motion.div
                                    whileHover={{ x: 4 }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5"
                                  >
                                    <ItemIcon className="w-4 h-4" />
                                    <span className="text-sm">{item.name}</span>
                                  </motion.div>
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

              <div className="h-px bg-white/10 my-3" />

              {/* Bottom Items */}
              <button onClick={() => handleNavigate(createPageUrl('Wallet'))} className="w-full text-left">
                <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span className="text-white/80 font-medium">Wallet</span>
                </motion.div>
              </button>
              <button onClick={() => handleNavigate(createPageUrl('Settings'))} className="w-full text-left">
                <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5">
                  <Settings className="w-5 h-5 text-white/40" />
                  <span className="text-white/80 font-medium">Settings</span>
                </motion.div>
              </button>
            </div>

            {/* Go Live Button */}
            <div className="p-4 border-t border-white/10">
              <motion.button
                onClick={() => handleNavigate(createPageUrl('GoLive'))}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold"
              >
                <Radio className="w-5 h-5" />
                Go Live
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}