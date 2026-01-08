import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Crown, Star, Send } from 'lucide-react';

const tierColors = {
  common: 'from-stone-600 to-stone-700 border-stone-500',
  uncommon: 'from-green-700 to-green-800 border-green-500',
  rare: 'from-blue-700 to-blue-800 border-blue-500',
  epic: 'from-purple-700 to-purple-800 border-purple-500',
  legendary: 'from-amber-600 to-amber-700 border-amber-400',
  prestige: 'from-rose-600 to-rose-700 border-rose-400'
};

const tierGlow = {
  common: '',
  uncommon: 'shadow-green-500/30',
  rare: 'shadow-blue-500/30',
  epic: 'shadow-purple-500/40',
  legendary: 'shadow-amber-400/50',
  prestige: 'shadow-rose-400/60'
};

export default function GiftPanel({ gifts, onSendGift, onClose, walletBalance }) {
  const [selectedGift, setSelectedGift] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('all');

  const categories = ['all', 'nature', 'military', 'celebration', 'mythical', 'prestige'];

  const filteredGifts = gifts?.filter(g => 
    activeTab === 'all' ? true : g.category === activeTab
  ).sort((a, b) => a.cost_as - b.cost_as);

  const formatCost = (cost) => {
    if (cost >= 1000) return `${(cost / 1000).toFixed(1)}K`;
    return cost;
  };

  const handleSend = () => {
    if (selectedGift) {
      onSendGift(selectedGift, quantity);
      setSelectedGift(null);
      setQuantity(1);
    }
  };

  const totalCost = selectedGift ? selectedGift.cost_as * quantity : 0;
  const canAfford = walletBalance >= totalCost;

  return (
    <div className="bg-gradient-to-b from-stone-900 to-stone-950 rounded-t-3xl border-t border-amber-600/30 p-4 max-h-[60vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-amber-100 font-bold text-lg">Send Gifts</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-amber-300">
            <span className="text-lg">🪙</span>
            <span className="font-semibold">{walletBalance?.toLocaleString() || 0}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-amber-400">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1 rounded-xl mb-4 flex-wrap h-auto gap-1">
          {categories.map(cat => (
            <TabsTrigger 
              key={cat}
              value={cat}
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-200/70 rounded-lg capitalize text-xs px-3 py-1.5"
            >
              {cat === 'all' ? '✨ All' : cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            <AnimatePresence>
              {filteredGifts?.map((gift, i) => (
                <motion.div
                  key={gift.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <button
                    onClick={() => setSelectedGift(gift)}
                    className={`relative w-full aspect-square rounded-xl bg-gradient-to-br ${tierColors[gift.tier]} 
                      border-2 p-2 flex flex-col items-center justify-center transition-all
                      ${selectedGift?.id === gift.id ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-900 scale-105' : ''}
                      hover:scale-105 shadow-lg ${tierGlow[gift.tier]}`}
                  >
                    {gift.tier === 'prestige' && (
                      <div className="absolute inset-0 rounded-xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-rose-500/20 animate-pulse" />
                      </div>
                    )}
                    <span className="text-2xl sm:text-3xl relative z-10">{gift.icon}</span>
                    <span className="text-[10px] text-white/90 font-medium mt-1 truncate w-full text-center relative z-10">
                      {gift.name}
                    </span>
                    <Badge className="mt-1 bg-black/40 text-amber-300 border-0 text-[10px] px-1.5 py-0">
                      {formatCost(gift.cost_as)}
                    </Badge>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Tabs>

      {/* Send Section */}
      <AnimatePresence>
        {selectedGift && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 p-4 bg-stone-800/80 rounded-2xl border border-amber-600/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tierColors[selectedGift.tier]} border-2 flex items-center justify-center`}>
                  <span className="text-3xl">{selectedGift.icon}</span>
                </div>
                <div>
                  <h4 className="text-amber-100 font-semibold">{selectedGift.name}</h4>
                  <p className="text-amber-400/70 text-xs">{selectedGift.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Quantity Selector */}
                <div className="flex items-center gap-1 bg-stone-900 rounded-lg p-1">
                  {[1, 5, 10, 99].map(q => (
                    <Button
                      key={q}
                      size="sm"
                      variant={quantity === q ? "default" : "ghost"}
                      className={quantity === q ? "bg-amber-600 text-white h-8 w-10" : "text-amber-300 h-8 w-10"}
                      onClick={() => setQuantity(q)}
                    >
                      {q === 99 ? '99+' : q}
                    </Button>
                  ))}
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSend}
                  disabled={!canAfford}
                  className={`${canAfford 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700' 
                    : 'bg-stone-700 cursor-not-allowed'} text-white px-6`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {formatCost(totalCost)}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}