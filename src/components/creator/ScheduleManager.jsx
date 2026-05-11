import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Plus, Trash2, Edit2, Bell, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  'gaming', 'music', 'talk_show', 'dance', 'cooking', 'fitness',
  'education', 'art', 'comedy', 'outdoor', 'other'
];

export default function ScheduleManager({ creatorId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'gaming',
    scheduled_at: '',
    duration_minutes: 120,
    is_recurring: false,
    recurrence_pattern: 'weekly'
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['scheduled-streams', creatorId],
    queryFn: () => base44.entities.ScheduledStream.filter(
      { creator_id: creatorId, status: 'scheduled' },
      'scheduled_at',
      20
    ),
    enabled: !!creatorId
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const schedule = await base44.entities.ScheduledStream.create({
        ...data,
        creator_id: creatorId
      });

      // Notify followers
      const followers = await base44.entities.Follow.filter({ creator_id: creatorId });
      await Promise.all(followers.slice(0, 100).map(f =>
        base44.entities.Notification.create({
          user_email: f.follower_email,
          type: 'live',
          title: 'Stream Scheduled',
          message: `${data.title} - ${format(new Date(data.scheduled_at), 'PPp')}`,
          from_user_email: creatorId,
          link_url: `/CreatorProfile?id=${creatorId}`
        })
      ));

      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-streams']);
      toast.success('Stream scheduled!');
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ScheduledStream.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-streams']);
      toast.success('Schedule updated!');
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduledStream.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduled-streams']);
      toast.success('Schedule deleted');
    }
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingSchedule(null);
    setFormData({
      title: '',
      description: '',
      category: 'gaming',
      scheduled_at: '',
      duration_minutes: 120,
      is_recurring: false,
      recurrence_pattern: 'weekly'
    });
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      category: schedule.category || 'gaming',
      scheduled_at: schedule.scheduled_at?.slice(0, 16) || '',
      duration_minutes: schedule.duration_minutes || 120,
      is_recurring: schedule.is_recurring || false,
      recurrence_pattern: schedule.recurrence_pattern || 'weekly'
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.scheduled_at) {
      toast.error('Title and date are required');
      return;
    }

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Card className="bg-stone-900/80 border-amber-600/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            Stream Schedule
          </div>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Schedule Stream
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 p-4 bg-stone-800/50 rounded-lg border border-amber-600/20"
            >
              <Input
                placeholder="Stream title"
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                className="bg-stone-900 border-amber-600/30 text-amber-100"
              />

              <Textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                className="bg-stone-900 border-amber-600/30 text-amber-100 h-20"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-amber-400/70 text-xs mb-1 block">Category</label>
                  <Select
                    value={formData.category}
                    onValueChange={v => setFormData(f => ({ ...f, category: v }))}
                  >
                    <SelectTrigger className="bg-stone-900 border-amber-600/30 text-amber-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-amber-400/70 text-xs mb-1 block">Duration</label>
                  <Select
                    value={formData.duration_minutes.toString()}
                    onValueChange={v => setFormData(f => ({ ...f, duration_minutes: parseInt(v) }))}
                  >
                    <SelectTrigger className="bg-stone-900 border-amber-600/30 text-amber-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="360">6 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-amber-400/70 text-xs mb-1 block">Date & Time</label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={e => setFormData(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="bg-stone-900 border-amber-600/30 text-amber-100"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-100 text-sm">Recurring</span>
                </div>
                <Switch
                  checked={formData.is_recurring}
                  onCheckedChange={v => setFormData(f => ({ ...f, is_recurring: v }))}
                />
              </div>

              {formData.is_recurring && (
                <Select
                  value={formData.recurrence_pattern}
                  onValueChange={v => setFormData(f => ({ ...f, recurrence_pattern: v }))}
                >
                  <SelectTrigger className="bg-stone-900 border-amber-600/30 text-amber-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  {editingSchedule ? 'Update' : 'Schedule'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scheduled Streams List */}
        <div className="space-y-3">
          {schedules.map(schedule => (
            <motion.div
              key={schedule.id}
              layout
              className="p-4 rounded-lg bg-stone-800/50 border border-amber-600/20"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-amber-100 font-medium">{schedule.title}</h4>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <Badge className="bg-amber-600/20 text-amber-300 capitalize">
                      {schedule.category?.replace('_', ' ')}
                    </Badge>
                    <span className="text-amber-400/70 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(schedule.scheduled_at), 'MMM d, yyyy')}
                    </span>
                    <span className="text-amber-400/70 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(schedule.scheduled_at), 'h:mm a')}
                    </span>
                  </div>
                  {schedule.is_recurring && (
                    <Badge className="mt-2 bg-purple-600/20 text-purple-300">
                      <Repeat className="w-3 h-3 mr-1" />
                      {schedule.recurrence_pattern}
                    </Badge>
                  )}
                  {schedule.reminder_count > 0 && (
                    <span className="text-amber-400/50 text-xs mt-2 flex items-center gap-1">
                      <Bell className="w-3 h-3" />
                      {schedule.reminder_count} reminders set
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(schedule)}
                    className="text-amber-400 h-8 w-8"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(schedule.id)}
                    className="text-red-400 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}

          {schedules.length === 0 && (
            <div className="text-center py-8 text-amber-400/50">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No scheduled streams</p>
              <p className="text-xs mt-1">Schedule your next stream above</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}