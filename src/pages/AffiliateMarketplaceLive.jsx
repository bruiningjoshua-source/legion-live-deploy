import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { Play, Eye, Search, Bell, Cast, ShoppingBag, MoreVertical, Flame } from 'lucide-react';

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function StreamCard({ stream }) {
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`} className="block group">
      <div className="relative w-full rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.15] transition-all mb-2" style={{ aspectRatio: '16/9' }}>
        {stream.thumbnail_url ? (
          <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-950 to-black flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-white/10" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE
        </div>
        {stream.viewer_count > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/80 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md">
            <Eye className="w-2.5 h-2.5" />{formatCount(stream.viewer_count)}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-4 h-4 text-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="flex gap-2.5 px-0.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold line-clamp-2 leading-tight mb-0.5">{stream.title}</p>
          <p className="text-white/45 text-xs">{stream.creator_id}</p>
          {stream.viewer_count > 0 && <p className="text-white/30 text-[11px]">{formatCount(stream.viewer_count)} shopping</p>}
        </div>
        <button className="shrink-0 w-7 h-7 flex items-center justify-center text-white/30 hover:text-white transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </Link>
  );
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'featured', label: 'Featured' },
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New' },
];

export default function AffiliateMarketplaceLive() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data: streams = [] } = useQuery({
    queryKey: ['marketplace-live'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live', platform_type: 'affiliate_marketplace' }, '-viewer_count', 50),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    let result = streams;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.title?.toLowerCase().includes(q));
    }
    if (activeTab === 'featured') result = result.filter(s => s.is_featured);
    if (activeTab === 'trending') result = result.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0)).slice(0, 20);
    return result;
  }, [streams, search, activeTab]);

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white pb-24">
      <div className="sticky top-0 z-40 bg-[#0f0f10]/98 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {showSearch ? (
            <div className="flex-1 flex items-center gap-2 bg-white/[0.07] border border-white/[0.1] rounded-full px-3 h-9">
              <Search className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search shops…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
              />
              <button onClick={() => { setShowSearch(false); setSearch(''); }} className="text-white/40 hover:text-white text-xs">✕</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-500" />
                <span className="text-white font-bold text-base">Shop Live</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="text-white/60 hover:text-white transition-colors"><Cast className="w-5 h-5" /></button>
                <button className="text-white/60 hover:text-white transition-colors"><Bell className="w-5 h-5" /></button>
                <button onClick={() => setShowSearch(true)} className="text-white/60 hover:text-white transition-colors"><Search className="w-5 h-5" /></button>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide items-center">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'bg-white/[0.12] text-white/90 hover:bg-white/[0.18]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {filtered.length > 0 ? (
          filtered.map(stream => (
            <StreamCard key={stream.id} stream={stream} />
          ))
        ) : (
          <div className="text-center py-20">
            <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No live shops right now</p>
          </div>
        )}
      </div>
    </div>
  );
}