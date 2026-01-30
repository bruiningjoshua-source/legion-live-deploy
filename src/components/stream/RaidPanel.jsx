import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Sword, Search, Radio, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RaidPanel({ currentStreamId, creatorId, viewerCount, onClose }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [countdown, setCountdown] = useState(null);

  const { data: liveCreators = [] } = useQuery({
    queryKey: ['live-creators-for-raid'],
    queryFn: async () => {
      const streams = await base44.entities.Stream.filter({ status: 'live' });
      const creatorIds = [...new Set(streams.map(s => s.creator_id).filter(id => id !== creatorId))];
      
      if (creatorIds.length === 0) return [];
      
      const creators = await Promise.all(
        creatorIds.map(async (id) => {
          const c = await base44.entities.Creator.filter({ user_email: id }, null, 1);
          const stream = streams.find(s => s.creator_id === id);
          return c[0] ? { ...c[0], stream } : null;
        })
      );
      return creators.filter(Boolean);
    }
  });

  const filteredCreators = liveCreators.filter(c =>
    c.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const raidMutation = useMutation({
    mutationFn: async (targetCreator) => {
      // Create raid record
      await base44.entities.Raid.create({
        from_creator_id: creatorId,
        to_creator_id: targetCreator.user_email,
        from_stream_id: currentStreamId,
        to_stream_id: targetCreator.stream?.id,
        viewer_count: viewerCount,
        status: 'completed',
        raided_at: new Date().toISOString()
      });

      // Notify target creator
      await base44.entities.Notification.create({
        user_email: targetCreator.user_email,
        type: 'raid',
        title: 'Incoming Raid!',
        message: `You're being raided with ${viewerCount} viewers!`,
        from_user_email: creatorId,
        metadata: { viewer_count: viewerCount, stream_id: currentStreamId }
      });

      // Create activity
      await base44.entities.ActivityFeed.create({
        user_email: creatorId,
        activity_type: 'raid',
        actor_email: creatorId,
        target_id: targetCreator.user_email,
        target_type: 'creator',
        target_title: targetCreator.display_name
      });

      return targetCreator;
    },
    onSuccess: (target) => {
      toast.success(`Raiding ${target.display_name}!`);
      // Redirect viewers
      window.location.href = `/WatchStream?id=${target.stream?.id}`;
    }
  });

  const startRaid = (creator) => {
    setSelectedCreator(creator);
    setCountdown(10);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          raidMutation.mutate(creator);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelRaid = () => {
    setSelectedCreator(null);
    setCountdown(null);
  };

  return (
    <Card className="bg-stone-900/95 border-amber-600/30 w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-100 flex items-center gap-2">
          <Sword className="w-5 h-5 text-red-400" />
          Raid a Channel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {countdown !== null ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <div className="relative w-32 h-32 mx-auto mb-4">
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-red-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-bold text-red-400">{countdown}</span>
              </div>
            </div>
            <p className="text-amber-100 text-lg mb-2">Raiding {selectedCreator?.display_name}</p>
            <p className="text-amber-400/70 mb-4">with {viewerCount} viewers</p>
            <Button
              variant="outline"
              onClick={cancelRaid}
              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              Cancel Raid
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
              <Input
                placeholder="Search channels..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-stone-800 border-amber-600/30 text-amber-100"
              />
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {filteredCreators.map(creator => (
                  <motion.div
                    key={creator.id}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-stone-800/50 border border-amber-600/20 hover:border-amber-500/50 cursor-pointer"
                    onClick={() => startRaid(creator)}
                  >
                    <div className="flex items-center gap-3">
                      {creator.avatar_url ? (
                        <img src={creator.avatar_url} className="w-10 h-10 rounded-full" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-600/30 flex items-center justify-center">
                          <Users className="w-5 h-5 text-amber-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-amber-100 font-medium">{creator.display_name}</p>
                        <div className="flex items-center gap-2 text-xs text-amber-400/70">
                          <Radio className="w-3 h-3 text-red-400" />
                          {creator.stream?.title || 'Live'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-600/30 text-red-300">
                        <Users className="w-3 h-3 mr-1" />
                        {creator.stream?.viewer_count || 0}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </div>
                  </motion.div>
                ))}

                {filteredCreators.length === 0 && (
                  <div className="text-center py-8 text-amber-400/50">
                    <Sword className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No channels to raid</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full border-stone-600"
            >
              Cancel
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}