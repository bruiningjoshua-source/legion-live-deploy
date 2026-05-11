import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, RotateCcw, Volume2, Music, Zap, Radio } from 'lucide-react';

// ── SEEDED LOOP PACK LIBRARY ──────────────────────────────────────────────
const LOOP_PACKS = [
  {
    id: 'pop_vibes',
    name: 'Pop Vibes',
    genre: 'Pop',
    bpm: 120,
    color: '#ec4899',
    pads: [
      { id: 'pv1', name: 'Pop Kick', type: 'drums', color: '#ec4899', emoji: '🥁' },
      { id: 'pv2', name: 'Clap & Snap', type: 'drums', color: '#f472b6', emoji: '👏' },
      { id: 'pv3', name: 'Pop Bass', type: 'bass', color: '#a855f7', emoji: '🎸' },
      { id: 'pv4', name: 'Synth Lead', type: 'melody', color: '#8b5cf6', emoji: '🎹' },
      { id: 'pv5', name: 'Chord Stab', type: 'melody', color: '#6366f1', emoji: '✨' },
      { id: 'pv6', name: 'Hi-Hat Roll', type: 'drums', color: '#ec4899', emoji: '🎵' },
      { id: 'pv7', name: 'Vocal Chop', type: 'fx', color: '#f59e0b', emoji: '🎤' },
      { id: 'pv8', name: 'Riser FX', type: 'fx', color: '#10b981', emoji: '🚀' },
    ]
  },
  {
    id: 'rock_fury',
    name: 'Rock Fury',
    genre: 'Rock',
    bpm: 140,
    color: '#ef4444',
    pads: [
      { id: 'rf1', name: 'Rock Kick', type: 'drums', color: '#ef4444', emoji: '🥁' },
      { id: 'rf2', name: 'Snare Crack', type: 'drums', color: '#f87171', emoji: '💥' },
      { id: 'rf3', name: 'Distorted Bass', type: 'bass', color: '#dc2626', emoji: '🎸' },
      { id: 'rf4', name: 'Power Chord', type: 'melody', color: '#b91c1c', emoji: '⚡' },
      { id: 'rf5', name: 'Guitar Riff', type: 'melody', color: '#991b1b', emoji: '🎸' },
      { id: 'rf6', name: 'Crash Cymbal', type: 'drums', color: '#ef4444', emoji: '🔥' },
      { id: 'rf7', name: 'Tom Fill', type: 'drums', color: '#f97316', emoji: '🥁' },
      { id: 'rf8', name: 'Feedback FX', type: 'fx', color: '#84cc16', emoji: '📻' },
    ]
  },
  {
    id: 'metal_chaos',
    name: 'Metal Chaos',
    genre: 'Metal',
    bpm: 180,
    color: '#374151',
    pads: [
      { id: 'mc1', name: 'Double Kick', type: 'drums', color: '#374151', emoji: '🥁' },
      { id: 'mc2', name: 'Blast Beat', type: 'drums', color: '#4b5563', emoji: '💀' },
      { id: 'mc3', name: 'Drop Tuned Bass', type: 'bass', color: '#6b7280', emoji: '🎸' },
      { id: 'mc4', name: 'Breakdown Riff', type: 'melody', color: '#1f2937', emoji: '⚡' },
      { id: 'mc5', name: 'Tremolo Pick', type: 'melody', color: '#111827', emoji: '🎸' },
      { id: 'mc6', name: 'China Cymbal', type: 'drums', color: '#374151', emoji: '🔥' },
      { id: 'mc7', name: 'Choir FX', type: 'fx', color: '#7c3aed', emoji: '😈' },
      { id: 'mc8', name: 'Scream FX', type: 'fx', color: '#dc2626', emoji: '🤘' },
    ]
  },
  {
    id: 'electronic_grid',
    name: 'Electronic Grid',
    genre: 'Electronic',
    bpm: 128,
    color: '#06b6d4',
    pads: [
      { id: 'eg1', name: '808 Kick', type: 'drums', color: '#06b6d4', emoji: '🥁' },
      { id: 'eg2', name: 'Clap Stack', type: 'drums', color: '#0891b2', emoji: '👏' },
      { id: 'eg3', name: 'Sub Bass', type: 'bass', color: '#0e7490', emoji: '🔊' },
      { id: 'eg4', name: 'Arp Lead', type: 'melody', color: '#155e75', emoji: '🎹' },
      { id: 'eg5', name: 'Pad Wash', type: 'melody', color: '#164e63', emoji: '✨' },
      { id: 'eg6', name: 'Open Hat', type: 'drums', color: '#06b6d4', emoji: '🎵' },
      { id: 'eg7', name: 'Stutter FX', type: 'fx', color: '#f59e0b', emoji: '⚡' },
      { id: 'eg8', name: 'Sweep FX', type: 'fx', color: '#10b981', emoji: '🌊' },
    ]
  },
  {
    id: 'house_groove',
    name: 'House Groove',
    genre: 'House',
    bpm: 126,
    color: '#f59e0b',
    pads: [
      { id: 'hg1', name: 'Four on Floor', type: 'drums', color: '#f59e0b', emoji: '🥁' },
      { id: 'hg2', name: 'Rimshot', type: 'drums', color: '#fbbf24', emoji: '👏' },
      { id: 'hg3', name: 'Funky Bass', type: 'bass', color: '#d97706', emoji: '🎸' },
      { id: 'hg4', name: 'Piano Loop', type: 'melody', color: '#b45309', emoji: '🎹' },
      { id: 'hg5', name: 'Organ Stab', type: 'melody', color: '#92400e', emoji: '🎵' },
      { id: 'hg6', name: 'Shaker', type: 'drums', color: '#f59e0b', emoji: '🎶' },
      { id: 'hg7', name: 'Vocal Loop', type: 'fx', color: '#ec4899', emoji: '🎤' },
      { id: 'hg8', name: 'Filter Sweep', type: 'fx', color: '#10b981', emoji: '🌀' },
    ]
  },
  {
    id: 'edm_drop',
    name: 'EDM Drop',
    genre: 'EDM',
    bpm: 130,
    color: '#8b5cf6',
    pads: [
      { id: 'ed1', name: 'EDM Kick', type: 'drums', color: '#8b5cf6', emoji: '🥁' },
      { id: 'ed2', name: 'Snare Roll', type: 'drums', color: '#7c3aed', emoji: '💥' },
      { id: 'ed3', name: 'Electro Bass', type: 'bass', color: '#6d28d9', emoji: '🔊' },
      { id: 'ed4', name: 'Supersaww Lead', type: 'melody', color: '#5b21b6', emoji: '⚡' },
      { id: 'ed5', name: 'Pluck Arp', type: 'melody', color: '#4c1d95', emoji: '🎹' },
      { id: 'ed6', name: 'Laser Hi-Hat', type: 'drums', color: '#8b5cf6', emoji: '🎵' },
      { id: 'ed7', name: 'Build Riser', type: 'fx', color: '#f59e0b', emoji: '🚀' },
      { id: 'ed8', name: 'Drop FX', type: 'fx', color: '#ef4444', emoji: '💣' },
    ]
  },
  {
    id: 'synthwave_nights',
    name: 'Synthwave Nights',
    genre: 'Synthwave',
    bpm: 110,
    color: '#db2777',
    pads: [
      { id: 'sw1', name: 'Retro Kick', type: 'drums', color: '#db2777', emoji: '🥁' },
      { id: 'sw2', name: 'Gated Snare', type: 'drums', color: '#be185d', emoji: '🎵' },
      { id: 'sw3', name: 'Synth Bass', type: 'bass', color: '#9d174d', emoji: '🎸' },
      { id: 'sw4', name: 'Analog Lead', type: 'melody', color: '#831843', emoji: '🌙' },
      { id: 'sw5', name: 'Pad Chord', type: 'melody', color: '#7c3aed', emoji: '✨' },
      { id: 'sw6', name: 'Cowbell', type: 'drums', color: '#db2777', emoji: '🔔' },
      { id: 'sw7', name: 'Arpeggiation', type: 'melody', color: '#0ea5e9', emoji: '🎹' },
      { id: 'sw8', name: 'Vaporwave FX', type: 'fx', color: '#10b981', emoji: '🌊' },
    ]
  },
  {
    id: 'chillwave_dreams',
    name: 'Chillwave Dreams',
    genre: 'Chillwave',
    bpm: 90,
    color: '#0ea5e9',
    pads: [
      { id: 'cw1', name: 'Soft Kick', type: 'drums', color: '#0ea5e9', emoji: '🥁' },
      { id: 'cw2', name: 'Snappy Snare', type: 'drums', color: '#0284c7', emoji: '🎵' },
      { id: 'cw3', name: 'Warm Bass', type: 'bass', color: '#0369a1', emoji: '🎸' },
      { id: 'cw4', name: 'Dream Pad', type: 'melody', color: '#075985', emoji: '💤' },
      { id: 'cw5', name: 'Tape Guitar', type: 'melody', color: '#0c4a6e', emoji: '🎸' },
      { id: 'cw6', name: 'Vinyl Crackle', type: 'fx', color: '#f59e0b', emoji: '📀' },
      { id: 'cw7', name: 'Chorus Bells', type: 'melody', color: '#6366f1', emoji: '🔔' },
      { id: 'cw8', name: 'Ocean FX', type: 'fx', color: '#10b981', emoji: '🌊' },
    ]
  },
  {
    id: 'hiphop_boom',
    name: 'Hip Hop Boom',
    genre: 'Hip Hop',
    bpm: 95,
    color: '#f97316',
    pads: [
      { id: 'hh1', name: 'Boom Bap Kick', type: 'drums', color: '#f97316', emoji: '🥁' },
      { id: 'hh2', name: 'Snap Snare', type: 'drums', color: '#ea580c', emoji: '👏' },
      { id: 'hh3', name: 'Hip Hop Bass', type: 'bass', color: '#c2410c', emoji: '🎸' },
      { id: 'hh4', name: 'Soul Sample', type: 'melody', color: '#9a3412', emoji: '🎵' },
      { id: 'hh5', name: 'Piano Chop', type: 'melody', color: '#7c2d12', emoji: '🎹' },
      { id: 'hh6', name: 'Hi Hat Pattern', type: 'drums', color: '#f97316', emoji: '🎵' },
      { id: 'hh7', name: 'Vinyl Scratch', type: 'fx', color: '#a855f7', emoji: '🎤' },
      { id: 'hh8', name: 'Record Stop', type: 'fx', color: '#06b6d4', emoji: '⏹️' },
    ]
  },
  {
    id: 'trap_wave',
    name: 'Trap Wave',
    genre: 'Trap',
    bpm: 140,
    color: '#10b981',
    pads: [
      { id: 'tw1', name: '808 Boom', type: 'drums', color: '#10b981', emoji: '🥁' },
      { id: 'tw2', name: 'Trap Snare', type: 'drums', color: '#059669', emoji: '💥' },
      { id: 'tw3', name: 'Sliding 808', type: 'bass', color: '#047857', emoji: '🔊' },
      { id: 'tw4', name: 'Flute Loop', type: 'melody', color: '#065f46', emoji: '🎵' },
      { id: 'tw5', name: 'Bells', type: 'melody', color: '#064e3b', emoji: '🔔' },
      { id: 'tw6', name: 'Triple Hi-Hat', type: 'drums', color: '#10b981', emoji: '🎵' },
      { id: 'tw7', name: 'Ad Lib FX', type: 'fx', color: '#f59e0b', emoji: '🎤' },
      { id: 'tw8', name: 'Dark Pad', type: 'fx', color: '#7c3aed', emoji: '🌙' },
    ]
  },
  {
    id: 'rap_bars',
    name: 'Rap Bars',
    genre: 'Rap',
    bpm: 100,
    color: '#6366f1',
    pads: [
      { id: 'rb1', name: 'Kick Pattern', type: 'drums', color: '#6366f1', emoji: '🥁' },
      { id: 'rb2', name: 'Clap', type: 'drums', color: '#4f46e5', emoji: '👏' },
      { id: 'rb3', name: 'Rap Bass', type: 'bass', color: '#4338ca', emoji: '🎸' },
      { id: 'rb4', name: 'Strings Loop', type: 'melody', color: '#3730a3', emoji: '🎻' },
      { id: 'rb5', name: 'Ambient Pad', type: 'melody', color: '#312e81', emoji: '✨' },
      { id: 'rb6', name: 'Shaker Pattern', type: 'drums', color: '#6366f1', emoji: '🎵' },
      { id: 'rb7', name: 'Voice Chop', type: 'fx', color: '#f59e0b', emoji: '🎤' },
      { id: 'rb8', name: 'Beat Switch', type: 'fx', color: '#ef4444', emoji: '🔄' },
    ]
  },
  {
    id: 'lofi_chill',
    name: 'Lo-Fi Chill',
    genre: 'Lo-Fi',
    bpm: 75,
    color: '#78716c',
    pads: [
      { id: 'lf1', name: 'Dusty Kick', type: 'drums', color: '#78716c', emoji: '🥁' },
      { id: 'lf2', name: 'Brushed Snare', type: 'drums', color: '#57534e', emoji: '🎵' },
      { id: 'lf3', name: 'Jazz Bass', type: 'bass', color: '#44403c', emoji: '🎸' },
      { id: 'lf4', name: 'Lofi Piano', type: 'melody', color: '#292524', emoji: '🎹' },
      { id: 'lf5', name: 'Jazz Guitar', type: 'melody', color: '#1c1917', emoji: '🎸' },
      { id: 'lf6', name: 'Rain FX', type: 'fx', color: '#0ea5e9', emoji: '🌧️' },
      { id: 'lf7', name: 'Tape Hiss', type: 'fx', color: '#78716c', emoji: '📼' },
      { id: 'lf8', name: 'Vinyl Noise', type: 'fx', color: '#f59e0b', emoji: '📀' },
    ]
  },
];

