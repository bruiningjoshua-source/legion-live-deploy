import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Plus, Minus, Send, Coins, Wallet, ChevronRight, Zap } from 'lucide-react';

const tierConfig = {
  common: { gradient: 'from-slate-500 to-slate-600', glow: 'shadow-slate-400/20', border: 'border-slate-400/30' },
  uncommon: { gradient: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-400/30', border: 'border-emerald-400/40' },
  rare: { gradient: 'from-blue-500 to-blue-600', glow: 'shadow-blue-400/40', border: 'border-blue-400/50' },
  epic: { gradient: 'from-purple-500 to-purple-600', glow: 'shadow-purple-400/50', border: 'border-purple-400/60' },
  legendary: { gradient: 'from-amber-400 to-orange-500', glow: 'shadow-amber-400/60', border: 'border-amber-400/70' },
  prestige: { gradient: 'from-rose-400 via-amber-400 to-violet-500', glow: 'shadow-rose-400/70', border: 'border-rose-400/80' }
};

export default function GiftPanel({ gifts = [], walletBalance = 0, onSendGift, onClose }) {
  const [selectedTier, setSelectedTier] = useState('all');
  const [giftCart, setGiftCart] = useState({});
  const [isSending, setIsSending] = useState(false);

  const tiers = [
    { value: 'all', label: 'All', icon: '✨' },
    { value: 'common', label: 'Common', icon: '⚪' },
    { value: 'rare', label: 'Rare', icon: '🔵' },
    { value: 'epic', label: 'Epic', icon: '🟣' },
    { value: 'legendary', label: 'Legend', icon: '🟡' },
  ];

  const filteredGifts = useMemo(() => 
    gifts.filter(gift => selectedTier === 'all' || gift.tier === selectedTier)
      .sort((a, b) => (a.cost_as || 0) - (b.cost_as || 0)),
    [gifts, selectedTier]
  );

  const { totalCost, cartItems } = useMemo(() => {
    const items = Object.entries(giftCart)
      .map(([giftId, qty]) => ({ gift: gifts.find(g => g.id === giftId), quantity: qty }))
      .filter(item => item.gift);
    const cost = items.reduce((sum, { gift, quantity }) => sum + (gift.cost_as || 0) * quantity, 0);
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

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="bg-gradient-to-b from-stone-900 to-stone-950 rounded-t-3xl border-t border-amber-500/20 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-900/80 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base">Send Gifts</h2>
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">{walletBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl('Wallet')}>
            <Button variant="ghost" size="sm" className="text-amber-400 hover:bg-amber-500/20 gap-1.5 h-8 px-3">
              <Wallet className="w-4 h-4" />
              <span className="text-xs">Add</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Tier Filters */}
      <div className="flex gap-1.5 p-3 overflow-x-auto scrollbar-hide">
        {tiers.map(tier => (
          <button
            key={tier.value}
            onClick={() => setSelectedTier(tier.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedTier === tier.value 
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' 
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{tier.icon}</span>
            {tier.label}
          </button>
        ))}
      </div>

      {/* Gifts Grid */}
      <div className="px-3 pb-3 max-h-[35vh] overflow-y-auto">
        <div className="grid grid-cols-4 gap-2">
          {filteredGifts.map(gift => {
            const inCart = giftCart[gift.id] || 0;
            const config = tierConfig[gift.tier] || tierConfig.common;
            
            return (
              <motion.button
                key={gift.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => updateGiftQuantity(gift.id, 1)}
                className={`relative p-2 rounded-xl bg-gradient-to-br ${config.gradient} ${config.glow} shadow-lg border ${
                  inCart > 0 ? 'border-amber-400 ring-1 ring-amber-400/50' : config.border
                } transition-all active:scale-95`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{gift.icon}</div>
                  <p className="text-white font-medium text-[10px] leading-tight mb-1 line-clamp-1">{gift.name}</p>
                  <div className="flex items-center justify-center gap-0.5">
                    <Coins className="w-3 h-3 text-amber-300" />
                    <span className="text-white font-bold text-xs">{gift.cost_as}</span>
                  </div>
                </div>
                
                {/* Quantity Badge */}
                {inCart > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <span className="text-white text-xs font-bold">{inCart}</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
        
        {filteredGifts.length === 0 && (
          <div className="text-center py-8 text-white/40">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No gifts in this category</p>
          </div>
        )}
      </div>

      {/* Cart Summary */}
      <AnimatePresence>
        {hasGifts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 bg-black/40 backdrop-blur-sm"
          >
            {/* Selected Gifts */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {cartItems.map(({ gift, quantity }) => (
                <div 
                  key={gift.id} 
                  className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5 flex-shrink-0"
                >
                  <span className="text-lg">{gift.icon}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => updateGiftQuantity(gift.id, -1)}
                      className="w-5 h-5 rounded bg-white/10 flex items-center justify-center hover:bg-white/20"
                    >
                      <Minus className="w-3 h-3 text-white" />
                    </button>
                    <span className="text-white font-bold text-sm w-6 text-center">{quantity}</span>
                    <button 
                      onClick={() => updateGiftQuantity(gift.id, 1)}
                      className="w-5 h-5 rounded bg-white/10 flex items-center justify-center hover:bg-white/20"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Send Button */}
            <div className="p-3 pt-2">
              <Button
                onClick={handleSendAll}
                disabled={!canAfford || isSending}
                className={`w-full h-12 rounded-xl font-bold text-base transition-all ${
                  canAfford 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30' 
                    : 'bg-red-900/50 text-red-300'
                }`}
              >
                {isSending ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Zap className="w-5 h-5" />
                  </motion.div>
                ) : canAfford ? (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send {totalCost.toLocaleString()} 
                    <Coins className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 mr-2" />
                    Need {(totalCost - walletBalance).toLocaleString()} more
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}