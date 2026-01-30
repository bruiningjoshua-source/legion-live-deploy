import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronDown, ChevronUp, Users, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveChannelsSidebar({ streams = [], creators = {}, followedCreators = [] }) {
  const [showMoreRecommended, setShowMoreRecommended] = useState(false);
  const liveStreams = streams.filter(s => s.status === 'live').slice(0, 20);
  const followedLive = liveStreams.filter(s => followedCreators.includes(s.creator_id));
  const recommendedLive = liveStreams.filter(s => !followedCreators.includes(s.creator_id));

  const ChannelItem = ({ stream, index }) => {
    const creator = creators[stream.creator_id];
    return (
      <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03 }}
          whileHover={{ x: 4, backgroundColor: 'rgba(139, 92, 246, 0.15)' }}
          className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden ring-2 ring-red-500/50">
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
              )}
            </div>
            <motion.div 
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0a0a0c]"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{creator?.display_name || 'Streamer'}</p>
            <p className="text-white/40 text-xs truncate">{stream.game_title || stream.title}</p>
          </div>
          
          <div className="flex items-center gap-1.5 text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            {(stream.viewer_count || 0).toLocaleString()}
          </div>
        </motion.div>
      </Link>
    );
  };

  return (
    <div className="w-64 bg-white/[0.02] backdrop-blur-xl border-r border-white/[0.06] h-screen overflow-y-auto hidden lg:block sticky top-0 scrollbar-hide">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6 px-2">
          <Gamepad2 className="w-5 h-5 text-purple-400" />
          <span className="text-white font-semibold">Live Channels</span>
        </div>

        {/* Following Section */}
        {followedLive.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider">Following</h3>
              <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-xs font-medium">{followedLive.length}</span>
            </div>
            <div className="space-y-1">
              {followedLive.map((stream, i) => (
                <ChannelItem key={stream.id} stream={stream} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Recommended Section */}
        <div>
          <div className="flex items-center justify-between mb-3 px-2">
            <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider">Recommended</h3>
          </div>
          <div className="space-y-1">
            <AnimatePresence>
              {recommendedLive.slice(0, showMoreRecommended ? 15 : 6).map((stream, i) => (
                <ChannelItem key={stream.id} stream={stream} index={i} />
              ))}
            </AnimatePresence>
          </div>
          
          {recommendedLive.length > 6 && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowMoreRecommended(!showMoreRecommended)}
              className="w-full mt-3 py-2.5 text-purple-300 hover:text-purple-200 text-sm flex items-center justify-center gap-1.5 bg-purple-500/10 rounded-xl border border-purple-500/20 hover:bg-purple-500/20 transition-all"
            >
              {showMoreRecommended ? 'Show Less' : 'Show More'}
              {showMoreRecommended ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </motion.button>
          )}
        </div>

        {/* Stats Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-white/80 text-sm font-medium">Live Now</span>
          </div>
          <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">
            {streams.filter(s => s.status === 'live').length}
          </div>
          <div className="text-white/40 text-xs mt-1">Gaming Streams</div>
        </motion.div>
      </div>
    </div>
  );
}