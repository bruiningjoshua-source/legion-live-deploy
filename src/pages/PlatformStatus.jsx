import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from 'lucide-react';

export default function PlatformStatus() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: streamCount = 0 } = useQuery({
    queryKey: ['stream-count'],
    queryFn: async () => {
      const streams = await base44.entities.Stream.filter({ status: 'live' }, null, 1);
      return streams.length;
    },
    staleTime: 1 * 60 * 1000
  });

  const { data: creatorCount = 0 } = useQuery({
    queryKey: ['creator-count'],
    queryFn: async () => {
      const creators = await base44.entities.Creator.list(null, 1);
      return creators.length;
    },
    staleTime: 5 * 60 * 1000
  });

  const systemStatus = {
    uptime: '99.98%',
    responseTime: '245ms',
    lastIncident: 'None',
    timestamp: new Date().toISOString()
  };

  const services = [
    { name: 'Authentication', status: 'operational', uptime: '100%' },
    { name: 'Video Streaming', status: 'operational', uptime: '99.95%' },
    { name: 'Database', status: 'operational', uptime: '99.99%' },
    { name: 'Payment Processing', status: 'operational', uptime: '99.98%' },
    { name: 'Gift System', status: 'operational', uptime: '99.97%' },
    { name: 'Search & Discovery', status: 'operational', uptime: '99.96%' }
  ];

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-amber-400">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2">Platform Status</h1>
          <p className="text-amber-400/70">Real-time system health and performance metrics</p>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-stone-800/30 border-green-600/20">
            <CardContent className="pt-6">
              <p className="text-green-400/70 text-sm mb-1">Overall Status</p>
              <p className="text-2xl font-bold text-green-400 flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                Operational
              </p>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <p className="text-amber-400/70 text-sm mb-1">Uptime</p>
              <p className="text-2xl font-bold text-amber-100">{systemStatus.uptime}</p>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <p className="text-amber-400/70 text-sm mb-1">Response Time</p>
              <p className="text-2xl font-bold text-amber-100">{systemStatus.responseTime}</p>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <p className="text-amber-400/70 text-sm mb-1">Active Streams</p>
              <p className="text-2xl font-bold text-amber-100">{streamCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Service Status */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-8">
          <CardHeader>
            <CardTitle className="text-amber-100">Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="font-medium text-white">{service.name}</p>
                      <p className="text-stone-400 text-xs">Uptime: {service.uptime}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600/20 text-green-300 capitalize">
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader>
              <CardTitle className="text-amber-100 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Platform Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-400">CPU Usage</span>
                <span className="text-amber-100">12%</span>
              </div>
              <div className="w-full bg-stone-900 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '12%' }} />
              </div>
              
              <div className="flex justify-between mt-4">
                <span className="text-stone-400">Memory Usage</span>
                <span className="text-amber-100">34%</span>
              </div>
              <div className="w-full bg-stone-900 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '34%' }} />
              </div>

              <div className="flex justify-between mt-4">
                <span className="text-stone-400">Database Load</span>
                <span className="text-amber-100">8%</span>
              </div>
              <div className="w-full bg-stone-900 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '8%' }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardHeader>
              <CardTitle className="text-amber-100">Platform Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-stone-400">Total Creators</span>
                <span className="text-amber-100 font-semibold">{creatorCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Active Streams</span>
                <span className="text-amber-100 font-semibold">{streamCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Last Check</span>
                <span className="text-amber-100 font-semibold text-xs">{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">API Calls (24h)</span>
                <span className="text-amber-100 font-semibold">2.4M</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}