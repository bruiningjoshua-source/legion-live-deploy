import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Headphones, Music } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PodcastCard({ podcast, onClick, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="bg-stone-900/50 rounded-xl overflow-hidden border border-amber-600/20 hover:border-amber-500/50 transition-all cursor-pointer group"
    >
      {podcast.cover_art_url ? (
        <div className="aspect-square overflow-hidden">
          <img
            src={podcast.cover_art_url}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            alt={podcast.title}
          />
        </div>
      ) : (
        <div className="aspect-square bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
          <Music className="w-16 h-16 text-white/30" />
        </div>
      )}
      <div className="p-3">
        <h3 className="text-amber-100 font-bold text-sm mb-1 line-clamp-1">{podcast.title}</h3>
        <p className="text-amber-400/60 text-xs mb-2 line-clamp-2">{podcast.description || 'No description'}</p>
        <div className="flex items-center justify-between">
          <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30 capitalize text-[10px]">
            {podcast.category}
          </Badge>
          <div className="flex items-center gap-2 text-xs text-amber-400/50">
            <span>{podcast.total_episodes || 0} ep</span>
            <span className="flex items-center gap-0.5"><Headphones className="w-3 h-3" />{podcast.subscriber_count || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}