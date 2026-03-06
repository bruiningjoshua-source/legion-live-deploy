import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Plus, Minus, Send, Coins, Wallet, Zap, Crown, Flame, Heart, Star, Diamond } from 'lucide-react';

const tierConfig = {
  common: { gradient: 'from-slate-500 to-slate-600', glow: '', border: 'border-slate-500/30', label: 'Common' },
  uncommon: { gradient: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/30', border: 'border-emerald-400/40', label: 'Uncommon' },
  rare: { gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/40', border: 'border-blue-400/50', label: 'Rare' },
  epic: { gradient: 'from-purple-500 to-violet-600', glow: 'shadow-purple-500/50', border: 'border-purple-400/60', label: 'Epic' },
  legendary: { gradient: 'from-amber-400 via-orange-500 to-red-500', glow: 'shadow-amber-500/60', border: 'border-amber-400/70', label: 'Legendary' },
  prestige: { gradient: 'from-rose-400 via-pink-500 to-fuchsia-600', glow: 'shadow-rose-500/70', border: 'border-rose-400/80', label: 'Prestige' },
  divine: { gradient: 'from-amber-300 via-yellow-400 to-amber-500', glow: 'shadow-yellow-400/80', border: 'border-yellow-300', label: 'Divine' }
};

const categoryIcons = {
  love: Heart,
  celebration: Sparkles,
  luxury: Diamond,
  mythical: Flame,
  prestige: Crown,
  divine: Star,
  nature: Sparkles,
  interactive: Zap
};

export default function GiftPanel({ gifts = [], walletBalance = 0, onSendGift, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [giftCart, setGiftCart] = useState({});
  const [isSending, setIsSending] = useState(false);

  const categories = [
    { value: 'all', label: 'All Gifts', icon: '✨' },
    { value: 'love', label: 'Love', icon: '💕' },
    { value: 'celebration', label: 'Party', icon: '🎉' },
    { value: 'luxury', label: 'Luxury', icon: '💎' },
    { value: 'mythical', label: 'Mythical', icon: '🐉' },
    { value: 'prestige', label: 'Prestige', icon: '👑' },
    { value: 'divine', label: 'Divine', icon: '⚡' },
  ];

  const filteredGifts = useMemo(() => 
    gifts.filter(gift => gift.is_active !== false && (selectedCategory === 'all' || gift.category === selectedCategory))
      .sort((a, b) => (a.cost_denarii || 0) - (b.cost_denarii || 0)),
    [gifts, selectedCategory]
  );

  const groupedByTier = useMemo(() => {
    const groups = {};
    filteredGifts.forEach(gift => {
      const tier = gift.tier || 'common';
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(gift);
    });
    return groups;
  }, [filteredGifts]);

  const tierOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'prestige', 'divine'];

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
      if (newQty === 0) {
        const { [giftId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [giftId]: newQty };
    });
  }, []);

  const handleSendAll = useCallback(async () => {
    if (!canAfford || !hasGifts || isSending) return;
    setIsSending(true);
    
    for (const { gift, quantity } of cartItems) {
      if (gift && quantity > 0) {
        await onSendGift(gift, quantity);
      }
    }
    
    setGiftCart({});
    setIsSending(false);
  }, [canAfford, hasGifts, isSending, cartItems, onSendGift]);

  const formatPrice = (price) => {
    if (price >= 1000) return `${(price / 1000).toFixed(price >= 10000 ? 0 : 1)}K`;
    return String(price);
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="bg-black/95 backdrop-blur-xl rounded-t-3xl border-t border-white/10 overflow-hidden"
      style={{ maxHeight: '65vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold">Send Gifts</h2>
            <div className="flex items-center gap-1">
              <span className="text-sm">🪙</span>
              <span className="text-amber-400 text-sm font-semibold">{walletBalance}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl('Wallet')}>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-8 px-3 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Top Up
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white h-8 w-8">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.value 
                ? 'bg-amber-500 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Gifts Grid */}
      <ScrollArea className="px-3 pb-2" style={{ height: '35vh' }}>
        <div className="grid grid-cols-4 gap-2">
          {filteredGifts.map(gift => {
            const inCart = giftCart[gift.id] || 0;
            const config = tierConfig[gift.tier] || tierConfig.common;
            
            return (
              <motion.button
                key={gift.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => updateGiftQuantity(gift.id, 1)}
                className={`relative p-2 rounded-xl bg-gradient-to-br ${config.gradient} ${
                  inCart > 0 ? 'ring-2 ring-white' : ''
                } transition-all`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{gift.icon}</div>
                  <p className="text-white font-medium text-[10px] leading-tight mb-1 line-clamp-1">
                    {gift.name}
                  </p>
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="text-[10px]">🪙</span>
                    <span className="text-white font-bold text-[10px]">{formatPrice(gift.cost_denarii)}</span>
                  </div>
                </div>
                
                {inCart > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg"
                  >
                    <span className="text-amber-600 text-xs font-bold">{inCart}</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
        
        {filteredGifts.length === 0 && (
          <div className="text-center py-8 text-white/40">
            <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No gifts in this category</p>
          </div>
        )}
      </ScrollArea>

      {/* Cart Summary & Send */}
      <AnimatePresence>
        {hasGifts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 bg-black/80"
          >
            {/* Selected Gifts */}
            <div className="px-3 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {cartItems.map(({ gift, quantity }) => (
                <div 
                  key={gift.id} 
                  className="flex items-center gap-1.5 bg-white/10 rounded-full px-2 py-1 flex-shrink-0"
                >
                  <span className="text-lg">{gift.icon}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => updateGiftQuantity(gift.id, -1)}
                      className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3 text-white" />
                    </button>
                    <span className="text-white font-bold text-sm w-4 text-center">{quantity}</span>
                    <button 
                      onClick={() => updateGiftQuantity(gift.id, 1)}
                      className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Send Button */}
            <div className="p-3 pt-1">
              <Button
                onClick={handleSendAll}
                disabled={!canAfford || isSending}
                className={`w-full h-12 rounded-xl font-bold text-base ${
                  canAfford 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white' 
                    : 'bg-red-900/50 text-red-300'
                }`}
              >
                {isSending ? (
                  <Sparkles className="w-5 h-5 animate-spin" />
                ) : canAfford ? (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send {totalCost} 🪙
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Need {totalCost - walletBalance} more
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}