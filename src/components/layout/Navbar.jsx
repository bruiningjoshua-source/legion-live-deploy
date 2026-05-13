import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Sword, Bell } from 'lucide-react';
import NotificationBell from '@/components/social/NotificationBell';

export default function Navbar({ user, wallet, currentPageName, onOpenShieldMenu }) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(createPageUrl('Explore') + '?q=' + encodeURIComponent(searchQuery.trim()));
      setSearchQuery('');
      setSearchOpen(false);
    }
    if (e.key === 'Escape') setSearchOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[#0a0a0f]/95 backdrop-blur-2xl border-b border-white/[0.06]'
        : 'bg-[#0a0a0f]/80 backdrop-blur-sm'
    }`}>
      <div className="px-4 h-14 flex items-center justify-between gap-3"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Left: Logo */}
        <Link to={createPageUrl('Home')} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
            <Sword className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-black text-white text-lg tracking-tight leading-none">
            LEGION<span className="text-amber-400"> LIVE</span>
          </span>
        </Link>

        {/* Right: Search + Notifications */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 180, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center bg-white/[0.08] border border-white/[0.1] rounded-full px-3 h-8 overflow-hidden"
              >
                <Search className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  className="bg-transparent text-white text-sm placeholder:text-white/30 outline-none ml-2 w-full min-w-0"
                />
                <button onClick={() => setSearchOpen(false)} className="text-white/30 hover:text-white/60 flex-shrink-0 ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
            )}
          </AnimatePresence>

          {user && <NotificationBell user={user} />}
        </div>
      </div>
    </nav>
  );
}