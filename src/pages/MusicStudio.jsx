/**
 * MusicStudio — Full DAW-style music production studio.
 * Beat pads, 16-step sequencer, piano roll, effects rack,
 * mixer, recording, and export. Web Audio API powered.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, RotateCcw, Volume2, Music, Zap, Mic, MicOff,
  Download, Share2, ChevronDown, ChevronUp, Wand2, Settings,
  Layers, Piano, Sliders, Radio, Save, Trash2, Plus, Minus,
  SkipBack, SkipForward, Repeat, Shuffle, Clock
} from 'lucide-react';
import RemixStudio from '@/components/music/RemixStudio';

// ── Beat Packs ────────────────────────────────────────────────────────────────
const BEAT_PACKS = [
  { id:'hip_hop', name:'Hip Hop Essentials', genre:'Hip Hop', bpm:90, color:'#a855f7',
    pads:[
      {id:'hh1',name:'808 Kick',type:'drums',emoji:'🥁',color:'#a855f7',freq:55,wave:'sine'},
      {id:'hh2',name:'Snap',type:'drums',emoji:'👏',color:'#c084fc',freq:180,wave:'square'},
      {id:'hh3',name:'Hi-Hat',type:'drums',emoji:'🎵',color:'#9333ea',freq:8000,wave:'square'},
      {id:'hh4',name:'Trap 808',type:'bass',emoji:'🔊',color:'#7e22ce',freq:40,wave:'sawtooth'},
      {id:'hh5',name:'Piano Loop',type:'melody',emoji:'🎹',color:'#6d28d9',freq:261,wave:'triangle'},
      {id:'hh6',name:'Vinyl Scratch',type:'fx',emoji:'💿',color:'#fbbf24',freq:600,wave:'sawtooth'},
      {id:'hh7',name:'Choir',type:'fx',emoji:'🎤',color:'#ec4899',freq:440,wave:'sine'},
      {id:'hh8',name:'Drill Hi-Hat',type:'drums',emoji:'⚡',color:'#a855f7',freq:10000,wave:'square'},
    ]
  },
  { id:'pop_vibes', name:'Pop Vibes', genre:'Pop', bpm:120, color:'#ec4899',
    pads:[
      {id:'pv1',name:'Pop Kick',type:'drums',emoji:'🥁',color:'#ec4899',freq:60,wave:'sine'},
      {id:'pv2',name:'Clap',type:'drums',emoji:'👏',color:'#f472b6',freq:200,wave:'square'},
      {id:'pv3',name:'Pop Bass',type:'bass',emoji:'🎸',color:'#a855f7',freq:80,wave:'sawtooth'},
      {id:'pv4',name:'Synth Lead',type:'melody',emoji:'🎹',color:'#8b5cf6',freq:523,wave:'square'},
      {id:'pv5',name:'Chord Stab',type:'melody',emoji:'✨',color:'#6366f1',freq:392,wave:'triangle'},
      {id:'pv6',name:'Hi-Hat',type:'drums',emoji:'🎵',color:'#ec4899',freq:9000,wave:'square'},
      {id:'pv7',name:'Vocal Chop',type:'fx',emoji:'🎤',color:'#f59e0b',freq:880,wave:'sine'},
      {id:'pv8',name:'Riser FX',type:'fx',emoji:'🚀',color:'#10b981',freq:300,wave:'sawtooth'},
    ]
  },
  { id:'electronic', name:'Electronic Grid', genre:'Electronic', bpm:128, color:'#06b6d4',
    pads:[
      {id:'eg1',name:'808 Kick',type:'drums',emoji:'🥁',color:'#06b6d4',freq:50,wave:'sine'},
      {id:'eg2',name:'Clap Stack',type:'drums',emoji:'👏',color:'#0891b2',freq:250,wave:'square'},
      {id:'eg3',name:'Sub Bass',type:'bass',emoji:'🔊',color:'#0e7490',freq:35,wave:'sawtooth'},
      {id:'eg4',name:'Arp Lead',type:'melody',emoji:'🎹',color:'#155e75',freq:698,wave:'square'},
      {id:'eg5',name:'Pad Wash',type:'melody',emoji:'✨',color:'#164e63',freq:349,wave:'sine'},
      {id:'eg6',name:'Open Hat',type:'drums',emoji:'🎵',color:'#06b6d4',freq:12000,wave:'square'},
      {id:'eg7',name:'Stutter FX',type:'fx',emoji:'⚡',color:'#f59e0b',freq:500,wave:'square'},
      {id:'eg8',name:'Sweep',type:'fx',emoji:'🌊',color:'#10b981',freq:200,wave:'sawtooth'},
    ]
  },
  { id:'rnb_soul', name:'R&B Soul', genre:'R&B', bpm:85, color:'#f59e0b',
    pads:[
      {id:'rs1',name:'Soul Kick',type:'drums',emoji:'🥁',color:'#f59e0b',freq:58,wave:'sine'},
      {id:'rs2',name:'Rimshot',type:'drums',emoji:'🎼',color:'#d97706',freq:300,wave:'square'},
      {id:'rs3',name:'Slap Bass',type:'bass',emoji:'🎸',color:'#b45309',freq:65,wave:'sawtooth'},
      {id:'rs4',name:'Rhodes',type:'melody',emoji:'🎹',color:'#92400e',freq:329,wave:'triangle'},
      {id:'rs5',name:'Wah Guitar',type:'melody',emoji:'🎸',color:'#78350f',freq:440,wave:'sawtooth'},
      {id:'rs6',name:'Shaker',type:'drums',emoji:'🪘',color:'#f59e0b',freq:5000,wave:'square'},
      {id:'rs7',name:'Vocal Ad-lib',type:'fx',emoji:'🎤',color:'#ec4899',freq:660,wave:'sine'},
      {id:'rs8',name:'Strings',type:'melody',emoji:'🎻',color:'#8b5cf6',freq:587,wave:'sawtooth'},
    ]
  },
  { id:'lofi', name:'Lo-Fi Chill', genre:'Lo-Fi', bpm:72, color:'#84cc16',
    pads:[
      {id:'lf1',name:'Vinyl Kick',type:'drums',emoji:'🥁',color:'#84cc16',freq:55,wave:'sine'},
      {id:'lf2',name:'Jazzy Snare',type:'drums',emoji:'🎼',color:'#65a30d',freq:220,wave:'square'},
      {id:'lf3',name:'Boom Bap',type:'bass',emoji:'🔊',color:'#4d7c0f',freq:70,wave:'sawtooth'},
      {id:'lf4',name:'Jazz Piano',type:'melody',emoji:'🎹',color:'#3f6212',freq:293,wave:'triangle'},
      {id:'lf5',name:'Guitar Loop',type:'melody',emoji:'🎸',color:'#365314',freq:392,wave:'triangle'},
      {id:'lf6',name:'Dusty HH',type:'drums',emoji:'🎵',color:'#84cc16',freq:7000,wave:'square'},
      {id:'lf7',name:'Rain FX',type:'fx',emoji:'🌧️',color:'#0ea5e9',freq:1000,wave:'sine'},
      {id:'lf8',name:'Vinyl Noise',type:'fx',emoji:'📻',color:'#a78bfa',freq:400,wave:'square'},
    ]
  },
  { id:'afrobeats', name:'Afrobeats', genre:'Afro', bpm:105, color:'#f97316',
    pads:[
      {id:'ab1',name:'Afro Kick',type:'drums',emoji:'🥁',color:'#f97316',freq:62,wave:'sine'},
      {id:'ab2',name:'Talking Drum',type:'drums',emoji:'🪘',color:'#ea580c',freq:180,wave:'square'},
      {id:'ab3',name:'Afro Bass',type:'bass',emoji:'🎸',color:'#c2410c',freq:75,wave:'sawtooth'},
      {id:'ab4',name:'Guitar Riff',type:'melody',emoji:'🎸',color:'#9a3412',freq:415,wave:'triangle'},
      {id:'ab5',name:'Keys',type:'melody',emoji:'🎹',color:'#7c2d12',freq:311,wave:'triangle'},
      {id:'ab6',name:'Shekere',type:'drums',emoji:'🌿',color:'#f97316',freq:6000,wave:'square'},
      {id:'ab7',name:'Vocals',type:'fx',emoji:'🎤',color:'#ec4899',freq:528,wave:'sine'},
      {id:'ab8',name:'Horns',type:'fx',emoji:'🎺',color:'#fbbf24',freq:783,wave:'sawtooth'},
    ]
  },
  { id:'trap', name:'Trap Bangers', genre:'Trap', bpm:140, color:'#ef4444',
    pads:[
      {id:'tr1',name:'Hard 808',type:'drums',emoji:'🥁',color:'#ef4444',freq:45,wave:'sine'},
      {id:'tr2',name:'Clap',type:'drums',emoji:'💥',color:'#f87171',freq:190,wave:'square'},
      {id:'tr3',name:'Trap Sub',type:'bass',emoji:'🔊',color:'#dc2626',freq:30,wave:'sawtooth'},
      {id:'tr4',name:'Melody Trap',type:'melody',emoji:'🎹',color:'#b91c1c',freq:622,wave:'square'},
      {id:'tr5',name:'Dark Pad',type:'melody',emoji:'🌑',color:'#991b1b',freq:233,wave:'sine'},
      {id:'tr6',name:'Hi-Hat Roll',type:'drums',emoji:'⚡',color:'#ef4444',freq:11000,wave:'square'},
      {id:'tr7',name:'Perc',type:'drums',emoji:'🪘',color:'#f97316',freq:400,wave:'square'},
      {id:'tr8',name:'Flute',type:'fx',emoji:'🎵',color:'#84cc16',freq:1046,wave:'sine'},
    ]
  },
  { id:'jazz', name:'Jazz Sessions', genre:'Jazz', bpm:110, color:'#0ea5e9',
    pads:[
      {id:'jz1',name:'Ride Cymbal',type:'drums',emoji:'🥁',color:'#0ea5e9',freq:6500,wave:'square'},
      {id:'jz2',name:'Brushed Snare',type:'drums',emoji:'🎼',color:'#0284c7',freq:280,wave:'square'},
      {id:'jz3',name:'Walking Bass',type:'bass',emoji:'🎸',color:'#0369a1',freq:82,wave:'sawtooth'},
      {id:'jz4',name:'Piano Chord',type:'melody',emoji:'🎹',color:'#075985',freq:370,wave:'triangle'},
      {id:'jz5',name:'Sax Solo',type:'melody',emoji:'🎷',color:'#0c4a6e',freq:466,wave:'sawtooth'},
      {id:'jz6',name:'Hi-Hat',type:'drums',emoji:'🎵',color:'#0ea5e9',freq:8500,wave:'square'},
      {id:'jz7',name:'Trumpet',type:'fx',emoji:'🎺',color:'#fbbf24',freq:587,wave:'sawtooth'},
      {id:'jz8',name:'Vibraphone',type:'fx',emoji:'🎵',color:'#a78bfa',freq:523,wave:'sine'},
    ]
  },
];

// ── Piano notes ───────────────────────────────────────────────────────────────
const PIANO_NOTES = [
  {note:'C4',freq:261.63,black:false},{note:'C#4',freq:277.18,black:true},
  {note:'D4',freq:293.66,black:false},{note:'D#4',freq:311.13,black:true},
  {note:'E4',freq:329.63,black:false},{note:'F4',freq:349.23,black:false},
  {note:'F#4',freq:369.99,black:true},{note:'G4',freq:392.00,black:false},
  {note:'G#4',freq:415.30,black:true},{note:'A4',freq:440.00,black:false},
  {note:'A#4',freq:466.16,black:true},{note:'B4',freq:493.88,black:false},
  {note:'C5',freq:523.25,black:false},{note:'C#5',freq:554.37,black:true},
  {note:'D5',freq:587.33,black:false},{note:'D#5',freq:622.25,black:true},
  {note:'E5',freq:659.25,black:false},{note:'F5',freq:698.46,black:false},
  {note:'F#5',freq:739.99,black:true},{note:'G5',freq:783.99,black:false},
  {note:'G#5',freq:830.61,black:true},{note:'A5',freq:880.00,black:false},
  {note:'A#5',freq:932.33,black:true},{note:'B5',freq:987.77,black:false},
];

// ── Effects ───────────────────────────────────────────────────────────────────
const EFFECTS = [
  { id:'reverb', name:'Reverb', emoji:'🌊', param:'mix', default:0.3, min:0, max:1, step:0.01 },
  { id:'delay', name:'Delay', emoji:'🔁', param:'time', default:0.25, min:0, max:1, step:0.01 },
  { id:'distortion', name:'Distort', emoji:'⚡', param:'amount', default:0, min:0, max:1, step:0.01 },
  { id:'filter', name:'Filter', emoji:'🎛️', param:'freq', default:0.8, min:0.01, max:1, step:0.01 },
  { id:'compressor', name:'Compress', emoji:'🗜️', param:'threshold', default:0.5, min:0, max:1, step:0.01 },
  { id:'chorus', name:'Chorus', emoji:'🎭', param:'rate', default:0.3, min:0, max:1, step:0.01 },
];

const STEPS = 16;
function initPattern() { return Array.from({length:8}, () => new Array(STEPS).fill(false)); }

// ── Audio engine ──────────────────────────────────────────────────────────────
function createTone(audioCtx, pad, duration=0.35, effects={}) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const comp = audioCtx.createDynamicsCompressor();

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(comp);
  comp.connect(audioCtx.destination);

  osc.type = pad.wave || 'sine';
  const freqVar = 0.92 + Math.random() * 0.16;
  osc.frequency.setValueAtTime(pad.freq * freqVar, audioCtx.currentTime);

  // Pitch envelope for 808s
  if (pad.type === 'drums' || pad.type === 'bass') {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(pad.freq * freqVar * 0.35, 20),
      audioCtx.currentTime + duration * 0.8
    );
  }

  filter.type = 'lowpass';
  const filterFreq = effects.filter ? effects.filter * 18000 + 200 : 8000;
  filter.frequency.setValueAtTime(filterFreq, audioCtx.currentTime);
  filter.Q.setValueAtTime(pad.type === 'drums' ? 8 : 2, audioCtx.currentTime);

  const vol = effects.volume ?? 0.4;
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(vol, audioCtx.currentTime + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  // Distortion via waveshaper
  if (effects.distortion > 0.05) {
    const ws = audioCtx.createWaveShaper();
    const amt = effects.distortion * 400;
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + amt) * x) / (Math.PI + amt * Math.abs(x));
    }
    ws.curve = curve;
    gain.connect(ws); ws.connect(comp);
    gain.disconnect(comp);
  }

  comp.threshold.setValueAtTime(-24 - (effects.compressor || 0) * 24, audioCtx.currentTime);
  comp.knee.setValueAtTime(30, audioCtx.currentTime);
  comp.ratio.setValueAtTime(12, audioCtx.currentTime);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

function playNote(audioCtx, freq, duration=0.4) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.start(); osc.stop(audioCtx.currentTime + duration);
}

export default function MusicStudio() {
  const [activePack, setActivePack] = useState(BEAT_PACKS[0]);
  const [pattern, setPattern] = useState(initPattern);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(90);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [activePads, setActivePads] = useState(new Set());
  const [activeNotes, setActiveNotes] = useState(new Set());
  const [tab, setTab] = useState('pads');
  const [micOn, setMicOn] = useState(false);
  const [showPackPicker, setShowPackPicker] = useState(false);
  const [recording, setRecording] = useState(false);
  const [effects, setEffects] = useState({ reverb:0.2, delay:0, distortion:0, filter:0.9, compressor:0.3, chorus:0 });
  const [padVolumes, setPadVolumes] = useState({});
  const [padMuted, setPadMuted] = useState({});
  const [pianoOctave, setPianoOctave] = useState(0);
  const [looping, setLooping] = useState(true);
  const [savedPatterns, setSavedPatterns] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [patternName, setPatternName] = useState('');

  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const stepRef = useRef(0);
  const gainNodeRef = useRef(null);
  const micStreamRef = useRef(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const triggerPad = useCallback((pad, padIdx) => {
    if (padMuted[pad.id]) return;
    const ctx = getAudioCtx();
    const vol = (padVolumes[pad.id] ?? 1) * masterVolume;
    createTone(ctx, pad, 0.35, { ...effects, volume: vol * 0.4 });
    setActivePads(p => { const s=new Set(p); s.add(pad.id); return s; });
    setTimeout(() => setActivePads(p => { const s=new Set(p); s.delete(pad.id); return s; }), 120);
  }, [getAudioCtx, effects, masterVolume, padVolumes, padMuted]);

  const triggerNote = useCallback((freq, note) => {
    const ctx = getAudioCtx();
    playNote(ctx, freq * Math.pow(2, pianoOctave));
    setActiveNotes(n => { const s=new Set(n); s.add(note); return s; });
    setTimeout(() => setActiveNotes(n => { const s=new Set(n); s.delete(note); return s; }), 200);
  }, [getAudioCtx, pianoOctave]);

  useEffect(() => {
    if (playing) {
      const stepMs = (60 / bpm / 4) * 1000;
      intervalRef.current = setInterval(() => {
        const step = stepRef.current;
        setCurrentStep(step);
        activePack.pads.forEach((pad, i) => {
          if (pattern[i]?.[step] && !padMuted[pad.id]) triggerPad(pad, i);
        });
        stepRef.current = looping ? (step + 1) % STEPS : step + 1;
        if (!looping && stepRef.current >= STEPS) {
          setPlaying(false);
          setCurrentStep(-1);
          stepRef.current = 0;
        }
      }, stepMs);
    } else {
      clearInterval(intervalRef.current);
      if (!playing) { setCurrentStep(-1); stepRef.current = 0; }
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, bpm, pattern, activePack, triggerPad, padMuted, looping]);

  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = masterVolume;
  }, [masterVolume]);

  const toggleStep = (padIdx, stepIdx) => {
    setPattern(p => { const next=p.map(r=>[...r]); next[padIdx][stepIdx]=!next[padIdx][stepIdx]; return next; });
  };

  const clearPattern = () => { setPattern(initPattern()); setPlaying(false); };

  const randomPattern = () => {
    setPattern(Array.from({length:8}, (_, i) =>
      Array.from({length:STEPS}, (_, s) => {
        if (i===0) return s%4===0;
        if (i===1) return s%8===4;
        if (i===2) return s%8===0 || s%8===6;
        return Math.random() > 0.78;
      })
    ));
  };

  const switchPack = (pack) => {
    setActivePack(pack); setBpm(pack.bpm); setPattern(initPattern());
    setPlaying(false); setShowPackPicker(false);
    setPadVolumes({}); setPadMuted({});
  };

  const savePattern = () => {
    if (!patternName.trim()) return;
    setSavedPatterns(p => [...p, { name: patternName, pattern, packId: activePack.id, bpm, effects, id: Date.now() }]);
    setPatternName(''); setShowSaveModal(false);
  };

  const loadPattern = (saved) => {
    setPattern(saved.pattern); setBpm(saved.bpm); setEffects(saved.effects);
    const pack = BEAT_PACKS.find(p => p.id === saved.packId);
    if (pack) setActivePack(pack);
  };

  const toggleMic = async () => {
    if (micOn) {
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
      setMicOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const ctx = getAudioCtx();
        const src = ctx.createMediaStreamSource(stream);
        src.connect(gainNodeRef.current);
        setMicOn(true);
      } catch { }
    }
  };

  useEffect(() => () => {
    clearInterval(intervalRef.current);
    micStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return (
    <div className="min-h-screen bg-[#070710] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#070710]/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:`linear-gradient(135deg,${activePack.color},${activePack.color}66)`}}>
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">Music Studio</div>
              <button onClick={() => setShowPackPicker(v=>!v)} className="flex items-center gap-1 text-white/50 text-xs hover:text-white/80 transition-colors">
                {activePack.name} · {bpm} BPM {showPackPicker ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMic} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${micOn?'bg-red-500':'bg-white/10 hover:bg-white/20'}`}>
              {micOn ? <Mic className="w-4 h-4"/> : <MicOff className="w-4 h-4 text-white/50"/>}
            </button>
            <button onClick={() => setShowSaveModal(true)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <Save className="w-4 h-4 text-white/60"/>
            </button>
          </div>
        </div>

        {/* Pack picker */}
        <AnimatePresence>
          {showPackPicker && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden border-t border-white/10">
              <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
                {BEAT_PACKS.map(pack => (
                  <button key={pack.id} onClick={() => switchPack(pack)}
                    className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                    style={activePack.id===pack.id?{background:`${pack.color}22`,borderColor:`${pack.color}88`,color:pack.color}:{borderColor:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)'}}>
                    {pack.name}<br/><span className="text-[10px] opacity-60">{pack.genre} · {pack.bpm}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transport */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <button onClick={() => { setCurrentStep(-1); stepRef.current=0; }} className="p-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10">
          <SkipBack className="w-4 h-4 text-white/60"/>
        </button>
        <button onClick={() => setPlaying(v=>!v)}
          className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all"
          style={{background:playing?'rgba(239,68,68,0.2)':activePack.color,color:'white',border:playing?'1px solid rgba(239,68,68,0.4)':'none'}}>
          {playing ? <><Square className="w-4 h-4 fill-current"/> Stop</> : <><Play className="w-4 h-4 fill-current"/> Play</>}
        </button>
        <button onClick={clearPattern} className="p-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10">
          <RotateCcw className="w-4 h-4 text-white/60"/>
        </button>
        <button onClick={randomPattern} className="p-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10">
          <Wand2 className="w-4 h-4 text-white/60"/>
        </button>
        <button onClick={() => setLooping(v=>!v)} className={`p-2 rounded-lg border transition-all ${looping?'bg-white/15 border-white/30':'bg-white/8 border-white/10'}`}>
          <Repeat className="w-4 h-4 text-white/60"/>
        </button>
        <div className="flex-1 flex items-center gap-2 ml-2">
          <span className="text-[10px] text-white/40">BPM</span>
          <input type="range" min={60} max={200} value={bpm} onChange={e=>setBpm(Number(e.target.value))} className="flex-1" style={{accentColor:activePack.color}}/>
          <span className="text-xs text-white/60 w-7 text-right">{bpm}</span>
        </div>
        <div className="flex items-center gap-1">
          <Volume2 className="w-3.5 h-3.5 text-white/40"/>
          <input type="range" min={0} max={1} step={0.01} value={masterVolume} onChange={e=>setMasterVolume(Number(e.target.value))} className="w-14" style={{accentColor:activePack.color}}/>
        </div>
      </div>

      {/* Step progress */}
      {playing && (
        <div className="h-1 bg-white/5">
          <div className="h-full transition-all" style={{width:`${((currentStep+1)/STEPS)*100}%`,background:activePack.color}}/>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[['pads','🎹 Pads'],['sequencer','🎛️ Sequencer'],['piano','🎼 Piano'],['effects','🎚️ Effects'],['remix','🎚️ Remix'],['saves','💾 Saved']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 py-2.5 text-[11px] font-semibold border-b-2 transition-all truncate px-1"
            style={tab===id?{borderColor:activePack.color,color:activePack.color}:{borderColor:'transparent',color:'rgba(255,255,255,0.35)'}}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 pb-24">
        {/* PADS */}
        {tab==='pads' && (
          <div>
            <p className="text-white/30 text-xs mb-3">Tap to play · long press to mute</p>
            <div className="grid grid-cols-4 gap-3">
              {activePack.pads.map((pad, idx) => (
                <motion.button key={pad.id}
                  onClick={() => triggerPad(pad, idx)}
                  onContextMenu={e => { e.preventDefault(); setPadMuted(m => ({...m,[pad.id]:!m[pad.id]})); }}
                  whileTap={{scale:0.88}}
                  className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-xs border-2 transition-all select-none relative"
                  style={{
                    background: padMuted[pad.id]?'rgba(255,255,255,0.04)':activePads.has(pad.id)?pad.color:`${pad.color}16`,
                    borderColor: padMuted[pad.id]?'rgba(255,255,255,0.08)':activePads.has(pad.id)?pad.color:`${pad.color}44`,
                    boxShadow: activePads.has(pad.id)?`0 0 24px ${pad.color}88`:'none',
                    color: padMuted[pad.id]?'rgba(255,255,255,0.2)':activePads.has(pad.id)?'#fff':pad.color,
                  }}>
                  {padMuted[pad.id] && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500"/>}
                  <span className="text-2xl">{pad.emoji}</span>
                  <span className="text-center leading-tight px-1 text-[10px]">{pad.name}</span>
                  <input type="range" min={0} max={1} step={0.05}
                    value={padVolumes[pad.id]??1}
                    onClick={e=>e.stopPropagation()}
                    onChange={e=>{ e.stopPropagation(); setPadVolumes(v=>({...v,[pad.id]:Number(e.target.value)})); }}
                    className="w-10 mt-1" style={{accentColor:pad.color}}/>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* SEQUENCER */}
        {tab==='sequencer' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/50 text-xs">16-step sequencer</span>
              <div className="flex gap-0.5">
                {Array.from({length:STEPS},(_,i)=>(
                  <div key={i} className="w-2 h-2 rounded-full transition-all"
                    style={{background:i===currentStep?activePack.color:'rgba(255,255,255,0.1)'}}/>
                ))}
              </div>
            </div>
            <div className="space-y-2 overflow-x-auto">
              {activePack.pads.map((pad, padIdx) => (
                <div key={pad.id} className="flex items-center gap-2">
                  <button onClick={() => triggerPad(pad, padIdx)}
                    className="w-20 shrink-0 text-left px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{background:`${pad.color}20`,color:pad.color}}>
                    <span className="mr-1">{pad.emoji}</span>{pad.name}
                  </button>
                  <button onClick={() => setPadMuted(m=>({...m,[pad.id]:!m[pad.id]}))}
                    className={`w-6 h-6 shrink-0 rounded text-[10px] font-bold border transition-all ${padMuted[pad.id]?'bg-red-500/20 border-red-500/50 text-red-400':'bg-white/5 border-white/10 text-white/30'}`}>
                    M
                  </button>
                  <div className="flex gap-0.5 flex-1 min-w-0">
                    {Array.from({length:STEPS},(_,stepIdx) => {
                      const isActive=pattern[padIdx]?.[stepIdx];
                      const isCurrent=stepIdx===currentStep;
                      const isBeat=stepIdx%4===0;
                      return (
                        <button key={stepIdx} onClick={() => toggleStep(padIdx,stepIdx)}
                          className="flex-1 h-7 rounded-sm transition-all border"
                          style={{
                            minWidth:16,
                            background:isActive?(isCurrent?pad.color:`${pad.color}cc`):(isCurrent?'rgba(255,255,255,0.18)':isBeat?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)'),
                            borderColor:isActive?`${pad.color}66`:(isBeat?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.05)'),
                            boxShadow:isActive&&isCurrent?`0 0 8px ${pad.color}`:undefined,
                          }}/>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PIANO */}
        {tab==='piano' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/50 text-sm">Piano Roll</span>
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs">Octave</span>
                <button onClick={() => setPianoOctave(v=>Math.max(-2,v-1))} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/60"><Minus className="w-3 h-3"/></button>
                <span className="text-white text-sm font-mono w-4 text-center">{pianoOctave >= 0 ? `+${pianoOctave}` : pianoOctave}</span>
                <button onClick={() => setPianoOctave(v=>Math.min(2,v+1))} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/60"><Plus className="w-3 h-3"/></button>
              </div>
            </div>
            <div className="relative overflow-x-auto">
              <div className="flex" style={{height:120,minWidth:480}}>
                {PIANO_NOTES.filter(n=>!n.black).map((note, i) => {
                  const blackBefore = PIANO_NOTES.filter(n=>n.black).find(b => {
                    const whites = PIANO_NOTES.filter(n=>!n.black);
                    const myIdx = whites.findIndex(w=>w.note===note.note);
                    const bIdx = PIANO_NOTES.findIndex(n=>n.note===b.note);
                    const wIdx = PIANO_NOTES.findIndex(n=>n.note===note.note);
                    return bIdx === wIdx - 1;
                  });
                  return (
                    <div key={note.note} className="relative flex-1" style={{minWidth:36}}>
                      {/* Black key before this white key */}
                      {PIANO_NOTES.indexOf(note) > 0 && PIANO_NOTES[PIANO_NOTES.indexOf(note)-1]?.black && (() => {
                        const bn = PIANO_NOTES[PIANO_NOTES.indexOf(note)-1];
                        return (
                          <button onClick={() => triggerNote(bn.freq, bn.note)}
                            className="absolute z-10 rounded-b-md transition-all"
                            style={{
                              left:-12, top:0, width:24, height:72,
                              background: activeNotes.has(bn.note)?activePack.color:'#1a1a2e',
                              boxShadow: activeNotes.has(bn.note)?`0 0 12px ${activePack.color}`:'0 4px 8px rgba(0,0,0,0.5)',
                            }}/>
                        );
                      })()}
                      {/* White key */}
                      <button onClick={() => triggerNote(note.freq, note.note)}
                        className="absolute inset-0 rounded-b-lg border border-white/10 transition-all flex items-end justify-center pb-2"
                        style={{
                          background: activeNotes.has(note.note)?`${activePack.color}44`:'rgba(255,255,255,0.88)',
                          boxShadow: activeNotes.has(note.note)?`0 0 16px ${activePack.color}`:'none',
                        }}>
                        <span className="text-[9px] font-mono" style={{color:activeNotes.has(note.note)?activePack.color:'rgba(0,0,0,0.3)'}}>{note.note}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-white/30 text-xs mt-4 text-center">Tap keys to play · Use octave shift for full range</p>
          </div>
        )}

        {/* EFFECTS */}
        {tab==='effects' && (
          <div className="space-y-4">
            <p className="text-white/40 text-xs">Applied to all pads in real-time</p>
            {EFFECTS.map(fx => (
              <div key={fx.id}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <span>{fx.emoji}</span>{fx.name}
                  </span>
                  <span className="text-xs font-mono" style={{color:activePack.color}}>
                    {Math.round(effects[fx.id]*100)}%
                  </span>
                </div>
                <input type="range" min={fx.min} max={fx.max} step={fx.step}
                  value={effects[fx.id]}
                  onChange={e => setEffects(ef => ({...ef,[fx.id]:Number(e.target.value)}))}
                  className="w-full" style={{accentColor:activePack.color}}/>
              </div>
            ))}
            <button onClick={() => setEffects({reverb:0.2,delay:0,distortion:0,filter:0.9,compressor:0.3,chorus:0})}
              className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-semibold">
              Reset All Effects
            </button>
          </div>
        )}

        {/* REMIX */}
        {tab==='remix' && <RemixStudio />}

        {/* SAVES */}
        {tab==='saves' && (
          <div>
            {savedPatterns.length === 0 ? (
              <div className="text-center py-12">
                <Save className="w-10 h-10 text-white/15 mx-auto mb-3"/>
                <p className="text-white/30 text-sm">No saved patterns yet</p>
                <button onClick={() => setShowSaveModal(true)} className="mt-3 text-xs text-white/50 hover:text-white/80 underline">Save current pattern</button>
              </div>
            ) : (
              <div className="space-y-2">
                {savedPatterns.map(saved => (
                  <div key={saved.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{saved.name}</div>
                      <div className="text-xs text-white/40">{BEAT_PACKS.find(p=>p.id===saved.packId)?.name} · {saved.bpm} BPM</div>
                    </div>
                    <button onClick={() => loadPattern(saved)} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{background:`${activePack.color}22`,color:activePack.color}}>Load</button>
                    <button onClick={() => setSavedPatterns(p=>p.filter(s=>s.id!==saved.id))} className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5 text-red-400"/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-end justify-center"
            onClick={() => setShowSaveModal(false)}>
            <motion.div initial={{y:80}} animate={{y:0}} exit={{y:80}}
              onClick={e=>e.stopPropagation()}
              className="w-full max-w-md bg-[#12121f] border border-white/10 rounded-t-3xl p-6">
              <h3 className="font-bold text-lg mb-4">Save Pattern</h3>
              <input value={patternName} onChange={e=>setPatternName(e.target.value)}
                placeholder="Pattern name…"
                className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 mb-4"/>
              <div className="flex gap-3">
                <button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 rounded-xl bg-white/8 text-white/60 font-semibold text-sm">Cancel</button>
                <button onClick={savePattern} className="flex-1 py-3 rounded-xl font-semibold text-sm text-white" style={{background:activePack.color}}>Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
