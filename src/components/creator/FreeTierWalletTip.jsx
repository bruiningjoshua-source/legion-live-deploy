import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wallet,
  DollarSign,
  Check,
  Copy,
  Edit,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

const WALLET_TYPES = [
  { value: 'paypal', label: 'PayPal', icon: '💳', placeholder: 'your@email.com' },
  { value: 'venmo', label: 'Venmo', icon: '📱', placeholder: '@username' },
  { value: 'cashapp', label: 'Cash App', icon: '💵', placeholder: '$cashtag' },
  { value: 'bitcoin', label: 'Bitcoin', icon: '₿', placeholder: 'BTC address' },
  { value: 'ethereum', label: 'Ethereum', icon: '⟠', placeholder: 'ETH address' }
];

export default function FreeTierWalletTip({ creator, isOwnProfile }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [walletType, setWalletType] = useState(creator?.tip_wallet_type || '');
  const [walletAddress, setWalletAddress] = useState(creator?.tip_wallet_address || '');
  const [copied, setCopied] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Creator.update(creator.id, {
        tip_wallet_type: walletType,
        tip_wallet_address: walletAddress,
        free_tier_tips_enabled: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-creator'] });
      queryClient.invalidateQueries({ queryKey: ['creator'] });
      setIsEditing(false);
      toast.success('Tip wallet saved!');
    }
  });

  // Don't render if no creator
  if (!creator) return null;

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Wallet address copied!');
  };

  const selectedWallet = WALLET_TYPES.find(w => w.value === (walletType || creator?.tip_wallet_type));

  // Owner view - setup/edit
  if (isOwnProfile) {
    return (
      <Card className="bg-gradient-to-br from-green-900/20 to-stone-900 border-green-600/30">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-400" />
              Free Tier Tip Wallet
            </div>
            <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
              Free Feature
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isEditing && creator?.tip_wallet_address ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-stone-800/50 rounded-lg">
                <span className="text-2xl">{selectedWallet?.icon || '💳'}</span>
                <div className="flex-1">
                  <p className="text-amber-100 font-semibold">{selectedWallet?.label}</p>
                  <p className="text-amber-400/70 text-sm">{creator.tip_wallet_address}</p>
                </div>
                <Badge className="bg-green-500 text-white">Active</Badge>
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="w-full border-amber-600/30 text-amber-300"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-amber-400/70 text-sm">
                Set up one wallet to accept direct tips from viewers - free for all creators!
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-amber-200">Wallet Type</Label>
                  <Select value={walletType} onValueChange={setWalletType}>
                    <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                      <SelectValue placeholder="Select wallet type" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-amber-600/30">
                      {WALLET_TYPES.map(wallet => (
                        <SelectItem key={wallet.value} value={wallet.value} className="text-amber-100">
                          <span className="mr-2">{wallet.icon}</span>
                          {wallet.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-amber-200">Wallet Address / Username</Label>
                  <Input
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder={WALLET_TYPES.find(w => w.value === walletType)?.placeholder || 'Enter your wallet address'}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={!walletType || !walletAddress || saveMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Wallet'}
                  </Button>
                  {creator?.tip_wallet_address && (
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="border-amber-600/30 text-amber-300"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Viewer view - show tip option
  if (!creator?.tip_wallet_address || !creator?.free_tier_tips_enabled) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-green-900/20 to-stone-900 border-green-600/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
              <span className="text-xl">{selectedWallet?.icon || '💳'}</span>
            </div>
            <div>
              <p className="text-amber-100 font-semibold">Tip {creator.display_name}</p>
              <p className="text-amber-400/60 text-sm">via {selectedWallet?.label}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={copyAddress}
              variant="outline"
              size="sm"
              className="border-amber-600/30 text-amber-300"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            {(creator.tip_wallet_type === 'paypal' || creator.tip_wallet_type === 'venmo' || creator.tip_wallet_type === 'cashapp') && (
              <Button
                onClick={() => {
                  let url = '';
                  if (creator.tip_wallet_type === 'paypal') {
                    url = `https://paypal.me/${creator.tip_wallet_address.replace('@', '')}`;
                  } else if (creator.tip_wallet_type === 'venmo') {
                    url = `https://venmo.com/${creator.tip_wallet_address.replace('@', '')}`;
                  } else if (creator.tip_wallet_type === 'cashapp') {
                    url = `https://cash.app/${creator.tip_wallet_address}`;
                  }
                  window.open(url, '_blank');
                }}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Tip Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}