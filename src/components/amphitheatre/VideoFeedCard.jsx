import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import VideoContextMenu from './VideoContextMenu';
import WatchLaterButton from '@/components/video/WatchLaterButton';

const formatViews = (views) => {
  if (!views) return '0 views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
  return `${views} views`;
};

const formatDuration = (seconds) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    return `${hrs}:${(mins % 60).toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoFeedCard({ content, isShort = false, user = null }) {
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const videoUrl = content.type === 'music'
    ? createPageUrl(`WatchVideo?id=${content.id}&type=music`)
    : createPageUrl(`WatchVideo?id=${content.id}`);

  // Shorts — vertical card
  if (isShort || content.video_type === 'short') {
    return (
      <Link to={videoUrl} className="block group">
        <div className="relative aspect-[9/16] bg-stone-900 rounded-xl overflow-hidden group">
          {content.thumbnail_url ? (
            <img src={content.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-white/20" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
            <h3 className="text-white font-medium text-sm line-clamp-2">{content.title}</h3>
            <span className="text-white/60 text-xs">{formatViews(content.view_count)}</span>
          </div>
          {content.duration_seconds && (
            <span className="absolute top-2 right-2 bg-black/70 text-white text-[11px] px-1.5 py-0.5 rounded font-medium">
              {formatDuration(content.duration_seconds)}
            </span>
          )}
          {user && (
            <div className="absolute top-12 right-2">
              <WatchLaterButton videoId={content.id} videoType="short" user={user} size="sm" />
            </div>
          )}
        </div>
      </Link>
    );
  }

  // Standard — YouTube-style card
  return (
    <div>
      <Link to={videoUrl} className="block group">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-stone-900 rounded-xl overflow-hidden group">
        {content.thumbnail_url ? (
          <img src={content.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:rounded-none transition-all duration-200" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
            <Play className="w-10 h-10 text-white/15" />
          </div>
        )}
        {content.duration_seconds && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
            {formatDuration(content.duration_seconds)}
          </span>
        )}
        {content.type === 'music' && (
          <Badge className="absolute top-2 left-2 bg-purple-600 border-0 text-[11px] py-0">♪ Music</Badge>
        )}
        <div className="absolute top-2 right-2 flex gap-1 items-center">
          {content.creator?.is_live && (
            <Badge className="bg-red-600 border-0 text-[11px] py-0 animate-pulse">LIVE</Badge>
          )}
          {user && (
            <WatchLaterButton videoId={content.id} videoType="vlog" user={user} size="sm" />
          )}
        </div>
        {/* Hover play icon */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
        <VideoContextMenu video={content} onAddToPlaylist={() => setShowPlaylistDialog(true)} />
      </div>

      {/* Meta row */}
      <div className="flex gap-3 mt-3">
        <Link
          to={createPageUrl(`CreatorProfile?id=${content.creator_id}`)}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0"
        >
          <div className="w-9 h-9 rounded-full bg-stone-700 overflow-hidden">
            {content.creator?.avatar_url ? (
              <img src={content.creator.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">👤</div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <h3 className="text-stone-100 font-medium text-sm line-clamp-2 leading-snug group-hover:text-white">
            {content.title}
          </h3>
          <Link
            to={createPageUrl(`CreatorProfile?id=${content.creator_id}`)}
            onClick={(e) => e.stopPropagation()}
            className="text-stone-400 text-xs hover:text-stone-300 flex items-center gap-1 mt-1"
          >
            {content.creator?.display_name || 'Creator'}
            {content.creator?.is_verified && <CheckCircle className="w-3 h-3 text-stone-400" />}
          </Link>
          <div className="text-stone-500 text-xs mt-0.5 flex items-center gap-1">
            <span>{formatViews(content.view_count)}</span>
            <span>•</span>
            <span>{content.created_date ? formatDistanceToNow(new Date(content.created_date), { addSuffix: true }) : ''}</span>
          </div>
        </div>
      </div>
      </Link>
    </div>
  );
}