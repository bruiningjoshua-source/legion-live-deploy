import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Heart,
  Share2,
  Volume2,
  SkipBack,
  SkipForward,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function MusicPlayer({ track, onClose, onNext, onPrev }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play();
    }
  }, [track]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const duration = track.duration_seconds || 0;

  return (
    <div className="space-y-4">
      {/* Video/Cover */}
      <div className="relative aspect-square bg-stone-900 rounded-xl overflow-hidden group">
        {track.is_music_video && track.video_url ? (
          <video
            src={track.video_url}
            poster={track.cover_url}
            className="w-full h-full object-cover"
            controls
          />
        ) : (
          <>
            <div
              className="w-full h-full bg-gradient-to-br from-amber-600 to-amber-800"
              style={{
                backgroundImage: track.cover_url ? `url(${track.cover_url})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
              {isPlaying && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center"
                >
                  <div className="w-0 h-0 border-l-8 border-l-white border-t-4 border-t-transparent border-b-4 border-b-transparent ml-1" />
                </motion.div>
              )}
            </div>
          </>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 z-10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Track Info */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-amber-100 mb-1">{track.title}</h2>
        <p className="text-amber-400/70">{track.artist}</p>
        <Badge className="mt-2 bg-amber-600/20 text-amber-200 border-amber-500/30">
          {track.genre.replace('_', ' ')}
        </Badge>
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={track.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Progress Bar */}
      <div className="space-y-1">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleProgressChange}
          className="w-full h-1 bg-amber-600/30 rounded-full cursor-pointer accent-amber-500"
        />
        <div className="flex items-center justify-between text-xs text-amber-400/70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-amber-400" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => {
            setVolume(parseFloat(e.target.value));
            if (audioRef.current) audioRef.current.volume = parseFloat(e.target.value);
          }}
          className="flex-1 h-1 bg-amber-600/30 rounded-full cursor-pointer accent-amber-500"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          className="text-amber-400 hover:bg-amber-800/30"
        >
          <SkipBack className="w-5 h-5" />
        </Button>

        <Button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-12 h-12 rounded-full bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          className="text-amber-400 hover:bg-amber-800/30"
        >
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => setIsFavorite(!isFavorite)}
          className={isFavorite ? 'border-red-500 text-red-400' : 'border-amber-600/30 text-amber-300'}
        >
          <Heart className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
          {isFavorite ? 'Liked' : 'Like'}
        </Button>

        <Button
          variant="outline"
          className="border-amber-600/30 text-amber-300"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Description */}
      {track.description && (
        <div className="bg-stone-900/50 rounded-lg p-3">
          <p className="text-amber-400/80 text-sm">{track.description}</p>
        </div>
      )}
    </div>
  );
}