// ── DRUM KITS ─────────────────────────────────────────────────────────────
const DRUM_KITS = [
  { id: 'acoustic', name: 'Acoustic Kit', emoji: '🥁', bpm: 120 },
  { id: 'electronic', name: 'Electronic Kit', emoji: '🤖', bpm: 128 },
  { id: 'trap', name: 'Trap Kit', emoji: '💣', bpm: 140 },
  { id: 'jazz', name: 'Jazz Brushes', emoji: '🎷', bpm: 90 },
  { id: 'metal', name: 'Metal Double Bass', emoji: '🤘', bpm: 180 },
  { id: 'lofi', name: 'Lo-Fi Dusty', emoji: '📀', bpm: 75 },
];

// ── PAD COMPONENT ─────────────────────────────────────────────────────────
function Pad({ pad, isActive, onPress }) {
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    onPress(pad);
  };

  return (
    <motion.button
      onClick={handlePress}
      animate={{
        scale: pressed ? 0.92 : 1,
        brightness: isActive ? 1.2 : 1,
      }}
      transition={{ duration: 0.08 }}
      className="relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all select-none"
      style={{
        backgroundColor: isActive ? pad.color + '40' : pad.color + '15',
        borderColor: isActive ? pad.color : pad.color + '40',
        boxShadow: isActive ? `0 0 20px ${pad.color}60` : 'none',
      }}
    >
      <span className="text-2xl">{pad.emoji}</span>
      <span className="text-[9px] font-semibold text-white/70 text-center leading-tight px-1">{pad.name}</span>
      <span className="text-[8px] text-white/30 uppercase">{pad.type}</span>
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ backgroundColor: pad.color + '20' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function RemixStudio({ onRecordingComplete }) {
  const [selectedPack, setSelectedPack] = useState(LOOP_PACKS[0]);
  const [activePads, setActivePads] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(LOOP_PACKS[0].bpm);
  const [volume, setVolume] = useState(80);
  const [activeTab, setActiveTab] = useState('packs');
  const [recordedPads, setRecordedPads] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const audioCtxRef = useRef(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(specFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Spectrum analyzer for visual feedback
  const analyserRef = useRef(null);
  const [spectrumData, setSpectrumData] = useState(new Array(16).fill(0));
  const specFrameRef = useRef(null);

  const getAnalyser = useCallback(() => {
    if (analyserRef.current) return analyserRef.current;
    const ctx = getAudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.7;
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;
    return analyser;
  }, []);

  // Spectrum animation loop
  useEffect(() => {
    const updateSpectrum = () => {
      specFrameRef.current = requestAnimationFrame(updateSpectrum);
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const bars = [];
      const step = Math.floor(data.length / 16);
      for (let i = 0; i < 16; i++) {
        bars.push(data[i * step] / 255);
      }
      setSpectrumData(bars);
    };
    updateSpectrum();
    return () => cancelAnimationFrame(specFrameRef.current);
  }, []);

  const playTone = useCallback((pad) => {
    try {
      const ctx = getAudioContext();
      const analyser = getAnalyser();
      const now = ctx.currentTime;

      // Richer synthesis per type
      const typeConfig = {
        drums: {
          osc: [
            { type: 'sine', freq: 150, detune: 0, gain: 0.5 },
            { type: 'sawtooth', freq: 80, detune: -5, gain: 0.3 },
          ],
          duration: 0.12, filter: 300, filterQ: 4, envelope: 'percussive',
        },
        bass: {
          osc: [
            { type: 'sine', freq: 60, detune: 0, gain: 0.55 },
            { type: 'triangle', freq: 120, detune: 3, gain: 0.15 },
          ],
          duration: 0.35, filter: 600, filterQ: 2, envelope: 'pluck',
        },
        melody: {
          osc: [
            { type: 'sine', freq: 440, detune: 0, gain: 0.3 },
            { type: 'triangle', freq: 441, detune: 7, gain: 0.2 },
          ],
          duration: 0.5, filter: 3000, filterQ: 1, envelope: 'sustain',
        },
        fx: {
          osc: [
            { type: 'square', freq: 200, detune: 0, gain: 0.2 },
            { type: 'sawtooth', freq: 403, detune: 15, gain: 0.15 },
          ],
          duration: 0.25, filter: 2000, filterQ: 6, envelope: 'percussive',
        },
      };

      const config = typeConfig[pad.type] || typeConfig.melody;
      const masterGain = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(config.filter, now);
      filterNode.Q.setValueAtTime(config.filterQ, now);
      filterNode.connect(masterGain);
      masterGain.connect(analyser);

      const vol = (volume / 100) * 0.35;
      if (config.envelope === 'percussive') {
        masterGain.gain.setValueAtTime(vol, now);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
      } else if (config.envelope === 'pluck') {
        masterGain.gain.setValueAtTime(vol, now);
        masterGain.gain.setTargetAtTime(vol * 0.3, now + 0.05, 0.08);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
      } else {
        masterGain.gain.setValueAtTime(0.001, now);
        masterGain.gain.linearRampToValueAtTime(vol, now + 0.02);
        masterGain.gain.setTargetAtTime(vol * 0.6, now + 0.1, 0.15);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
      }

      config.osc.forEach(o => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = o.type;
        osc.frequency.setValueAtTime(o.freq, now);
        osc.detune.setValueAtTime(o.detune, now);
        oscGain.gain.setValueAtTime(o.gain, now);
        osc.connect(oscGain);
        oscGain.connect(filterNode);
        osc.start(now);
        osc.stop(now + config.duration + 0.05);
      });
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, [volume, getAnalyser]);

  const handlePadPress = (pad) => {
    playTone(pad);

    setActivePads(prev => {
      const next = new Set(prev);
      if (next.has(pad.id)) {
        next.delete(pad.id);
      } else {
        next.add(pad.id);
      }
      return next;
    });

    if (isRecording) {
      setRecordedPads(prev => [...prev, { padId: pad.id, time: Date.now() }]);
    }
  };

  const handlePackSelect = (pack) => {
    setSelectedPack(pack);
    setBpm(pack.bpm);
    setActivePads(new Set());
    setIsPlaying(false);
  };

  const handlePlayStop = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setActivePads(new Set());
    setIsPlaying(false);
    setRecordedPads([]);
    setIsRecording(false);
  };

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      if (onRecordingComplete && recordedPads.length > 0) {
        onRecordingComplete({ pads: recordedPads, pack: selectedPack, bpm });
      }
    } else {
      setRecordedPads([]);
      setIsRecording(true);
    }
  };

  return (
    <div className="bg-black/90 rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Music className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Remix Studio</p>
            <p className="text-white/40 text-[10px]">{selectedPack.name} · {bpm} BPM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* BPM control */}
          <div className="flex items-center gap-1 bg-white/5 rounded-full px-2 py-1">
            <button onClick={() => setBpm(b => Math.max(60, b - 5))}
              className="text-white/50 text-xs font-bold w-4">−</button>
            <span className="text-white text-xs font-bold w-8 text-center">{bpm}</span>
            <button onClick={() => setBpm(b => Math.min(220, b + 5))}
              className="text-white/50 text-xs font-bold w-4">+</button>
          </div>
          {/* Volume */}
          <div className="flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-white/40" />
            <input
              type="range" min="0" max="100" value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="w-14 accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {['packs', 'drums', 'kit'].map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-white/40'
            }`}>
            {tab === 'packs' ? '🎵 Loop Packs' : tab === 'drums' ? '🥁 Drum Kits' : '🎹 Instruments'}
          </button>
        ))}
      </div>

      {/* Pack selector */}
      {activeTab === 'packs' && (
        <div className="px-3 py-2 overflow-x-auto">
          <div className="flex gap-2 pb-1">
            {LOOP_PACKS.map(pack => (
              <button key={pack.id}
                onClick={() => handlePackSelect(pack)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedPack.id === pack.id
                    ? 'text-black border-transparent'
                    : 'text-white/50 border-white/10 bg-white/5'
                }`}
                style={selectedPack.id === pack.id ? { backgroundColor: pack.color, borderColor: pack.color } : {}}>
                {pack.genre}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'drums' && (
        <div className="px-3 py-2 overflow-x-auto">
          <div className="flex gap-2 pb-1">
            {DRUM_KITS.map(kit => (
              <button key={kit.id}
                onClick={() => setBpm(kit.bpm)}
                className="shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 transition-all">
                <span className="text-xl">{kit.emoji}</span>
                <span className="text-[9px] leading-none text-center">{kit.name}</span>
                <span className="text-[9px] text-white/30">{kit.bpm} BPM</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'kit' && (
        <div className="px-3 py-2">
          <p className="text-white/30 text-xs text-center py-2">Instrument packs coming soon — upload your own samples above</p>
        </div>
      )}

      {/* SPECTRUM VISUALIZER */}
      <div className="px-3 pt-2 flex items-end gap-[2px] h-8 overflow-hidden">
        {spectrumData.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all duration-75"
            style={{
              height: `${Math.max(2, v * 100)}%`,
              backgroundColor: selectedPack.color + (v > 0.5 ? 'cc' : '55'),
              opacity: 0.3 + v * 0.7,
            }}
          />
        ))}
      </div>

      {/* PAD GRID */}
      <div className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {selectedPack.pads.map(pad => (
            <Pad
              key={pad.id}
              pad={pad}
              isActive={activePads.has(pad.id)}
              onPress={handlePadPress}
            />
          ))}
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-black/40">
        <button onClick={handleReset}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <RotateCcw className="w-4 h-4 text-white/50" />
        </button>

        <div className="flex items-center gap-3">
          {/* Record */}
          <button onClick={handleRecord}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
              isRecording
                ? 'bg-red-500 border-red-400 text-white animate-pulse'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
            <div className="w-2 h-2 rounded-full bg-current" />
            {isRecording ? 'Recording...' : 'Record'}
          </button>

          {/* Play/Stop */}
          <button onClick={handlePlayStop}
            className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all"
            style={{
              backgroundColor: isPlaying ? selectedPack.color + '30' : selectedPack.color,
              borderColor: selectedPack.color,
              boxShadow: isPlaying ? `0 0 20px ${selectedPack.color}60` : 'none',
            }}>
            {isPlaying
              ? <Square className="w-5 h-5 text-white" />
              : <Play className="w-5 h-5 text-white ml-0.5" />
            }
          </button>
        </div>

        <button className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-400" />
        </button>
      </div>

      {/* Active pads status */}
      {activePads.size > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {selectedPack.pads.filter(p => activePads.has(p.id)).map(p => (
            <span key={p.id} className="text-[9px] px-2 py-0.5 rounded-full text-white/60"
              style={{ backgroundColor: p.color + '20', border: `1px solid ${p.color}40` }}>
              {p.emoji} {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}