import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TrendingUp, Users, Clock, Shield, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FraudMonitoringDashboard() {
  const [riskFilter, setRiskFilter] = useState('all');

  const { data: fraudData = {}, isLoading } = useQuery({
    queryKey: ['fraud-dashboard'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getFraudDashboard', {});
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000
  });

  const summary = fraudData.summary || {};
  const recentTransactions = fraudData.recentTransactions || [];
  const reviewQueue = fraudData.reviewQueue || [];

  const riskColors = {
    'HIGH': 'bg-red-500/20 border-red-500/50 text-red-200',
    'MEDIUM': 'bg-amber-500/20 border-amber-500/50 text-amber-200',
    'LOW': 'bg-green-500/20 border-green-500/50 text-green-200'
  };

  const getRiskLevel = (reason) => {
    if (reason.includes('HIGH')) return 'HIGH';
    if (reason.includes('MEDIUM')) return 'MEDIUM';
    return 'LOW';
  };

  const filteredTransactions = riskFilter === 'all' 
    ? recentTransactions 
    : recentTransactions.filter(t => getRiskLevel(t.reason) === riskFilter);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          {
            icon: AlertTriangle,
            label: 'High Risk',
            value: summary.highRiskTransactions || 0,
            color: 'red'
          },
          {
            icon: TrendingUp,
            label: 'Medium Risk',
            value: summary.mediumRiskTransactions || 0,
            color: 'amber'
          },
          {
            icon: Clock,
            label: 'Pending Reviews',
            value: summary.pendingReviews || 0,
            color: 'blue'
          },
          {
            icon: Users,
            label: 'Flagged Users',
            value: summary.flaggedUsers || 0,
            color: 'purple'
          }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`bg-gradient-to-br from-${stat.color}-500/10 to-${stat.color}-600/10 border-${stat.color}-500/30`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-${stat.color}-300/70 text-xs mb-1`}>{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                    <Icon className={`w-8 h-8 text-${stat.color}-400/50`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Real-Time Monitoring */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="recent">Recent Transactions</TabsTrigger>
          <TabsTrigger value="review">Review Queue</TabsTrigger>
          <TabsTrigger value="flagged">Flagged Users</TabsTrigger>
        </TabsList>

        {/* Recent Transactions */}
        <TabsContent value="recent" className="space-y-3 mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Monitored Transactions (Last 30 min)
                </CardTitle>
                <div className="flex gap-1">
                  {['all', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
                    <button
                      key={level}
                      onClick={() => setRiskFilter(level)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        riskFilter === level
                          ? level === 'all'
                            ? 'bg-white text-black'
                            : `bg-${level === 'HIGH' ? 'red' : level === 'MEDIUM' ? 'amber' : 'green'}-500/30 text-${level === 'HIGH' ? 'red' : level === 'MEDIUM' ? 'amber' : 'green'}-200`
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {level === 'all' ? 'All' : level}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => {
                    const riskLevel = getRiskLevel(t.reason);
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-3 rounded-lg border ${riskColors[riskLevel]}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-medium truncate">{t.email}</p>
                              <Badge className="text-xs shrink-0" variant="secondary">
                                {new Date(t.timestamp).toLocaleTimeString()}
                              </Badge>
                            </div>
                            <p className="text-xs opacity-75 line-clamp-2">{t.reason}</p>
                          </div>
                          <Badge className={`shrink-0 ${
                            riskLevel === 'HIGH' ? 'bg-red-500/30 text-red-200' :
                            riskLevel === 'MEDIUM' ? 'bg-amber-500/30 text-amber-200' :
                            'bg-green-500/30 text-green-200'
                          }`}>
                            {riskLevel}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <p className="text-center py-8 text-white/40 text-sm">No {riskFilter === 'all' ? '' : riskFilter} risk transactions</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Queue */}
        <TabsContent value="review" className="space-y-3 mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Manual Review Cases ({reviewQueue.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {reviewQueue.length > 0 ? (
                  reviewQueue.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-white mb-1">{c.email}</p>
                          <p className="text-xs text-red-200/80">{c.reason}</p>
                        </div>
                        <Badge className="bg-red-500/20 text-red-200 text-xs">
                          {new Date(c.timestamp).toLocaleTimeString()}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-center py-8 text-white/40 text-sm">No pending reviews</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flagged Users */}
        <TabsContent value="flagged" className="space-y-3 mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-4 h-4" />
                Flagged for Review ({fraudData.flaggedUsersList?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {fraudData.flaggedUsersList && fraudData.flaggedUsersList.length > 0 ? (
                  fraudData.flaggedUsersList.map((u) => (
                    <motion.div
                      key={u.email}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-medium text-white">{u.name || u.email}</p>
                        <p className="text-xs text-purple-200/70">{u.email}</p>
                      </div>
                      <XCircle className="w-4 h-4 text-purple-400" />
                    </motion.div>
                  ))
                ) : (
                  <p className="text-center py-8 text-white/40 text-sm">No flagged users</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Auto-refresh notice */}
      <div className="text-center text-xs text-white/40 flex items-center justify-center gap-1">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Auto-refreshing every 30 seconds
      </div>
    </div>
  );
}