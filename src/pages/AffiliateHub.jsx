import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShoppingBag, TrendingUp, Search, ChevronRight, DollarSign, Package, Tv, Eye,
  Radio, Crown,
  Tag, Percent, ArrowRight, Store,
  Heart, Sparkles
} from 'lucide-react';

const PRODUCT_CATS = [
  { id: 'all', label: 'All', emoji: '🛍️' },
  { id: 'tech', label: 'Tech', emoji: '🎮' },
  { id: 'fashion', label: 'Fashion', emoji: '👗' },
  { id: 'beauty', label: 'Beauty', emoji: '💄' },
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'food', label: 'Food', emoji: '🍕' },
  { id: 'services', label: 'Services', emoji: '⚡' },
];

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function LiveStreamCard({ stream }) {
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`}>
      <motion.div whileTap={{ scale: 0.97 }} className="group">
        <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-white/[0.06] hover:border-emerald-500/40 transition-all">
          {stream.thumbnail_url ? (
            <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-900/40 to-black flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-white/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
          
          {/* Live badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> LIVE
          </div>

          {/* Viewer count */}
          {stream.viewer_count > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md">
              <Eye className="w-2.5 h-2.5" />{formatCount(stream.viewer_count)}
            </div>
          )}

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white text-xs font-bold line-clamp-2 mb-1">{stream.title}</p>
            {stream.stream_products_count > 0 && (
              <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-2 py-0.5 w-fit">
                <Package className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-300 text-[9px] font-semibold">{stream.stream_products_count} products</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function ProductCard({ product }) {
  const [liked, setLiked] = useState(false);
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className="group relative rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all overflow-hidden"
    >
      {/* Product image */}
      <div className="relative aspect-square overflow-hidden bg-white/[0.03]">
        {product.product_image_url || product.image_url ? (
          <img
            src={product.product_image_url || product.image_url}
            alt={product.product_name || product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-white/10" />
          </div>
        )}

        {/* Commission badge */}
        {product.commission_rate && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
            <Percent className="w-2.5 h-2.5" />{product.commission_rate}%
          </div>
        )}

        {/* Like button */}
        <button
          onClick={(e) => { e.preventDefault(); setLiked(v => !v); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? 'text-red-400 fill-red-400' : 'text-white/60'}`} />
        </button>
      </div>

      {/* Product info */}
      <div className="p-3">
        <p className="text-white font-semibold text-xs line-clamp-2 mb-2 leading-snug">
          {product.product_name || product.title || 'Product'}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-bold text-sm">
              {product.price_usd || product.price || '—'}
            </span>
          </div>
          <a
            href={product.product_url || product.affiliate_link || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold px-2 py-1 rounded-lg transition-all"
          >
            Shop <ArrowRight className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function CreatorStorefront({ creator }) {
  return (
    <Link to={createPageUrl('CreatorProfile') + `?id=${creator.id}`}>
      <motion.div whileTap={{ scale: 0.97 }}
        className="group flex flex-col items-center gap-2 w-20">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/[0.08] group-hover:border-emerald-500/50 transition-all">
          {creator.avatar_url ? (
            <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-white font-black text-lg">{creator.display_name?.charAt(0)}</span>
            </div>
          )}
          {creator.is_live && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-[8px] font-bold text-center py-0.5">
              LIVE
            </div>
          )}
        </div>
        <p className="text-white/60 text-[10px] font-medium text-center truncate w-full">{creator.display_name}</p>
        {creator.total_earnings_denarii > 0 && (
          <p className="text-emerald-400 text-[9px]">${(creator.total_earnings_denarii / 180 * 0.85).toFixed(0)} earned</p>
        )}
      </motion.div>
    </Link>
  );
}

