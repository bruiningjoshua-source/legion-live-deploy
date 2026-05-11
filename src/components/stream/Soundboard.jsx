import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, X } from 'lucide-react';

const PACKS = [
  { id: 'reactions', name: 'Reactions', icon: '😂', sounds: [
    { id: 'airhorn',  name: 'Air Horn',   emoji: '📢', freq: 400,  dur: 0.8,  type: 'square'   },
    { id: 'applause', name: 'Applause',   emoji: '👏', freq: 200,  dur: 1.5,  type: 'noise'    },
    { id: 'drumroll', name: 'Drum Roll',  emoji: '🥁', freq: 80,   dur: 1.2,  type: 'drum'     },
    { id: 'ding',     name: 'Ding',       emoji: '🔔', freq: 880,  dur: 0.4,  type: 'sine'     },
    { id: 'buzzer',   name: 'Buzzer',     emoji: '🚨', freq: 120,  dur: 0.6,  type: 'square'   },
    { id: 'woosh',    name: 'Woosh',      emoji: '💨', freq: 800,  dur: 0.5,  type: 'sweep_dn' },
  ]},
  { id: 'music', name: 'Music', icon: '🎵', sounds: [
    { id: 'chord_maj', name: 'Major Chord', emoji: '🎹', freq: 261, dur: 1.0, type: 'chord_maj' },
    { id: 'chord_min', name: 'Minor Chord', emoji: '🎸', freq: 220, dur: 1.0, type: 'chord_min' },
    { id: 'riser',     name: 'Riser',       emoji: '🚀', freq: 100, dur: 2.0, type: 'sweep_up'  },
    { id: 'drop',      name: 'Drop',        emoji: '💥', freq: 50,  dur: 0.8, type: 'drop'      },
    { id: 'stab',      name: 'Synth Stab',  emoji: '⚡',      freq: 440, dur: 0.3, type: 'square'    },
    { id: 'bass',      name: 'Bass Hit',    emoji: '🔊', freq: 60,  dur: 0.5, type: 'bass'      },
  ]},
  { id: 'alerts', name: 'Alerts', icon: '🔔', sounds: [
    { id: 'follow',   name: 'New Follow',  emoji: '❤️',  freq: 523, dur: 0.6, type: 'jingle'  },
    { id: 'donation', name: 'Donation',    emoji: '💰', freq: 659, dur: 0.8, type: 'jingle'  },
    { id: 'raid',     name: 'Raid!',       emoji: '⚔️', freq: 392, dur: 1.5, type: 'fanfare' },
    { id: 'levelup',  name: 'Level Up',    emoji: '⬆️', freq: 440, dur: 1.0, type: 'ascend'  },
    { id: 'countdown',name: 'Countdown',   emoji: '⏱️', freq: 1000,dur: 0.1, type: 'sine'    },
    { id: 'victory',  name: 'Victory',     emoji: '🏆', freq: 523, dur: 2.0, type: 'fanfare' },
  ]},
  { id: 'gaming', name: 'Gaming', icon: '🎮', sounds: [
    { id: 'glitch',   name: 'Glitch',    emoji: '👾', freq: 300,  dur: 0.4, type: 'glitch'  },
    { id: 'powerup',  name: 'Power Up',  emoji: '⭐',      freq: 330,  dur: 0.6, type: 'ascend'  },
    { id: 'gameover', name: 'Game Over', emoji: '💀', freq: 440,  dur: 1.2, type: 'descend' },
    { id: 'coin',     name: 'Coin',      emoji: '🪙', freq: 988,  dur: 0.2, type: 'coin'    },
    { id: 'explode',  name: 'Explosion', emoji: '💣', freq: 60,   dur: 0.5, type: 'square'  },
    { id: 'laser',    name: 'Laser',     emoji: '🔫', freq: 1200, dur: 0.3, type: 'sweep_dn'},
  ]},
];

