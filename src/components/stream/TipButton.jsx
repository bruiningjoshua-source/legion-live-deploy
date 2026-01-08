import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DollarSign, Heart } from 'lucide-react';

export default function TipButton({ creatorId, streamId, variant = "default", size = "default" }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const tipMutation = useMutation({
    mutationFn: async () => {
      if (window.self !== window.top) {
        throw new Error('IFRAME_BLOCKED');
      }

      const response = await base44.functions.invoke('createTipCheckout', {
        creatorId,
        amount,
        message,
        streamId,
        isAnonymous
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to create checkout');
      }
    },
    onError: (error) => {
      if (error.message === 'IFRAME_BLOCKED') {
        alert('⚠️ Tipping only works in the published app.');
      } else {
        alert('Tip failed. Please try again.');
      }
    }
  });

  const quickAmounts = [1, 5, 10, 25, 50, 100];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <DollarSign className="w-4 h-4" />
          Tip
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-stone-900 border-amber-600/30">
        <DialogHeader>
          <DialogTitle className="text-amber-100 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Send a Tip
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Quick amounts */}
          <div>
            <Label className="text-amber-200 mb-2 block">Quick Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map(amt => (
                <Button
                  key={amt}
                  variant={amount === amt ? "default" : "outline"}
                  onClick={() => setAmount(amt)}
                  className={amount === amt ? "bg-amber-600" : "border-amber-600/20 text-amber-300"}
                >
                  ${amt}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <Label className="text-amber-200">Custom Amount (USD)</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              className="bg-stone-800 border-amber-600/20 text-amber-100"
            />
          </div>

          {/* Message */}
          <div>
            <Label className="text-amber-200">Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a supportive message..."
              className="bg-stone-800 border-amber-600/20 text-amber-100"
              maxLength={200}
            />
            <p className="text-xs text-amber-400/60 mt-1">{message.length}/200</p>
          </div>

          {/* Anonymous */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
            <Label htmlFor="anonymous" className="text-amber-200 text-sm cursor-pointer">
              Send anonymously
            </Label>
          </div>

          {/* Submit */}
          <Button
            onClick={() => tipMutation.mutate()}
            disabled={!amount || amount < 1 || tipMutation.isPending}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
          >
            {tipMutation.isPending ? 'Processing...' : `Send $${amount} Tip`}
          </Button>

          <p className="text-xs text-amber-400/60 text-center">
            85% goes to creator, 15% platform fee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}