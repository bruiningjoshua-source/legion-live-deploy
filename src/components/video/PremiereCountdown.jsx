import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, Clock, Users, Play } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function PremiereCountdown({ premiereId, user, onStart }) {
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const { data: premiere } = useQuery({
    queryKey: ['premiere', premiereId],
    queryFn: async () => {
      const premieres = await base44.entities.Premiere.filter({ id: premiereId }, null, 1);
      return premieres[0];
    },
    enabled: !!premiereId
  });

  const { data: hasReminder } = useQuery({
    queryKey: ['premiere-reminder', premiereId, user?.email],
    queryFn: async () => {
      const reminders = await base44.entities.PremiereReminder.filter({
        premiere_id: premiereId,
        user_email: user.email
      }, null, 1);
      return reminders.length > 0;
    },
    enabled: !!premiereId && !!user?.email
  });

  useEffect(() => {
    if (!premiere?.scheduled_at) return;

    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(premiere.scheduled_at);
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onStart) onStart();
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [premiere?.scheduled_at, onStart]);

  const reminderMutation = useMutation({
    mutationFn: async () => {
      if (hasReminder) {
        const reminders = await base44.entities.PremiereReminder.filter({
          premiere_id: premiereId,
          user_email: user.email
        }, null, 1);
        if (reminders[0]) {
          await base44.entities.PremiereReminder.delete(reminders[0].id);
        }
        // Decrement count
        await base44.entities.Premiere.update(premiereId, {
          reminder_count: Math.max(0, (premiere?.reminder_count || 1) - 1)
        });
      } else {
        await base44.entities.PremiereReminder.create({
          premiere_id: premiereId,
          user_email: user.email
        });
        // Increment count
        await base44.entities.Premiere.update(premiereId, {
          reminder_count: (premiere?.reminder_count || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['premiere-reminder']);
      queryClient.invalidateQueries(['premiere']);
      toast.success(hasReminder ? 'Reminder removed' : 'Reminder set!');
    }
  });

  if (!premiere) return null;

  const isStarted = new Date(premiere.scheduled_at) <= new Date();

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/50 to-stone-900/50 border border-purple-500/30">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -inset-1/2 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative p-6 text-center">
        <Badge className="bg-purple-600 text-white mb-4">
          <Play className="w-3 h-3 mr-1" />
          Premiere
        </Badge>

        <h2 className="text-2xl font-bold text-white mb-2">{premiere.title}</h2>
        
        {premiere.description && (
          <p className="text-purple-200/80 text-sm mb-4">{premiere.description}</p>
        )}

        {!isStarted ? (
          <>
            {/* Countdown */}
            <div className="flex justify-center gap-4 my-6">
              {[
                { value: timeLeft.days, label: 'Days' },
                { value: timeLeft.hours, label: 'Hours' },
                { value: timeLeft.minutes, label: 'Min' },
                { value: timeLeft.seconds, label: 'Sec' }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="bg-stone-900/80 rounded-lg p-3 min-w-[60px]"
                  animate={{ scale: item.value === 0 ? 1 : [1, 1.02, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div className="text-3xl font-bold text-white">
                    {item.value.toString().padStart(2, '0')}
                  </div>
                  <div className="text-purple-400 text-xs">{item.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Reminder Button */}
            {user && (
              <Button
                onClick={() => reminderMutation.mutate()}
                disabled={reminderMutation.isPending}
                variant={hasReminder ? 'default' : 'outline'}
                className={hasReminder 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'border-purple-500/50 text-purple-300 hover:bg-purple-500/20'
                }
              >
                {hasReminder ? (
                  <>
                    <BellRing className="w-4 h-4 mr-2" />
                    Reminder Set
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Set Reminder
                  </>
                )}
              </Button>
            )}

            <div className="flex items-center justify-center gap-4 mt-4 text-purple-300/70 text-sm">
              <span className="flex items-center gap-1">
                <Bell className="w-4 h-4" />
                {premiere.reminder_count || 0} waiting
              </span>
            </div>
          </>
        ) : (
          <div className="py-4">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Badge className="bg-red-500 text-white text-lg px-4 py-2">
                <Play className="w-4 h-4 mr-2" />
                PREMIERING NOW
              </Badge>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}