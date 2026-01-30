import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Clock, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function WatchLaterButton({ videoId, videoType = 'vlog', user, size = 'icon', showLabel = false }) {
  const queryClient = useQueryClient();

  const { data: isInWatchLater } = useQuery({
    queryKey: ['watch-later', user?.email, videoId],
    queryFn: async () => {
      const items = await base44.entities.WatchLater.filter({
        user_email: user.email,
        video_id: videoId
      }, null, 1);
      return items.length > 0 ? items[0] : null;
    },
    enabled: !!user?.email && !!videoId
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (isInWatchLater) {
        await base44.entities.WatchLater.delete(isInWatchLater.id);
      } else {
        await base44.entities.WatchLater.create({
          user_email: user.email,
          video_id: videoId,
          video_type: videoType,
          added_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['watch-later']);
      toast.success(isInWatchLater ? 'Removed from Watch Later' : 'Added to Watch Later');
    }
  });

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleMutation.mutate();
      }}
      className={`${isInWatchLater ? 'text-amber-400' : 'text-amber-400/70'} hover:text-amber-300`}
    >
      {isInWatchLater ? (
        <Check className="w-4 h-4" />
      ) : (
        <Clock className="w-4 h-4" />
      )}
      {showLabel && <span className="ml-2">{isInWatchLater ? 'Added' : 'Watch Later'}</span>}
    </Button>
  );
}