import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Headphones, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import EpisodeCard from './EpisodeCard';
import EpisodeUploadDialog from './EpisodeUploadDialog';

export default function PodcastDetailPanel({ podcast, creatorId, isCreator, onBack, onPlayEpisode, currentEpisodeId }) {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState(null);

  const { data: episodes = [], isLoading } = useQuery({
    queryKey: ['podcast-episodes', podcast.id],
    queryFn: () => base44.entities.PodcastEpisode.filter(
      isCreator ? { podcast_id: podcast.id } : { podcast_id: podcast.id, is_published: true },
      'episode_number',
      100
    ),
    enabled: !!podcast.id
  });

  const deleteMutation = useMutation({
    mutationFn: async (episodeId) => {
      await base44.entities.PodcastEpisode.delete(episodeId);
      await base44.entities.Podcast.update(podcast.id, {
        total_episodes: Math.max(0, (podcast.total_episodes || 1) - 1)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['my-podcasts'] });
      toast.success('Episode deleted');
    }
  });

  const togglePublishMutation = useMutation({
    mutationFn: (ep) => base44.entities.PodcastEpisode.update(ep.id, { is_published: !ep.is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcast-episodes'] });
      toast.success('Episode visibility updated');
    }
  });

  // Group by season
  const seasons = {};
  episodes.forEach(ep => {
    const s = ep.season_number || 1;
    if (!seasons[s]) seasons[s] = [];
    seasons[s].push(ep);
  });

  const totalDuration = episodes.reduce((acc, ep) => acc + (ep.duration_seconds || 0), 0);
  const totalPlays = episodes.reduce((acc, ep) => acc + (ep.play_count || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={onBack} className="mt-1 text-amber-400/60 hover:text-amber-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-4 flex-1">
          {podcast.cover_art_url ? (
            <img src={podcast.cover_art_url} alt="" className="w-28 h-28 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shrink-0">
              <Headphones className="w-10 h-10 text-white/50" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-amber-100">{podcast.title}</h2>
            <p className="text-amber-400/60 text-sm mt-1 line-clamp-3">{podcast.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-amber-400/50">
              <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30 capitalize">{podcast.category}</Badge>
              <span>{episodes.length} episodes</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round(totalDuration / 60)}m total</span>
              <span className="flex items-center gap-1"><Headphones className="w-3 h-3" />{totalPlays} plays</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload button */}
      {isCreator && (
        <Button onClick={() => { setEditingEpisode(null); setShowUpload(true); }} className="bg-amber-600 hover:bg-amber-700 mb-6">
          <Plus className="w-4 h-4 mr-2" /> New Episode
        </Button>
      )}

      {/* Episodes by season */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
      ) : episodes.length === 0 ? (
        <div className="text-center py-12">
          <Headphones className="w-12 h-12 text-amber-400/20 mx-auto mb-3" />
          <p className="text-amber-400/50">{isCreator ? 'No episodes yet. Upload your first one!' : 'No episodes published yet.'}</p>
        </div>
      ) : (
        Object.entries(seasons).sort(([a], [b]) => Number(a) - Number(b)).map(([season, eps]) => (
          <div key={season} className="mb-6">
            {Object.keys(seasons).length > 1 && (
              <h3 className="text-amber-200 font-semibold text-sm mb-3">Season {season}</h3>
            )}
            <div className="space-y-2">
              {eps.map((ep, i) => (
                <motion.div key={ep.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <EpisodeCard
                    episode={ep}
                    coverFallback={podcast.cover_art_url}
                    isPlaying={currentEpisodeId === ep.id}
                    onPlay={() => onPlayEpisode(ep, episodes)}
                    isCreator={isCreator}
                    onEdit={() => { setEditingEpisode(ep); setShowUpload(true); }}
                    onDelete={() => { if (confirm('Delete this episode?')) deleteMutation.mutate(ep.id); }}
                    onTogglePublish={() => togglePublishMutation.mutate(ep)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Upload / Edit dialog */}
      {showUpload && (
        <EpisodeUploadDialog
          open={showUpload}
          onOpenChange={setShowUpload}
          podcast={podcast}
          creatorId={creatorId}
          editEpisode={editingEpisode}
        />
      )}
    </div>
  );
}