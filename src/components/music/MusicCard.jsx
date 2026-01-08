import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Music } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MusicCard({ track, onPlay, isNowPlaying }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`group cursor-pointer relative aspect-square rounded-xl overflow-hidden ${
        isNowPlaying ? 'ring-2 ring-amber-400' : ''
      }`}
    >
      {/* Cover Image */}
      <div
        className="w-full h-full bg-gradient-to-br from-amber-600 to-amber-800"
        style={{
          backgroundImage: track.cover_url ? `url(${track.cover_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center">
        {/* Music Video Badge */}
        {track.is_music_video && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-purple-600 text-white border-0 text-xs">Video</Badge>
          </div>
        )}

        {/* Play Button */}
        <Button
          onClick={onPlay}
          className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Play className="w-6 h-6 fill-white" />
        </Button>

        {/* Now Playing Indicator */}
        {isNowPlaying && (
          <div className="absolute inset-0 flex items-end p-2 pointer-events-none">
            <div className="flex gap-0.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-amber-400 rounded-full"
                  style={{
                    animation: `pulse 0.6s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`,
                    height: `${4 + i * 3}px`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
        <h3 className="text-white font-semibold truncate text-sm">{track.title}</h3>
        <p className="text-amber-200/70 text-xs truncate">{track.artist}</p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </motion.div>
  );
}