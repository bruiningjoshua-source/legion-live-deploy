import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Eye, ChevronDown, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LiveChannelsSidebar({ streams = [], creators = {}, followedCreators = [] }) {
  const liveStreams = streams.filter(s => s.status === 'live').slice(0, 10);
  const followedLive = liveStreams.filter(s => followedCreators.includes(s.creator_id));
  const recommendedLive = liveStreams.filter(s => !followedCreators.includes(s.creator_id));

  const ChannelItem = ({ stream, isFollowed }) => {
    const creator = creators[stream.creator_id];
    return (
      <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
        <motion.div 
          whileHover={{ x: 4, backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
          className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden ring-2 ring-red-500">
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-stone-900" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{creator?.display_name || 'Streamer'}</p>
            <p className="text-purple-400/70 text-xs truncate">{stream.game_title || stream.title}</p>
          </div>
          
          <div className="flex items-center gap-1 text-red-400 text-xs">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {(stream.viewer_count || 0).toLocaleString()}
          </div>
        </motion.div>
      </Link>
    );
  };

  return (
    <div className="w-60 bg-stone-900/50 border-r border-purple-500/10 h-full overflow-y-auto hidden lg:block">
      <div className="p-4">
        {/* Following Section */}
        {followedLive.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Following</h3>
              <Badge className="bg-purple-500/20 text-purple-300 border-0 text-xs">{followedLive.length}</Badge>
            </div>
            <div className="space-y-1">
              {followedLive.map(stream => (
                <ChannelItem key={stream.id} stream={stream} isFollowed />
              ))}
            </div>
          </div>
        )}

        {/* Recommended Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Recommended</h3>
          </div>
          <div className="space-y-1">
            {recommendedLive.slice(0, 8).map(stream => (
              <ChannelItem key={stream.id} stream={stream} />
            ))}
          </div>
          
          {recommendedLive.length > 8 && (
            <button className="w-full mt-3 py-2 text-purple-400 hover:text-purple-300 text-sm flex items-center justify-center gap-1">
              Show More <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-purple-200 text-sm font-medium">Live Now</span>
          </div>
          <div className="text-2xl font-bold text-white">{streams.filter(s => s.status === 'live').length}</div>
          <div className="text-purple-400/70 text-xs">Gaming Streams</div>
        </div>
      </div>
    </div>
  );
}