function BrandOpportunityCard({ brand }) {
  return (
    <motion.div whileHover={{ y: -2 }}
      className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/20 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <span className="text-2xl">{brand.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{brand.name}</p>
          <p className="text-white/40 text-xs line-clamp-2 mt-0.5">{brand.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {brand.commission}% commission
            </span>
            <span className="text-white/30 text-xs">{brand.products} products</span>
          </div>
        </div>
        <button className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-all">
          Apply
        </button>
      </div>
    </motion.div>
  );
}

// Seeded brand opportunities for the marketplace
const BRAND_OPPORTUNITIES = [
  { emoji: '💻', name: 'TechFlow Pro', description: 'Premium tech accessories and gadgets for streamers and creators', commission: 15, products: 48 },
  { emoji: '👟', name: 'StrideWear', description: 'Athletic footwear and performance clothing for active lifestyles', commission: 12, products: 124 },
  { emoji: '💄', name: 'GlowLab Beauty', description: 'Clean beauty products loved by influencers worldwide', commission: 18, products: 89 },
  { emoji: '🎮', name: 'GameVault', description: 'Gaming peripherals, accessories and setup gear', commission: 10, products: 203 },
  { emoji: '🏠', name: 'HomeCraft', description: 'Premium home decor and lifestyle products for modern living', commission: 14, products: 156 },
  { emoji: '🥗', name: 'NutriBox', description: 'Health foods, supplements and wellness products', commission: 20, products: 67 },
  { emoji: '📸', name: 'LensLife', description: 'Photography and videography gear for content creators', commission: 11, products: 92 },
  { emoji: '🎵', name: 'SoundWave Audio', description: 'Professional audio equipment for musicians and podcasters', commission: 13, products: 44 },
];

const TABS = [
  { id: 'discover', label: 'Discover', emoji: '🔥' },
  { id: 'live', label: 'Live Shopping', emoji: '📺' },
  { id: 'products', label: 'Products', emoji: '🛍️' },
  { id: 'brands', label: 'Brands', emoji: '🏷️' },
  { id: 'creators', label: 'Creators', emoji: '⭐' },
];

export default function AffiliateHub() {
  const [activeTab, setActiveTab] = useState('discover');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ['affiliate-live-streams'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live', platform_type: 'affiliate_marketplace' }, '-viewer_count', 12),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['affiliate-products-all'],
    queryFn: () => base44.entities.AffiliateProduct.list('-created_date', 60),
    staleTime: 5 * 60 * 1000,
  });

  const { data: topCreators = [] } = useQuery({
    queryKey: ['top-affiliate-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 12),
    staleTime: 5 * 60 * 1000,
  });

  const { data: creator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      const c = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return c[0] || null;
    },
    enabled: !!user?.email,
  });

  const filteredProducts = useMemo(() => {
    let result = products;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.product_name || p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }
    if (activeCategory !== 'all') {
      result = result.filter(p => p.category?.toLowerCase() === activeCategory);
    }
    return result;
  }, [products, search, activeCategory]);

  return (
    <div className="min-h-screen bg-[#07090f] text-white pb-24">

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 bg-[#07090f]/98 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-screen-xl mx-auto px-4">
          
          {/* Top bar */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-black text-sm leading-none">Legion Market</h1>
                <p className="text-emerald-400 text-[9px] leading-none mt-0.5">Live Commerce Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {creator && (
                <Link to={createPageUrl('AffiliateGoLive')}>
                  <button className="flex items-center gap-1.5 bg-red-500 hover:bg-red-400 text-white font-bold text-xs px-3 py-1.5 rounded-full transition-all">
                    <Radio className="w-3 h-3" /> Go Live
                  </button>
                </Link>
              )}
              <Link to={createPageUrl('AffiliateDashboard')}>
                <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1.5 rounded-full transition-all">
                  <TrendingUp className="w-3 h-3" /> Dashboard
                </button>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 pb-3 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
                }`}>
                <span>{tab.emoji}</span> {tab.label}
                {tab.id === 'live' && liveStreams.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5">

        {/* ── DISCOVER TAB ── */}
        {activeTab === 'discover' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

            {/* Hero */}
            <div className="relative rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f172a 100%)' }}>
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(16,185,129,0.3) 0%, transparent 60%)' }} />
              <div className="relative p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">Legion Market</span>
                </div>
                <h2 className="text-white font-black text-3xl mb-2 leading-tight">
                  Shop Live.<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                    Earn Every Sale.
                  </span>
                </h2>
                <p className="text-white/50 text-sm mb-5 max-w-xs">
                  The future of live commerce. Stream products, earn commissions, build your brand.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setActiveTab('products')}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30">
                    <ShoppingBag className="w-4 h-4" /> Browse Products
                  </button>
                  <button onClick={() => setActiveTab('brands')}
                    className="flex items-center gap-2 border border-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-white/10 transition-all">
                    <Tag className="w-4 h-4" /> View Brands
                  </button>
                </div>
              </div>

              {/* Stats strip */}
              <div className="border-t border-white/10 grid grid-cols-3 divide-x divide-white/10">
                {[
                  { label: 'Avg Commission', value: '14%', icon: '💰' },
                  { label: 'Active Brands', value: `${BRAND_OPPORTUNITIES.length}`, icon: '🏷️' },
                  { label: 'Live Now', value: `${liveStreams.length}`, icon: '📺' },
                ].map(stat => (
                  <div key={stat.label} className="px-4 py-3 text-center">
                    <p className="text-white font-black text-lg">{stat.icon} {stat.value}</p>
                    <p className="text-white/30 text-[10px]">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Live now */}
            {liveStreams.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="text-white font-black text-base">Live Shopping</h3>
                    <span className="bg-red-500/15 border border-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      {liveStreams.length} LIVE
                    </span>
                  </div>
                  <button onClick={() => setActiveTab('live')}
                    className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    See all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {liveStreams.slice(0, 4).map(s => <LiveStreamCard key={s.id} stream={s} />)}
                </div>
              </div>
            )}

            {/* Featured products */}
            {products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-black text-base">Featured Products</h3>
                  <button onClick={() => setActiveTab('products')}
                    className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    See all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}

            {/* Brand opportunities */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-black text-base">Brand Partnerships</h3>
                <button onClick={() => setActiveTab('brands')}
                  className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {BRAND_OPPORTUNITIES.slice(0, 3).map((brand, i) => (
                  <BrandOpportunityCard key={i} brand={brand} />
                ))}
              </div>
            </div>

            {/* Top creators */}
            {topCreators.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <h3 className="text-white font-black text-base">Top Affiliates</h3>
                  </div>
                  <button onClick={() => setActiveTab('creators')}
                    className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    See all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                  {topCreators.map(c => <CreatorStorefront key={c.id} creator={c} />)}
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-white font-black text-base mb-4">How Legion Market Works</h3>
              <div className="space-y-4">
                {[
                  { emoji: '1️⃣', title: 'Apply to Brand Campaigns', desc: 'Browse brands and apply to promote their products. Get approved instantly for most campaigns.' },
                  { emoji: '2️⃣', title: 'Go Live and Showcase Products', desc: 'Stream with products pinned to your broadcast. Viewers click and buy in real time.' },
                  { emoji: '3️⃣', title: 'Earn Commission on Every Sale', desc: 'Get paid automatically. Commissions range from 10-20% per sale with no caps.' },
                  { emoji: '4️⃣', title: 'Withdraw Anytime', desc: 'Cash out to your bank, PayPal or crypto. Minimum $5, processed within 2-3 business days.' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{step.emoji}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{step.title}</p>
                      <p className="text-white/40 text-xs mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LIVE SHOPPING TAB ── */}
        {activeTab === 'live' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-white font-black text-xl">Live Shopping</h2>
              {liveStreams.length > 0 && (
                <span className="bg-red-500/15 border border-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {liveStreams.length} LIVE
                </span>
              )}
            </div>
            {liveStreams.length === 0 ? (
              <div className="text-center py-20">
                <Tv className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">No live shopping streams</h3>
                <p className="text-white/30 text-sm mb-6">Be the first to go live and start selling</p>
                {creator && (
                  <Link to={createPageUrl('AffiliateGoLive')}>
                    <button className="flex items-center gap-2 bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl mx-auto">
                      <Radio className="w-4 h-4" /> Start Live Shopping
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {liveStreams.map(s => <LiveStreamCard key={s.id} stream={s} />)}
              </div>
            )}
          </motion.div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 h-10">
              <Search className="w-4 h-4 text-white/30 shrink-0" />
              <input type="text" placeholder="Search products..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-white text-sm placeholder:text-white/25 outline-none flex-1" />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {PRODUCT_CATS.map(cat => (
                <button key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeCategory === cat.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1]'
                  }`}>
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>

            {/* Products grid */}
            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-white/[0.04] animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30">No products found</p>
              </div>
            ) : (
              <>
                <p className="text-white/30 text-xs">{filteredProducts.length} products</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── BRANDS TAB ── */}
        {activeTab === 'brands' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div>
              <h2 className="text-white font-black text-xl mb-1">Brand Partnerships</h2>
              <p className="text-white/40 text-sm">Apply to promote brands and earn commissions on every sale</p>
            </div>

            {/* Brand signup CTA */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/20">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Are you a brand?</p>
              <p className="text-white font-semibold text-sm mb-3">List your products and reach thousands of live shopping creators</p>
              <Link to={createPageUrl('BrandCampaigns')}>
                <button className="flex items-center gap-2 bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-xl">
                  <Store className="w-4 h-4" /> List Your Brand
                </button>
              </Link>
            </div>

            <div className="space-y-3">
              {BRAND_OPPORTUNITIES.map((brand, i) => (
                <BrandOpportunityCard key={i} brand={brand} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── CREATORS TAB ── */}
        {activeTab === 'creators' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div>
              <h2 className="text-white font-black text-xl mb-1">Top Affiliate Creators</h2>
              <p className="text-white/40 text-sm">Follow top performers and learn what works</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {topCreators.map((creator, i) => (
                <Link key={creator.id} to={createPageUrl('CreatorProfile') + `?id=${creator.id}`}>
                  <motion.div whileTap={{ scale: 0.97 }}
                    className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <span className="text-white font-black">{creator.display_name?.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-bold text-sm truncate">{creator.display_name}</p>
                        <p className="text-white/30 text-xs capitalize">{creator.category || 'General'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 rounded-xl bg-white/[0.03]">
                        <p className="text-white font-bold text-sm">{formatCount(creator.follower_count)}</p>
                        <p className="text-white/30 text-[10px]">Followers</p>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-white/[0.03]">
                        <p className="text-emerald-400 font-bold text-sm">{creator.total_streams || 0}</p>
                        <p className="text-white/30 text-[10px]">Streams</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}