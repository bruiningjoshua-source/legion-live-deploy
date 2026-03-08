import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PayoutRoutingDashboard() {
  const [testCreatorEmail, setTestCreatorEmail] = useState('');
  const [testAmount, setTestAmount] = useState('10.00');

  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['payout-routing'],
    queryFn: () => base44.functions.invoke('verifyPayoutRouting', {
      test_creator_email: testCreatorEmail,
      amount_cents: Math.round(parseFloat(testAmount) * 100)
    }),
    enabled: false,
    staleTime: Infinity
  });

  const mutation = useMutation({
    mutationFn: () => refetch(),
    onSuccess: () => toast.success('Payout routing verified'),
    onError: () => toast.error('Verification failed')
  });

  const runVerification = () => {
    if (!testCreatorEmail || !testAmount) {
      toast.error('Please enter creator email and amount');
      return;
    }
    mutation.mutate();
  };

  const allPassed = results?.data?.overall_status === 'VERIFIED';

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Stripe Connect Payout Routing</h1>
          <p className="text-amber-400/70">Verify creator earnings flow to bank accounts</p>
        </div>

        {/* Overall Status */}
        {results?.data && (
          <Card className={`mb-6 border-2 ${allPassed ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-2xl font-bold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>
                    {allPassed ? '✓ ROUTING VERIFIED' : '✗ ROUTING FAILED'}
                  </h2>
                  <p className="text-amber-200/70 mt-2">{Object.keys(results.data.tests).filter(k => results.data.tests[k]?.status === 'PASS').length}/{Object.keys(results.data.tests).length} checks passed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Control Panel */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-100">Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-amber-200/70 text-sm mb-2 block">Creator Email (Test)</label>
                <Input
                  value={testCreatorEmail}
                  onChange={(e) => setTestCreatorEmail(e.target.value)}
                  placeholder="creator@example.com"
                  className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                />
              </div>
              <div>
                <label className="text-amber-200/70 text-sm mb-2 block">Test Amount (USD)</label>
                <Input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  placeholder="10.00"
                  step="0.01"
                  className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                />
              </div>
            </div>
            <Button
              onClick={runVerification}
              disabled={isLoading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isLoading ? 'Verifying...' : 'Verify Payout Routing'}
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        {results?.data && (
          <>
            {/* Stripe Connect Config */}
            <Card className="bg-stone-800/30 border-amber-600/20 mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-amber-100">Stripe Connect Platform</CardTitle>
                  <Badge className={results.data.tests.stripe_connect_config?.status === 'PASS' ? 'bg-green-600/30 text-green-200' : 'bg-red-600/30 text-red-200'}>
                    {results.data.tests.stripe_connect_config?.status === 'PASS' ? '✓ PASS' : '✗ FAIL'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.data.tests.stripe_connect_config?.status === 'PASS' && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-stone-900/30 rounded p-3">
                        <p className="text-amber-200/50 text-xs">Account ID</p>
                        <p className="text-amber-100 text-sm font-mono">{results.data.tests.stripe_connect_config.account_id?.slice(0, 12)}...</p>
                      </div>
                      <div className="bg-stone-900/30 rounded p-3">
                        <p className="text-amber-200/50 text-xs">Charges Enabled</p>
                        <p className="text-green-400 text-sm">✓ Yes</p>
                      </div>
                      <div className="bg-stone-900/30 rounded p-3">
                        <p className="text-amber-200/50 text-xs">Payouts Enabled</p>
                        <p className="text-green-400 text-sm">✓ Yes</p>
                      </div>
                      <div className="bg-stone-900/30 rounded p-3">
                        <p className="text-amber-200/50 text-xs">Currency</p>
                        <p className="text-amber-100 text-sm font-mono">{results.data.tests.stripe_connect_config.currency?.toUpperCase()}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payout Routing */}
            <Card className="bg-stone-800/30 border-amber-600/20 mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-amber-100">Payout Routing Flows</CardTitle>
                  <Badge className={results.data.tests.payout_routing?.status === 'PASS' ? 'bg-green-600/30 text-green-200' : 'bg-red-600/30 text-red-200'}>
                    {results.data.tests.payout_routing?.status === 'PASS' ? '✓ PASS' : '✗ FAIL'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.data.tests.payout_routing?.routing_types && Object.entries(results.data.tests.payout_routing.routing_types).map(([type, config]) => (
                    <div key={type} className="bg-stone-900/30 rounded p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-amber-100 font-semibold capitalize">{type.replace(/_/g, ' ')}</p>
                          <p className="text-amber-200/60 text-sm">{config.description}</p>
                          {config.creator_percentage && (
                            <p className="text-green-400 text-xs mt-1">Creator: {config.creator_percentage}% | Platform: {config.platform_percentage}%</p>
                          )}
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Edge Cases */}
            <Card className="bg-stone-800/30 border-amber-600/20 mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-amber-100">Failure Handling & Recovery</CardTitle>
                  <Badge className={results.data.tests.edge_cases?.status === 'PASS' ? 'bg-green-600/30 text-green-200' : 'bg-red-600/30 text-red-200'}>
                    {results.data.tests.edge_cases?.status === 'PASS' ? '✓ PASS' : '✗ FAIL'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {results.data.tests.edge_cases?.edge_cases && Object.entries(results.data.tests.edge_cases.edge_cases).map(([scenario, config]) => (
                    <div key={scenario} className="flex items-start gap-2 text-amber-200/70">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold capitalize text-amber-100">{scenario.replace(/_/g, ' ')}</p>
                        <p className="text-amber-200/50">{config.handling || config.scenario}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Webhooks */}
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-amber-100">Webhook Events</CardTitle>
                  <Badge className={results.data.tests.payout_webhooks?.status === 'PASS' ? 'bg-green-600/30 text-green-200' : 'bg-red-600/30 text-red-200'}>
                    {results.data.tests.payout_webhooks?.status === 'PASS' ? '✓ PASS' : '✗ FAIL'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {results.data.tests.payout_webhooks?.monitored_events?.map(evt => (
                    <div key={evt} className="flex items-center gap-2 text-amber-200/70">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="font-mono">{evt}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Payout Flow Diagram */}
        <Card className="bg-stone-800/30 border-amber-600/20 mt-6">
          <CardHeader>
            <CardTitle className="text-amber-100">Creator Earnings Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { step: '1', label: 'Customer Payment', desc: 'Charges platform Stripe account' },
                { step: '2', label: 'Calculate Split', desc: 'Creator gets 60-100%, platform 0-40%' },
                { step: '3', label: 'Initiate Transfer', desc: 'Platform → Creator connected account' },
                { step: '4', label: 'Webhook Event', desc: 'transfer.created triggers logging' },
                { step: '5', label: 'Bank Settlement', desc: '2-7 business days to creator bank' },
                { step: '6', label: 'Confirmation', desc: 'payout.paid webhook confirms completion' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-600/30 flex items-center justify-center text-amber-100 font-semibold flex-shrink-0">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-100 font-semibold">{item.label}</p>
                    <p className="text-amber-200/60 text-sm">{item.desc}</p>
                  </div>
                  {idx < 5 && <ArrowRight className="w-4 h-4 text-amber-600/50" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}