import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Bell } from 'lucide-react';
import StreamScheduleCard from '@/components/stream/StreamScheduleCard';
import { format, isToday, isTomorrow, isThisWeek, addDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function UpcomingStreamsPage() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: following = [] } = useQuery({
    queryKey: ['user-following', user?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: user.email }),
    enabled: !!user?.email
  });

  const followingIds = following.map(f => f.creator_id);

  const { data: scheduledStreams = [], isLoading } = useQuery({
    queryKey: ['all-scheduled-streams'],
    queryFn: () => base44.entities.ScheduledStream.filter(
      { status: 'scheduled' },
      'scheduled_at',
      100
    )
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['schedule-creators', scheduledStreams.map(s => s.creator_id)],
    queryFn: async () => {
      const creatorIds = [...new Set(scheduledStreams.map(s => s.creator_id))];
      const results = await Promise.all(
        creatorIds.map(async (id) => {
          const c = await base44.entities.Creator.filter({ user_email: id }, null, 1);
          return c[0];
        })
      );
      return results.filter(Boolean);
    },
    enabled: scheduledStreams.length > 0
  });

  const creatorMap = creators.reduce((acc, c) => {
    acc[c.user_email] = c;
    return acc;
  }, {});

  // Filter to upcoming only
  const upcomingStreams = scheduledStreams.filter(s => 
    new Date(s.scheduled_at) > new Date()
  );

  // Sort followed creators first
  const sortedStreams = [...upcomingStreams].sort((a, b) => {
    const aFollowed = followingIds.includes(a.creator_id);
    const bFollowed = followingIds.includes(b.creator_id);
    if (aFollowed && !bFollowed) return -1;
    if (!aFollowed && bFollowed) return 1;
    return new Date(a.scheduled_at) - new Date(b.scheduled_at);
  });

  // Group by time period
  const groupedStreams = sortedStreams.reduce((groups, stream) => {
    const date = new Date(stream.scheduled_at);
    let groupKey;
    
    if (isToday(date)) {
      groupKey = 'Today';
    } else if (isTomorrow(date)) {
      groupKey = 'Tomorrow';
    } else if (isThisWeek(date)) {
      groupKey = 'This Week';
    } else {
      groupKey = 'Later';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(stream);
    return groups;
  }, {});

  const followedStreams = sortedStreams.filter(s => followingIds.includes(s.creator_id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="w-8 h-8 text-amber-400" />
          <h1 className="text-3xl font-bold text-amber-100">Upcoming Streams</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-stone-800/50 border-amber-600/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-100">{upcomingStreams.length}</p>
              <p className="text-amber-400/70 text-sm">Scheduled</p>
            </CardContent>
          </Card>
          <Card className="bg-stone-800/50 border-amber-600/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-100">{followedStreams.length}</p>
              <p className="text-amber-400/70 text-sm">From Following</p>
            </CardContent>
          </Card>
          <Card className="bg-stone-800/50 border-amber-600/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-100">
                {groupedStreams['Today']?.length || 0}
              </p>
              <p className="text-amber-400/70 text-sm">Today</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-stone-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : upcomingStreams.length > 0 ? (
          <div className="space-y-8">
            {['Today', 'Tomorrow', 'This Week', 'Later'].map(period => {
              const streams = groupedStreams[period];
              if (!streams?.length) return null;

              return (
                <div key={period}>
                  <h2 className="text-amber-400 font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {period}
                    <Badge className="bg-amber-600/20 text-amber-300 ml-2">
                      {streams.length}
                    </Badge>
                  </h2>
                  <div className="space-y-3">
                    {streams.map((stream, index) => (
                      <motion.div
                        key={stream.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
                      >
                        <StreamScheduleCard
                          schedule={stream}
                          creator={creatorMap[stream.creator_id]}
                          user={user}
                        />
                        {followingIds.includes(stream.creator_id) && (
                          <Badge className="ml-16 -mt-2 bg-blue-600/20 text-blue-300 text-xs">
                            Following
                          </Badge>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-amber-400/30" />
              <h2 className="text-xl font-semibold text-amber-100 mb-2">No upcoming streams</h2>
              <p className="text-amber-400/70">
                Follow creators to see their scheduled streams here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}