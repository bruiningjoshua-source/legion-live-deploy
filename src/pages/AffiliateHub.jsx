import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag, TrendingUp, Link2, Tag, ChevronRight,
  Star, DollarSign, Zap, Award, ExternalLink, Package
} from 'lucide-react';

const TABS = ['Featured', 'Gaming', 'Fitness', 'Tech', 'Fashion'];

function ProductCard({ product }) {
  return (
    <div className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-emerald-500/25 hover:bg-white/[0.05] transition-all duration-200 active:scale-[0.98]">
      {/* Product image placeholder */}
      <div className="w-full aspect-square rounded-xl bg-white/[0.05] flex items-center justify-center mb-3 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <Package className="w-8 h-8 text-white/15" />
        )}
      </div>

      <p className="text-white font-semibold text-sm line-clamp-2 mb-1">{product.title || 'Product Name'}</p>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 text-emerald-400">
          <DollarSign className="w-3.5 h-3.5" />
          <span className="font-bold text-sm">{product.price || '—'}</span>
        </div>
        {product.commission_rate && (
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-lg font-semibold">
            {product.commission_rate}% back
          </span>
        )}
      </div>
    </div>
  );
}

export default function AffiliateHub() {
  const [activeTab, setActiveTab] = useState('Featured');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['affiliate-products'],
    queryFn: () => base44.entities.AffiliateProduct.list('-created_date', 20),
    staleTime: 5 * 60 * 1000,
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['affiliate-creators'],
    queryFn: () => base44.entities.Creator.filter({ is_verified: true }, '-follower_count', 6),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen text-white pt-16">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-[#0d0d10]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <h1 className="text-white font-bold text-base">Merchant Hub</h1>
            </div>
            <Link to={createPageUrl('AffiliateDashboard')}>
              <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs px-3 h-8 rounded-xl transition-all">
                <TrendingUp className="w-3.5 h-3.5" />
                My Dashboard
              </button>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5">
        {/* Earn banner */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-emerald-900/30 via-emerald-800/10 to-transparent border border-emerald-500/20 mb-5 overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Affiliate Program
            </p>
            <p className="text-white font-black text-2xl mb-1">Earn While You Stream</p>
            <p className="text-white/40 text-xs mb-3">Share products, earn commissions on every sale</p>
            <Link to={createPageUrl('AffiliateMarketplace')}>
              <button className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs px-4 h-8 rounded-xl transition-all">
                Browse Products
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Avg Commission', value: '12%', icon: Tag, color: 'text-amber-400' },
            { label: 'Top Earners', value: '$2.4K', icon: Award, color: 'text-violet-400' },
            { label: 'Products', value: '500+', icon: Package, color: 'text-emerald-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center">
              <Icon className={`w-4 h-4 ${color} mx-auto mb-1.5`} />
              <p className="text-white font-bold text-base">{value}</p>
              <p className="text-white/35 text-[10px]">{label}</p>
            </div>
          ))}
        </div>

        {/* Products grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No products yet</p>
            <Link to={createPageUrl('AffiliateMarketplace')} className="text-emerald-400 text-sm mt-2 inline-block hover:text-emerald-300">
              Browse marketplace →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}