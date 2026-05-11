import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { 
  Zap,
  Search,
  ArrowRight,
  Radio,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

export default function RaidButton({ streamId, creatorId, viewerCount }) {
  const [showRaid, setShowRaid] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState(null);
  const navigate = useNavigate();

  const { data: liveStreams = [] } = useQuery({
    queryKey: ['live-streams-for-raid'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 50),
    enabled: showRaid
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators-for-raid'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 100),
    enabled: showRaid
  });

  const creatorMap = useMemo(() => 
    creators.reduce((acc, c) => { acc[c.id] = c; return acc; }, {}),
    [creators]
  );

  const raidableStreams = useMemo(() => {
    return liveStreams
      .filter(s => s.id !== streamId)
      .map(s => ({ ...s, creator: creatorMap[s.creator_id] }))
      .filter(s => {
        if (!searchQuery) return true;
        return s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               s.creator?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [liveStreams, streamId, creatorMap, searchQuery]);

  const raidMutation = useMutation({
    mutationFn: async (targetStream) => {
      // Create raid record
      await base44.entities.Raid.create({
        from_stream_id: streamId,
        to_stream_id: targetStream.id,
        from_creator_id: creatorId,
        to_creator_id: targetStream.creator_id,
        viewer_count: viewerCount,
        status: 'completed'
      });

      // Update target stream viewer count
      await base44.entities.Stream.update(targetStream.id, {
        viewer_count: (targetStream.viewer_count || 0) + viewerCount
      });

      return targetStream;
    },
    onSuccess: (targetStream) => {
      toast.success(`Raiding ${targetStream.creator?.display_name || 'streamer'} with ${viewerCount} viewers!`);
      setShowRaid(false);
      
      // Redirect to the raided stream after a moment
      setTimeout(() => {
        navigate(createPageUrl(`WatchStream?id=${targetStream.id}`));
      }, 2000);
    }
  });

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowRaid(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 transition-colors"
      >
        <Zap className="w-5 h-5" />
        <span className="font-medium">Raid</span>
      </motion.button>

      <AnimatePresence>
        {showRaid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setShowRaid(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <GlassCard glowColor="orange">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">Raid Another Stream</h2>
                    <p className="text-white/50 text-sm">Send your {viewerCount} viewers to support another creator</p>
                  </div>
                  <button onClick={() => setShowRaid(false)} className="text-white/50 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400/50" />
                  <Input
                    placeholder="Search streamers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 bg-white/5 border-white/10 text-white"
                  />
                </div>

                {/* Streams List */}
                <div className="max-h-80 overflow-y-auto space-y-2 scrollbar-hide">
                  {raidableStreams.length > 0 ? (
                    raidableStreams.map(stream => (
                      <motion.div
                        key={stream.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedCreator(stream)}
                        className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${
                          selectedCreator?.id === stream.id
                            ? 'bg-orange-500/30 border-2 border-orange-500'
                            : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 overflow-hidden shrink-0">
                          {stream.creator?.avatar_url ? (
                            <img src={stream.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate">{stream.creator?.display_name}</h3>
                          <p className="text-white/50 text-sm truncate">{stream.title}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/60 text-sm shrink-0">
                          <Radio className="w-4 h-4 text-red-400" />
                          {stream.viewer_count || 0}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-white/40">
                      <Radio className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No other streams live right now</p>
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="flex gap-3 mt-6">
                  <PremiumButton variant="ghost" onClick={() => setShowRaid(false)} className="flex-1">
                    Cancel
                  </PremiumButton>
                  <PremiumButton
                    onClick={() => selectedCreator && raidMutation.mutate(selectedCreator)}
                    loading={raidMutation.isPending}
                    disabled={!selectedCreator}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Raid Now
                  </PremiumButton>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}