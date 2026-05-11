import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Ban, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AlertNotifications({ streamId, isAdmin }) {
  const queryClient = useQueryClient();
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  const { data: alerts = [] } = useQuery({
    queryKey: ['moderation-alerts', streamId],
    queryFn: () =>
      base44.asServiceRole.entities.ModerationAlert.filter(
        { stream_id: streamId, admin_decision: 'pending' },
        '-created_date',
        20
      ),
    enabled: isAdmin && !!streamId,
    refetchInterval: 10 * 1000 // Check every 10 seconds
  });

  const pendingAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  const handleDismiss = (alertId) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  const handleApprove = async (alert) => {
    await base44.asServiceRole.entities.ModerationAlert.update(alert.id, {
      admin_decision: 'approved',
      reviewed_by_email: (await base44.auth.me()).email,
      reviewed_at: new Date().toISOString()
    });
    handleDismiss(alert.id);
    queryClient.invalidateQueries({ queryKey: ['moderation-alerts'] });
  };

  const handleDismissAlert = async (alert) => {
    await base44.asServiceRole.entities.ModerationAlert.update(alert.id, {
      admin_decision: 'dismissed',
      reviewed_by_email: (await base44.auth.me()).email,
      reviewed_at: new Date().toISOString()
    });
    handleDismiss(alert.id);
    queryClient.invalidateQueries({ queryKey: ['moderation-alerts'] });
  };

  if (!isAdmin || pendingAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 max-w-sm z-40 space-y-2">
      <AnimatePresence>
        {pendingAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="bg-stone-900 border border-amber-600/50 rounded-lg p-3 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {alert.severity === 'high' ? (
                  <Ban className="w-5 h-5 text-red-400" />
                ) : alert.severity === 'medium' ? (
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                ) : (
                  <Bell className="w-5 h-5 text-blue-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-100 font-semibold text-sm truncate">
                    {alert.user_name}
                  </span>
                  <Badge className="text-xs bg-opacity-50 h-5">
                    {alert.alert_type}
                  </Badge>
                </div>
                <p className="text-amber-300/70 text-xs line-clamp-2 mb-2">
                  {alert.content}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400/60 text-xs">
                    {Math.round(alert.ai_confidence * 100)}% confidence
                  </span>
                  {alert.action_taken !== 'none' && (
                    <Badge className="bg-red-600/50 text-red-200 text-xs h-5">
                      {alert.action_taken}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-1">
                {alert.action_taken === 'banned' && alert.severity === 'high' ? (
                  <Button
                    size="sm"
                    className="h-7 bg-red-600 hover:bg-red-700 text-xs px-2"
                    onClick={() => handleApprove(alert)}
                  >
                    Confirm Ban
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2 border-amber-600/30"
                      onClick={() => handleDismissAlert(alert)}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 bg-amber-600 hover:bg-amber-700 text-xs px-2"
                      onClick={() => handleApprove(alert)}
                    >
                      OK
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}