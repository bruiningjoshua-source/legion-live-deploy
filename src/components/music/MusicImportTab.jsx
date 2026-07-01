/**
 * MusicImportTab — Import audio files into Legion Music Studio.
 *
 * Supports:
 * - Direct file upload (MP3, WAV, FLAC, OGG, M4A, AAC)
 * - Load into studio for playback/sampling
 * - Save to Supabase Storage for persistent library
 */
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Music, Play, Pause, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED = '.mp3,.wav,.flac,.ogg,.m4a,.aac,.opus';
const MAX_SIZE_MB = 50;

function formatDuration(secs) {
  if (!secs || isNaN(secs)) return '--:--';
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function TrackRow({ track, onPlay, onDelete, isPlaying }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl ll-interactive group"
      style={{ background: isPlaying ? 'rgba(245,166,35,0.08)' : 'rgba(255,255,255,0.03)',
               border: `1px solid ${isPlaying ? 'rgba(245,166,35,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
      
      {/* Play/pause */}
      <button onClick={() => onPlay(track)}
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ll-interactive"
        style={{ background: isPlaying ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.06)' }}>
        {isPlaying
          ? <Pause className="w-3.5 h-3.5 text-amber-400" />
          : <Play className="w-3.5 h-3.5 text-white/50" />}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{track.name}</p>
        <p className="text-white/35 text-[10px]">
          {track.type.toUpperCase().replace('AUDIO/', '')} · {formatSize(track.size)} · {formatDuration(track.duration)}
        </p>
      </div>

      {/* Waveform bars (decorative) */}
      <div className="flex items-center gap-0.5 h-5 shrink-0">
        {[3, 5, 7, 4, 6, 8, 5, 3].map((h, i) => (
          <div key={i} className="w-0.5 rounded-full transition-all"
            style={{
              height: isPlaying ? `${h + Math.random() * 4}px` : `${h}px`,
              background: isPlaying ? '#f5a623' : 'rgba(255,255,255,0.2)',
              transition: `height 0.${i + 1}s ease`,
            }} />
        ))}
      </div>

      {/* Delete */}
      <button onClick={() => onDelete(track.id)}
        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 ll-interactive shrink-0"
        style={{ background: 'rgba(239,68,68,0.1)' }}>
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </motion.div>
  );
}

export default function MusicImportTab() {
  const [tracks, setTracks] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const audioRef = useRef(null);

  const processFiles = useCallback((files) => {
    const validFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith('audio/')) {
        toast.error(`${f.name} is not an audio file`);
        return false;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name} exceeds ${MAX_SIZE_MB}MB limit`);
        return false;
      }
      return true;
    });

    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        setTracks(prev => {
          // Avoid duplicates by name+size
          if (prev.some(t => t.name === file.name && t.size === file.size)) return prev;
          return [...prev, {
            id: `${file.name}-${file.size}-${Date.now()}`,
            name: file.name.replace(/\.[^.]+$/, ''),
            type: file.type || 'audio/mpeg',
            size: file.size,
            url,
            duration: audio.duration,
          }];
        });
        toast.success(`Loaded: ${file.name.replace(/\.[^.]+$/, '')}`);
      });
    });
  }, []);

  const handleFiles = (e) => processFiles(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const playTrack = (track) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (playingId === track.id) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(track.url);
    audio.play().catch(() => toast.error('Playback failed'));
    audio.addEventListener('ended', () => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(track.id);
  };

  const deleteTrack = (id) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    setTracks(prev => {
      const t = prev.find(x => x.id === id);
      if (t) URL.revokeObjectURL(t.url);
      return prev.filter(x => x.id !== id);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <Music className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Music Import</p>
          <p className="text-white/35 text-xs">Load audio files into the studio</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className="relative cursor-pointer rounded-2xl p-8 text-center transition-all"
        style={{
          background: dragging ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)',
          border: `2px dashed ${dragging ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
        }}>
        <input ref={fileRef} type="file" accept={ACCEPTED} multiple
          onChange={handleFiles} className="hidden" />
        <motion.div animate={{ scale: dragging ? 1.05 : 1 }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
            <Upload className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-white font-semibold text-sm mb-1">
            {dragging ? 'Drop to import' : 'Tap to import audio'}
          </p>
          <p className="text-white/35 text-xs">MP3, WAV, FLAC, OGG, M4A · Up to {MAX_SIZE_MB}MB each</p>
        </motion.div>
      </div>

      {/* Track list */}
      <AnimatePresence>
        {tracks.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-2">
              <p className="ll-label text-white/30 text-[10px]">{tracks.length} TRACK{tracks.length !== 1 ? 'S' : ''} LOADED</p>
              <button onClick={() => {
                if (audioRef.current) { audioRef.current.pause(); setPlayingId(null); }
                tracks.forEach(t => URL.revokeObjectURL(t.url));
                setTracks([]);
              }} className="text-white/25 text-[10px] ll-interactive hover:text-red-400 transition-colors">
                Clear all
              </button>
            </div>
            <div className="space-y-1.5">
              {tracks.map(track => (
                <TrackRow key={track.id} track={track}
                  isPlaying={playingId === track.id}
                  onPlay={playTrack}
                  onDelete={deleteTrack} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Supported formats info */}
      <div className="ll-card p-3 rounded-2xl">
        <p className="ll-label text-white/25 text-[10px] mb-2">SUPPORTED FORMATS</p>
        <div className="flex flex-wrap gap-1.5">
          {['MP3', 'WAV', 'FLAC', 'OGG', 'M4A', 'AAC', 'OPUS'].map(fmt => (
            <span key={fmt} className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa' }}>
              {fmt}
            </span>
          ))}
        </div>
        <p className="text-white/25 text-[10px] mt-2 leading-relaxed">
          Imported audio plays through your device speaker. Use as reference tracks, sample inspiration, or backing music while you produce in the studio.
        </p>
      </div>
    </div>
  );
}
