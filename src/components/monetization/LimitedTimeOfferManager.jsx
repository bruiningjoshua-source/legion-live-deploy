import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, Gift, Zap, Plus, Trash2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, differenceInHours } from 'date-fns';

const OFFER_TYPES = [
  { value: 'fan_club_discount', label: 'Fan Club Discount', icon: '💎', description: 'Discount on subscription tiers' },
  { value: 'ppv_discount', label: 'PPV Event Discount', icon: '🎬', description: 'Discount on ticketed events' },
  { value: 'bundle', label: 'Bundle Deal', icon: '📦', description: 'Multiple items at special price' },
  { value: 'free_trial', label: 'Free Trial', icon: '🎁', description: 'Limited time free access' },
  { value: 'bonus_content', label: 'Bonus Content', icon: '⭐', description: 'Extra perks with purchase' },
];

export default function LimitedTimeOfferManager({ creatorId }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    offer_type: 'fan_club_discount',
    discount_percent: 20,
    original_price_usd: 9.99,
    sale_price_usd: 7.99,
    start_date: new Date().toISOString(),
    end_date: addDays(new Date(), 7).toISOString(),
    max_claims: null,
    promo_code: '',
    urgency_message: '',
    bonus_perks: [],
  });

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['limited-offers', creatorId],
    queryFn: () => base44.entities.LimitedTimeOffer.filter({ creator_id: creatorId }, '-created_date'),
    enabled: !!creatorId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LimitedTimeOffer.create({ ...data, creator_id: creatorId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['limited-offers', creatorId]);
      setShowCreate(false);
      setNewOffer({
        title: '',
        description: '',
        offer_type: 'fan_club_discount',
        discount_percent: 20,
        original_price_usd: 9.99,
        sale_price_usd: 7.99,
        start_date: new Date().toISOString(),
        end_date: addDays(new Date(), 7).toISOString(),
        max_claims: null,
        promo_code: '',
        urgency_message: '',
        bonus_perks: [],
      });
      toast.success('Limited time offer created!');
    },
    onError: () => toast.error('Failed to create offer'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LimitedTimeOffer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['limited-offers', creatorId]);
      toast.success('Offer deleted');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.LimitedTimeOffer.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['limited-offers', creatorId]),
  });

  const activeOffers = offers.filter(o => o.is_active && new Date(o.end_date) > new Date());
  const expiredOffers = offers.filter(o => !o.is_active || new Date(o.end_date) <= new Date());

  const calculateSalePrice = () => {
    const discount = newOffer.discount_percent / 100;
    return (newOffer.original_price_usd * (1 - discount)).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Active Offers */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-amber-100 font-bold text-lg">Limited Time Offers</h3>
          <p className="text-amber-400/60 text-sm">{activeOffers.length} active offers</p>
        </div>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Offer
        </Button>
      </div>

      {/* Offer Cards */}
      <div className="grid gap-4">
        {activeOffers.map(offer => (
          <OfferCard 
            key={offer.id} 
            offer={offer} 
            onDelete={() => deleteMutation.mutate(offer.id)}
            onToggle={() => toggleActiveMutation.mutate({ id: offer.id, is_active: !offer.is_active })}
          />
        ))}
        {activeOffers.length === 0 && !showCreate && (
          <div className="text-center py-12 bg-stone-900/30 rounded-xl border border-dashed border-amber-600/20">
            <Gift className="w-12 h-12 text-amber-400/40 mx-auto mb-3" />
            <p className="text-amber-400/60">No active offers</p>
            <p className="text-amber-400/40 text-sm">Create a limited time offer to boost sales</p>
          </div>
        )}
      </div>

      {/* Past Offers */}
      {expiredOffers.length > 0 && (
        <div>
          <h4 className="text-amber-400/60 text-sm font-medium mb-3">Past Offers</h4>
          <div className="space-y-2">
            {expiredOffers.slice(0, 3).map(offer => (
              <div key={offer.id} className="flex items-center justify-between p-3 bg-stone-900/30 rounded-lg opacity-60">
                <span className="text-amber-200 text-sm">{offer.title}</span>
                <span className="text-amber-400/40 text-xs">{offer.claims_count} claims</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Offer Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-stone-900 rounded-2xl border border-amber-600/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-amber-600/20">
                <h3 className="text-amber-100 font-bold text-xl flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Create Limited Time Offer
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Offer Type */}
                <div>
                  <Label className="text-amber-200">Offer Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {OFFER_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setNewOffer({ ...newOffer, offer_type: type.value })}
                        className={`p-3 rounded-xl text-left transition-all ${
                          newOffer.offer_type === type.value
                            ? 'bg-amber-600/30 border border-amber-500/50'
                            : 'bg-stone-800/50 border border-stone-700/50 hover:bg-stone-700/50'
                        }`}
                      >
                        <span className="text-xl">{type.icon}</span>
                        <p className="text-sm text-amber-100 mt-1">{type.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title & Description */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-amber-200">Offer Title</Label>
                    <Input
                      value={newOffer.title}
                      onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                      placeholder="e.g. Flash Sale - 50% Off!"
                    />
                  </div>
                  <div>
                    <Label className="text-amber-200">Promo Code (optional)</Label>
                    <Input
                      value={newOffer.promo_code}
                      onChange={(e) => setNewOffer({ ...newOffer, promo_code: e.target.value.toUpperCase() })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100 uppercase"
                      placeholder="e.g. FLASH50"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-amber-200">Description</Label>
                  <Textarea
                    value={newOffer.description}
                    onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                    placeholder="Describe your offer..."
                    rows={2}
                  />
                </div>

                {/* Pricing */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-amber-200">Original Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newOffer.original_price_usd}
                      onChange={(e) => setNewOffer({ ...newOffer, original_price_usd: parseFloat(e.target.value) })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                    />
                  </div>
                  <div>
                    <Label className="text-amber-200">Discount %</Label>
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={newOffer.discount_percent}
                      onChange={(e) => setNewOffer({ ...newOffer, discount_percent: parseInt(e.target.value) })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                    />
                  </div>
                  <div>
                    <Label className="text-amber-200">Sale Price</Label>
                    <div className="h-9 flex items-center px-3 bg-green-900/30 border border-green-600/30 rounded-md">
                      <span className="text-green-400 font-bold">${calculateSalePrice()}</span>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-amber-200">Start Date</Label>
                    <Input
                      type="datetime-local"
                      value={newOffer.start_date.slice(0, 16)}
                      onChange={(e) => setNewOffer({ ...newOffer, start_date: new Date(e.target.value).toISOString() })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                    />
                  </div>
                  <div>
                    <Label className="text-amber-200">End Date</Label>
                    <Input
                      type="datetime-local"
                      value={newOffer.end_date.slice(0, 16)}
                      onChange={(e) => setNewOffer({ ...newOffer, end_date: new Date(e.target.value).toISOString() })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                    />
                  </div>
                </div>

                {/* Limits & Urgency */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-amber-200">Max Claims (optional)</Label>
                    <Input
                      type="number"
                      value={newOffer.max_claims || ''}
                      onChange={(e) => setNewOffer({ ...newOffer, max_claims: e.target.value ? parseInt(e.target.value) : null })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <Label className="text-amber-200">Urgency Message</Label>
                    <Input
                      value={newOffer.urgency_message}
                      onChange={(e) => setNewOffer({ ...newOffer, urgency_message: e.target.value })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                      placeholder="e.g. Only 10 spots left!"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-amber-600/20 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button 
                  onClick={() => createMutation.mutate({ ...newOffer, sale_price_usd: parseFloat(calculateSalePrice()) })}
                  disabled={!newOffer.title || createMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Offer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OfferCard({ offer, onDelete, onToggle }) {
  const hoursLeft = differenceInHours(new Date(offer.end_date), new Date());
  const isUrgent = hoursLeft < 24;
  const progress = offer.max_claims ? (offer.claims_count / offer.max_claims) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-900/20 to-stone-900 rounded-xl border border-amber-600/30 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-600/20">
              {OFFER_TYPES.find(t => t.value === offer.offer_type)?.icon || '🎁'}
            </div>
            <div>
              <h4 className="text-amber-100 font-bold">{offer.title}</h4>
              <p className="text-amber-400/60 text-sm">{offer.description}</p>
            </div>
          </div>
          <Badge className={isUrgent ? 'bg-red-600' : 'bg-amber-600'}>
            {isUrgent ? `${hoursLeft}h left!` : `${Math.floor(hoursLeft / 24)}d left`}
          </Badge>
        </div>

        <div className="flex items-center gap-6 mt-4">
          <div>
            <p className="text-amber-400/60 text-xs">Original</p>
            <p className="text-amber-200 line-through">${offer.original_price_usd}</p>
          </div>
          <div>
            <p className="text-green-400 text-xs">Sale Price</p>
            <p className="text-green-400 font-bold text-xl">${offer.sale_price_usd}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="border-amber-600/30 text-amber-300">
              {offer.discount_percent}% OFF
            </Badge>
            {offer.promo_code && (
              <Badge variant="outline" className="border-amber-600/30 text-amber-300">
                {offer.promo_code}
              </Badge>
            )}
          </div>
        </div>

        {offer.max_claims && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-amber-400/60 mb-1">
              <span>{offer.claims_count} claimed</span>
              <span>{offer.max_claims - offer.claims_count} remaining</span>
            </div>
            <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-amber-600/10">
          <div className="flex items-center gap-2 text-amber-400/60 text-sm">
            <Clock className="w-4 h-4" />
            <span>Ends {format(new Date(offer.end_date), 'MMM d, h:mm a')}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onToggle} className="text-amber-400">
              {offer.is_active ? 'Pause' : 'Activate'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-400 hover:text-red-300">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}