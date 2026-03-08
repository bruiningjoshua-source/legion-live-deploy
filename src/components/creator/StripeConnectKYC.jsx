import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2, AlertCircle, Clock, ArrowRight,
  Loader2, RefreshCw, ExternalLink, ShieldCheck,
  Banknote, FileText, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const STEPS = [
  { id: 'account', label: 'Create Stripe Account', desc: 'Set up your Express payout account' },
  { id: 'identity', label: 'Identity Verification', desc: 'Verify your name, DOB & government ID' },
  { id: 'banking', label: 'Connect Bank Account', desc: 'Link your bank for direct deposits' },
  { id: 'tax', label: 'Tax Information', desc: 'Provide SSN/EIN for 1099 reporting' },
  { id: 'active', label: 'Payouts Active', desc: 'Automated daily deposits enabled' },
];

function getStepStatus(stripeStatus, stepId) {
  if (!stripeStatus || stripeStatus.status === 'not_started') {
    return stepId === 'account' ? 'current' : 'pending';
  }
  if (stripeStatus.status === 'incomplete') {
    if (stepId === 'account') return 'done';
    return stepId === 'identity' ? 'current' : 'pending';
  }
  if (stripeStatus.status === 'pending_verification') {
    return ['account','identity','banking','tax'].includes(stepId) ? 'done' : 'current';
  }
  if (stripeStatus.status === 'active') return 'done';
  return 'pending';
}

