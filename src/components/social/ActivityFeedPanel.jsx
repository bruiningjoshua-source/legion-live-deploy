import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Radio, 
  Video, 
  UserPlus, 
  Heart, 
  Award, 
  Trophy,
  Scissors,
  Sword,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function ActivityFeedPanel({ user, followingOnly = true }) {
  const { data: following = [] } = useQuery({
    queryKey: ['user-following', user?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: user.email }),
    enabled: !!user?.email && followingOnly
  });

  const followingEmails = following.map(f => f.creator_id);

  const { data: activities = [] } = useQuery({
    queryKey: ['activity-feed', followingEmails],
    queryFn: async () => {
      if (followingOnly && followingEmails.length === 0) return [];
      
      const allActivities = await base44.entities.ActivityFeed.list('-created_date', 50);
      
      if (followingOnly) {
        return allActivities.filter(a => followingEmails.includes(a.actor_email));
      }
      return allActivities;
    },
    enabled: followingOnly ? followingEmails.length > 0 : true
  });

  const getActivityIcon = (type) => {
    const icons = {
      went_live: Radio,
      uploaded_video: Video,
      followed: UserPlus,
      subscribed: Heart,
      achievement: Award,
      milestone: Trophy,
      clip_created: Scissors,
      raid: Sword
    };
    return icons[type] || Activity;
  };

  const getActivityColor = (type) => {
    const colors = {
      went_live: 'text-red-400 bg-red-400/20',
      uploaded_video: 'text-purple-400 bg-purple-400/20',
      followed: 'text-blue-400 bg-blue-400/20',
      subscribed: 'text-pink-400 bg-pink-400/20',
      achievement: 'text-yellow-400 bg-yellow-400/20',
      milestone: 'text-amber-400 bg-amber-400/20',
      clip_created: 'text-cyan-400 bg-cyan-400/20',
      raid: 'text-orange-400 bg-orange-400/20'
    };
    return colors[type] || 'text-amber-400 bg-amber-400/20';
  };

  const getActivityText = (activity) => {
    const texts = {
      went_live: 'started streaming',
      uploaded_video: 'uploaded a new video',
      followed: `followed ${activity.target_title}`,
      subscribed: `subscribed to ${activity.target_title}`,
      achievement: `earned "${activity.target_title}"`,
      milestone: `reached a milestone`,
      clip_created: `created a clip`,
      raid: `raided ${activity.target_title}`
    };
    return texts[activity.activity_type] || 'did something';
  };

  const getActivityLink = (activity) => {
    switch (activity.activity_type) {
      case 'went_live':
        return createPageUrl(`WatchStream?id=${activity.target_id}`);
      case 'uploaded_video':
        return createPageUrl(`WatchVideo?id=${activity.target_id}`);
      case 'followed':
      case 'subscribed':
        return createPageUrl(`CreatorProfile?id=${activity.target_id}`);
      default:
        return '#';
    }
  };

  return (
    <Card className="bg-stone-900/80 border-amber-600/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity, index) => {
                const Icon = getActivityIcon(activity.activity_type);
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={getActivityLink(activity)}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-stone-800/50 transition-colors"
                    >
                      <div className="relative">
                        {activity.actor_avatar ? (
                          <img 
                            src={activity.actor_avatar} 
                            className="w-10 h-10 rounded-full"
                            alt=""
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-amber-600/30 flex items-center justify-center text-amber-400">
                            {activity.actor_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${getActivityColor(activity.activity_type)}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-amber-100 text-sm">
                          <span className="font-semibold">{activity.actor_name}</span>
                          {' '}
                          <span className="text-amber-400/70">{getActivityText(activity)}</span>
                        </p>
                        {activity.target_title && activity.activity_type !== 'followed' && activity.activity_type !== 'subscribed' && (
                          <p className="text-amber-400/60 text-xs truncate mt-0.5">
                            {activity.target_title}
                          </p>
                        )}
                        <p className="text-amber-400/50 text-xs mt-1">
                          {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
                        </p>
                      </div>

                      {activity.target_thumbnail && (
                        <img 
                          src={activity.target_thumbnail}
                          className="w-16 h-10 rounded object-cover"
                          alt=""
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-amber-400/50">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              {followingOnly && (
                <p className="text-xs mt-1">Follow creators to see their activity</p>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}