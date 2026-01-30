import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Bell, BellRing, Users, Repeat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isPast, isFuture, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function StreamScheduleCard({ schedule, creator, user }) {
  const queryClient = useQueryClient();

  const { data: hasReminder } = useQuery({
    queryKey: ['stream-reminder', schedule.id, user?.email],
    queryFn: async () => {
      const reminders = await base44.entities.StreamReminder.filter({
        scheduled_stream_id: schedule.id,
        user_email: user.email
      }, null, 1);
      return reminders.length > 0;
    },
    enabled: !!schedule?.id && !!user?.email
  });

  const reminderMutation = useMutation({
    mutationFn: async () => {
      if (hasReminder) {
        const reminders = await base44.entities.StreamReminder.filter({
          scheduled_stream_id: schedule.id,
          user_email: user.email
        }, null, 1);
        if (reminders[0]) {
          await base44.entities.StreamReminder.delete(reminders[0].id);
        }
        await base44.entities.ScheduledStream.update(schedule.id, {
          reminder_count: Math.max(0, (schedule.reminder_count || 1) - 1)
        });
      } else {
        await base44.entities.StreamReminder.create({
          scheduled_stream_id: schedule.id,
          user_email: user.email
        });
        await base44.entities.ScheduledStream.update(schedule.id, {
          reminder_count: (schedule.reminder_count || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stream-reminder']);
      queryClient.invalidateQueries(['scheduled-streams']);
      toast.success(hasReminder ? 'Reminder removed' : 'Reminder set!');
    }
  });

  const scheduledDate = new Date(schedule.scheduled_at);
  const isUpcoming = isFuture(scheduledDate);
  const minutesUntil = differenceInMinutes(scheduledDate, new Date());
  const isStartingSoon = minutesUntil > 0 && minutesUntil <= 30;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`bg-stone-800/50 border-amber-600/20 overflow-hidden ${
        isStartingSoon ? 'border-red-500/50 animate-pulse' : ''
      }`}>
        {/* Header with time indicator */}
        <div className={`h-1 ${
          isStartingSoon ? 'bg-red-500' : isUpcoming ? 'bg-amber-500' : 'bg-stone-600'
        }`} />
        
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Creator Avatar */}
            <Link to={createPageUrl(`CreatorProfile?id=${creator?.id}`)}>
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} className="w-12 h-12 rounded-full" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-amber-600/30 flex items-center justify-center text-amber-400 font-bold">
                  {creator?.display_name?.charAt(0) || '?'}
                </div>
              )}
            </Link>

            <div className="flex-1 min-w-0">
              <h3 className="text-amber-100 font-semibold line-clamp-1">{schedule.title}</h3>
              
              <Link 
                to={createPageUrl(`CreatorProfile?id=${creator?.id}`)}
                className="text-amber-400/70 text-sm hover:text-amber-300"
              >
                {creator?.display_name || 'Unknown'}
              </Link>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {schedule.category && (
                  <Badge className="bg-amber-600/20 text-amber-300 capitalize text-xs">
                    {schedule.category.replace('_', ' ')}
                  </Badge>
                )}
                {schedule.is_recurring && (
                  <Badge className="bg-purple-600/20 text-purple-300 text-xs">
                    <Repeat className="w-3 h-3 mr-1" />
                    {schedule.recurrence_pattern}
                  </Badge>
                )}
                {isStartingSoon && (
                  <Badge className="bg-red-600 text-white text-xs animate-pulse">
                    Starting Soon!
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm text-amber-400/70">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(scheduledDate, 'MMM d')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(scheduledDate, 'h:mm a')}
                </span>
                <span className="flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  {schedule.reminder_count || 0}
                </span>
              </div>
            </div>

            {/* Reminder Button */}
            {user && isUpcoming && (
              <Button
                size="sm"
                variant={hasReminder ? 'default' : 'outline'}
                onClick={() => reminderMutation.mutate()}
                disabled={reminderMutation.isPending}
                className={hasReminder 
                  ? 'bg-amber-600 hover:bg-amber-700' 
                  : 'border-amber-600/30 text-amber-300'
                }
              >
                {hasReminder ? (
                  <BellRing className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}