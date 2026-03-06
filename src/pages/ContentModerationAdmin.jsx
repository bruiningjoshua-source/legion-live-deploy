import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  AlertTriangle,
  Ban,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

const AUTHORIZED_ADMINS = [
  'admin@legionlive.io',
  'inthestixproductions@gmail.com',
  'muggabuckerpro@gmail.com',
  'rankincadence@gmail.com',
  'invictaoperations@gmail.com',
  'bruiningjoshua@gmail.com'
];

const SEVERITY_CONFIG = {
  low: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: AlertCircle },
  medium: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: AlertTriangle },
  high: { color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: AlertTriangle },
  critical: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: XCircle }
};

const ACTION_CONFIG = {
  warning_issued: { color: 'bg-yellow-600', label: 'Warning Sent' },
  stream_cut: { color: 'bg-red-600', label: 'Stream Cut' },
  pending_review: { color: 'bg-blue-600', label: 'Pending Review' },
  dismissed: { color: 'bg-green-600', label: 'Dismissed' },
  content_removed: { color: 'bg-orange-600', label: 'Content Removed' },
  account_suspended: { color: 'bg-red-800', label: 'Account Suspended' }
};

export default function ContentModerationAdmin() {
  const queryClient = useQueryClient();
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const isAuthorized = user?.role === 'admin' && AUTHORIZED_ADMINS.includes(user?.email);

  const { data: violations = [] } = useQuery({
    queryKey: ['all-violations'],
    queryFn: () => base44.entities.ContentViolation.list('-created_date', 200),
    enabled: isAuthorized
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['violation-creators'],
    queryFn: () => base44.entities.Creator.list('-created_date', 500),
    enabled: isAuthorized
  });

  const updateViolationMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.ContentViolation.update(id, {
        ...data,
        reviewed_by: user.email,
        review_notes: reviewNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-violations']);
      setSelectedViolation(null);
      setReviewNotes('');
      toast.success('Violation updated');
    }
  });

  const getCreatorName = (creatorId) => {
    const creator = creators.find(c => c.id === creatorId);
    return creator?.display_name || 'Unknown';
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 flex items-center justify-center">
        <Card className="bg-stone-800/50 border-red-500/30">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-red-400/50 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-amber-100 mb-2">Access Denied</h2>
            <p className="text-amber-400/70">Platform admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingViolations = violations.filter(v => v.review_decision === 'pending' || !v.review_decision);
  const reviewedViolations = violations.filter(v => v.review_decision && v.review_decision !== 'pending');
  const aiDetected = violations.filter(v => v.detected_by === 'ai');
  const userReported = violations.filter(v => v.detected_by === 'user_report');

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-400" />
              Content Moderation
            </h1>
            <p className="text-amber-400/70">Review and manage content violations</p>
          </div>
          <div className="flex gap-4">
            <Badge className="bg-yellow-600 text-white px-4 py-2">
              <Clock className="w-4 h-4 mr-2" />
              {pendingViolations.length} Pending
            </Badge>
            <Badge className="bg-blue-600 text-white px-4 py-2">
              <Eye className="w-4 h-4 mr-2" />
              {aiDetected.length} AI Detected
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-red-900/30 to-stone-900 border-red-600/30">
            <CardContent className="p-4">
              <AlertCircle className="w-6 h-6 text-red-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">{violations.length}</p>
              <p className="text-amber-400/60 text-sm">Total Violations</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-900/30 to-stone-900 border-yellow-600/30">
            <CardContent className="p-4">
              <Clock className="w-6 h-6 text-yellow-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">{pendingViolations.length}</p>
              <p className="text-amber-400/60 text-sm">Pending Review</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30">
            <CardContent className="p-4">
              <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">{violations.filter(v => v.review_decision === 'upheld').length}</p>
              <p className="text-amber-400/60 text-sm">Upheld</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-900/30 to-stone-900 border-blue-600/30">
            <CardContent className="p-4">
              <XCircle className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-amber-100">{violations.filter(v => v.review_decision === 'overturned').length}</p>
              <p className="text-amber-400/60 text-sm">Dismissed</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1">
            <TabsTrigger value="pending" className="data-[state=active]:bg-red-600">
              Pending ({pendingViolations.length})
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-blue-600">
              AI Detected ({aiDetected.length})
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-amber-600">
              User Reports ({userReported.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-stone-600">
              All ({violations.length})
            </TabsTrigger>
          </TabsList>

          {['pending', 'ai', 'reports', 'all'].map(tabValue => (
            <TabsContent key={tabValue} value={tabValue} className="space-y-4">
              {(tabValue === 'pending' ? pendingViolations :
                tabValue === 'ai' ? aiDetected :
                tabValue === 'reports' ? userReported :
                violations
              ).map((violation, i) => {
                const severityConfig = SEVERITY_CONFIG[violation.severity] || SEVERITY_CONFIG.medium;
                const SeverityIcon = severityConfig.icon;
                const actionConfig = ACTION_CONFIG[violation.action_taken] || ACTION_CONFIG.pending_review;

                return (
                  <motion.div
                    key={violation.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.25 }}
                  >
                    <Card className="bg-stone-800/30 border-amber-600/20">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge className={severityConfig.color}>
                                <SeverityIcon className="w-3 h-3 mr-1" />
                                {violation.severity?.toUpperCase()}
                              </Badge>
                              <Badge className={actionConfig.color}>
                                {actionConfig.label}
                              </Badge>
                              <Badge className="bg-stone-700 text-amber-300">
                                {violation.violation_type?.replace('_', ' ')}
                              </Badge>
                              {violation.detected_by === 'ai' && (
                                <Badge className="bg-blue-600/20 text-blue-300">
                                  🤖 AI • {(violation.ai_confidence * 100).toFixed(0)}%
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-amber-100 font-semibold mb-2">
                              Creator: {getCreatorName(violation.creator_id)}
                            </h3>
                            <p className="text-amber-400/70 text-sm mb-3">{violation.description}</p>

                            <div className="flex items-center gap-4 text-sm text-amber-400/60">
                              <span>Stream: {violation.stream_id?.slice(0, 8)}...</span>
                              <span>{violation.created_date && format(new Date(violation.created_date), 'MMM d, h:mm a')}</span>
                              {violation.reviewed_by && (
                                <span>Reviewed by: {violation.reviewed_by}</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          {(!violation.review_decision || violation.review_decision === 'pending') && (
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                onClick={() => updateViolationMutation.mutate({
                                  id: violation.id,
                                  data: { review_decision: 'upheld', action_taken: 'warning_issued' }
                                })}
                                size="sm"
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Warn
                              </Button>
                              <Button
                                onClick={() => updateViolationMutation.mutate({
                                  id: violation.id,
                                  data: { review_decision: 'upheld', action_taken: 'account_suspended' }
                                })}
                                size="sm"
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <Ban className="w-4 h-4 mr-1" />
                                Suspend
                              </Button>
                              <Button
                                onClick={() => updateViolationMutation.mutate({
                                  id: violation.id,
                                  data: { review_decision: 'overturned', action_taken: 'dismissed' }
                                })}
                                size="sm"
                                variant="outline"
                                className="border-green-500/30 text-green-400"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Review Notes */}
                        {violation.review_notes && (
                          <div className="mt-4 p-3 bg-stone-900/50 rounded-lg">
                            <p className="text-amber-400/70 text-sm">
                              <MessageSquare className="w-4 h-4 inline mr-2" />
                              {violation.review_notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

              {(tabValue === 'pending' ? pendingViolations :
                tabValue === 'ai' ? aiDetected :
                tabValue === 'reports' ? userReported :
                violations
              ).length === 0 && (
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-green-400/50 mx-auto mb-4" />
                    <p className="text-amber-400/70">No violations in this category</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}