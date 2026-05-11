import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Gift, 
  Plus, 
  Upload,
  Sparkles,
  Trash2,
  Edit,
  CheckCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

const TIER_CONFIG = {
  common: { color: 'gray', minPrice: 10, maxPrice: 100 },
  rare: { color: 'blue', minPrice: 100, maxPrice: 500 },
  epic: { color: 'purple', minPrice: 500, maxPrice: 2000 },
  legendary: { color: 'amber', minPrice: 2000, maxPrice: 10000 }
};

export default function CustomGiftCreator({ creatorId }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [newGift, setNewGift] = useState({
    name: '',
    description: '',
    image_url: '',
    cost_denarii: 100,
    tier: 'common'
  });
  const queryClient = useQueryClient();

  const { data: myGifts = [], isLoading } = useQuery({
    queryKey: ['my-custom-gifts', creatorId],
    queryFn: () => base44.entities.CustomGift.filter({ creator_id: creatorId }),
    enabled: !!creatorId
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const gift = await base44.entities.CustomGift.create({
        ...data,
        creator_id: creatorId,
        is_approved: false,
        is_active: true
      });
      return gift;
    },
    onSuccess: () => {
      toast.success('Gift created! Pending approval.');
      setShowCreate(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['my-custom-gifts'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.CustomGift.update(id, data);
    },
    onSuccess: () => {
      toast.success('Gift updated!');
      setEditingGift(null);
      queryClient.invalidateQueries({ queryKey: ['my-custom-gifts'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.CustomGift.delete(id);
    },
    onSuccess: () => {
      toast.success('Gift deleted');
      queryClient.invalidateQueries({ queryKey: ['my-custom-gifts'] });
    }
  });

  const resetForm = () => {
    setNewGift({
      name: '',
      description: '',
      image_url: '',
      cost_denarii: 100,
      tier: 'common'
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (editingGift) {
        setEditingGift({ ...editingGift, image_url: file_url });
      } else {
        setNewGift({ ...newGift, image_url: file_url });
      }
      toast.success('Image uploaded!');
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-400" />
            Custom Gifts
          </h2>
          <p className="text-white/50 text-sm">Create unique gifts for your fans</p>
        </div>
        <PremiumButton
          onClick={() => setShowCreate(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Gift
        </PremiumButton>
      </div>

      {/* My Gifts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : myGifts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {myGifts.map(gift => {
            const tierStyle = TIER_CONFIG[gift.tier] || TIER_CONFIG.common;
            return (
              <GlassCard
                key={gift.id}
                className="relative group"
                padding="p-4"
                glowColor={tierStyle.color}
              >
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  {gift.is_approved ? (
                    <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded-lg">
                      <CheckCircle className="w-3 h-3" />
                      Approved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 text-xs px-2 py-1 rounded-lg">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                </div>

                {/* Image */}
                <div className="aspect-square rounded-xl bg-white/10 mb-3 overflow-hidden">
                  {gift.image_url ? (
                    <img src={gift.image_url} alt={gift.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🎁</div>
                  )}
                </div>

                {/* Info */}
                <h3 className="text-white font-semibold text-sm truncate">{gift.name}</h3>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-${tierStyle.color}-400 text-xs capitalize`}>{gift.tier}</span>
                  <span className="text-amber-300 text-sm font-medium">{gift.cost_denarii} 🪙</span>
                </div>

                {/* Stats */}
                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white/40">
                  Sent {gift.times_sent || 0} times
                </div>

                {/* Actions */}
                <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingGift(gift)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(gift.id)}
                    className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard className="text-center py-12">
          <Gift className="w-12 h-12 text-pink-400/30 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No Custom Gifts Yet</h3>
          <p className="text-white/50 text-sm mb-4">Create unique gifts for your fans to send during streams</p>
          <PremiumButton onClick={() => setShowCreate(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Create Your First Gift
          </PremiumButton>
        </GlassCard>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreate || editingGift) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => { setShowCreate(false); setEditingGift(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard glowColor="pink">
                <h2 className="text-xl font-bold text-white mb-6">
                  {editingGift ? 'Edit Gift' : 'Create Custom Gift'}
                </h2>

                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Gift Image</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-white/10 overflow-hidden">
                        {(editingGift?.image_url || newGift.image_url) ? (
                          <img 
                            src={editingGift?.image_url || newGift.image_url} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🎁</div>
                        )}
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 transition-colors">
                          <Upload className="w-4 h-4" />
                          Upload
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Gift Name</label>
                    <Input
                      value={editingGift?.name || newGift.name}
                      onChange={(e) => editingGift 
                        ? setEditingGift({ ...editingGift, name: e.target.value })
                        : setNewGift({ ...newGift, name: e.target.value })
                      }
                      placeholder="e.g., Super Heart"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Description</label>
                    <Textarea
                      value={editingGift?.description || newGift.description}
                      onChange={(e) => editingGift 
                        ? setEditingGift({ ...editingGift, description: e.target.value })
                        : setNewGift({ ...newGift, description: e.target.value })
                      }
                      placeholder="A special gift for special fans..."
                      className="bg-white/5 border-white/10 text-white h-20"
                    />
                  </div>

                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Price (Denarii)</label>
                    <Input
                      type="number"
                      value={editingGift?.cost_denarii || newGift.cost_denarii}
                      onChange={(e) => editingGift 
                        ? setEditingGift({ ...editingGift, cost_denarii: parseInt(e.target.value) || 0 })
                        : setNewGift({ ...newGift, cost_denarii: parseInt(e.target.value) || 0 })
                      }
                      min={10}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Tier</label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(TIER_CONFIG).map(([tier, config]) => (
                        <button
                          key={tier}
                          onClick={() => editingGift 
                            ? setEditingGift({ ...editingGift, tier })
                            : setNewGift({ ...newGift, tier })
                          }
                          className={`p-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                            (editingGift?.tier || newGift.tier) === tier
                              ? `bg-${config.color}-500/30 text-${config.color}-300 ring-2 ring-${config.color}-500`
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <PremiumButton 
                    variant="ghost" 
                    onClick={() => { setShowCreate(false); setEditingGift(null); resetForm(); }} 
                    className="flex-1"
                  >
                    Cancel
                  </PremiumButton>
                  <PremiumButton
                    onClick={() => editingGift 
                      ? updateMutation.mutate({ id: editingGift.id, data: editingGift })
                      : createMutation.mutate(newGift)
                    }
                    loading={createMutation.isPending || updateMutation.isPending}
                    disabled={!(editingGift?.name || newGift.name)}
                    className="flex-1"
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    {editingGift ? 'Save Changes' : 'Create Gift'}
                  </PremiumButton>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}