import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Heart,
  Check,
  X,
  MessageCircle,
  Calendar,
  DollarSign,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import CollabRequestCard from '@/components/collaboration/CollabRequestCard';
import CollabProjectCard from '@/components/collaboration/CollabProjectCard';

export default function CollaborationDashboard({ creatorId }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('requests');

  // Incoming requests
  const { data: incomingRequests = [] } = useQuery({
    queryKey: ['collab-requests-incoming', creatorId],
    queryFn: () =>
      base44.entities.CollabRequest.filter(
        { recipient_creator_id: creatorId, status: 'pending' },
        '-created_date',
        50
      ),
    enabled: !!creatorId
  });

  // Outgoing requests
  const { data: outgoingRequests = [] } = useQuery({
    queryKey: ['collab-requests-outgoing', creatorId],
    queryFn: () =>
      base44.entities.CollabRequest.filter(
        { requester_creator_id: creatorId },
        '-created_date',
        50
      ),
    enabled: !!creatorId
  });

  // Active collaborations
  const { data: activeCollabs = [] } = useQuery({
    queryKey: ['collab-projects-active', creatorId],
    queryFn: async () => {
      const projects = await base44.entities.CollabProject.filter(
        { status: ['scheduled', 'live'] },
        '-created_date',
        50
      );
      return projects.filter(p => p.creator_ids?.includes(creatorId));
    },
    enabled: !!creatorId
  });

  // Past collaborations
  const { data: pastCollabs = [] } = useQuery({
    queryKey: ['collab-projects-past', creatorId],
    queryFn: async () => {
      const projects = await base44.entities.CollabProject.filter(
        { status: 'completed' },
        '-created_date',
        50
      );
      return projects.filter(p => p.creator_ids?.includes(creatorId));
    },
    enabled: !!creatorId
  });

  const respondMutation = useMutation({
    mutationFn: ({ requestId, status, message }) =>
      base44.entities.CollabRequest.update(requestId, {
        status,
        response_message: message,
        responded_at: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-requests-incoming', creatorId] });
      toast.success('Request responded!');
    }
  });

  const stats = {
    pending: incomingRequests.length,
    sent: outgoingRequests.filter(r => r.status === 'pending').length,
    active: activeCollabs.length,
    completed: pastCollabs.length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: MessageCircle, label: 'Pending Requests', value: stats.pending, color: 'from-blue-500' },
          { icon: Users, label: 'Sent Requests', value: stats.sent, color: 'from-purple-500' },
          { icon: Zap, label: 'Active Collabs', value: stats.active, color: 'from-green-500' },
          { icon: Check, label: 'Completed', value: stats.completed, color: 'from-amber-500' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} bg-opacity-10 border border-current border-opacity-20 rounded-lg p-3`}
            >
              <Icon className="w-4 h-4 mb-2 opacity-70" />
              <div className="text-2xl font-bold text-amber-100">{stat.value}</div>
              <div className="text-xs text-amber-400/70">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-stone-800/50 border border-amber-600/20 w-full grid grid-cols-4">
          <TabsTrigger value="requests" className="data-[state=active]:bg-amber-600">
            Requests ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="sent" className="data-[state=active]:bg-amber-600">
            Sent ({stats.sent})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-amber-600">
            Active ({stats.active})
          </TabsTrigger>
          <TabsTrigger value="past" className="data-[state=active]:bg-amber-600">
            Past ({stats.completed})
          </TabsTrigger>
        </TabsList>

        {/* Incoming Requests */}
        <TabsContent value="requests" className="mt-6 space-y-4">
          {incomingRequests.length > 0 ? (
            <AnimatePresence>
              {incomingRequests.map((request, i) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CollabRequestCard
                    request={request}
                    onAccept={() =>
                      respondMutation.mutate({
                        requestId: request.id,
                        status: 'accepted'
                      })
                    }
                    onReject={() =>
                      respondMutation.mutate({
                        requestId: request.id,
                        status: 'rejected',
                        message: 'Not available at this time'
                      })
                    }
                    isProcessing={respondMutation.isPending}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-12 bg-stone-800/30 rounded-xl border border-amber-600/20">
              <Heart className="w-12 h-12 mx-auto mb-3 text-amber-400/50" />
              <p className="text-amber-300/70">No pending collaboration requests</p>
            </div>
          )}
        </TabsContent>

        {/* Sent Requests */}
        <TabsContent value="sent" className="mt-6 space-y-4">
          {outgoingRequests.length > 0 ? (
            <AnimatePresence>
              {outgoingRequests.map((request, i) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="bg-stone-800/50 border-amber-600/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-amber-100 font-semibold mb-1">{request.title}</h4>
                          <p className="text-amber-400/70 text-sm">To: {request.recipient_name}</p>
                          <p className="text-amber-300/60 text-xs mt-2">{request.description}</p>
                        </div>
                        <Badge
                          className={
                            request.status === 'accepted'
                              ? 'bg-green-600 text-white'
                              : request.status === 'rejected'
                              ? 'bg-red-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-12 bg-stone-800/30 rounded-xl border border-amber-600/20">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-amber-400/50" />
              <p className="text-amber-300/70">No sent requests yet</p>
            </div>
          )}
        </TabsContent>

        {/* Active Collaborations */}
        <TabsContent value="active" className="mt-6 space-y-4">
          {activeCollabs.length > 0 ? (
            <AnimatePresence>
              {activeCollabs.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CollabProjectCard project={project} />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-12 bg-stone-800/30 rounded-xl border border-amber-600/20">
              <Zap className="w-12 h-12 mx-auto mb-3 text-amber-400/50" />
              <p className="text-amber-300/70">No active collaborations</p>
            </div>
          )}
        </TabsContent>

        {/* Past Collaborations */}
        <TabsContent value="past" className="mt-6 space-y-4">
          {pastCollabs.length > 0 ? (
            <AnimatePresence>
              {pastCollabs.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CollabProjectCard project={project} />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-12 bg-stone-800/30 rounded-xl border border-amber-600/20">
              <Check className="w-12 h-12 mx-auto mb-3 text-amber-400/50" />
              <p className="text-amber-300/70">No past collaborations yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}