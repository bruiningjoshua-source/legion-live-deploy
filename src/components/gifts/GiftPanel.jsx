import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

// TikTok/BIGO-style gift tier config
const tierConfig = {
  normal:    { bg: 'bg-white/[0.04]', border: 'border-white/8', label: 'Normal' },
  common:    { bg: 'bg-white/[0.06]', border: 'border-white/10', label: 'Common' },
  uncommon:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Uncommon' },
  rare:      { bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Rare' },
  epic:      { bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Epic' },
  legendary: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Legendary' },
  prestige:  { bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Prestige' },
  divine:    { bg: 'bg-yellow-500/10', border: 'border-yellow-300/20', label: 'Divine' }
};

// BIGO-style tab system
const TABS = [
  { id: 'popular',   label: 'Popular',   icon: '🔥' },
  { id: 'all',       label: 'All',       icon: '✨' },
  { id: 'common',    label: 'Common',    icon: '🏛️' },
  { id: 'rare',      label: 'Rare',      icon: '🔱' },
  { id: 'epic',      label: 'Epic',      icon: '🔥' },
  { id: 'legendary', label: 'Legendary', icon: '⚔️' },
];

function GiftItem({ gift, inCart, onTap }) {
  const config = tierConfig[gift.category] || tierConfig.common;
  const formatPrice = (p) => p >= 1000 ? `${(p / 1000).toFixed(p >= 10000 ? 0 : 1)}K` : String(p);

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => onTap(gift.id)}
      className={`relative flex flex-col items-center justify-center p-2 rounded-xl ${config.bg} border ${config.border} ${
        inCart > 0 ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : ''
      } transition-all active:bg-white/10`}
    >
      <span className="text-2xl mb-0.5 leading-none">{gift.icon}</span>
      <p className="text-white font-medium text-[10px] leading-tight mb-0.5 line-clamp-1 w-full text-center">{gift.name}</p>
      <div className="flex items-center gap-0.5">
        <span className="text-[9px]">🪙</span>
        <span className="text-amber-400 font-bold text-[10px]">{formatPrice(gift.cost_denarii)}</span>
      </div>
      {inCart > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <span className="text-white text-[10px] font-bold">{inCart}</span>
        </motion.div>
      )}
    </motion.button>
  );
}

