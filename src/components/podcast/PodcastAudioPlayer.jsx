import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Loader2, X, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function PodcastAudioPlayer({ episode, coverFallback, onNext, onPrev, onClose }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(episode?.duration_seconds || 0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlers = {
      loadedmetadata: () => { setDuration(audio.duration); setIsLoading(false); },
      canplay: () => setIsLoading(false),
      timeupdate: () => setCurrentTime(audio.currentTime),
      ended: () => { if (isRepeat) { audio.currentTime = 0; audio.play(); } else { setIsPlaying(false); onNext?.(); } },
      waiting: () => setIsLoading(true),
      playing: () => setIsLoading(false),
    };

    Object.entries(handlers).forEach(([e, h]) => audio.addEventListener(e, h));
    return () => Object.entries(handlers).forEach(([e, h]) => audio.removeEventListener(e, h));
  }, [episode, isRepeat, onNext]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Auto-play on episode change
  useEffect(() => {
    if (audioRef.current && episode?.audio_url) {
      audioRef.current.load();
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [episode?.id]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); }
  }, [isPlaying]);

  const handleSeek = useCallback((value) => {
    if (audioRef.current) { audioRef.current.currentTime = value[0]; setCurrentTime(value[0]); }
  }, []);

  const skip = (secs) => {
    if (audioRef.current) { audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + secs, duration)); }
  };

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
  };

  if (!episode) return null;

  const coverUrl = episode.cover_art_url || coverFallback || '';

  return (
    <>
      <audio ref={audioRef} src={episode.audio_url} preload="metadata" />

      {/* Mini Player Bar */}
      <AnimatePresence>
        {!expanded && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-20 left-0 right-0 z-50 px-3"
          >
            <div
              className="bg-stone-900/95 backdrop-blur-xl border border-amber-600/20 rounded-2xl p-3 flex items-center gap-3 shadow-2xl cursor-pointer"
              onClick={() => setExpanded(true)}
            >
              <img src={coverUrl} alt="" className="w-11 h-11 rounded-lg object-cover bg-stone-800" onError={e => { e.target.style.display = 'none'; }} />
              <div className="flex-1 min-w-0">
                <p className="text-amber-100 text-sm font-medium truncate">{episode.title}</p>
                <div className="w-full bg-stone-700 rounded-full h-1 mt-1">
                  <div className="bg-amber-500 h-1 rounded-full transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); togglePlay(); }} className="text-amber-400 h-9 w-9">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onClose?.(); }} className="text-amber-400/50 h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Player */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[60] bg-gradient-to-b from-stone-900 via-stone-950 to-black flex flex-col"
          >
            {/* Close handle */}
            <div className="flex justify-center pt-3 pb-2">
              <button onClick={() => setExpanded(false)} className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-md mx-auto w-full gap-6">
              {/* Cover Art */}
              <motion.div
                animate={isPlaying ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl shadow-amber-600/10"
              >
                <img src={coverUrl} alt="" className="w-full h-full object-cover bg-gradient-to-br from-amber-700 to-stone-800" onError={e => { e.target.style.display = 'none'; }} />
              </motion.div>

              {/* Info */}
              <div className="text-center w-full">
                <h2 className="text-xl font-bold text-amber-100 truncate">{episode.title}</h2>
                <p className="text-amber-400/60 text-sm mt-1">S{episode.season_number || 1} · Episode {episode.episode_number || '?'}</p>
              </div>

              {/* Progress */}
              <div className="w-full space-y-1">
                <Slider value={[currentTime]} max={duration || 100} step={0.5} onValueChange={handleSeek} className="cursor-pointer" />
                <div className="flex justify-between text-xs text-amber-400/50">
                  <span>{formatTime(currentTime)}</span>
                  <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={cycleSpeed} className="text-amber-400/60 h-9 w-9 text-xs font-bold">
                  {speed}x
                </Button>
                <Button variant="ghost" size="icon" onClick={() => skip(-15)} className="text-amber-400 h-10 w-10">
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button onClick={togglePlay} disabled={isLoading} className="w-16 h-16 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg">
                  {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => skip(30)} className="text-amber-400 h-10 w-10">
                  <SkipForward className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsRepeat(!isRepeat)} className={`h-9 w-9 ${isRepeat ? 'text-amber-400' : 'text-amber-400/40'}`}>
                  <Repeat className="w-4 h-4" />
                </Button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3 w-full max-w-xs">
                <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="text-amber-400/60 h-8 w-8">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Slider value={[isMuted ? 0 : volume]} max={1} step={0.01} onValueChange={v => { setVolume(v[0]); setIsMuted(v[0] === 0); }} className="flex-1" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}