import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, AlertTriangle, Ban, CreditCard, FileText, 
  Users, TrendingUp, Activity, Eye, Clock
} from 'lucide-react';

export default function AdminSecurityDashboard() {
  const [timeRange, setTimeRange] = useState('24h');

  // Fetch security metrics
  const { data: securityMetrics = {} } = useQuery({
    queryKey: ['security-metrics', timeRange],
    queryFn: async () => {
      const now = new Date();
      const startDate = new Date(now);
      
      if (timeRange === '24h') startDate.setHours(now.getHours() - 24);
      else if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
      else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);

      // Fetch various security-related analytics
      const [fraudAlerts, chargebacks, bans, violations, kycRequests] = await Promise.all([
        base44.entities.PlatformAnalytics.filter({ metric_type: 'fraud_detection' }, '-created_date', 100),
        base44.entities.PlatformAnalytics.filter({ metric_type: 'chargeback' }, '-created_date', 50),
        base44.entities.UserBan.filter({}, '-created_date', 100),
        base44.entities.ContentViolation.filter({}, '-created_date', 100),
        base44.entities.PlatformAnalytics.filter({ metric_type: 'kyc_submission' }, '-created_date', 50)
      ]);

      return {
        fraudAlerts,
        chargebacks,
        bans,
        violations,
        kycRequests,
        stats: {
          totalFraudAlerts: fraudAlerts.length,
          highRiskAlerts: fraudAlerts.filter(a => a.metadata?.riskLevel === 'high').length,
          totalChargebacks: chargebacks.length,
          chargebackAmount: chargebacks.reduce((sum, c) => sum + (c.metric_value || 0), 0),
          activeBans: bans.filter(b => b.status === 'active').length,
          pendingViolations: violations.filter(v => v.status === 'pending_review').length,
          pendingKYC: kycRequests.filter(k => k.metadata?.status === 'pending_review').length
        }
      };
    }
  });

  const stats = securityMetrics.stats || {};

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-amber-100">Security Dashboard</h2>
        <div className="flex gap-2">
          {['24h', '7d', '30d'].map(range => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? 'default' : 'ghost'}
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'bg-amber-600' : 'text-amber-200'}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-red-200">{stats.highRiskAlerts || 0}</p>
                <p className="text-red-400/70 text-xs">High Risk Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-900/20 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CreditCard className="w-8 h-8 text-orange-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-200">${stats.chargebackAmount || 0}</p>
                <p className="text-orange-400/70 text-xs">Chargebacks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-900/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Ban className="w-8 h-8 text-purple-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-200">{stats.activeBans || 0}</p>
                <p className="text-purple-400/70 text-xs">Active Bans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-900/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Eye className="w-8 h-8 text-yellow-400" />
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-200">{stats.pendingViolations || 0}</p>
                <p className="text-yellow-400/70 text-xs">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="fraud" className="w-full">
        <TabsList className="bg-stone-800/50">
          <TabsTrigger value="fraud">Fraud Alerts</TabsTrigger>
          <TabsTrigger value="chargebacks">Chargebacks</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="kyc">KYC Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="fraud" className="mt-4">
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader>
              <CardTitle className="text-amber-100">Recent Fraud Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {securityMetrics.fraudAlerts?.slice(0, 20).map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={`
                        ${alert.metadata?.riskLevel === 'high' ? 'bg-red-600' : ''}
                        ${alert.metadata?.riskLevel === 'medium' ? 'bg-yellow-600' : ''}
                        ${alert.metadata?.riskLevel === 'low' ? 'bg-green-600' : ''}
                      `}>
                        {alert.metadata?.riskLevel || 'unknown'}
                      </Badge>
                      <div>
                        <p className="text-amber-100 text-sm">{alert.metadata?.userEmail}</p>
                        <p className="text-amber-400/60 text-xs">
                          Score: {alert.metadata?.score} | {alert.metadata?.signals?.join(', ')}
                        </p>
                      </div>
                    </div>
                    <span className="text-amber-400/50 text-xs">
                      {new Date(alert.created_date).toLocaleString()}
                    </span>
                  </div>
                ))}
                {(!securityMetrics.fraudAlerts || securityMetrics.fraudAlerts.length === 0) && (
                  <p className="text-amber-400/60 text-center py-8">No fraud alerts in this period</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chargebacks" className="mt-4">
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader>
              <CardTitle className="text-amber-100">Chargeback History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {securityMetrics.chargebacks?.map((cb, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                    <div>
                      <p className="text-amber-100 text-sm">{cb.metadata?.customer_email}</p>
                      <p className="text-amber-400/60 text-xs">
                        Reason: {cb.metadata?.reason} | ${cb.metric_value}
                      </p>
                    </div>
                    <Badge className="bg-red-600/30 text-red-200">
                      {cb.metadata?.status || 'open'}
                    </Badge>
                  </div>
                ))}
                {(!securityMetrics.chargebacks || securityMetrics.chargebacks.length === 0) && (
                  <p className="text-amber-400/60 text-center py-8">No chargebacks in this period</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="mt-4">
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader>
              <CardTitle className="text-amber-100">Content Violations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {securityMetrics.violations?.filter(v => v.status === 'pending_review').map((violation, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                    <div>
                      <p className="text-amber-100 text-sm">Stream: {violation.stream_id?.slice(0, 8)}...</p>
                      <p className="text-amber-400/60 text-xs">
                        Type: {violation.violation_type} | Confidence: {(violation.confidence_score * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-600/20">
                        Dismiss
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-600/20">
                        Take Action
                      </Button>
                    </div>
                  </div>
                ))}
                {(!securityMetrics.violations || securityMetrics.violations.filter(v => v.status === 'pending_review').length === 0) && (
                  <p className="text-amber-400/60 text-center py-8">No pending violations</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc" className="mt-4">
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader>
              <CardTitle className="text-amber-100">KYC Verification Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {securityMetrics.kycRequests?.filter(k => k.metadata?.status === 'pending_review').map((kyc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                    <div>
                      <p className="text-amber-100 text-sm">{kyc.metadata?.userEmail}</p>
                      <p className="text-amber-400/60 text-xs">
                        Submitted: {new Date(kyc.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive">
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {stats.pendingKYC === 0 && (
                  <p className="text-amber-400/60 text-center py-8">No pending KYC requests</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}