export default function StripeConnectKYC({ creator, onStatusChange }) {
  const [stripeStatus, setStripeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = async () => {
    if (!creator?.id) return;
    setLoading(true);
    const res = await base44.functions.invoke('stripeConnectOnboard', {
      action: 'check_status',
      creatorId: creator.id
    });
    setStripeStatus(res.data);
    if (onStatusChange) onStatusChange(res.data);
    setLoading(false);
  };

  useEffect(() => {
    // Check for return from Stripe onboarding
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success') || params.get('stripe_refresh')) {
      toast.success('Stripe onboarding step completed — refreshing status...');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => fetchStatus(), 1500);
    } else {
      fetchStatus();
    }
  }, [creator?.id]);

  const handleStartOnboarding = async () => {
    setActionLoading(true);
    const res = await base44.functions.invoke('stripeConnectOnboard', {
      action: 'create_account',
      creatorId: creator.id
    });
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error(res.data?.error || 'Failed to start setup');
      setActionLoading(false);
    }
  };

  const handleResumeOnboarding = async () => {
    setActionLoading(true);
    const res = await base44.functions.invoke('stripeConnectOnboard', {
      action: 'resume_onboarding',
      creatorId: creator.id
    });
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error(res.data?.error || 'Failed to resume setup');
      setActionLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    setActionLoading(true);
    const res = await base44.functions.invoke('stripeConnectOnboard', {
      action: 'create_login_link',
      creatorId: creator.id
    });
    if (res.data?.url) {
      window.open(res.data.url, '_blank');
    } else {
      toast.error('Failed to open Stripe dashboard');
    }
    setActionLoading(false);
  };

  const isActive = stripeStatus?.status === 'active';
  const isPending = stripeStatus?.status === 'pending_verification';
  const isIncomplete = stripeStatus?.status === 'incomplete';
  const isNotStarted = !stripeStatus || stripeStatus?.status === 'not_started';

  const statusBadge = isActive
    ? { label: 'Verified & Active', color: 'bg-green-600/20 text-green-300 border-green-500/30' }
    : isPending
    ? { label: 'Under Review', color: 'bg-amber-600/20 text-amber-300 border-amber-500/30' }
    : isIncomplete
    ? { label: 'Action Required', color: 'bg-red-600/20 text-red-300 border-red-500/30' }
    : { label: 'Not Started', color: 'bg-stone-600/20 text-stone-300 border-stone-500/30' };

  return (
    <div className="space-y-6">
      {/* Header Status Card */}
      <Card className={`border ${isActive ? 'border-green-600/40 bg-green-900/10' : isPending ? 'border-amber-600/40 bg-amber-900/10' : 'border-indigo-600/40 bg-indigo-900/10'}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className={`w-6 h-6 ${isActive ? 'text-green-400' : 'text-indigo-400'}`} />
                <h3 className="text-white font-bold text-lg">Identity Verification & KYC</h3>
                <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
              </div>
              <p className="text-white/60 text-sm max-w-lg">
                Stripe handles your identity verification, tax compliance (1099), and automated daily bank deposits. Required before receiving any payouts.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading} className="text-white/40 hover:text-white/70">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Info pills */}
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              { icon: <Banknote className="w-3.5 h-3.5" />, label: 'Daily auto-payouts' },
              { icon: <FileText className="w-3.5 h-3.5" />, label: '1099 tax reporting' },
              { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'Bank-grade KYC' },
              { icon: <Calendar className="w-3.5 h-3.5" />, label: '1-2 business day deposits' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs">
                {item.icon}{item.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progress Steps */}
      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const status = loading ? 'pending' : getStepStatus(stripeStatus, step.id);
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                status === 'done' ? 'border-green-600/30 bg-green-900/10' :
                status === 'current' ? 'border-indigo-500/50 bg-indigo-900/15' :
                'border-white/5 bg-white/2'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                status === 'done' ? 'bg-green-600/30' :
                status === 'current' ? 'bg-indigo-600/30' :
                'bg-white/5'
              }`}>
                {status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : status === 'current' ? (
                  <Clock className="w-5 h-5 text-indigo-400" />
                ) : (
                  <span className="text-white/20 text-sm font-bold">{i + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium text-sm ${status === 'done' ? 'text-green-300' : status === 'current' ? 'text-white' : 'text-white/30'}`}>
                  {step.label}
                </p>
                <p className={`text-xs ${status === 'done' ? 'text-green-400/60' : status === 'current' ? 'text-white/50' : 'text-white/20'}`}>
                  {step.desc}
                </p>
              </div>
              {status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-400/60 flex-shrink-0" />}
              {status === 'current' && !isActive && <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />}
            </motion.div>
          );
        })}
      </div>

      {/* Action Button */}
      <div className="space-y-3">
        {isNotStarted && (
          <Button
            onClick={handleStartOnboarding}
            disabled={actionLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 text-base"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
            Begin KYC & Connect Bank Account
          </Button>
        )}

        {isIncomplete && (
          <Button
            onClick={handleResumeOnboarding}
            disabled={actionLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-12 text-base"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
            Complete Verification (Action Required)
          </Button>
        )}

        {isPending && (
          <div className="p-4 rounded-xl border border-amber-600/30 bg-amber-900/10 text-center">
            <Clock className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-300 font-medium">Verification Under Review</p>
            <p className="text-amber-400/60 text-sm mt-1">Stripe typically completes verification within 24-48 hours. You'll receive an email when payouts are enabled.</p>
          </div>
        )}

        {isActive && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-green-600/30 bg-green-900/10">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-green-300 font-bold">Fully Verified — Payouts Active</p>
                  <p className="text-green-400/60 text-sm">Daily automatic deposits to your bank. Funds arrive in 1-2 business days.</p>
                </div>
              </div>
              {stripeStatus?.payout_schedule && (
                <div className="mt-2 flex gap-4 text-xs text-green-400/60">
                  <span>Schedule: {stripeStatus.payout_schedule.interval}</span>
                  {stripeStatus.payout_schedule.delay_days && <span>Delay: {stripeStatus.payout_schedule.delay_days} days</span>}
                </div>
              )}
            </div>
            <Button
              onClick={handleOpenDashboard}
              disabled={actionLoading}
              variant="outline"
              className="w-full border-green-600/30 text-green-300 hover:bg-green-900/20"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              Open Stripe Dashboard
            </Button>
          </div>
        )}
      </div>

      {/* Pending requirements if any */}
      {stripeStatus?.pending_requirements?.length > 0 && !isActive && (
        <div className="p-4 rounded-xl border border-red-600/30 bg-red-900/10">
          <p className="text-red-300 font-medium text-sm mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Required Information
          </p>
          <ul className="space-y-1">
            {stripeStatus.pending_requirements.map((req, i) => (
              <li key={i} className="text-red-400/70 text-xs flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-red-400/50 flex-shrink-0" />
                {req.replace(/_/g, ' ').replace(/\./g, ' → ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-white/20 text-xs text-center">
        Powered by Stripe Connect Express · Bank-grade 256-bit encryption · Stripe handles all KYC regulatory compliance
      </p>
    </div>
  );
}