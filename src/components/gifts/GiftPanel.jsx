import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Plus, Minus, ShoppingCart, Coins } from 'lucide-react';

const tierColors = {
  common: 'from-stone-600 to-stone-700',
  uncommon: 'from-green-600 to-green-700',
  rare: 'from-blue-600 to-blue-700',
  epic: 'from-purple-600 to-purple-700',
  legendary: 'from-amber-500 to-orange-600',
  prestige: 'from-rose-500 via-amber-500 to-purple-600'
};

const tierShadows = {
  common: 'shadow-stone-500/20',
  uncommon: 'shadow-green-500/30',
  rare: 'shadow-blue-500/40',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-amber-500/60',
  prestige: 'shadow-rose-500/70'
};

export default function GiftPanel({ gifts, walletBalance, onSendGift, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [giftCart, setGiftCart] = useState({});

  const categories = [
    { value: 'all', label: 'All', icon: '⚔️' },
    { value: 'military', label: 'Military', icon: '🛡️' },
    { value: 'prestige', label: 'Prestige', icon: '👑' }
  ];

  const filteredGifts = gifts.filter(gift => 
    selectedCategory === 'all' || gift.category === selectedCategory
  );

  const totalCost = Object.entries(giftCart).reduce((sum, [giftId, qty]) => {
    const gift = gifts.find(g => g.id === giftId);
    return sum + (gift ? gift.cost_as * qty : 0);
  }, 0);
  
  const canAfford = totalCost <= walletBalance;
  const hasGifts = Object.keys(giftCart).length > 0;

  const updateGiftQuantity = (giftId, change) => {
    setGiftCart(prev => {
      const current = prev[giftId] || 0;
      const newQty = Math.max(0, Math.min(100, current + change)); // Max 100 per gift type
      if (newQty === 0) {
        const { [giftId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [giftId]: newQty };
    });
  };

  const setGiftQuantity = (giftId, qty) => {
    const numQty = Math.max(0, Math.min(100, parseInt(qty) || 0));
    setGiftCart(prev => {
      if (numQty === 0) {
        const { [giftId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [giftId]: numQty };
    });
  };

  const handleSendAll = async () => {
    if (!canAfford || !hasGifts) return;
    
    for (const [giftId, qty] of Object.entries(giftCart)) {
      const gift = gifts.find(g => g.id === giftId);
      if (gift && qty > 0) {
        await onSendGift(gift, qty);
      }
    }
    
    setGiftCart({});
  };

  const cartItems = Object.entries(giftCart).map(([giftId, qty]) => ({
    gift: gifts.find(g => g.id === giftId),
    quantity: qty
  })).filter(item => item.gift);

  return (
    <div className="bg-stone-950 border-t-2 border-amber-600/30 rounded-t-3xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-amber-600/20">
        <div>
          <h2 className="text-amber-100 font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Send Gifts
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400/70 text-sm">{walletBalance.toLocaleString()} As</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-amber-400">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 p-4 border-b border-amber-600/20 overflow-x-auto">
        {categories.map(cat => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
            className={selectedCategory === cat.value 
              ? "bg-amber-600 text-white" 
              : "text-amber-300 hover:bg-amber-800/30"}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Gifts Grid */}
      <div className="p-4 max-h-[40vh] overflow-y-auto">
        <div className="grid grid-cols-3 gap-3">
          {filteredGifts.map(gift => {
            const inCart = giftCart[gift.id] || 0;
            return (
              <motion.div
                key={gift.id}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <Card 
                  className={`bg-gradient-to-br ${tierColors[gift.tier]} ${tierShadows[gift.tier]} border-2 ${
                    inCart > 0 ? 'border-amber-400 ring-2 ring-amber-400' : 'border-white/20'
                  } p-3 cursor-pointer transition-all`}
                  onClick={() => updateGiftQuantity(gift.id, 1)}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">{gift.icon}</div>
                    <p className="text-white font-medium text-xs mb-1">{gift.name}</p>
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <span className="text-amber-300 text-xs">🪙</span>
                      <span className="text-white font-bold text-sm">{gift.cost_as}</span>
                    </div>
                    
                    {inCart > 0 && (
                      <div className="flex items-center justify-center gap-1 bg-amber-600 rounded-full py-1 px-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateGiftQuantity(gift.id, -10);
                          }}
                          className="hover:bg-amber-700 rounded-full p-0.5 text-white text-xs"
                        >
                          -10
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateGiftQuantity(gift.id, -1);
                          }}
                          className="hover:bg-amber-700 rounded-full p-0.5"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <input
                          type="number"
                          value={inCart}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setGiftQuantity(gift.id, e.target.value)}
                          className="w-10 text-center bg-transparent text-white font-bold text-sm border-0 focus:outline-none"
                          min="1"
                          max="100"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateGiftQuantity(gift.id, 1);
                          }}
                          className="hover:bg-amber-700 rounded-full p-0.5"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateGiftQuantity(gift.id, 10);
                          }}
                          className="hover:bg-amber-700 rounded-full p-0.5 text-white text-xs"
                        >
                          +10
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Cart Summary & Send */}
      <AnimatePresence>
        {hasGifts && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="border-t border-amber-600/30 bg-stone-900/95 backdrop-blur-lg p-4"
          >
            <div className="mb-3 max-h-24 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {cartItems.map(({ gift, quantity }) => (
                  <Badge key={gift.id} className="bg-amber-600/20 text-amber-200 border-amber-500/30">
                    {gift.icon} {gift.name} x{quantity}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-amber-400/70 text-sm">Total Cost</p>
                <p className="text-2xl font-bold text-amber-100">{totalCost.toLocaleString()} As</p>
              </div>
              <div className="text-right">
                <p className="text-amber-400/70 text-sm">Your Balance</p>
                <p className={`text-lg font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                  {walletBalance.toLocaleString()} As
                </p>
              </div>
            </div>

            <Button
              onClick={handleSendAll}
              disabled={!canAfford}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-6 text-lg disabled:opacity-50"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {canAfford ? `Send ${cartItems.length} Gift${cartItems.length > 1 ? 's' : ''}` : 'Insufficient Balance'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}