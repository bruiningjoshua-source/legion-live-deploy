import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Package, DollarSign, ExternalLink,
  Play, Eye, Radio, Percent, Star, ArrowRight,
  Clock, Gavel, TrendingUp, Tag
} from 'lucide-react';

function ProductCard({ product, compact = false }) {
  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
      className="group rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 overflow-hidden transition-all">
      <div className={`relative ${compact ? 'aspect-square' : 'aspect-[4/3]'} bg-white/[0.03]`}>
        {product.product_image_url ? (
          <img src={product.product_image_url} alt={product.product_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-white/10" />
          </div>
        )}
        {product.commission_rate && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
            <Percent className="w-2.5 h-2.5" />{product.commission_rate}%
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-white font-semibold text-xs line-clamp-2 mb-2">{product.product_name}</p>
        <div className="flex items-center justify-between">
          <span className="text-emerald-400 font-black text-sm">${product.price_usd || '—'}</span>
          <a href={product.product_url || '#'} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-semibold px-2 py-1 rounded-lg transition-all">
            Shop <ArrowRight className="w-2.5 h-2.5" />
          </a>
        </div>
        {product.click_count > 0 && (
          <p className="text-white/20 text-[9px] mt-1">{product.click_count} clicks · {product.conversion_count || 0} sales</p>
        )}
      </div>
    </motion.div>
  );
}

function AuctionCard({ auction }) {
  const [timeLeft, setTimeLeft] = useState('');
  const endTime = auction.auction_end_at ? new Date(auction.auction_end_at) : null;

  React.useEffect(() => {
    if (!endTime) return;
    const update = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <motion.div whileHover={{ y: -2 }}
      className="p-4 rounded-2xl bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/20">
      <div className="flex items-start gap-3">
        {auction.product_image_url ? (
          <img src={auction.product_image_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-amber-500/20" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Gavel className="w-7 h-7 text-amber-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-bold">
              AUCTION LIVE
            </span>
          </div>
          <p className="text-white font-bold text-sm line-clamp-1">{auction.product_name}</p>
          <div className="flex items-center gap-3 mt-2">
            <div>
              <p className="text-amber-400 font-black text-lg">${auction.current_bid || auction.starting_price}</p>
              <p className="text-white/30 text-[9px]">current bid</p>
            </div>
            <div>
              <p className="text-white/60 text-sm font-mono">{timeLeft}</p>
              <p className="text-white/30 text-[9px]">remaining</p>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{auction.bid_count || 0}</p>
              <p className="text-white/30 text-[9px]">bids</p>
            </div>
          </div>
        </div>
      </div>
      <a href={auction.auction_url || '#'} target="_blank" rel="noopener noreferrer"
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-all">
        <Gavel className="w-4 h-4" /> Place Bid
      </a>
    </motion.div>
  );
}

export default function CreatorStorefront({ creatorId, creatorEmail, displayName }) {
  const [activeTab, setActiveTab] = useState('products');

  const { data: products = [] } = useQuery({
    queryKey: ['creator-affiliate-products', creatorEmail],
    queryFn: () => base44.entities.AffiliateProduct.filter({ creator_email: creatorEmail }, '-created_date', 20),
    enabled: !!creatorEmail,
    staleTime: 5 * 60 * 1000,
  });

  const { data: streamProducts = [] } = useQuery({
    queryKey: ['creator-stream-products', creatorId],
    queryFn: () => base44.entities.StreamProduct.filter({ creator_email: creatorEmail }, '-created_at', 10),
    enabled: !!creatorEmail,
    staleTime: 2 * 60 * 1000,
  });

  const { data: liveStream } = useQuery({
    queryKey: ['creator-live-affiliate', creatorId],
    queryFn: async () => {
      const streams = await base44.entities.Stream.filter({
        creator_id: creatorId,
        status: 'live',
        platform_type: 'affiliate_marketplace'
      }, null, 1);
      return streams[0] || null;
    },
    enabled: !!creatorId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const totalEarnings = products.reduce((s, p) => s + ((p.conversion_count || 0) * (p.price_usd || 0) * ((p.commission_rate || 10) / 100)), 0);
  const totalClicks = products.reduce((s, p) => s + (p.click_count || 0), 0);
  const totalSales = products.reduce((s, p) => s + (p.conversion_count || 0), 0);

  if (products.length === 0 && !liveStream) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-emerald-900/20 to-transparent">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-emerald-400" />
          <span className="text-white font-bold text-sm">{displayName}'s Shop</span>
          {liveStream && (
            <span className="flex items-center gap-1 text-[9px] bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full font-bold">
              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" /> LIVE NOW
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/30">
          <span>{products.length} products</span>
          <span>{totalSales} sales</span>
        </div>
      </div>

      {/* Live stream CTA */}
      {liveStream && (
        <Link to={createPageUrl('WatchStream') + `?id=${liveStream.id}`}>
          <div className="mx-4 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 hover:bg-red-500/15 transition-all">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm line-clamp-1">{liveStream.title}</p>
              <p className="text-white/40 text-xs">{liveStream.viewer_count || 0} watching • Shopping live</p>
            </div>
            <ArrowRight className="w-4 h-4 text-red-400 shrink-0" />
          </div>
        </Link>
      )}

      {/* Tabs */}
      {products.length > 0 && (
        <>
          <div className="flex px-4 pt-4 gap-2">
            {[
              { id: 'products', label: 'Products', count: products.length },
              { id: 'featured', label: 'Featured', count: streamProducts.length },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'border-white/[0.06] text-white/40'
                }`}>
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'products' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.slice(0, 6).map(p => <ProductCard key={p.id} product={p} compact />)}
              </div>
            )}
            {activeTab === 'featured' && (
              streamProducts.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-6">No featured products right now</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {streamProducts.map(p => <ProductCard key={p.id} product={p} compact />)}
                </div>
              )
            )}
          </div>

          {products.length > 6 && (
            <div className="px-4 pb-4">
              <Link to={createPageUrl('AffiliateHub')}>
                <button className="w-full py-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2">
                  View all {products.length} products <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}