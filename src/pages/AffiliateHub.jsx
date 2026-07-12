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
  const initial = brand.name?.charAt(0) || '?';
  const categoryColors = {
    'Retail': '#3b82f6', 'Live Commerce': '#ec4899', 'Streaming Gear': '#8b5cf6',
    'Gaming': '#ef4444', 'Tech / Software': '#06b6d4', 'Streaming Tools': '#6366f1',
    'Gaming / Energy': '#f97316', 'Music Licensing': '#a855f7', 'Multi-Streaming': '#0ea5e9',
    'Health & Wellness': '#10b981', 'Food & Lifestyle': '#f59e0b', 'Creator Merch': '#ec4899',
    'Education': '#3b82f6', 'Mobile & Lifestyle': '#f43f5e', 'Fashion & Style': '#e879f9',
    'Creator Gear': '#f97316', 'Health': '#10b981', 'Creator Business': '#8b5cf6',
  };
  const color = categoryColors[brand.category] || '#10b981';

  return (
    <a href={brand.url} target="_blank" rel="noopener noreferrer">
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
        className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          {/* Logo placeholder — first letter in brand color */}
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-base"
            style={{ background: color + '18', border: `1px solid ${color}30`, color }}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-white font-bold text-sm leading-tight">{brand.name}</p>
              {brand.badge && (
                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: color + '18', color, border: `1px solid ${color}30` }}>
                  {brand.badge}
                </span>
              )}
            </div>
            <p className="text-white/35 text-[11px] leading-relaxed mt-1 line-clamp-2">{brand.description}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: color + '15', color, border: `1px solid ${color}25` }}>
                {brand.commissionNote || `${brand.commission}%`}
              </span>
              <span className="text-white/25 text-[10px]">{brand.category}</span>
              {brand.minFollowers > 0 && (
                <span className="text-white/20 text-[10px]">{brand.minFollowers.toLocaleString()}+ followers</span>
              )}
            </div>
          </div>
        </div>
        {/* Tags */}
        {brand.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pl-14">
            {brand.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/25">#{t}</span>
            ))}
          </div>
        )}
      </motion.div>
    </a>
  );
}

