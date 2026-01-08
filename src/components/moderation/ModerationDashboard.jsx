import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ModerationDashboard({ streamId, onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('recent');

  const { data: actions = [] } = useQuery({
    queryKey: ['moderation-actions', streamId],
    queryFn: () => base44.entities.ModerationAction.filter({ stream_id: streamId }, '-created_date', 100),
    refetchInterval: 5000
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ actionId, decision }) => {
      return base44.entities.ModerationAction.update(actionId, {
        reviewed_by_host: true,
        host_decision: decision
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-actions', streamId] });
    }
  });

  const pending = actions.filter(a => !a.reviewed_by_host);
  const reviewed = actions.filter(a => a.reviewed_by_host);

  const actionTypeColors = {
    warning: 'bg-yellow-500',
    message_removed: 'bg-orange-500',
    timeout: 'bg-red-500',
    ban: 'bg-red-700'
  };

  const severityIcons = {
    warning: AlertTriangle,
    message_removed: XCircle,
    timeout: Clock,
    ban: Shield
  };

  const ActionCard = ({ action }) => {
    const Icon = severityIcons[action.action_type] || Shield;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-stone-800/50 rounded-lg border border-amber-600/20 mb-2"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={`${actionTypeColors[action.action_type]} text-white border-0`}>
              <Icon className="w-3 h-3 mr-1" />
              {action.action_type.replace('_', ' ')}
            </Badge>
            <span className="text-amber-100 font-medium">{action.user_name}</span>
          </div>
          <span className="text-amber-400/60 text-xs">
            {new Date(action.created_date).toLocaleTimeString()}
          </span>
        </div>
        
        <p className="text-amber-400/80 text-sm mb-2 italic">"{action.original_message}"</p>
        <p className="text-amber-300/70 text-xs mb-3">Reason: {action.reason}</p>
        
        {action.ai_confidence && (
          <div className="text-xs text-amber-400/60 mb-3">
            AI Confidence: {Math.round(action.ai_confidence * 100)}%
          </div>
        )}

        {!action.reviewed_by_host ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => reviewMutation.mutate({ actionId: action.id, decision: 'upheld' })}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Uphold
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => reviewMutation.mutate({ actionId: action.id, decision: 'overturned' })}
              className="border-amber-600/30 text-amber-300"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Overturn
            </Button>
          </div>
        ) : (
          <Badge variant="outline" className={action.host_decision === 'upheld' ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}>
            {action.host_decision === 'upheld' ? '✓ Upheld' : '✗ Overturned'}
          </Badge>
        )}
      </motion.div>
    );
  };

  return (
    <Card className="bg-stone-900 border-amber-600/30">
      <CardHeader className="border-b border-amber-600/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Moderation Dashboard
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-amber-400">
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-stone-800/50 rounded-lg p-3 border border-amber-600/20">
            <div className="text-2xl font-bold text-amber-100">{actions.length}</div>
            <div className="text-xs text-amber-400/70">Total Actions</div>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{pending.length}</div>
            <div className="text-xs text-yellow-400/70">Pending Review</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{reviewed.length}</div>
            <div className="text-xs text-green-400/70">Reviewed</div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-stone-800/50 border border-amber-600/20 w-full">
            <TabsTrigger value="recent" className="flex-1 data-[state=active]:bg-amber-600">
              Recent
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 data-[state=active]:bg-amber-600">
              Pending ({pending.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent">
            <ScrollArea className="h-[400px] pr-4">
              <AnimatePresence>
                {actions.length > 0 ? (
                  actions.map(action => <ActionCard key={action.id} action={action} />)
                ) : (
                  <div className="text-center py-12 text-amber-400/60">
                    No moderation actions yet
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pending">
            <ScrollArea className="h-[400px] pr-4">
              <AnimatePresence>
                {pending.length > 0 ? (
                  pending.map(action => <ActionCard key={action.id} action={action} />)
                ) : (
                  <div className="text-center py-12 text-amber-400/60">
                    No pending actions
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}