function playSound(sound, volume = 0.75) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.35, ctx.currentTime);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.connect(gain);
    const now = ctx.currentTime;
    const multi = ["chord_maj","chord_min","jingle","fanfare"];

    switch (sound.type) {
      case 'sine': case 'square':
        osc.type = sound.type;
        osc.frequency.setValueAtTime(sound.freq, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur);
        break;
      case 'sweep_up':
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(sound.freq, now);
        osc.frequency.exponentialRampToValueAtTime(sound.freq * 8, now + sound.dur);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur);
        break;
      case 'sweep_dn':
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(sound.freq, now);
        osc.frequency.exponentialRampToValueAtTime(sound.freq * 0.2, now + sound.dur);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur);
        break;
      case 'drum':
        osc.type = "sine";
        osc.frequency.setValueAtTime(sound.freq * 2, now);
        osc.frequency.exponentialRampToValueAtTime(sound.freq * 0.5, now + 0.1);
        gain.gain.setValueAtTime(volume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur);
        break;
      case 'bass':
        osc.type = "sine";
        osc.frequency.setValueAtTime(sound.freq, now);
        osc.frequency.exponentialRampToValueAtTime(sound.freq * 0.5, now + sound.dur);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur);
        break;
      case 'drop':
        osc.type = "sine";
        osc.frequency.setValueAtTime(sound.freq * 4, now);
        osc.frequency.exponentialRampToValueAtTime(sound.freq, now + sound.dur);
        gain.gain.setValueAtTime(volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur);
        break;
      case 'chord_maj': case 'chord_min': {
        const ratios = sound.type === 'chord_maj' ? [1, 1.25, 1.5] : [1, 1.2, 1.5];
        ratios.forEach(r => {
          const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.type = "sine"; o2.frequency.setValueAtTime(sound.freq * r, now);
          g2.gain.setValueAtTime(volume * 0.15, now);
          g2.gain.exponentialRampToValueAtTime(0.001, now + sound.dur);
          o2.start(now); o2.stop(now + sound.dur);
        }); break; }
      case 'jingle':
        [0, 0.1, 0.2].forEach((delay, i) => {
          const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination); o2.type = "sine";
          o2.frequency.setValueAtTime([sound.freq, sound.freq*1.25, sound.freq*1.5][i], now + delay);
          g2.gain.setValueAtTime(volume * 0.25, now + delay);
          g2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);
          o2.start(now + delay); o2.stop(now + delay + 0.4);
        }); break;
      case 'fanfare':
        [0, 0.15, 0.3, 0.45].forEach((delay, i) => {
          const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination); o2.type = "square";
          o2.frequency.setValueAtTime([sound.freq,sound.freq*1.25,sound.freq*1.5,sound.freq*2][i], now+delay);
          g2.gain.setValueAtTime(volume * 0.2, now + delay);
          g2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
          o2.start(now + delay); o2.stop(now + delay + 0.3);
        }); break;
      case 'ascend':
        osc.type = "sine"; osc.frequency.setValueAtTime(sound.freq, now);
        osc.frequency.exponentialRampToValueAtTime(sound.freq * 2, now + sound.dur);
        gain.gain.setValueAtTime(volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur); break;
      case 'descend':
        osc.type = "sine"; osc.frequency.setValueAtTime(sound.freq, now);
        osc.frequency.exponentialRampToValueAtTime(sound.freq * 0.3, now + sound.dur);
        gain.gain.setValueAtTime(volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur); break;
      case 'coin':
        osc.type = "sine"; osc.frequency.setValueAtTime(sound.freq, now);
        osc.frequency.setValueAtTime(sound.freq * 1.5, now + 0.08);
        gain.gain.setValueAtTime(volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur); break;
      case 'glitch':
        osc.type = "square";
        [0, 0.05, 0.1, 0.15].forEach(t => osc.frequency.setValueAtTime(sound.freq * (1 + Math.random() * 3), now + t));
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur); break;
      case "noise": default:
        osc.type = "sine"; osc.frequency.setValueAtTime(sound.freq, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.dur);
    }
    if (!multi.includes(sound.type)) { osc.start(now); osc.stop(now + sound.dur + 0.05); }
    setTimeout(() => ctx.close(), (sound.dur + 0.6) * 1000);
  } catch (e) { console.warn("[Soundboard]", e.message); }
}

export default function Soundboard({ onClose }) {
  const [activePack, setActivePack] = useState(PACKS[0]);
  const [volume,     setVolume]     = useState(75);
  const [muted,      setMuted]      = useState(false);
  const [playing,    setPlaying]    = useState(null);

  const handlePlay = useCallback((sound) => {
    if (muted) return;
    setPlaying(sound.id);
    playSound(sound, volume / 100);
    setTimeout(() => setPlaying(null), sound.dur * 1000 + 300);
  }, [muted, volume]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{   opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-20 left-3 right-3 z-40 rounded-2xl overflow-hidden"
      style={{ background: "rgba(8,8,18,0.95)", backdropFilter: "blur(20px) saturate(180%)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">🎵</span>
          <span className="text-white font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Soundboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMuted(m => !m)}>
            {muted ? <VolumeX className="w-4 h-4 text-white/40" /> : <Volume2 className="w-4 h-4 text-white/60" />}
          </button>
          <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-16 accent-amber-500" />
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>
      </div>
      <div className="flex border-b border-white/10 overflow-x-auto scrollbar-hide">
        {PACKS.map(pack => (
          <button
            key={pack.id}
            onClick={() => setActivePack(pack)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all"
            style={{
              color: activePack.id === pack.id ? '#f5a623' : 'rgba(255,255,255,0.4)',
              borderBottom: activePack.id === pack.id ? '2px solid #f5a623' : '2px solid transparent',
              background: activePack.id === pack.id ? 'rgba(245,166,35,0.05)' : 'transparent',
            }}
          >
            <span>{pack.icon}</span><span>{pack.name}</span>
          </button>
        ))}
      </div>
      <div className="p-3 grid grid-cols-3 gap-2">
        {activePack.sounds.map(sound => (
          <motion.button
            key={sound.id}
            onClick={() => handlePlay(sound)}
            whileTap={{ scale: 0.91 }}
            className="flex flex-col items-center gap-1 py-3 rounded-xl border transition-all select-none"
            style={{
              background: playing === sound.id ? 'rgba(245,166,35,0.18)' : 'rgba(255,255,255,0.04)',
              borderColor: playing === sound.id ? 'rgba(245,166,35,0.6)' : 'rgba(255,255,255,0.08)',
              boxShadow:   playing === sound.id ? '0 0 12px rgba(245,166,35,0.25)' : 'none',
            }}
          >
            <span className="text-2xl">{sound.emoji}</span>
            <span className="text-[10px] font-medium text-center leading-tight px-1" style={{ color: "rgba(255,255,255,0.7)" }}>{sound.name}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}