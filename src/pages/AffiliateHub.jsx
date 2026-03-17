import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShoppingBag, TrendingUp, Search, ChevronRight,
  Star, DollarSign, Zap, Award, Package, Tv, Eye,
  Radio, Play, Users, Flame, Crown, Grid3x3
} from 'lucide-react';
import AffiliateLiveSection from '@/components/affiliate/AffiliateLiveStream';

const TABS = ['Discover', 'Live Shopping', 'Marketplace', 'My Dashboard'];
const PRODUCT_CATS = ['All', 'Gaming', 'Fitness', 'Tech', 'Fashion', 'Beauty', 'Food'];

function AffiliateLiveCard({ stream }) {
  return (
    <Link to={createPageUrl('WatchAffiliateVideo') + `?id=${stream.id}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] mb-2 hover:border-emerald-500/30 transition-all duration-200">
          {stream.thumbnail_url ? (
            <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-900/30 to-black flex items-center justify-center">
              <Tv className="w-8 h-8 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> SHOP LIVE
          </div>
          {stream.viewer_count > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md">
              <Eye className="w-2.5 h-2.5" />{stream.viewer_count.toLocaleString()}
            </div>
          )}
          <div className="absolute bottom-2 left-2">
            <p className="text-white text-xs font-semibold line-clamp-1">{stream.title}</p>
          </div>
        </div>
        <p className="text-white/60 text-xs">{stream.creator_id}</p>
      </div>
    </Link>
  );
}

function ProductCard({ product }) {
  return (
    <div className="group p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/25 hover:bg-white/[0.06] transition-all duration-200 active:scale-[0.98]">
      <div className="w-full aspect-square rounded-xl bg-white/[0.05] flex items-center justify-center mb-3 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <Package className="w-8 h-8 text-white/15" />
        )}
      </div>
      <p className="text-white font-semibold text-xs line-clamp-2 mb-1.5">{product.title || 'Product'}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 text-emerald-400">
          <DollarSign className="w-3 h-3" />
          <span className="font-bold text-sm">{product.price || '—'}</span>
        </div>
        {product.commission_rate && (
          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-lg font-semibold">
            {product.commission_rate}% back
          </span>
        )}
      </div>
    </div>
  );
}

function DiscoverTab() {
  const { data: affiliateStreams = [] } = useQuery({
    queryKey: ['affiliate-live-streams'],
    queryFn: () => base44.entities.AffiliateLiveStream.filter({ status: 'live' }, '-viewer_count', 12),
    staleTime: 30 * 1000,
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['top-affiliate-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 6),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-7">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #0f172a 100%)' }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #10b981 0%, transparent 60%)' }} />
        <div className="relative p-5 sm:p-7">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">Affiliate Marketplace</span>
          </div>
          <h2 className="text-white font-black text-2xl sm:text-3xl mb-2 leading-tight">
            Stream. Sell.<br className="sm:hidden" /> <span className="text-emerald-400">Earn.</span>
          </h2>
          <p className="text-white/50 text-sm mb-4 max-w-xs">Share products live, earn commissions on every sale your viewers make.</p>
          <div className="flex gap-3">
            <Link to={createPageUrl('AffiliateMarketplace')}>
              <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-sm px-5 h-10 rounded-xl transition-all shadow-lg shadow-emerald-500/30">
                Browse Products
              </button>
            </Link>
            <Link to={createPageUrl('AffiliateDashboard')}>
              <button className="flex items-center gap-2 border border-white/20 text-white text-sm font-semibold px-4 h-10 rounded-xl hover:bg-white/10 transition-all">
                My Earnings
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Avg Commission', value: '12%', icon: Star, color: 'text-amber-400' },
          { label: 'Top Earners', value: '$2.4K', icon: Award, color: 'text-violet-400' },
          { label: 'Products', value: '500+', icon: Package, color: 'text-emerald-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
            <Icon className={`w-4 h-4 ${color} mx-auto mb-1.5`} />
            <p className="text-white font-bold text-base">{value}</p>
            <p className="text-white/35 text-[10px]">{label}</p>
          </div>
        ))}
      </div>

      {/* Live Shopping Streams */}
      {affiliateStreams.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-white font-bold text-sm">Live Shopping</h3>
            </div>
            <button
              className="text-emerald-400 text-xs font-medium hover:text-emerald-300"
              onClick={() => {}}
            >
              See all <ChevronRight className="w-3 h-3 inline" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {affiliateStreams.slice(0, 6).map(s => <AffiliateLiveCard key={s.id} stream={s} />)}
          </div>
        </div>
      )}

      {/* Top affiliate creators */}
      {creators.length > 0 && (
        <div>
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" /> Top Affiliates
          </h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {creators.map(c => (
              <Link key={c.id} to={createPageUrl('CreatorProfile') + `?id=${c.id}`} className="flex-shrink-0">
                <div className="flex flex-col items-center gap-1.5 w-16 group">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/[0.08] group-hover:border-emerald-500/40 transition-colors">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{c.display_name?.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-white/60 text-[10px] font-medium text-center truncate w-full">{c.display_name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MarketplaceTab() {
  const [productCat, setProductCat] = useState('All');
  const [search, setSearch] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['affiliate-products'],
    queryFn: () => base44.entities.AffiliateProduct.list('-created_date', 40),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = products.filter(p => {
    const matchCat = productCat === 'All' || p.category?.toLowerCase() === productCat.toLowerCase();
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 h-9 mb-3">
        <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent text-white text-sm placeholder:text-white/25 outline-none flex-1 min-w-0"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
        {PRODUCT_CATS.map(cat => (
          <button
            key={cat}
            onClick={() => setProductCat(cat)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              productCat === cat
                ? 'bg-emerald-500 text-white'
                : 'bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

export default function AffiliateHub() {
  const [activeTab, setActiveTab] = useState('Discover');

  return (
    <div className="min-h-screen text-white pt-14 bg-[#09090b]">

      {/* Header */}
      <div className="sticky top-14 z-40 bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <h1 className="text-white font-bold text-base">Merchant Hub</h1>
            </div>
            <Link to={createPageUrl('AffiliateDashboard')}>
              <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs px-3.5 h-8 rounded-xl transition-all">
                <TrendingUp className="w-3.5 h-3.5" /> Dashboard
              </button>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-emerald-600 text-white'
                    : 'text-white/45 hover:text-white hover:bg-white/[0.07]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5">
        {activeTab === 'Discover' && <DiscoverTab />}
        {activeTab === 'Live Shopping' && <AffiliateLiveSection />}
        {activeTab === 'Marketplace' && <MarketplaceTab />}
        {activeTab === 'My Dashboard' && (
          <div className="text-center py-12">
            <Link to={createPageUrl('AffiliateDashboard')}>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all">
                Open Full Dashboard →
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}