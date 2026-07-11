import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  UserPlus, 
  X, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Crown,
  Search,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

export default function CoStreamPanel({ 
  streamId,
  hostCreator,
  currentUser,
  isHost = false,
  maxCoStreamers = 4,
  onClose 
}) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingInvites, setPendingInvites] = useState([]);
  const [coStreamers, setCoStreamers] = useState([]);
  const [myAudioMuted, setMyAudioMuted] = useState(false);
  const [myVideoOff, setMyVideoOff] = useState(false);

  // Fetch followed creators for invite suggestions
  const { data: followedCreators = [] } = useQuery({
    queryKey: ['followed-creators-for-costream', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const follows = await base44.entities.Follow.filter({ 
        follower_email: currentUser.email 
      }, '-created_date', 50);
      
      const creatorIds = follows.map(f => f.following_creator_id);
      if (creatorIds.length === 0) return [];
      
      const creators = await base44.entities.Creator.filter({}, '-follower_count', 100);
      return creators.filter(c => creatorIds.includes(c.id) && c.is_live);
    },
    enabled: !!currentUser?.email && isHost
  });

  // Fetch pending co-stream invites
  const { data: invites = [] } = useQuery({
    queryKey: ['costream-invites', streamId],
    queryFn: async () => {
      const requests = await base44.entities.CollabRequest.filter({
        stream_id: streamId,
        status: 'pending',
        collab_type: 'co_stream'
      }, '-created_date', 10);
      return requests;
    },
    enabled: !!streamId,
    refetchInterval: 5000
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (creator) => {
      await base44.entities.CollabRequest.create({
        requester_email: currentUser.email,
        requester_creator_id: hostCreator?.id,
        target_creator_id: creator.id,
        collab_type: 'co_stream',
        stream_id: streamId,
        status: 'pending',
        message: `${currentUser.full_name} invites you to co-stream!`
      });
    },
    onSuccess: (_, creator) => {
      toast.success(`Invite sent to ${creator.display_name}!`);
      setPendingInvites(prev => [...prev, creator.id]);
    }
  });

  const handleInviteResponse = useMutation({
    mutationFn: async ({ invite, accept }) => {
      await base44.entities.CollabRequest.update(invite.id, {
        status: accept ? 'accepted' : 'declined'
      });
      
      if (accept) {
        // Add to co-streamers
        setCoStreamers(prev => [...prev, {
          id: invite.target_creator_id,
          display_name: invite.target_creator_name,
          user_email: invite.requester_email
        }]);
      }
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ['costream-invites'] });
      toast.success(accept ? 'Co-streamer joined!' : 'Invite declined');
    }
  });

  const removeCoStreamer = (coStreamer) => {
    setCoStreamers(prev => prev.filter(c => c.id !== coStreamer.id));
    toast.info(`${coStreamer.display_name} removed from co-stream`);
  };

  const filteredCreators = followedCreators.filter(c => 
    c.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !coStreamers.find(cs => cs.id === c.id) &&
    !pendingInvites.includes(c.id)
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-[#1e1f22] border-l border-white/10 flex flex-col z-40"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <h3 className="text-white font-semibold">Co-Stream</h3>
        </div>
        <button onClick={onClose} className="p-1 text-white/40 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Current Co-Streamers */}
      <div className="p-4 border-b border-white/10">
        <h4 className="text-white/60 text-xs uppercase tracking-wider mb-3">
          Active ({coStreamers.length + 1}/{maxCoStreamers})
        </h4>
        
        {/* Host */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 overflow-hidden">
            {hostCreator?.avatar_url ? (
              <img src={hostCreator.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">👤</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-white text-sm font-medium truncate">{hostCreator?.display_name}</span>
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-white/40 text-xs">Host</span>
          </div>
        </div>

        {/* Co-Streamers */}
        {coStreamers.map(coStreamer => (
          <div key={coStreamer.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 mb-2 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-amber-600 overflow-hidden">
              {coStreamer.avatar_url ? (
                <img src={coStreamer.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">👤</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-white text-sm font-medium truncate block">{coStreamer.display_name}</span>
              <span className="text-white/40 text-xs">Co-streaming</span>
            </div>
            {isHost && (
              <button 
                onClick={() => removeCoStreamer(coStreamer)}
                className="p-1 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Invite Section (Host Only) */}
      {isHost && coStreamers.length < maxCoStreamers - 1 && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 pb-2">
            <h4 className="text-white/60 text-xs uppercase tracking-wider mb-3">Invite Live Creators</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creators..."
                className="pl-9 bg-white/5 border-white/10 text-white text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
            {filteredCreators.map(creator => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-amber-600 overflow-hidden">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white">👤</div>
                    )}
                  </div>
                  {creator.is_live && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-[#1e1f22] flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">LIVE</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white text-sm font-medium truncate block">{creator.display_name}</span>
                  <span className="text-white/40 text-xs">{creator.follower_count?.toLocaleString()} followers</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendInviteMutation.mutate(creator)}
                  disabled={pendingInvites.includes(creator.id)}
                  className="bg-purple-500 hover:bg-purple-600 h-8 px-3"
                >
                  {pendingInvites.includes(creator.id) ? 'Sent' : 'Invite'}
                </Button>
              </motion.div>
            ))}

            {filteredCreators.length === 0 && (
              <div className="text-center py-8 text-white/30">
                <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No live creators found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Controls */}
      {coStreamers.length > 0 && (
        <div className="p-4 border-t border-white/10 flex items-center justify-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMyAudioMuted(!myAudioMuted)}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              myAudioMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            {myAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMyVideoOff(!myVideoOff)}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              myVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            {myVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}