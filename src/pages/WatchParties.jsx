import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Play, 
  Plus, 
  Search,
  Lock,
  Globe,
  Clock,
  Copy,
  CheckCircle,
  Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

function PartyCard({ party, videos, onJoin }) {
  const video = videos.find(v => v.id === party.video_id);
  const [copied, setCopied] = useState(false);

  const copyInvite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${createPageUrl(`WatchPartyRoom?id=${party.id}`)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="cursor-pointer"
      onClick={() => onJoin(party)}
    >
      <GlassCard className="overflow-hidden" padding="p-0" glowColor="cyan" hover>
        {/* Thumbnail */}
        <div className="relative aspect-video">
          {video?.thumbnail_url ? (
            <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center">
              <Film className="w-12 h-12 text-cyan-400/50" />
            </div>
          )}
          
          {/* Status */}
          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
              party.status === 'playing' ? 'bg-green-500 text-white' :
              party.status === 'paused' ? 'bg-yellow-500 text-black' :
              'bg-cyan-500 text-white'
            }`}>
              {party.status === 'waiting' ? 'Waiting' : party.status === 'playing' ? 'Playing' : 'Paused'}
            </span>
          </div>

          {/* Privacy */}
          <div className="absolute top-3 right-3">
            {party.is_private ? (
              <Lock className="w-5 h-5 text-white/80" />
            ) : (
              <Globe className="w-5 h-5 text-white/80" />
            )}
          </div>

          {/* Participants */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-white text-sm">{party.participant_count}/{party.max_participants}</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-white font-semibold mb-1 line-clamp-1">{party.title || video?.title}</h3>
          <p className="text-white/50 text-sm mb-3 line-clamp-1">
            Hosted by {party.host_email?.split('@')[0]}
          </p>

          <div className="flex items-center justify-between">
            <button
              onClick={copyInvite}
              className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Invite'}
            </button>
            <PremiumButton size="sm" leftIcon={<Play className="w-4 h-4" />}>
              Join
            </PremiumButton>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function WatchParties() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newParty, setNewParty] = useState({ title: '', video_id: '', is_private: false });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ['watch-parties'],
    queryFn: () => base44.entities.WatchParty.filter({ 
      status: { $ne: 'ended' } 
    }, '-created_date', 50),
    refetchInterval: 10000
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['videos-for-parties'],
    queryFn: () => base44.entities.VlogVideo.filter({ is_published: true }, '-view_count', 100)
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const party = await base44.entities.WatchParty.create({
        ...data,
        host_email: user.email,
        participants: [{
          email: user.email,
          name: user.full_name,
          joined_at: new Date().toISOString()
        }],
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase()
      });
      return party;
    },
    onSuccess: (party) => {
      toast.success('Watch party created!');
      setShowCreate(false);
      setNewParty({ title: '', video_id: '', is_private: false });
      navigate(createPageUrl(`WatchPartyRoom?id=${party.id}`));
    }
  });

  const handleJoin = (party) => {
    navigate(createPageUrl(`WatchPartyRoom?id=${party.id}`));
  };

  const filteredParties = useMemo(() => {
    return parties.filter(p => {
      if (p.is_private && p.host_email !== user?.email) return false;
      if (!searchQuery) return true;
      const video = videos.find(v => v.id === p.video_id);
      return p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             video?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [parties, videos, searchQuery, user]);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <Users className="w-16 h-16 text-cyan-400" />
          </motion.div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-400 mb-2">
            Watch Parties
          </h1>
          <p className="text-white/50">Watch videos together with friends in sync</p>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/50" />
            <Input
              placeholder="Search parties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50 rounded-xl"
            />
          </div>
          <PremiumButton
            onClick={() => setShowCreate(true)}
            leftIcon={<Plus className="w-5 h-5" />}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            Create Party
          </PremiumButton>
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
              onClick={() => setShowCreate(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <GlassCard className="w-full max-w-md" glowColor="cyan">
                  <h2 className="text-2xl font-bold text-white mb-6">Create Watch Party</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-white/70 text-sm mb-2 block">Party Name</label>
                      <Input
                        value={newParty.title}
                        onChange={(e) => setNewParty({ ...newParty, title: e.target.value })}
                        placeholder="Movie night with friends"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-white/70 text-sm mb-2 block">Select Video</label>
                      <select
                        value={newParty.video_id}
                        onChange={(e) => setNewParty({ ...newParty, video_id: e.target.value })}
                        className="w-full h-12 px-4 bg-white/5 border border-white/10 text-white rounded-xl"
                      >
                        <option value="">Choose a video...</option>
                        {videos.map(v => (
                          <option key={v.id} value={v.id}>{v.title}</option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newParty.is_private}
                        onChange={(e) => setNewParty({ ...newParty, is_private: e.target.checked })}
                        className="w-5 h-5 rounded bg-white/10 border-white/20"
                      />
                      <span className="text-white/70">Private party (invite only)</span>
                    </label>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <PremiumButton variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">
                      Cancel
                    </PremiumButton>
                    <PremiumButton
                      onClick={() => createMutation.mutate(newParty)}
                      loading={createMutation.isPending}
                      disabled={!newParty.video_id}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600"
                    >
                      Create
                    </PremiumButton>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Parties Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl bg-white/10" />
            ))}
          </div>
        ) : filteredParties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredParties.map((party, i) => (
              <motion.div
                key={party.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <PartyCard party={party} videos={videos} onJoin={handleJoin} />
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="text-center py-16" glowColor="cyan">
            <Users className="w-16 h-16 text-cyan-400/30 mx-auto mb-4" />
            <h3 className="text-white font-semibold text-xl mb-2">No Watch Parties</h3>
            <p className="text-white/50 mb-6">Be the first to create a watch party!</p>
            <PremiumButton
              onClick={() => setShowCreate(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Create Party
            </PremiumButton>
          </GlassCard>
        )}
      </div>
    </div>
  );
}