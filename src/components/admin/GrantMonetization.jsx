import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, UserPlus, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GrantMonetization({ adminEmail }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [recentGrants, setRecentGrants] = useState([]);

  const grantMutation = useMutation({
    mutationFn: async (targetEmail) => {
      const trimmed = targetEmail.trim().toLowerCase();
      if (!trimmed || !trimmed.includes('@')) throw new Error('Enter a valid email');

      // Check if already has active subscription
      const existing = await base44.entities.CreatorSubscription.filter(
        { user_email: trimmed, status: 'active' }, null, 1
      );
      if (existing.length > 0) throw new Error('User already has active monetization');

      // Create admin-granted subscription
      await base44.entities.CreatorSubscription.create({
        user_email: trimmed,
        plan_type: 'admin_grant',
        status: 'active',
        admin_activated: true,
        granted_by: adminEmail,
        expiry_date: new Date(2099, 11, 31).toISOString(),
        auto_renew: false
      });

      return trimmed;
    },
    onSuccess: (grantedEmail) => {
      setRecentGrants(prev => [{ email: grantedEmail, date: new Date() }, ...prev.slice(0, 9)]);
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['creator-subscription'] });
      toast.success(`Monetization granted to ${grantedEmail}`);
    },
    onError: (err) => toast.error(err.message)
  });

  const revokeMutation = useMutation({
    mutationFn: async (targetEmail) => {
      const subs = await base44.entities.CreatorSubscription.filter(
        { user_email: targetEmail, status: 'active' }, null, 10
      );
      for (const sub of subs) {
        await base44.entities.CreatorSubscription.update(sub.id, { status: 'cancelled' });
      }
      return targetEmail;
    },
    onSuccess: (revokedEmail) => {
      setRecentGrants(prev => prev.filter(g => g.email !== revokedEmail));
      queryClient.invalidateQueries({ queryKey: ['creator-subscription'] });
      toast.success(`Monetization revoked for ${revokedEmail}`);
    },
    onError: () => toast.error('Failed to revoke')
  });

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          Grant Monetization
        </CardTitle>
        <p className="text-white/40 text-xs">Give a user free monetization access without payment</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && grantMutation.mutate(email)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
          />
          <Button
            onClick={() => grantMutation.mutate(email)}
            disabled={grantMutation.isPending || !email.trim()}
            className="bg-black border border-red-500/30 text-white hover:bg-red-950/50 shrink-0"
          >
            {grantMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-400" />
            ) : (
              <UserPlus className="w-4 h-4 text-red-400" />
            )}
          </Button>
        </div>

        {recentGrants.length > 0 && (
          <div className="space-y-2">
            <p className="text-white/40 text-xs font-medium">Recently Granted</p>
            {recentGrants.map((g, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span className="text-white/70 text-sm truncate">{g.email}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-green-500/15 text-green-300 border-0 text-[10px]">Active</Badge>
                  <button
                    onClick={() => revokeMutation.mutate(g.email)}
                    className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                  >
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}