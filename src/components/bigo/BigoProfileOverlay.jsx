import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Share2 } from 'lucide-react';
import BigoCard from './BigoCard';
import BigoButton from './BigoButton';

export default function BigoProfileOverlay({ user, creator, isOpen, onClose }) {
  if (!isOpen || !creator) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 400 }}
          animate={{ y: 0 }}
          exit={{ y: 400 }}
          onClick={e => e.stopPropagation()}
          className="w-full md:w-96 max-h-[80vh] overflow-y-auto bigo-overlay rounded-t-[2rem] md:rounded-[2rem] p-6 pb-8"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Avatar */}
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 p-1">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold">
                  {creator.display_name?.[0]}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">{creator.display_name}</h2>
            <p className="text-white/50 text-sm">@{creator.user_email?.split('@')[0]}</p>
            {creator.bio && <p className="text-white/60 text-xs mt-2">{creator.bio}</p>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <BigoCard className="text-center">
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {creator.follower_count || 0}
              </p>
              <p className="text-white/50 text-xs mt-1">Followers</p>
            </BigoCard>
            <BigoCard className="text-center">
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                {creator.level || 1}
              </p>
              <p className="text-white/50 text-xs mt-1">Level</p>
            </BigoCard>
            <BigoCard className="text-center">
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
                {creator.total_earnings_denarii || 0}
              </p>
              <p className="text-white/50 text-xs mt-1">Earnings</p>
            </BigoCard>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-4">
            <BigoButton variant="primary" className="flex-1">
              <Heart className="w-4 h-4" />
              Follow
            </BigoButton>
            <BigoButton variant="secondary" className="flex-1">
              <MessageCircle className="w-4 h-4" />
            </BigoButton>
            <BigoButton variant="secondary" className="w-12">
              <Share2 className="w-4 h-4" />
            </BigoButton>
          </div>

          {/* Bio Extended */}
          {creator.bio_extended && (
            <BigoCard>
              <p className="text-white/70 text-sm leading-relaxed">{creator.bio_extended}</p>
            </BigoCard>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}