import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { Search, ShoppingBag, Star, TrendingUp } from 'lucide-react';

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function AffiliateMarketplaceExplore() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: allStreams = [] } = useQuery({
    queryKey: ['marketplace-explore'],
    queryFn: () => base44.entities.Stream.filter({ platform_type: 'affiliate_marketplace' }, '-created_date', 200),
    staleTime: 5 * 60_000,
  });

  const categories = ['all', 'fashion', 'beauty', 'home', 'tech', 'food'];

  const filtered = useMemo(() => {
    let result = allStreams;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.title?.toLowerCase().includes(q));
    }
    if (activeCategory !== 'all') {
      result = result.filter(s => s.category?.includes(activeCategory) || s.tags?.some(t => t.includes(activeCategory)));
    }
    return result;
  }, [allStreams, search, activeCategory]);

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white pb-24">
      <div className="sticky top-0 z-40 bg-[#0f0f10]/98 backdrop-blur-xl border-b border-white/[0.05] px-4 py-4">
        <div className="flex items-center gap-2 bg-white/[0.07] border border-white/[0.1] rounded-full px-3 h-10 mb-4">
          <Search className="w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search products, shops…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                activeCategory === cat
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/[0.12] text-white/80 hover:bg-white/[0.18]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-6 space-y-8">
        {/* Featured Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-emerald-400" />
            <h2 className="text-white font-bold text-lg">Featured Shops</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {filtered.filter(s => s.is_featured).slice(0, 4).map(stream => (
              <Link key={stream.id} to={createPageUrl('WatchStream') + `?id=${stream.id}`}>
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]" style={{ aspectRatio: '1/1' }}>
                    {stream.thumbnail_url ? (
                      <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-teal-950 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-white/20" />
                      </div>
                    )}
                    {stream.status === 'live' && (
                      <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] font-bold px-2 py-1 rounded">LIVE</div>
                    )}
                  </div>
                  <div className="px-0.5">
                    <p className="text-white text-xs font-semibold line-clamp-2">{stream.title}</p>
                    <p className="text-white/50 text-[10px] mt-1">{formatCount(stream.viewer_count)} viewers</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* All Shops */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-bold text-lg">All Shops</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {filtered.slice(0, 50).map(stream => (
              <Link key={stream.id} to={createPageUrl('WatchStream') + `?id=${stream.id}`}>
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]" style={{ aspectRatio: '1/1' }}>
                    {stream.thumbnail_url ? (
                      <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-teal-950 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-white/20" />
                      </div>
                    )}
                    {stream.status === 'live' && (
                      <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] font-bold px-2 py-1 rounded">LIVE</div>
                    )}
                  </div>
                  <div className="px-0.5">
                    <p className="text-white text-xs font-semibold line-clamp-2">{stream.title}</p>
                    <p className="text-white/50 text-[10px] mt-1">{formatCount(stream.viewer_count)} viewers</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No shops found</p>
          </div>
        )}
      </div>
    </div>
  );
}