// Seeded brand opportunities for the marketplace
// Real brand affiliate programs — sourced 2026
const BRAND_OPPORTUNITIES = [
  { name: 'Amazon Associates', category: 'Retail', description: `The world's largest affiliate program. Promote 350M+ products — gear reviews, unboxings, game setups. Cookie applies to the entire cart.`, commission: 4, commissionType: 'percentage', commissionNote: '1–10% by category', url: 'https://affiliate-program.amazon.com', tags: ['gear','gaming','lifestyle','retail'], minFollowers: 0, badge: 'No Minimum' },
  { name: 'Walmart Creator', category: 'Retail', description: `Up to 17.5% on select categories. No follower minimum. Access to the Affiliate Member Center with custom link generation, weekly tips, and deep analytics.`, commission: 10, commissionType: 'percentage', commissionNote: 'Up to 17.5%', url: 'https://affiliates.walmart.com', tags: ['retail','home','fashion','food'], minFollowers: 0, badge: 'No Minimum' },
  { name: 'TikTok Shop', category: 'Live Commerce', description: `Native live shopping for streamers. 5–20% commission by category — beauty up to 20%, electronics 5–8%. Direct product links during live streams convert at 3× standard posts.`, commission: 15, commissionType: 'percentage', commissionNote: '5–20% by category', url: 'https://shop.tiktok.com/business/creator', tags: ['beauty','fashion','electronics','live'], minFollowers: 1000, badge: 'Live Commerce' },
  { name: 'Elgato Creator Partner', category: 'Streaming Gear', description: `Official partner program for the #1 streaming gear brand. Stream Decks, capture cards, lighting, mics. Dedicated creator portal and audience discount codes.`, commission: 10, commissionType: 'percentage', commissionNote: '10% + bonuses', url: 'https://www.elgato.com/us/en/s/partner', tags: ['streaming','gaming','setup','gear'], minFollowers: 500, badge: 'Creator Gear' },
  { name: 'Razer Affiliate', category: 'Gaming', description: `Partner with gaming's most iconic brand. Headsets, keyboards, controllers, RGB peripherals. Creator discount codes, quarterly bonus tiers, dedicated affiliate dashboard.`, commission: 10, commissionType: 'percentage', commissionNote: '10% + quarterly bonuses', url: 'https://www.razer.com/affiliate', tags: ['gaming','esports','peripherals','pc'], minFollowers: 1000, badge: 'Gaming' },
  { name: 'NordVPN', category: 'Tech / Software', description: `Up to 100% commission on first month + 30% recurring. Every gaming and streaming audience needs privacy tools. One of the highest-paying programs in creator marketing.`, commission: 40, commissionType: 'percentage', commissionNote: 'Up to 100% first + 30% recurring', url: 'https://nordvpn.com/affiliates', tags: ['tech','security','software','streaming'], minFollowers: 0, badge: 'Top Payout' },
  { name: 'Streamlabs', category: 'Streaming Tools', description: `Official partner program for the leading streaming software. Earn 10% recurring on Streamlabs Ultra subscriptions. Perfect for Legion Live creators who also stream elsewhere.`, commission: 10, commissionType: 'percentage', commissionNote: '10% recurring', url: 'https://streamlabs.com/affiliate', tags: ['streaming','overlays','alerts','software'], minFollowers: 0, badge: 'Recurring' },
  { name: 'GFuel Creator Program', category: 'Gaming / Energy', description: `The official energy drink of esports and streaming. Creator partnerships include custom flavors, merch drops, and 15% commission. One of the most authentic brand fits in gaming.`, commission: 15, commissionType: 'percentage', commissionNote: '15% + merch perks', url: 'https://gfuel.com/pages/affiliate-application', tags: ['gaming','esports','energy','streaming'], minFollowers: 500, badge: 'Fan Favorite' },
  { name: 'Epidemic Sound', category: 'Music Licensing', description: `30% recurring commission on music licensing subscriptions. Every creator needs royalty-free music for streams and videos. Very low refund rate, strong LTV per referral.`, commission: 30, commissionType: 'percentage', commissionNote: '30% recurring', url: 'https://www.epidemicsound.com/referral', tags: ['music','streaming','content','audio'], minFollowers: 0, badge: 'Recurring' },
  { name: 'Restream', category: 'Multi-Streaming', description: `Earn 20% on every referred user's first payment. Referred users get $10 credit on signup. Ideal for creators expanding to multiple platforms simultaneously.`, commission: 20, commissionType: 'percentage', commissionNote: '20% first payment', url: 'https://restream.io/affiliate', tags: ['streaming','multistream','tools','growth'], minFollowers: 0, badge: 'New' },
  { name: 'iHerb', category: 'Health & Wellness', description: `20% commission on 18,000+ health supplements, vitamins, and wellness products shipped to 185 countries. Strong fit for fitness and self-care content creators.`, commission: 20, commissionType: 'percentage', commissionNote: '20% per sale', url: 'https://www.iherb.com/info/affiliates', tags: ['health','wellness','fitness','supplements'], minFollowers: 0, badge: 'Health' },
  { name: 'HelloFresh', category: 'Food & Lifestyle', description: `$52.50 flat per sale — one of the highest flat-rate payouts in lifestyle affiliate marketing. Meal kits convert well with lifestyle, fitness, and family-oriented creator audiences.`, commission: 52, commissionType: 'flat', commissionNote: '$52.50 per sale', url: 'https://www.hellofresh.com/pages/affiliate', tags: ['food','lifestyle','health','family'], minFollowers: 500, badge: 'Flat Rate' },
  { name: 'Printful', category: 'Creator Merch', description: `10% commission on print-on-demand merchandise. Launch branded merch with no inventory. Ideal for streamers ready to monetize their brand with hoodies, tees, and accessories.`, commission: 10, commissionType: 'percentage', commissionNote: '10% per sale', url: 'https://www.printful.com/affiliates', tags: ['merch','branding','streaming','creators'], minFollowers: 0, badge: 'Creator Merch' },
  { name: 'Skillshare', category: 'Education', description: `40% recurring for the first 4 months per referral. Converts well for creator audiences interested in video editing, music production, and design skills.`, commission: 40, commissionType: 'percentage', commissionNote: '40% x 4 months', url: 'https://www.skillshare.com/affiliates', tags: ['education','creative','skills','learning'], minFollowers: 0, badge: 'Recurring' },
  { name: 'ExpressVPN', category: 'Tech / Software', description: `Up to $36 flat per sale or 30% recurring. Consistently high conversion in gaming, streaming, and tech audiences. One of the strongest VPN affiliate programs for creators.`, commission: 30, commissionType: 'percentage', commissionNote: '$36 flat or 30% recurring', url: 'https://www.expressvpn.com/affiliates', tags: ['tech','vpn','security','gaming'], minFollowers: 0, badge: 'Top Payout' },
  { name: 'Ritual Vitamins', category: 'Health', description: `Up to 70% commission on first orders — among the highest-paying health programs. Strong subscription LTV. Wellness and lifestyle audiences convert at high rates.`, commission: 30, commissionType: 'percentage', commissionNote: 'Up to 70% first order', url: 'https://ritual.com/refer-a-friend', tags: ['health','wellness','supplements'], minFollowers: 1000, badge: 'High Commission' },
  { name: 'Casetify', category: 'Mobile & Lifestyle', description: `15% commission on customizable phone cases loved by the Gen Z creator economy. High visual appeal makes this naturally shareable content in any stream format.`, commission: 15, commissionType: 'percentage', commissionNote: '15% per sale', url: 'https://www.casetify.com/affiliates', tags: ['lifestyle','mobile','fashion','gen-z'], minFollowers: 1000, badge: 'Lifestyle' },
  { name: 'Moment Photography', category: 'Creator Gear', description: `Premium camera lenses and accessories for content creators. 10% commission with $150+ average order value. Best for IRL streaming, vlog, and photography-focused audiences.`, commission: 10, commissionType: 'percentage', commissionNote: '10% — avg $150 AOV', url: 'https://www.shopmoment.com/pages/affiliate-program', tags: ['photo','video','vlogging','irl','gear'], minFollowers: 1000, badge: 'Creator Gear' },
  { name: 'MVMT Watches', category: 'Fashion & Style', description: `12% commission on premium minimalist watches and accessories. Average order $130+. Fashion, lifestyle, and men's content converts especially well with this brand.`, commission: 12, commissionType: 'percentage', commissionNote: '12% — avg $130 AOV', url: 'https://www.mvmt.com/pages/affiliates', tags: ['fashion','lifestyle','accessories','style'], minFollowers: 2000, badge: 'Fashion' },
  { name: 'HoneyBook', category: 'Creator Business', description: `Up to $200 flat per referral on business management software for freelancers. Best for creators who manage client work, brand deal contracts, or bookings alongside their content.`, commission: 20, commissionType: 'percentage', commissionNote: 'Up to $200 per referral', url: 'https://www.honeybook.com/affiliates', tags: ['business','creators','tools','freelance'], minFollowers: 0, badge: 'Business' },
  { name: 'Printify', category: 'Creator Merch', description: `5% commission on a competing print-on-demand platform with 900+ products. Pairs well with Printful — recommend both and let your audience choose. No setup fee.`, commission: 5, commissionType: 'percentage', commissionNote: '5% per sale', url: 'https://printify.com/affiliates', tags: ['merch','print','creators','ecommerce'], minFollowers: 0, badge: 'Creator Merch' },
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