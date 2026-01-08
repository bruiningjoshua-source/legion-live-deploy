import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Volume2, Mic, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ModerationDashboard({ streamId, onClose, chatMessages, onClearStream }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('viewers');

  const { data: actions = [] } = useQuery({
    queryKey: ['moderation-actions', streamId],
    queryFn: () => base44.entities.ModerationAction.filter({ stream_id: streamId }, '-created_date', 100),
    refetchInterval: 5000
  });

  const { data: mutedUsers = [] } = useQuery({
    queryKey: ['muted-users', streamId],
    queryFn: () => base44.entities.ModerationAction.filter({ 
      stream_id: streamId, 
      action_type: 'mute_chat' 
    }, '-created_date', 50)
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

  const muteMutation = useMutation({
    mutationFn: async ({ userEmail, userName, actionType, duration }) => {
      const now = new Date();
      const mutedUntil = duration ? new Date(now.getTime() + duration * 60000) : null;
      
      return base44.entities.ModerationAction.create({
        stream_id: streamId,
        user_email: userEmail,
        user_name: userName,
        action_type: actionType,
        reason: `${actionType === 'mute_chat' ? 'Chat' : 'Audio'} mute by host`,
        mute_duration_minutes: duration,
        muted_until: mutedUntil?.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-actions', streamId] });
      queryClient.invalidateQueries({ queryKey: ['muted-users', streamId] });
    }
  });

  const pending = actions.filter(a => !a.reviewed_by_host);
  const reviewed = actions.filter(a => a.reviewed_by_host);

  const actionTypeColors = {
    warning: 'bg-yellow-500',
    message_removed: 'bg-orange-500',
    timeout: 'bg-red-500',
    ban: 'bg-red-700',
    mute_chat: 'bg-blue-500',
    mute_audio: 'bg-purple-500'
  };

  const severityIcons = {
    warning: AlertTriangle,
    message_removed: XCircle,
    timeout: Clock,
    ban: Shield,
    mute_chat: Volume2,
    mute_audio: Mic
  };

  // Get unique viewers from chat messages
  const viewers = Array.from(
    new Map(
      (chatMessages || []).map(msg => [
        msg.sender_email,
        { email: msg.sender_email, name: msg.sender_name }
      ])
    ).values()
  );

  const isMuted = (email, type) => {
    return mutedUsers.some(action => 
      action.user_email === email && 
      action.action_type === type &&
      (!action.muted_until || new Date(action.muted_until) > new Date())
    );
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
          <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">{viewers.length}</div>
            <div className="text-xs text-blue-400/70">Active Viewers</div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-stone-800/50 border border-amber-600/20 w-full grid grid-cols-4">
            <TabsTrigger value="viewers" className="data-[state=active]:bg-amber-600 text-xs">
              Viewers
            </TabsTrigger>
            <TabsTrigger value="recent" className="data-[state=active]:bg-amber-600 text-xs">
              Recent
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-amber-600 text-xs">
              Pending
            </TabsTrigger>
            <TabsTrigger value="controls" className="data-[state=active]:bg-amber-600 text-xs">
              Controls
            </TabsTrigger>
          </TabsList>

          <TabsContent value="viewers">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {viewers.length > 0 ? (
                  viewers.map(viewer => (
                    <motion.div
                      key={viewer.email}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 bg-stone-800/50 rounded-lg border border-amber-600/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-amber-100 font-medium text-sm">{viewer.name}</span>
                        <span className="text-amber-400/50 text-xs">{viewer.email}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={isMuted(viewer.email, 'mute_chat') ? 'default' : 'outline'}
                          onClick={() => muteMutation.mutate({ 
                            userEmail: viewer.email, 
                            userName: viewer.name, 
                            actionType: 'mute_chat',
                            duration: 30
                          })}
                          disabled={muteMutation.isPending}
                          className={isMuted(viewer.email, 'mute_chat') 
                            ? 'bg-blue-600 text-white' 
                            : 'border-blue-500/30 text-blue-300'}
                        >
                          <Volume2 className="w-3 h-3 mr-1" />
                          Chat
                        </Button>
                        <Button
                          size="sm"
                          variant={isMuted(viewer.email, 'mute_audio') ? 'default' : 'outline'}
                          onClick={() => muteMutation.mutate({ 
                            userEmail: viewer.email, 
                            userName: viewer.name, 
                            actionType: 'mute_audio',
                            duration: 30
                          })}
                          disabled={muteMutation.isPending}
                          className={isMuted(viewer.email, 'mute_audio') 
                            ? 'bg-purple-600 text-white' 
                            : 'border-purple-500/30 text-purple-300'}
                        >
                          <Mic className="w-3 h-3 mr-1" />
                          Audio
                        </Button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-amber-400/60">
                    No active viewers
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

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

          <TabsContent value="controls">
            <div className="space-y-4 py-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-red-300 font-semibold text-sm mb-3 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Stream Management
                </h3>
                <Button
                  onClick={() => {
                    if (window.confirm('Clear the stream and return to menu? This will end the live broadcast.')) {
                      onClearStream?.();
                    }
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Stream & Return to Menu
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}