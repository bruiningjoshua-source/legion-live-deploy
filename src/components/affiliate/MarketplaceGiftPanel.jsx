import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Coins, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Roman Marketplace themed gifts
const MARKETPLACE_GIFTS = [
  // Common - Marketplace basics
  { id: 'bronze_coin', name: 'Bronze Coin', icon: '🪙', cost_as: 1, tier: 'common', category: 'marketplace', description: 'A humble bronze As' },
  { id: 'olive_branch', name: 'Olive Branch', icon: '🫒', cost_as: 5, tier: 'common', category: 'marketplace', description: 'Symbol of peace and trade' },
  { id: 'amphora', name: 'Amphora', icon: '🏺', cost_as: 10, tier: 'common', category: 'marketplace', description: 'Fine Roman pottery' },
  { id: 'scroll', name: 'Trade Scroll', icon: '📜', cost_as: 15, tier: 'common', category: 'merchant', description: 'Merchant contract' },
  
  // Uncommon - Merchant goods
  { id: 'silk_cloth', name: 'Silk Cloth', icon: '🧣', cost_as: 25, tier: 'uncommon', category: 'trade', description: 'Exotic silk from the East' },
  { id: 'spice_jar', name: 'Spice Jar', icon: '🫙', cost_as: 50, tier: 'uncommon', category: 'trade', description: 'Precious spices' },
  { id: 'silver_denarii', name: 'Silver Denarii', icon: '💿', cost_as: 75, tier: 'uncommon', category: 'marketplace', description: 'A bag of silver' },
  { id: 'merchant_scale', name: 'Merchant Scale', icon: '⚖️', cost_as: 100, tier: 'uncommon', category: 'merchant', description: 'Fair trade symbol' },
  
  // Rare - Prosperity symbols
  { id: 'golden_wheat', name: 'Golden Wheat', icon: '🌾', cost_as: 200, tier: 'rare', category: 'prosperity', description: 'Blessing of Ceres' },
  { id: 'gem_pouch', name: 'Gem Pouch', icon: '💎', cost_as: 350, tier: 'rare', category: 'trade', description: 'Precious gemstones' },
  { id: 'merchant_ship', name: 'Merchant Ship', icon: '⛵', cost_as: 500, tier: 'rare', category: 'merchant', description: 'Trading vessel' },
  { id: 'cornucopia', name: 'Cornucopia', icon: '🎺', cost_as: 750, tier: 'rare', category: 'prosperity', description: 'Horn of plenty' },
  
  // Epic - Patron gifts
  { id: 'golden_laurel', name: 'Golden Laurel', icon: '👑', cost_as: 1000, tier: 'epic', category: 'patron', description: 'Champion of commerce' },
  { id: 'treasure_chest', name: 'Treasure Chest', icon: '📦', cost_as: 2500, tier: 'epic', category: 'prosperity', description: 'Merchant\'s fortune' },
  { id: 'mercury_wings', name: 'Mercury Wings', icon: '🪽', cost_as: 5000, tier: 'epic', category: 'patron', description: 'Blessing of Mercury' },
  
  // Legendary - Ultimate patron
  { id: 'golden_eagle', name: 'Golden Eagle', icon: '🦅', cost_as: 10000, tier: 'legendary', category: 'patron', description: 'Imperial blessing' },
  { id: 'roman_triumph', name: 'Roman Triumph', icon: '🏛️', cost_as: 25000, tier: 'legendary', category: 'patron', description: 'Triumphal celebration' },
  
  // Prestige
  { id: 'emperors_seal', name: 'Emperor\'s Seal', icon: '🔱', cost_as: 50000, tier: 'prestige', category: 'patron', description: 'Ultimate imperial favor' }
];

const TIER_COLORS = {
  common: 'bg-stone-600/20 text-stone-300 border-stone-500/30',
  uncommon: 'bg-green-600/20 text-green-300 border-green-500/30',
  rare: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
  epic: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
  legendary: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
  prestige: 'bg-rose-600/20 text-rose-300 border-rose-500/30'
};

