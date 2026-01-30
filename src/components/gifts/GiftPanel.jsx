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
    return price.toLocaleString();
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="bg-gradient-to-b from-stone-900 via-stone-950 to-black rounded-t-3xl border-t border-amber-500/30 overflow-hidden max-h-[70vh]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-900/30 via-stone-900/80 to-amber-900/30 backdrop-blur-sm border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Send Gifts</h2>
            <div className="flex items-center gap-2">
              <span className="text-xl">🪙</span>
              <span className="text-amber-400 text-sm font-bold">{walletBalance.toLocaleString()} Denarii</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl('Wallet')}>
            <Button variant="ghost" size="sm" className="text-amber-400 hover:bg-amber-500/20 gap-1.5 h-9 px-4 border border-amber-500/30">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">Top Up</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10 h-9 w-9">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide bg-black/30">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.value 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30' 
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <span className="text-base">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Gifts Grid by Tier */}
      <ScrollArea className="h-[40vh] px-3 pb-3">
        {tierOrder.map(tier => {
          const tierGifts = groupedByTier[tier];
          if (!tierGifts?.length) return null;
          const config = tierConfig[tier];
          
          return (
            <div key={tier} className="mb-4">
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className={`h-px flex-1 bg-gradient-to-r from-transparent via-${tier === 'divine' ? 'yellow' : tier === 'legendary' ? 'amber' : 'white'}-500/30 to-transparent`} />
                <span className={`text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                  {config.label}
                </span>
                <div className={`h-px flex-1 bg-gradient-to-r from-transparent via-${tier === 'divine' ? 'yellow' : tier === 'legendary' ? 'amber' : 'white'}-500/30 to-transparent`} />
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {tierGifts.map(gift => {
                  const inCart = giftCart[gift.id] || 0;
                  const isHighTier = ['legendary', 'prestige', 'divine'].includes(gift.tier);
                  
                  return (
                    <motion.button
                      key={gift.id}
                      whileTap={{ scale: 0.92 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => updateGiftQuantity(gift.id, 1)}
                      className={`relative p-2 rounded-xl bg-gradient-to-br ${config.gradient} shadow-lg ${config.glow} border-2 ${
                        inCart > 0 ? 'border-white ring-2 ring-white/50' : config.border
                      } transition-all overflow-hidden group`}
                    >
                      {/* Animated shine effect for high tier */}
                      {isHighTier && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      )}
                      
                      <div className="relative text-center">
                        <div className={`text-3xl mb-1 ${isHighTier ? 'animate-pulse' : ''}`}>
                          {gift.icon}
                        </div>
                        <p className="text-white font-semibold text-[10px] leading-tight mb-1 line-clamp-1 drop-shadow-lg">
                          {gift.name}
                        </p>
                        <div className="flex items-center justify-center gap-0.5 bg-black/30 rounded-full px-2 py-0.5">
                          <span className="text-xs">🪙</span>
                          <span className="text-white font-bold text-xs">{formatPrice(gift.cost_denarii)}</span>
                        </div>
                      </div>
                      
                      {/* Screen takeover badge */}
                      {gift.screen_takeover && (
                        <div className="absolute -top-1 -left-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-br-lg rounded-tl-lg">
                          FULL
                        </div>
                      )}
                      
                      {/* Quantity Badge */}
                      {inCart > 0 && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-amber-500"
                        >
                          <span className="text-amber-600 text-sm font-black">{inCart}</span>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {filteredGifts.length === 0 && (
          <div className="text-center py-12 text-white/40">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-base">No gifts in this category</p>
          </div>
        )}
      </ScrollArea>

      {/* Cart Summary */}
      <AnimatePresence>
        {hasGifts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-amber-500/20 bg-gradient-to-r from-amber-900/20 via-black/60 to-amber-900/20 backdrop-blur-sm"
          >
            {/* Selected Gifts */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {cartItems.map(({ gift, quantity }) => {
                const config = tierConfig[gift.tier] || tierConfig.common;
                return (
                  <div 
                    key={gift.id} 
                    className={`flex items-center gap-2 bg-gradient-to-r ${config.gradient} rounded-xl px-3 py-2 flex-shrink-0 shadow-lg`}
                  >
                    <span className="text-2xl">{gift.icon}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => updateGiftQuantity(gift.id, -1)}
                        className="w-6 h-6 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"
                      >
                        <Minus className="w-3 h-3 text-white" />
                      </button>
                      <span className="text-white font-black text-base w-6 text-center">{quantity}</span>
                      <button 
                        onClick={() => updateGiftQuantity(gift.id, 1)}
                        className="w-6 h-6 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"
                      >
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Send Button */}
            <div className="p-3 pt-2">
              <Button
                onClick={handleSendAll}
                disabled={!canAfford || isSending}
                className={`w-full h-14 rounded-2xl font-bold text-lg transition-all ${
                  canAfford 
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 shadow-xl shadow-amber-500/40 text-white' 
                    : 'bg-red-900/50 text-red-300 border border-red-500/30'
                }`}
              >
                {isSending ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}>
                    <Sparkles className="w-6 h-6" />
                  </motion.div>
                ) : canAfford ? (
                  <span className="flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Send {totalCost.toLocaleString()} 
                    <span className="text-xl">🪙</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Need {(totalCost - walletBalance).toLocaleString()} more
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