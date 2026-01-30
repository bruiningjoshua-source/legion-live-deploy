import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Award, Coins, Sparkles, Send } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AwardButton({ postId, replyId, receiverEmail, user }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedAward, setSelectedAward] = useState(null);
  const [message, setMessage] = useState('');

  const { data: awards = [] } = useQuery({
    queryKey: ['forum-awards'],
    queryFn: () => base44.entities.ForumAward.list('cost_coins', 50)
  });

  const { data: userWallet } = useQuery({
    queryKey: ['user-wallet', user?.email],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
      return wallets[0] || { denarii_balance: 0 };
    },
    enabled: !!user?.email
  });

  const giveAwardMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAward) throw new Error('Select an award');
      if ((userWallet?.denarii_balance || 0) < selectedAward.cost_coins) {
        throw new Error('Not enough coins');
      }

      // Deduct coins
      await base44.entities.Wallet.update(userWallet.id, {
        denarii_balance: userWallet.denarii_balance - selectedAward.cost_coins
      });

      // Create award record
      await base44.entities.PostAward.create({
        post_id: postId || null,
        reply_id: replyId || null,
        award_id: selectedAward.id,
        giver_email: user.email,
        receiver_email: receiverEmail,
        message
      });

      // Notify receiver
      await base44.entities.Notification.create({
        user_email: receiverEmail,
        type: 'gift',
        title: `You received a ${selectedAward.name}!`,
        message: message || `${user.full_name} gave you an award`,
        from_user_email: user.email,
        from_user_name: user.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-wallet']);
      queryClient.invalidateQueries(['post-awards']);
      toast.success('Award given!');
      setOpen(false);
      setSelectedAward(null);
      setMessage('');
    },
    onError: (err) => toast.error(err.message)
  });

  const tierColors = {
    bronze: 'bg-orange-600/30 text-orange-300 border-orange-500/30',
    silver: 'bg-gray-400/30 text-gray-200 border-gray-400/30',
    gold: 'bg-yellow-500/30 text-yellow-300 border-yellow-500/30',
    platinum: 'bg-cyan-400/30 text-cyan-200 border-cyan-400/30'
  };

  if (!user || user.email === receiverEmail) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300">
          <Award className="w-4 h-4 mr-1" />
          Award
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-stone-900 border-amber-600/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Give an Award
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-stone-800 rounded-lg">
            <span className="text-amber-400/70 text-sm">Your balance</span>
            <Badge className="bg-amber-600/30 text-amber-300">
              <Coins className="w-3 h-3 mr-1" />
              {userWallet?.denarii_balance?.toLocaleString() || 0}
            </Badge>
          </div>

          <ScrollArea className="h-64">
            <div className="grid grid-cols-2 gap-2">
              {awards.map(award => {
                const canAfford = (userWallet?.denarii_balance || 0) >= award.cost_coins;
                
                return (
                  <motion.div
                    key={award.id}
                    whileHover={{ scale: canAfford ? 1.02 : 1 }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAward?.id === award.id
                        ? 'border-amber-500 bg-amber-500/20'
                        : canAfford
                          ? `${tierColors[award.tier]} hover:border-amber-500/50`
                          : 'border-stone-700 bg-stone-800/50 opacity-50'
                    }`}
                    onClick={() => canAfford && setSelectedAward(award)}
                  >
                    <div className="text-center">
                      <span className="text-2xl">{award.icon || '🏆'}</span>
                      <p className="text-amber-100 font-medium text-sm mt-1">{award.name}</p>
                      <Badge className="mt-1 bg-stone-700/50 text-amber-300">
                        {award.cost_coins}
                      </Badge>
                      {award.gives_premium && (
                        <p className="text-purple-400 text-xs mt-1">
                          +{award.premium_days} days premium
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          {selectedAward && (
            <div className="space-y-3 pt-3 border-t border-stone-700">
              <Input
                placeholder="Add a message (optional)"
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="bg-stone-800 border-amber-600/30 text-amber-100"
              />
              <Button
                onClick={() => giveAwardMutation.mutate()}
                disabled={giveAwardMutation.isPending}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Give {selectedAward.name} ({selectedAward.cost_coins} coins)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}