export default function MarketplaceGiftPanel({ 
  isOpen, 
  onClose, 
  partnerId, 
  videoId,
  onGiftSent 
}) {
  const queryClient = useQueryClient();
  const [selectedGift, setSelectedGift] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallet } = useQuery({
    queryKey: ['user-wallet', user?.email],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
      return wallets[0] || null;
    },
    enabled: !!user?.email
  });

  const sendGiftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGift) throw new Error('Select a gift');
      
      const totalCost = selectedGift.cost_as * quantity;
      const asBalance = wallet?.as_balance || 0;
      
      if (asBalance < totalCost) {
        throw new Error('Not enough coins');
      }

      // Server-authoritative debit (client can't forge balance)
      const { error: debitErr } = await base44.rpc('debit_as_balance', {
        p_amount: totalCost, p_reason: 'marketplace_gift', p_related: partnerId || null,
      });
      if (debitErr) throw new Error(debitErr.message || 'Payment failed');

      // Record gift transaction
      await base44.entities.GiftTransaction.create({
        sender_email: user.email,
        receiver_creator_id: partnerId,
        gift_id: selectedGift.id,
        gift_name: selectedGift.name,
        quantity,
        total_as_value: totalCost
      });

      // Update video gift count if applicable
      if (videoId) {
        const video = await base44.entities.AffiliateVideo.filter({ id: videoId }, null, 1);
        if (video[0]) {
          await base44.entities.AffiliateVideo.update(videoId, {
            gift_count: (video[0].gift_count || 0) + quantity,
            total_gifts_denarii: (video[0].total_gifts_denarii || 0) + Math.floor(totalCost / 100)
          });
        }
      }

      // Update partner earnings (75% to partner)
      const partnerEarnings = totalCost * 0.75;
      const partners = await base44.entities.AffiliatePartner.filter({ id: partnerId }, null, 1);
      if (partners[0]) {
        await base44.entities.AffiliatePartner.update(partnerId, {
          total_earnings_usd: (partners[0].total_earnings_usd || 0) + (partnerEarnings / 100),
          pending_payout_usd: (partners[0].pending_payout_usd || 0) + (partnerEarnings / 100)
        });
      }

      return { gift: selectedGift, quantity };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      toast.success(`Sent ${data.quantity}x ${data.gift.icon} ${data.gift.name}!`);
      onGiftSent?.(data);
      setSelectedGift(null);
      setQuantity(1);
      onClose();
    },
    onError: (error) => toast.error(error.message)
  });

  const categories = ['all', 'marketplace', 'merchant', 'trade', 'prosperity', 'patron'];
  const filteredGifts = activeCategory === 'all' 
    ? MARKETPLACE_GIFTS 
    : MARKETPLACE_GIFTS.filter(g => g.category === activeCategory);

  const totalCost = selectedGift ? selectedGift.cost_as * quantity : 0;
  const canAfford = (wallet?.as_balance || 0) >= totalCost;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          className="bg-gradient-to-b from-stone-800 to-stone-900 rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-hidden border-t border-amber-600/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-amber-600/20 flex items-center justify-between">
            <div>
              <h3 className="text-amber-100 font-bold text-lg flex items-center gap-2">
                <span>🏛️</span> Roman Marketplace Gifts
              </h3>
              <p className="text-amber-400/60 text-xs">Support your favorite merchants</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-amber-900/30 px-3 py-1 rounded-full">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-amber-100 font-bold">{wallet?.as_balance || 0}</span>
              </div>
              <button onClick={onClose} className="text-amber-400/60 hover:text-amber-400">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 p-3 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-700/50 text-amber-300 hover:bg-stone-700'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Gifts Grid */}
          <ScrollArea className="h-64 px-4">
            <div className="grid grid-cols-4 gap-2 pb-4">
              {filteredGifts.map((gift) => (
                <motion.button
                  key={gift.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedGift(gift)}
                  className={`p-2 rounded-xl text-center transition-all ${
                    selectedGift?.id === gift.id
                      ? 'bg-amber-600/30 ring-2 ring-amber-500'
                      : 'bg-stone-700/30 hover:bg-stone-700/50'
                  }`}
                >
                  <div className="text-3xl mb-1">{gift.icon}</div>
                  <p className="text-amber-100 text-xs font-medium truncate">{gift.name}</p>
                  <p className="text-amber-400 text-xs">{gift.cost_as} 🪙</p>
                </motion.button>
              ))}
            </div>
          </ScrollArea>

          {/* Selected Gift & Send */}
          {selectedGift && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-4 border-t border-amber-600/20 bg-stone-800/50"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="text-4xl">{selectedGift.icon}</div>
                <div className="flex-1">
                  <p className="text-amber-100 font-bold">{selectedGift.name}</p>
                  <p className="text-amber-400/70 text-xs">{selectedGift.description}</p>
                  <Badge className={TIER_COLORS[selectedGift.tier]}>
                    {selectedGift.tier}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full bg-stone-700 text-amber-100"
                  >
                    -
                  </button>
                  <span className="text-amber-100 font-bold w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full bg-stone-700 text-amber-100"
                  >
                    +
                  </button>
                </div>
              </div>

              <Button
                onClick={() => sendGiftMutation.mutate()}
                disabled={!canAfford || sendGiftMutation.isPending}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Send {quantity}x for {totalCost} 🪙
              </Button>
              {!canAfford && (
                <p className="text-red-400 text-xs text-center mt-2">Not enough coins</p>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}