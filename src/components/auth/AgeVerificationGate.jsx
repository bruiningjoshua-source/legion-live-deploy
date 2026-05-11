import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, AlertTriangle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function AgeVerificationGate({ user, onVerified }) {
  const queryClient = useQueryClient();
  const [birthDate, setBirthDate] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!birthDate) throw new Error('Please enter your date of birth');
      if (!confirmed) throw new Error('Please confirm you are 21 or older');

      const dob = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      if (age < 21) {
        throw new Error('You must be 21 years or older to use this platform');
      }

      await base44.auth.updateMe({
        age_verified: true,
        date_of_birth: birthDate,
        verification_date: new Date().toISOString()
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('Age verified successfully!');
      onVerified?.();
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="bg-gradient-to-br from-stone-900 to-stone-950 border-amber-600/30">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-amber-400" />
            </div>
            <CardTitle className="text-2xl text-amber-100">Age Verification Required</CardTitle>
            <p className="text-amber-400/70 text-sm mt-2">
              This platform contains mature content and is restricted to users 21 years of age or older.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-900/20 border border-amber-600/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-amber-100 font-semibold mb-1">Important Notice</p>
                  <p className="text-amber-400/70">
                    By proceeding, you confirm that you are at least 21 years old and agree to our terms of service and community guidelines.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-amber-200 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of Birth
              </Label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 21)).toISOString().split('T')[0]}
                className="bg-stone-800 border-amber-600/20 text-amber-100"
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="age-confirm"
                checked={confirmed}
                onCheckedChange={setConfirmed}
                className="mt-1 border-amber-600/50 data-[state=checked]:bg-amber-600"
              />
              <label htmlFor="age-confirm" className="text-amber-100/80 text-sm cursor-pointer">
                I confirm that I am 21 years of age or older and understand that this platform contains mature content intended for adults only.
              </label>
            </div>

            <Button
              onClick={() => verifyMutation.mutate()}
              disabled={!birthDate || !confirmed || verifyMutation.isPending}
              className="w-full bg-amber-600 hover:bg-amber-700 py-6 text-lg"
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Verify & Continue'}
            </Button>

            <p className="text-amber-400/50 text-xs text-center">
              Your information is stored securely and used only for age verification purposes.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}