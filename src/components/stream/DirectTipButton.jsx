import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DollarSign, ExternalLink, Copy, Check, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PAYOUT_ICONS = {
  paypal: '💳',
  venmo: '📱',
  cashapp: '💵',
  bank_transfer: '🏦'
};

export default function DirectTipButton({ creator, variant = 'default', size = 'default' }) {
  const [showDialog, setShowDialog] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const { data: payoutMethods = [] } = useQuery({
    queryKey: ['creator-payout-methods', creator?.id],
    queryFn: () => base44.entities.CreatorPayoutMethod.filter({ creator_id: creator.id }),
    enabled: !!creator?.id && creator?.direct_tips_enabled
  });

  const { data: subscription } = useQuery({
    queryKey: ['creator-subscription', creator?.user_email],
    queryFn: async () => {
      const subs = await base44.entities.CreatorSubscription.filter({ 
        user_email: creator.user_email, 
        status: 'active' 
      }, '-created_date', 1);
      return subs[0] || null;
    },
    enabled: !!creator?.user_email
  });

  const isSubscribed = subscription?.status === 'active';

  // Don't show if creator hasn't enabled direct tips or isn't subscribed
  if (!creator?.direct_tips_enabled || !isSubscribed || payoutMethods.length === 0) {
    return null;
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getPaymentLink = (method) => {
    switch (method.method_type) {
      case 'paypal':
        return `https://paypal.me/${method.identifier.replace('@', '')}`;
      case 'venmo':
        return `https://venmo.com/${method.identifier.replace('@', '')}`;
      case 'cashapp':
        return `https://cash.app/${method.identifier}`;
      default:
        return null;
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant={variant}
        size={size}
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white gap-2"
      >
        <DollarSign className="w-4 h-4" />
        Direct Tip
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-stone-900 border-amber-600/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-400" />
              Send Direct Tip to {creator?.display_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-amber-400/70 text-sm">
              Send a tip directly to {creator?.display_name}'s wallet. They receive 100% of your tip!
            </p>

            {payoutMethods.map((method, i) => {
              const link = getPaymentLink(method);
              return (
                <motion.div
                  key={method.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-stone-800/50 rounded-xl p-4 border border-amber-600/20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{PAYOUT_ICONS[method.method_type]}</span>
                      <span className="text-amber-100 font-semibold capitalize">{method.method_type.replace('_', ' ')}</span>
                    </div>
                    {method.is_default && (
                      <Badge className="bg-green-600/20 text-green-300 border-green-500/30 text-xs">
                        Preferred
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-stone-900 px-3 py-2 rounded-lg text-amber-300 text-sm">
                      {method.identifier}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(method.identifier, method.id)}
                      className="text-amber-400 hover:bg-amber-800/20"
                    >
                      {copiedId === method.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}

            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-3">
              <p className="text-amber-300/80 text-xs">
                💡 Direct tips go straight to the creator's wallet - no platform fees! 
                After sending, come back and let them know in chat.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}