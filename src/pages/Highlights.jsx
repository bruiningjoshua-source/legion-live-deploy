import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  Play, 
  Share2,
  Eye,
  Gift,
  Users,
  MessageSquare,
  Zap,
  Trophy,
  CheckCircle,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import GlassCard from '@/components/shared/GlassCard';

const HIGHLIGHT_TYPES = {
  gift_surge: { icon: Gift, color: 'amber', label: 'Gift Surge' },
  viewer_peak: { icon: Users, color: 'blue', label: 'Peak Viewers' },
  chat_spike: { icon: MessageSquare, color: 'green', label: 'Chat Explosion' },
  hype_train: { icon: Zap, color: 'purple', label: 'Hype Train' },
  pk_moment: { icon: Trophy, color: 'red', label: 'PK Moment' },
  manual: { icon: Sparkles, color: 'pink', label: 'Highlight' }
};

function HighlightCard({ highlight, creator, onPublish, onDelete }) {
  const typeConfig = HIGHLIGHT_TYPES[highlight.highlight_type] || HIGHLIGHT_TYPES.manual;
  const TypeIcon = typeConfig.icon;

  const shareHighlight = async () => {
    const url = `${window.location.origin}${createPageUrl(`WatchHighlight?id=${highlight.id}`)}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group"
    >
      <GlassCard className="overflow-hidden" padding="p-0" glowColor={typeConfig.color} hover>
        {/* Thumbnail */}
        <div className="relative aspect-video">
          {highlight.thumbnail_url ? (
            <img src={highlight.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br from-${typeConfig.color}-900 to-${typeConfig.color}-800 flex items-center justify-center`}>
              <TypeIcon className={`w-12 h-12 text-${typeConfig.color}-400/50`} />
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={`w-14 h-14 bg-gradient-to-br from-${typeConfig.color}-500 to-${typeConfig.color}-600 rounded-full flex items-center justify-center shadow-xl`}
            >
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </motion.div>
          </div>

          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1.5 bg-${typeConfig.color}-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-medium`}>
              <TypeIcon className="w-3.5 h-3.5" />
              {typeConfig.label}
            </span>
          </div>

          {/* Score */}
          <div className="absolute top-3 right-3">
            <span className="bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-bold">
              {highlight.excitement_score}% 🔥
            </span>
          </div>

          {/* Duration */}
          <div className="absolute bottom-3 right-3">
            <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
              {Math.floor(highlight.duration_seconds / 60)}:{(highlight.duration_seconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-semibold line-clamp-1 mb-2">{highlight.title}</h3>
          
          {/* Creator */}
          {creator && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 overflow-hidden">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                )}
              </div>
              <span className="text-white/60 text-sm">{creator.display_name}</span>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-white/40">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {highlight.view_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Share2 className="w-4 h-4" />
                {highlight.share_count || 0}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {!highlight.is_published && onPublish && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.preventDefault(); onPublish(highlight); }}
                  className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                >
                  <CheckCircle className="w-4 h-4" />
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareHighlight}
                className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20"
              >
                <Share2 className="w-4 h-4" />
              </motion.button>
              {onDelete && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.preventDefault(); onDelete(highlight); }}
                  className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function Highlights() {
  const [showMine, setShowMine] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: highlights = [], isLoading } = useQuery({
    queryKey: ['highlights', showMine, user?.email],
    queryFn: async () => {
      if (showMine && user?.email) {
        return base44.entities.AutoHighlight.filter({ creator_id: user.email }, '-created_date', 100);
      }
      return base44.entities.AutoHighlight.filter({ is_published: true }, '-view_count', 100);
    }
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators-for-highlights'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 100)
  });

  const creatorMap = useMemo(() => 
    creators.reduce((acc, c) => { acc[c.user_email] = c; return acc; }, {}),
    [creators]
  );

  const publishMutation = useMutation({
    mutationFn: async (highlight) => {
      await base44.entities.AutoHighlight.update(highlight.id, { is_published: true });
    },
    onSuccess: () => {
      toast.success('Highlight published!');
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (highlight) => {
      await base44.entities.AutoHighlight.delete(highlight.id);
    },
    onSuccess: () => {
      toast.success('Highlight deleted');
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    }
  });

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
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <Sparkles className="w-16 h-16 text-pink-400" />
          </motion.div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-pink-400 to-purple-400 mb-2">
            Auto Highlights
          </h1>
          <p className="text-white/50">AI-detected exciting moments from live streams</p>
        </motion.div>

        {/* Toggle */}
        {user && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => setShowMine(false)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !showMine ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                Trending
              </button>
              <button
                onClick={() => setShowMine(true)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showMine ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                My Highlights
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl bg-white/10" />
            ))}
          </div>
        ) : highlights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {highlights.map((highlight, i) => (
                <motion.div
                  key={highlight.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.25 }}
                >
                  <HighlightCard
                    highlight={highlight}
                    creator={creatorMap[highlight.creator_id]}
                    onPublish={showMine ? (h) => publishMutation.mutate(h) : null}
                    onDelete={showMine ? (h) => deleteMutation.mutate(h) : null}
                  />
                </motion.div>
              ))}
          </div>
        ) : (
          <GlassCard className="text-center py-16" glowColor="pink">
            <Sparkles className="w-16 h-16 text-pink-400/30 mx-auto mb-4" />
            <h3 className="text-white font-semibold text-xl mb-2">
              {showMine ? 'No Highlights Yet' : 'No Highlights Found'}
            </h3>
            <p className="text-white/50">
              {showMine 
                ? 'Go live and create exciting moments - our AI will capture them!'
                : 'Check back soon for trending highlights!'}
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}