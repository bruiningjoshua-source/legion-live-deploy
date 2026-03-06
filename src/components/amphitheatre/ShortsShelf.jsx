import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Play } from 'lucide-react';
import VideoFeedCard from './VideoFeedCard';

export default function ShortsShelf({ shorts }) {
  if (!shorts?.length) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
        <h2 className="text-white font-semibold text-lg">Shorts</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {shorts.slice(0, 12).map(s => (
          <div key={s._key || s.id} className="w-[160px] flex-shrink-0">
            <VideoFeedCard content={s} isShort />
          </div>
        ))}
      </div>
    </div>
  );
}