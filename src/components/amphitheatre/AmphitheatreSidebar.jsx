import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { History, BookmarkIcon, ListVideo, Clock, TrendingUp, Home, Compass } from 'lucide-react';

export default function AmphitheatreSidebar() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  return (
    <div className="hidden md:flex flex-col w-64 bg-stone-900/50 border-r border-stone-800 h-screen sticky top-14 overflow-y-auto">
      {/* Main Navigation */}
      <div className="p-4 space-y-2">
        <Link to={createPageUrl('Home')}>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-stone-800/50 text-stone-300 hover:text-white transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-sm font-medium">Home</span>
          </div>
        </Link>
        <Link to={createPageUrl('Explore')}>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-stone-800/50 text-stone-300 hover:text-white transition-colors">
            <Compass className="w-5 h-5" />
            <span className="text-sm font-medium">Explore</span>
          </div>
        </Link>
        <Link to={createPageUrl('TheAmphitheatre')}>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-stone-800 text-white transition-colors">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Amphitheatre</span>
          </div>
        </Link>
      </div>

      <div className="border-t border-stone-800" />

      {/* User Features (if logged in) */}
      {user && (
        <>
          <div className="p-4">
            <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-3">Your Library</p>
            <div className="space-y-2">
              <Link to={createPageUrl('WatchHistory')}>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-stone-800/50 text-stone-300 hover:text-white transition-colors text-sm">
                  <History className="w-4 h-4" />
                  <span>History</span>
                </div>
              </Link>
              <Link to={createPageUrl('WatchLater')}>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-stone-800/50 text-stone-300 hover:text-white transition-colors text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Watch Later</span>
                </div>
              </Link>
              <Link to={createPageUrl('Playlists')}>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-stone-800/50 text-stone-300 hover:text-white transition-colors text-sm">
                  <ListVideo className="w-4 h-4" />
                  <span>Playlists</span>
                </div>
              </Link>
            </div>
          </div>

          <div className="border-t border-stone-800" />

          {/* Subscriptions */}
          <div className="p-4">
            <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-3">Subscriptions</p>
            <p className="text-stone-400 text-xs text-center py-4">No subscriptions yet</p>
          </div>
        </>
      )}
    </div>
  );
}