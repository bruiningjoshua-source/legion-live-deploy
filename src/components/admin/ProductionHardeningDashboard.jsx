import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Server, Lock, Zap } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ProductionHardeningDashboard() {
  const [activeTest, setActiveTest] = useState(null);

  const { data: auditResults, isLoading: auditLoading, refetch: runAudit } = useQuery({
    queryKey: ['production-audit'],
    queryFn: () => base44.functions.invoke('productionValidation', {}),
    enabled: false,
    staleTime: Infinity
  });

  const { data: stripeResults, isLoading: stripeLoading, refetch: runStripeTest } = useQuery({
    queryKey: ['stripe-test'],
    queryFn: () => base44.functions.invoke('liveStripeTest', { test_type: 'full_cycle' }),
    enabled: false,
    staleTime: Infinity
  });

  const auditMutation = useMutation({
    mutationFn: () => runAudit(),
    onSuccess: () => toast.success('Audit completed'),
    onError: () => toast.error('Audit failed')
  });

  const stripeMutation = useMutation({
    mutationFn: () => runStripeTest(),
    onSuccess: () => toast.success('Stripe test completed'),
    onError: () => toast.error('Stripe test failed')
  });

  const checks = [
    {
      id: 'database',
      title: 'Database Integrity',
      description: 'CRUD operations on critical entities',
      icon: Server,
      result: auditResults?.data?.checks?.database
    },
    {
      id: 'stripe',
      title: 'Stripe Live Integration',
      description: 'Payment processing verified',
      icon: Zap,
      result: stripeResults?.data || auditResults?.data?.checks?.stripe
    },
    {
      id: 'security',
      title: 'Security Hardening',
      description: 'CSRF, rate limiting, fraud detection',
      icon: Lock,
      result: auditResults?.data?.checks?.security
    },
    {
      id: 'monitoring',
      title: 'Monitoring & Alerts',
      description: 'Error tracking, network monitoring, analytics',
      icon: Clock,
      result: auditResults?.data?.checks?.monitoring
    },
    {
      id: 'failover',
      title: 'Failover & Recovery',
      description: 'Critical functions with error handling',
      icon: AlertTriangle,
      result: auditResults?.data?.checks?.failover
    },
    {
      id: 'performance',
      title: 'Performance Baselines',
      description: 'Caching, lazy loading, optimization',
      icon: Zap,
      result: auditResults?.data?.checks?.performance
    }
  ];

  const allPassed = auditResults?.data?.status === 'READY_TO_LAUNCH';
  const anythingFailed = checks.some(c => c.result?.status === 'FAIL');

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Production Readiness Audit</h1>
          <p className="text-amber-400/70">Comprehensive hardening verification before launch</p>
        </div>

        {/* Overall Status */}
        {auditResults?.data && (
          <Card className={`mb-6 border-2 ${allPassed ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-2xl font-bold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>
                    {allPassed ? '✓ LAUNCH READY' : '✗ BLOCKERS DETECTED'}
                  </h2>
                  <p className="text-amber-200/70 mt-2">{auditResults.data.checks ? Object.keys(auditResults.data.checks).filter(k => auditResults.data.checks[k]?.status === 'PASS').length : 0}/{checks.length} checks passed</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-400/50 text-sm">Last verified: {new Date(auditResults.data.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Control Panel */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-100">Run Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => auditMutation.mutate()}
                disabled={auditLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {auditLoading ? 'Running Audit...' : 'Run Full Audit'}
              </Button>
              <Button
                onClick={() => stripeMutation.mutate()}
                disabled={stripeLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {stripeLoading ? 'Testing Stripe...' : 'Test Live Stripe'}
              </Button>
            </div>
            <p className="text-amber-200/50 text-sm">
              ⚠️ Stripe test creates a real test charge. Manually verify payment completion in Stripe Dashboard.
            </p>
          </CardContent>
        </Card>

        {/* Check Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {checks.map(check => {
            const Icon = check.icon;
            const status = check.result?.status;
            const isPassed = status === 'PASS';
            const isFailed = status === 'FAIL';
            const isPending = !status;

            return (
              <Card 
                key={check.id} 
                className={`border-2 ${
                  isPassed ? 'bg-green-900/10 border-green-500/30' : 
                  isFailed ? 'bg-red-900/10 border-red-500/30' :
                  'bg-stone-800/30 border-amber-600/20'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      isPassed ? 'bg-green-600/20' : 
                      isFailed ? 'bg-red-600/20' :
                      'bg-amber-600/20'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isPassed ? 'text-green-400' : 
                        isFailed ? 'text-red-400' :
                        'text-amber-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-amber-100 font-semibold">{check.title}</h3>
                      <p className="text-amber-200/60 text-sm">{check.description}</p>
                      {status && (
                        <div className="mt-2">
                          <Badge className={`${
                            isPassed ? 'bg-green-600/30 text-green-200' : 
                            'bg-red-600/30 text-red-200'
                          }`}>
                            {isPassed ? '✓ PASS' : isFailed ? '✗ FAIL' : 'PENDING'}
                          </Badge>
                          {check.result?.message && (
                            <p className="text-amber-200/50 text-xs mt-2">{check.result.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Results */}
        {auditResults?.data && (
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader>
              <CardTitle className="text-amber-100">Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-stone-950 rounded p-4 text-amber-100/70 text-xs overflow-auto max-h-96">
                {JSON.stringify(auditResults.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Critical Path Checklist */}
        <Card className="bg-stone-800/30 border-amber-600/20 mt-6">
          <CardHeader>
            <CardTitle className="text-amber-100">🔴 CRITICAL PATH - Pre-Launch Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Stripe Validation */}
              <div>
                <h4 className="text-amber-400 font-semibold mb-3">1. Stripe Live Mode Validation</h4>
                <ul className="space-y-1 text-amber-200/70 text-sm ml-4">
                  <li className={`flex items-center gap-2 ${stripeResults?.data?.success ? 'text-green-400' : ''}`}>
                    <span>□</span> Full payment cycle test ($1 charge)
                  </li>
                  <li>
                    <span>□</span> Webhook endpoint active and receiving events
                  </li>
                  <li>
                    <span>□</span> Creator wallet credited within 2 seconds of payment
                  </li>
                  <li>
                    <span>□</span> Refund/chargeback flow tested
                  </li>
                </ul>
              </div>

              {/* Database */}
              <div>
                <h4 className="text-amber-400 font-semibold mb-3">2. Database Integrity</h4>
                <ul className="space-y-1 text-amber-200/70 text-sm ml-4">
                  <li className={`flex items-center gap-2 ${auditResults?.data?.checks?.database?.status === 'PASS' ? 'text-green-400' : ''}`}>
                    <span>□</span> CRUD operations on all critical entities
                  </li>
                  <li>
                    <span>□</span> Backup/restore cycle tested
                  </li>
                  <li>
                    <span>□</span> Index performance verified
                  </li>
                </ul>
              </div>

              {/* Security */}
              <div>
                <h4 className="text-amber-400 font-semibold mb-3">3. Security Hardening</h4>
                <ul className="space-y-1 text-amber-200/70 text-sm ml-4">
                  <li className={`flex items-center gap-2 ${auditResults?.data?.checks?.security?.status === 'PASS' ? 'text-green-400' : ''}`}>
                    <span>□</span> CSRF, rate limiting, fraud detection active
                  </li>
                  <li>
                    <span>□</span> 2FA required for creators with payouts
                  </li>
                  <li>
                    <span>□</span> SSL/TLS certificates valid
                  </li>
                </ul>
              </div>

              {/* Monitoring */}
              <div>
                <h4 className="text-amber-400 font-semibold mb-3">4. Monitoring & Alerting</h4>
                <ul className="space-y-1 text-amber-200/70 text-sm ml-4">
                  <li className={`flex items-center gap-2 ${auditResults?.data?.checks?.monitoring?.status === 'PASS' ? 'text-green-400' : ''}`}>
                    <span>□</span> Error tracking, network monitoring, analytics live
                  </li>
                  <li>
                    <span>□</span> Critical alerts configured (payment failures, latency)
                  </li>
                  <li>
                    <span>□</span> Production dashboard accessible
                  </li>
                </ul>
              </div>

              {/* Failover */}
              <div>
                <h4 className="text-amber-400 font-semibold mb-3">5. Failover & Incident Response</h4>
                <ul className="space-y-1 text-amber-200/70 text-sm ml-4">
                  <li className={`flex items-center gap-2 ${auditResults?.data?.checks?.failover?.status === 'PASS' ? 'text-green-400' : ''}`}>
                    <span>□</span> Kill switch for Stripe documented
                  </li>
                  <li>
                    <span>□</span> Rollback procedure tested (< 5 min)
                  </li>
                  <li>
                    <span>□</span> Incident response team briefed
                  </li>
                </ul>
              </div>

              {/* High Priority */}
              <div className="border-t border-amber-600/20 pt-4">
                <h4 className="text-amber-300 font-semibold mb-3">🟡 HIGH PRIORITY</h4>
                <ul className="space-y-1 text-amber-200/70 text-sm ml-4">
                  <li className={`flex items-center gap-2 ${auditResults?.data?.checks?.performance?.status === 'PASS' ? 'text-green-400' : ''}`}>
                    <span>□</span> Load test (1000 concurrent) passed
                  </li>
                  <li>
                    <span>□</span> Mobile testing (iOS/Android) completed
                  </li>
                  <li>
                    <span>□</span> Creator 2FA enforcement active
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}