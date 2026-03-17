import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Plus, Minus, Send, Gift } from 'lucide-react';
import { toast } from 'sonner';

// TikTok/BIGO-style gift tier config
const tierConfig = {
  common:    { bg: 'bg-white/[0.06]', border: 'border-white/10', label: 'Common' },
  uncommon:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Uncommon' },
  rare:      { bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Rare' },
  epic:      { bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Epic' },
  legendary: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Legendary' },
  prestige:  { bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Prestige' },
  divine:    { bg: 'bg-yellow-500/10', border: 'border-yellow-300/20', label: 'Divine' }
};

// BIGO-style tab system: Popular | Multi | Categories | VIP | Backpack
const TABS = [
  { id: 'popular', label: 'Popular', icon: '🔥' },
  { id: 'all',     label: 'All',     icon: '✨' },
  { id: 'love',    label: 'Love',    icon: '💕' },
  { id: 'luxury',  label: 'Luxury',  icon: '💎' },
  { id: 'mythical',label: 'Mythical',icon: '🐉' },
  { id: 'prestige',label: 'VIP',     icon: '👑' },
  { id: 'divine',  label: 'Divine',  icon: '⚡' },
];

function GiftItem({ gift, inCart, onTap }) {
  const config = tierConfig[gift.tier] || tierConfig.common;
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
      {/* Header — TikTok style */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-400" />
          <h2 className="text-white font-bold text-base">Gifts</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Balance */}
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
            <span className="text-sm">🪙</span>
            <span className="text-amber-400 font-bold text-sm">{walletBalance.toLocaleString()}</span>
          </div>
          <Link to={createPageUrl('Wallet')}>
            <button className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 h-7 rounded-full transition-all active:scale-95">
              <Plus className="w-3 h-3" /> Top Up
            </button>
          </Link>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* BIGO/TikTok-style Category Tabs */}
      <div className="flex gap-0.5 px-2 pb-2 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                : 'bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
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

      {/* Selected gift quick-send bar — TikTok style */}
      {selectedGift && !hasGifts && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-white/[0.06] bg-white/[0.03]">
          <span className="text-2xl">{selectedGift.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{selectedGift.name}</p>
            <p className="text-amber-400 text-xs font-bold">🪙 {selectedGift.cost_denarii}</p>
          </div>
          <button
            onClick={() => handleQuickSend(selectedGift)}
            disabled={isSending || (selectedGift.cost_denarii || 0) > walletBalance}
            className="flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-30 text-white font-bold text-sm px-5 h-9 rounded-full transition-all active:scale-95 shadow-lg shadow-pink-500/30"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </div>
      )}

      {/* Cart Summary & Send — like BIGO Multi-send */}
      <AnimatePresence>
        {hasGifts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 bg-black/90"
          >
            {/* Selected gifts row */}
            <div className="px-3 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {cartItems.map(({ gift, quantity }) => (
                <div key={gift.id} className="flex items-center gap-1.5 bg-white/[0.08] rounded-full px-2 py-1 flex-shrink-0 border border-white/10">
                  <span className="text-lg">{gift.icon}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateGiftQuantity(gift.id, -1)} className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center active:scale-90">
                      <Minus className="w-3 h-3 text-white" />
                    </button>
                    <span className="text-white font-bold text-sm w-4 text-center">{quantity}</span>
                    <button onClick={() => updateGiftQuantity(gift.id, 1)} className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center active:scale-90">
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Send button */}
            <div className="px-3 pb-3 pt-1">
              <button
                onClick={handleSendAll}
                disabled={!canAfford || isSending}
                className={`w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  canAfford
                    ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white shadow-lg shadow-pink-500/30'
                    : 'bg-red-900/50 text-red-300'
                }`}
              >
                {isSending ? (
                  <Sparkles className="w-5 h-5 animate-spin" />
                ) : canAfford ? (
                  <>
                    <Send className="w-4 h-4" />
                    Send {totalCost.toLocaleString()} 🪙
                  </>
                ) : (
                  <span>Need {(totalCost - walletBalance).toLocaleString()} more 🪙</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}