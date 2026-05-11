import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Clock, Users, Zap, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

export default function EngagementMetrics({ 
  chatMessages = 0,
  chatMessagesPerMinute = 0,
  uniqueChatters = 0,
  avgWatchTime = 0,
  viewerRetention = 0,
  engagementRate = 0,
  chatActivity = []
}) {
  const metrics = [
    { 
      label: 'Chat Messages', 
      value: chatMessages.toLocaleString(), 
      icon: MessageSquare, 
      color: 'text-green-400',
      bgColor: 'from-green-900/30'
    },
    { 
      label: 'Msgs/Minute', 
      value: chatMessagesPerMinute.toFixed(1), 
      icon: Zap, 
      color: 'text-amber-400',
      bgColor: 'from-amber-900/30'
    },
    { 
      label: 'Unique Chatters', 
      value: uniqueChatters.toLocaleString(), 
      icon: Users, 
      color: 'text-purple-400',
      bgColor: 'from-purple-900/30'
    },
    { 
      label: 'Avg Watch Time', 
      value: `${Math.floor(avgWatchTime)}m`, 
      icon: Clock, 
      color: 'text-blue-400',
      bgColor: 'from-blue-900/30'
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900 border border-amber-600/30 rounded-lg p-2 shadow-lg">
          <p className="text-amber-400 text-xs">{payload[0].value} msgs</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-stone-800/30 border-amber-600/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          Engagement Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric Grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-gradient-to-br ${metric.bgColor} to-stone-900 rounded-xl p-4 border border-white/5`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-amber-400/70 text-xs">{metric.label}</span>
                </div>
                <p className="text-2xl font-bold text-amber-100">{metric.value}</p>
              </motion.div>
            );
          })}
        </div>
        
        {/* Retention & Engagement Bars */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-amber-400/70">Viewer Retention</span>
              <span className="text-amber-100 font-semibold">{viewerRetention}%</span>
            </div>
            <div className="h-2 bg-stone-900 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${viewerRetention}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  viewerRetention >= 70 ? 'bg-green-500' :
                  viewerRetention >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-amber-400/70">Engagement Rate</span>
              <span className="text-amber-100 font-semibold">{engagementRate}%</span>
            </div>
            <div className="h-2 bg-stone-900 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(engagementRate, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              />
            </div>
          </div>
        </div>
        
        {/* Chat Activity Mini Chart */}
        {chatActivity.length > 0 && (
          <div>
            <p className="text-amber-400/70 text-sm mb-2">Chat Activity</p>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chatActivity}>
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}