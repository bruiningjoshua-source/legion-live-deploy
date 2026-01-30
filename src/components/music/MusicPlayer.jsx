import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Heart,
  Share2,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  X,
  Repeat,
  Shuffle,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function MusicPlayer({ track, onClose, onNext, onPrev }) {
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track?.duration_seconds || 0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [error, setError] = useState(null);

  const mediaRef = track?.is_music_video && track?.video_url ? videoRef : audioRef;

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleLoadedMetadata = () => {
      setDuration(media.duration);
      setIsLoading(false);
      setError(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleError = (e) => {
      console.error('Media error:', e);
      setIsLoading(false);
      setError('Unable to load media. Please try again.');
    };

    const handleEnded = () => {
      if (isRepeat) {
        media.currentTime = 0;
        media.play();
      } else {
        setIsPlaying(false);
        onNext?.();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
    };

    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('canplay', handleCanPlay);
    media.addEventListener('error', handleError);
    media.addEventListener('ended', handleEnded);
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('waiting', handleWaiting);
    media.addEventListener('playing', handlePlaying);

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('canplay', handleCanPlay);
      media.removeEventListener('error', handleError);
      media.removeEventListener('ended', handleEnded);
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('waiting', handleWaiting);
      media.removeEventListener('playing', handlePlaying);
    };
  }, [track, isRepeat, onNext]);

  useEffect(() => {
    const media = mediaRef.current;
    if (media) {
      media.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    } else {
      media.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Play error:', err);
          setError('Could not play. Click to retry.');
        });
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value) => {
    const media = mediaRef.current;
    if (media && value[0] !== undefined) {
      media.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  const isVideo = track.is_music_video && track.video_url;
  const mediaSource = isVideo ? track.video_url : track.audio_url;

  return (
    <div className="space-y-4">
      {/* Video/Cover */}
      <div className="relative aspect-square bg-stone-900 rounded-xl overflow-hidden group">
        {isVideo ? (
          <video
            ref={videoRef}
            src={track.video_url}
            poster={track.cover_url}
            className="w-full h-full object-cover"
            playsInline
            preload="metadata"
            onClick={togglePlay}
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
            {/* Hidden audio element */}
            <audio
              ref={audioRef}
              src={track.audio_url}
              preload="metadata"
            />
          </>
        )}

        {/* Loading/Error overlay */}
        {(isLoading || error) && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            ) : (
              <div className="text-center p-4">
                <p className="text-red-400 text-sm mb-2">{error}</p>
                <Button size="sm" onClick={togglePlay} className="bg-amber-600 hover:bg-amber-700">
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Play/Pause overlay for cover art */}
        {!isVideo && !isLoading && !error && (
          <div 
            className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer group-hover:bg-black/50 transition-colors"
            onClick={togglePlay}
          >
            <motion.div
              animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-16 h-16 rounded-full ${isPlaying ? 'bg-amber-500' : 'bg-amber-500/80'} flex items-center justify-center shadow-lg`}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 text-white ml-1" />
              )}
            </motion.div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 z-10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Track Info */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-amber-100 mb-1">{track.title}</h2>
        <p className="text-amber-400/70">{track.artist || 'Unknown Artist'}</p>
        {track.genre && (
          <Badge className="mt-2 bg-amber-600/20 text-amber-200 border-amber-500/30">
            {track.genre.replace('_', ' ')}
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 px-1">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex items-center justify-between text-xs text-amber-400/70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsRepeat(!isRepeat)}
          className={`${isRepeat ? 'text-amber-400' : 'text-amber-400/50'} hover:bg-amber-800/30`}
        >
          <Repeat className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          className="text-amber-400 hover:bg-amber-800/30"
        >
          <SkipBack className="w-5 h-5" />
        </Button>

        <Button
          onClick={togglePlay}
          disabled={isLoading}
          className="w-14 h-14 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/30"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isPlaying ? (
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

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="text-amber-400/50 hover:bg-amber-800/30"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="text-amber-400 hover:bg-amber-800/30 h-8 w-8"
        >
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={(v) => {
            setVolume(v[0]);
            setIsMuted(v[0] === 0);
          }}
          className="flex-1"
        />
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
          onClick={() => {
            navigator.share?.({ title: track.title, url: window.location.href }).catch(() => {});
          }}
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