export default function GiftPanel({ gifts = [], walletBalance = 0, onSendGift, onClose }) {
  const [activeTab, setActiveTab] = useState('popular');
  const [giftCart, setGiftCart] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);

  // Popular = top 20 by cost descending (most sent)
  const popularGifts = useMemo(() =>
    [...gifts].filter(g => g.is_active !== false).sort((a, b) => (a.cost_denarii || 0) - (b.cost_denarii || 0)).slice(0, 20),
    [gifts]
  );

  const filteredGifts = useMemo(() => {
    if (activeTab === 'popular') return popularGifts;
    if (activeTab === 'all') return gifts.filter(g => g.is_active !== false).sort((a, b) => (a.cost_denarii || 0) - (b.cost_denarii || 0));
    return gifts.filter(g => g.is_active !== false && g.category === activeTab).sort((a, b) => (a.cost_denarii || 0) - (b.cost_denarii || 0));
  }, [gifts, activeTab, popularGifts]);

  // Prefetch the 3 cheapest (most commonly sent) gift videos on panel open so
  // they're warm in browser cache by the time a viewer actually sends one —
  // avoids a visible stall between tap and animation start.
  useEffect(() => {
    // Respect data-saver mode and slow connections — don't prefetch video on metered networks
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return;

    const toPrefetch = popularGifts.slice(0, 3).filter(g => g.video_url);
    toPrefetch.forEach(g => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'video';
      link.href = g.video_url;
      document.head.appendChild(link);
    });
    return () => {
      document.querySelectorAll(`link[rel="prefetch"][as="video"]`).forEach(el => {
        if (toPrefetch.some(g => g.video_url === el.href || el.href.endsWith(g.video_url))) el.remove();
      });
    };
  }, [popularGifts]);

  const { totalCost, cartItems } = useMemo(() => {
    const items = Object.entries(giftCart)
      .map(([giftId, qty]) => ({ gift: gifts.find(g => g.id === giftId), quantity: qty }))
      .filter(item => item.gift);
    const cost = items.reduce((sum, { gift, quantity }) => sum + (gift.cost_denarii || 0) * quantity, 0);
    return { totalCost: cost, cartItems: items };
  }, [giftCart, gifts]);

  const canAfford = totalCost <= walletBalance;
  const hasGifts = cartItems.length > 0;

  const updateGiftQuantity = useCallback((giftId, change) => {
    setGiftCart(prev => {
      const current = prev[giftId] || 0;
      const newQty = Math.max(0, Math.min(99, current + change));
      if (newQty === 0) { const { [giftId]: _, ...rest } = prev; return rest; }
      return { ...prev, [giftId]: newQty };
    });
  }, []);

  const handleQuickSend = useCallback(async (gift) => {
    if (isSending) return;
    if ((gift.cost_denarii || 0) > walletBalance) { toast.error('Insufficient balance'); return; }
    setIsSending(true);
    try {
      await onSendGift(gift, 1);
    } catch (e) {
      toast.error(e.message || 'Failed to send gift');
    }
    setIsSending(false);
  }, [isSending, walletBalance, onSendGift]);

  const handleSendAll = useCallback(async () => {
    if (!canAfford || !hasGifts || isSending) return;
    setIsSending(true);
    for (const { gift, quantity } of cartItems) {
      if (gift && quantity > 0 && quantity <= 99) {
        try { await onSendGift(gift, quantity); }
        catch (e) { toast.error(e.message || 'Failed to send gift'); break; }
      }
    }
    setGiftCart({});
    setIsSending(false);
  }, [canAfford, hasGifts, isSending, cartItems, onSendGift]);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="bg-[#0c0c0f]/98 backdrop-blur-xl rounded-t-3xl border-t border-white/10 overflow-hidden"
      style={{ maxHeight: '70vh' }}
    >
      {/* Wealth bar — BIGO style */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600/30 to-blue-600/30 border border-purple-500/30 rounded-full px-2.5 py-1">
          <span className="text-sm">💎</span>
          <span className="text-purple-300 font-bold text-xs">{walletBalance.toLocaleString()}</span>
        </div>
        <div className="flex-1 flex items-center gap-1.5 bg-white/[0.04] rounded-full px-3 py-1 border border-white/[0.06]">
          <span className="text-white/40 text-[10px]">Your wealth point is</span>
          <span className="text-amber-400 text-[10px] font-bold">{walletBalance >= 1000 ? `${(walletBalance / 1000).toFixed(0)}K` : walletBalance}</span>
          <span className="text-white/30 text-[10px] ml-auto">›</span>
        </div>
        <Link to={createPageUrl('Wallet')}>
          <div className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 rounded-full px-2.5 py-1">
            <span className="text-purple-300 text-xs font-bold">💎 Me</span>
          </div>
        </Link>
      </div>

      {/* BIGO-style Category Tabs — text with underline */}
      <div className="flex gap-4 px-4 pb-1 overflow-x-auto scrollbar-hide border-b border-white/[0.06]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative pb-2 text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="gift-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Sub-filter pills */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
        {['All', 'New', 'Normal', 'Treasure Box'].map(f => (
          <span key={f} className="text-white/40 text-[10px] font-medium bg-white/[0.04] rounded-full px-2.5 py-1 border border-white/[0.06] whitespace-nowrap">{f}</span>
        ))}
        <span className="text-white/40 text-[10px] font-medium ml-auto whitespace-nowrap">Price Sorting ↕</span>
      </div>

      {/* Gifts Grid — 4 columns like TikTok */}
      <ScrollArea className="px-2 pb-2" style={{ height: '38vh' }}>
        <div className="grid grid-cols-4 gap-1.5">
          {filteredGifts.map(gift => (
            <GiftItem
              key={gift.id}
              gift={gift}
              inCart={giftCart[gift.id] || 0}
              onTap={(id) => {
                setSelectedGift(gift);
                updateGiftQuantity(id, 1);
              }}
            />
          ))}
        </div>

        {filteredGifts.length === 0 && (
          <div className="text-center py-10 text-white/30">
            <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No gifts in this category</p>
          </div>
        )}
      </ScrollArea>

      {/* ── BIGO Bottom: quantity pills + Send ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.06] bg-white/[0.02]">
        {/* Balance */}
        <div className="flex items-center gap-1">
          <span className="text-amber-400 text-xs">🪙</span>
          <span className="text-white/60 text-xs font-bold">{walletBalance.toLocaleString()}</span>
          <span className="text-white/30 text-xs">›</span>
        </div>

        {/* Quantity pills */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
          {[1, 10, 99, 188, 999].map(qty => {
            const isSelected = selectedGift && (giftCart[selectedGift.id] || 0) === qty;
            return (
              <button
                key={qty}
                onClick={() => {
                  if (selectedGift) {
                    setGiftCart(prev => ({ ...prev, [selectedGift.id]: qty }));
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-red-500 text-white'
                    : qty > 10
                      ? 'bg-white/[0.06] text-amber-400 border border-amber-500/20'
                      : 'bg-white/[0.06] text-white/60'
                }`}
              >
                {qty}{qty > 10 ? '⚡' : ''}
              </button>
            );
          })}
        </div>

        {/* Send button */}
        <button
          onClick={() => {
            if (hasGifts) handleSendAll();
            else if (selectedGift) handleQuickSend(selectedGift);
          }}
          disabled={isSending || (!hasGifts && !selectedGift) || (selectedGift && !hasGifts && (selectedGift.cost_denarii || 0) > walletBalance)}
          className="bg-red-500 hover:bg-red-600 disabled:opacity-30 text-white font-bold text-sm px-5 h-9 rounded-full transition-all active:scale-95 shrink-0"
        >
          Send
        </button>
      </div>
    </motion.div>
  );
}