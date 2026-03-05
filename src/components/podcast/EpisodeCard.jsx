import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Clock, Headphones, MoreVertical, Pencil, Trash2, Eye, EyeOff, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function formatDuration(seconds) {
  if (!seconds) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function EpisodeCard({ episode, coverFallback, isPlaying, onPlay, isCreator = false, onEdit, onDelete, onTogglePublish }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-all ${isPlaying ? 'bg-amber-600/10 border border-amber-500/30' : 'bg-stone-800/30 hover:bg-stone-800/50 border border-transparent'}`}>
      {/* Cover / Play */}
      <button onClick={onPlay} className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 group">
        <img
          src={episode.cover_art_url || coverFallback || ''}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
        </div>
        {isPlaying && (
          <div className="absolute inset-0 bg-amber-600/30 flex items-center justify-center">
            <div className="flex gap-0.5 items-end h-4">
              <span className="w-1 bg-amber-400 rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
              <span className="w-1 bg-amber-400 rounded-full animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
              <span className="w-1 bg-amber-400 rounded-full animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className={`font-semibold text-sm leading-tight ${isPlaying ? 'text-amber-300' : 'text-amber-100'}`}>
              S{episode.season_number || 1} E{episode.episode_number || '?'} · {episode.title}
            </h4>
            {episode.description && (
              <p className="text-amber-400/60 text-xs mt-1 line-clamp-2">{episode.description}</p>
            )}
          </div>
          {isCreator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400/50 shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-stone-900 border-amber-600/30">
                <DropdownMenuItem onClick={onEdit} className="text-amber-200">
                  <Pencil className="w-3 h-3 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onTogglePublish} className="text-amber-200">
                  {episode.is_published ? <EyeOff className="w-3 h-3 mr-2" /> : <Eye className="w-3 h-3 mr-2" />}
                  {episode.is_published ? 'Unpublish' : 'Publish'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-400">
                  <Trash2 className="w-3 h-3 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-amber-400/50">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(episode.duration_seconds)}</span>
          <span className="flex items-center gap-1"><Headphones className="w-3 h-3" />{episode.play_count || 0}</span>
          {episode.guests?.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{episode.guests.length} guest{episode.guests.length > 1 ? 's' : ''}</span>}
          {!episode.is_published && <Badge className="bg-yellow-600/20 text-yellow-300 text-[10px] px-1.5 py-0">Draft</Badge>}
          {episode.is_explicit && <Badge className="bg-red-600/20 text-red-300 text-[10px] px-1.5 py-0">E</Badge>}
        </div>
      </div>
    </div>
  );
}