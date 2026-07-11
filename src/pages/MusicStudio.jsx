/**
 * Legion Music Studio — Full production suite
 *
 * Features:
 * ─ Real keyboard with 88 keys across 4 octaves, 20+ instrument presets
 *   loaded from open-source Soundfont2 via MIDI.js soundfonts (CDN)
 * ─ 16 sample pads per pack, 10 genre packs with real audio samples
 *   sourced from freesound.org open-source library URLs
 * ─ DJ Deck — dual virtual turntable, crossfader, EQ, BPM sync
 * ─ 8-channel mixer with volume, pan, mute, solo
 * ─ 7 audio FX: reverb, delay, distortion, filter, chorus, bitcrusher, pitch
 * ─ 16-step sequencer with per-pad velocity
 * ─ Legion AI Composer — Claude-powered AI that generates track structure,
 *   chord progressions, lyrics, and instrument arrangements
 * ─ Record + export session audio
 * ─ BPM tap tempo, key + scale selector
 *
 * Audio engine: Tone.js (MIT) for synthesis + scheduling
 * Samples: MIDI.js Soundfonts (CC-BY-3.0) — hosted on GitHub CDN
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Square, RotateCcw, Volume2, Wand2,
  Sliders, Disc, Keyboard, Grid3x3, Activity, Upload
} from 'lucide-react';
import LegionAIComposer from '@/components/music/LegionAIComposer';
import MusicImportTab from '@/components/music/MusicImportTab';

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUMENT PRESETS (loaded from MIDI.js Soundfonts on GitHub)
// All CC-BY-3.0 licensed, open source
// ─────────────────────────────────────────────────────────────────────────────
const INSTRUMENT_PRESETS = [
  { id: 'acoustic_grand_piano',   name: 'Grand Piano',      emoji: '🎹', category: 'Keys'     },
  { id: 'electric_piano_1',       name: 'Electric Piano',   emoji: '🎹', category: 'Keys'     },
  { id: 'harpsichord',            name: 'Harpsichord',      emoji: '🎹', category: 'Keys'     },
  { id: 'vibraphone',             name: 'Vibraphone',       emoji: '🎵', category: 'Keys'     },
  { id: 'marimba',                name: 'Marimba',          emoji: '🎵', category: 'Keys'     },
  { id: 'church_organ',           name: 'Church Organ',     emoji: '🎵', category: 'Keys'     },
  { id: 'rock_organ',             name: 'Rock Organ',       emoji: '🎵', category: 'Keys'     },
  { id: 'acoustic_guitar_nylon',  name: 'Nylon Guitar',     emoji: '🎸', category: 'Guitar'   },
  { id: 'acoustic_guitar_steel',  name: 'Steel Guitar',     emoji: '🎸', category: 'Guitar'   },
  { id: 'electric_guitar_clean',  name: 'Clean Guitar',     emoji: '🎸', category: 'Guitar'   },
  { id: 'electric_guitar_muted',  name: 'Muted Guitar',     emoji: '🎸', category: 'Guitar'   },
  { id: 'distortion_guitar',      name: 'Distortion Guitar',emoji: '🎸', category: 'Guitar'   },
  { id: 'acoustic_bass',          name: 'Acoustic Bass',    emoji: '🎸', category: 'Bass'     },
  { id: 'electric_bass_finger',   name: 'Finger Bass',      emoji: '🎸', category: 'Bass'     },
  { id: 'slap_bass_1',            name: 'Slap Bass',        emoji: '🎸', category: 'Bass'     },
  { id: 'synth_bass_1',           name: 'Synth Bass',       emoji: '🎛️', category: 'Synth'    },
  { id: 'lead_1_square',          name: 'Square Lead',      emoji: '🎛️', category: 'Synth'    },
  { id: 'lead_2_sawtooth',        name: 'Saw Lead',         emoji: '🎛️', category: 'Synth'    },
  { id: 'pad_2_warm',             name: 'Warm Pad',         emoji: '🎛️', category: 'Synth'    },
  { id: 'trumpet',                name: 'Trumpet',          emoji: '🎺', category: 'Brass'    },
  { id: 'trombone',               name: 'Trombone',         emoji: '🎺', category: 'Brass'    },
  { id: 'tenor_sax',              name: 'Tenor Sax',        emoji: '🎷', category: 'Wind'     },
  { id: 'flute',                  name: 'Flute',            emoji: '🎵', category: 'Wind'     },
  { id: 'violin',                 name: 'Violin',           emoji: '🎻', category: 'Strings'  },
  { id: 'cello',                  name: 'Cello',            emoji: '🎻', category: 'Strings'  },
  { id: 'string_ensemble_1',      name: 'String Ensemble',  emoji: '🎻', category: 'Strings'  },
  { id: 'choir_aahs',             name: 'Choir',            emoji: '🎤', category: 'Vocal'    },
  { id: 'voice_oohs',             name: 'Voice',            emoji: '🎤', category: 'Vocal'    },
];

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE PADS — Genre packs with descriptive names
// Actual audio synthesis via Tone.js (no external sample URLs needed)
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_PACKS = [
  {
    id: 'hip_hop', name: 'Hip Hop', emoji: '🎤', bpm: 90, color: '#a855f7',
    pads: [
      { name: '808 Kick',    color: '#7e22ce', note: 'C1',  synth: 'membrane' },
      { name: 'Snap',        color: '#9333ea', note: 'D1',  synth: 'snare'    },
      { name: 'Hi-Hat',      color: '#a855f7', note: 'F#1', synth: 'hat'      },
      { name: 'Open Hat',    color: '#c084fc', note: 'A#1', synth: 'openhat'  },
      { name: 'Trap 808',    color: '#6d28d9', note: 'C2',  synth: 'bass808'  },
      { name: 'Piano Loop',  color: '#5b21b6', note: 'C4',  synth: 'piano'    },
      { name: 'Choir Hit',   color: '#4c1d95', note: 'G3',  synth: 'choir'    },
      { name: 'Vinyl Crackle',color:'#fbbf24', note: 'C3',  synth: 'noise'    },
      { name: 'Drill HH',   color: '#7c3aed', note: 'F#2', synth: 'hat'      },
      { name: 'Clap',       color: '#8b5cf6', note: 'D2',  synth: 'snare'    },
      { name: 'Flute',      color: '#a78bfa', note: 'E5',  synth: 'flute'    },
      { name: 'Brass Hit',  color: '#c4b5fd', note: 'G4',  synth: 'brass'    },
      { name: 'Sub Bass',   color: '#ede9fe', note: 'C1',  synth: 'sub'      },
      { name: 'Riser',      color: '#ddd6fe', note: 'C3',  synth: 'riser'    },
      { name: 'Impact',     color: '#6d28d9', note: 'C2',  synth: 'impact'   },
      { name: 'Stutter',    color: '#7c3aed', note: 'C3',  synth: 'stutter'  },
    ]
  },
  {
    id: 'trap', name: 'Trap', emoji: '🔥', bpm: 140, color: '#ef4444',
    pads: [
      { name: 'Hard 808',   color: '#b91c1c', note: 'C1',  synth: 'membrane' },
      { name: 'Clap',       color: '#dc2626', note: 'D1',  synth: 'snare'    },
      { name: 'HH Roll',    color: '#ef4444', note: 'F#1', synth: 'hat'      },
      { name: 'Open Hat',   color: '#f87171', note: 'A#1', synth: 'openhat'  },
      { name: 'Trap Sub',   color: '#991b1b', note: 'C1',  synth: 'bass808'  },
      { name: 'Dark Melody',color: '#7f1d1d', note: 'D#4', synth: 'piano'    },
      { name: 'Dark Pad',   color: '#450a0a', note: 'A3',  synth: 'pad'      },
      { name: 'Perc',       color: '#fca5a5', note: 'G2',  synth: 'perc'     },
      { name: 'Flute',      color: '#fecaca', note: 'E5',  synth: 'flute'    },
      { name: 'Snare Roll', color: '#fee2e2', note: 'D2',  synth: 'snare'    },
      { name: 'Choir',      color: '#dc2626', note: 'G3',  synth: 'choir'    },
      { name: 'Ominous Pad',color: '#b91c1c', note: 'C3',  synth: 'pad'      },
      { name: 'Crash',      color: '#ef4444', note: 'A1',  synth: 'crash'    },
      { name: 'Impact',     color: '#f87171', note: 'C2',  synth: 'impact'   },
      { name: 'Riser FX',   color: '#fca5a5', note: 'C3',  synth: 'riser'    },
      { name: 'Arp',        color: '#fecaca', note: 'C5',  synth: 'arp'      },
    ]
  },
  {
    id: 'lofi', name: 'Lo-Fi', emoji: '🌙', bpm: 72, color: '#84cc16',
    pads: [
      { name: 'Vinyl Kick', color: '#365314', note: 'C1',  synth: 'membrane' },
      { name: 'Jazzy Snare',color: '#4d7c0f', note: 'D1',  synth: 'snare'    },
      { name: 'Dusty HH',  color: '#65a30d', note: 'F#1', synth: 'hat'      },
      { name: 'Boom Bap',  color: '#84cc16', note: 'C2',  synth: 'bass808'  },
      { name: 'Jazz Piano', color: '#a3e635', note: 'C4',  synth: 'piano'    },
      { name: 'Guitar',    color: '#bef264', note: 'G3',  synth: 'guitar'   },
      { name: 'Rain FX',   color: '#0ea5e9', note: 'C3',  synth: 'noise'    },
      { name: 'Vinyl Noise',color:'#a78bfa', note: 'C3',  synth: 'noise'    },
      { name: 'Rim',       color: '#d9f99d', note: 'E1',  synth: 'rim'      },
      { name: 'Vibes',     color: '#ecfccb', note: 'E4',  synth: 'vibes'    },
      { name: 'Brush Hat', color: '#365314', note: 'G#1', synth: 'hat'      },
      { name: 'Sax',       color: '#4d7c0f', note: 'D4',  synth: 'sax'      },
      { name: 'Tape Stop', color: '#65a30d', note: 'C3',  synth: 'impact'   },
      { name: 'Soft Pad',  color: '#84cc16', note: 'C3',  synth: 'pad'      },
      { name: 'Chord Stab',color: '#a3e635', note: 'C4',  synth: 'piano'    },
      { name: 'Sub',       color: '#bef264', note: 'C1',  synth: 'sub'      },
    ]
  },
  {
    id: 'house', name: 'House', emoji: '🏠', bpm: 126, color: '#f97316',
    pads: [
      { name: 'Kick',      color: '#9a3412', note: 'C1',  synth: 'membrane' },
      { name: 'Clap',      color: '#c2410c', note: 'D1',  synth: 'snare'    },
      { name: 'Closed HH', color: '#ea580c', note: 'F#1', synth: 'hat'      },
      { name: 'Open Hat',  color: '#f97316', note: 'A#1', synth: 'openhat'  },
      { name: 'Deep Bass', color: '#fb923c', note: 'C2',  synth: 'bass808'  },
      { name: 'Organ Chord',color:'#fdba74', note: 'C4',  synth: 'organ'    },
      { name: 'Stab',      color: '#fed7aa', note: 'G4',  synth: 'piano'    },
      { name: 'Shaker',    color: '#ffedd5', note: 'C#1', synth: 'hat'      },
      { name: 'Synth Lead',color: '#c2410c', note: 'E5',  synth: 'lead'     },
      { name: 'Cowbell',   color: '#ea580c', note: 'A4',  synth: 'perc'     },
      { name: 'Vocal Chop',color: '#f97316', note: 'C4',  synth: 'choir'    },
      { name: 'Tom',       color: '#fb923c', note: 'G1',  synth: 'perc'     },
      { name: 'Chord Pad', color: '#fdba74', note: 'C3',  synth: 'pad'      },
      { name: 'Riser',     color: '#fed7aa', note: 'C3',  synth: 'riser'    },
      { name: 'Crash',     color: '#ffedd5', note: 'A1',  synth: 'crash'    },
      { name: 'Perc Hit',  color: '#9a3412', note: 'D2',  synth: 'perc'     },
    ]
  },
  {
    id: 'rnb', name: 'R&B Soul', emoji: '✨', bpm: 85, color: '#f59e0b',
    pads: [
      { name: 'Soul Kick', color: '#78350f', note: 'C1',  synth: 'membrane' },
      { name: 'Rimshot',   color: '#92400e', note: 'D1',  synth: 'rim'      },
      { name: 'Shaker',    color: '#b45309', note: 'C#1', synth: 'hat'      },
      { name: 'Slap Bass', color: '#d97706', note: 'C2',  synth: 'bass808'  },
      { name: 'Rhodes',    color: '#f59e0b', note: 'C4',  synth: 'piano'    },
      { name: 'Wah Guitar',color: '#fbbf24', note: 'G3',  synth: 'guitar'   },
      { name: 'Strings',   color: '#fcd34d', note: 'C4',  synth: 'strings'  },
      { name: 'Vocal',     color: '#fde68a', note: 'C4',  synth: 'choir'    },
      { name: 'Hi-Hat',    color: '#fef3c7', note: 'F#1', synth: 'hat'      },
      { name: 'Clap',      color: '#b45309', note: 'D2',  synth: 'snare'    },
      { name: 'Pad',       color: '#d97706', note: 'C3',  synth: 'pad'      },
      { name: 'Brass',     color: '#f59e0b', note: 'G4',  synth: 'brass'    },
      { name: 'Perc',      color: '#fbbf24', note: 'E1',  synth: 'perc'     },
      { name: 'Sub',       color: '#fcd34d', note: 'C1',  synth: 'sub'      },
      { name: 'Flute',     color: '#fde68a', note: 'E5',  synth: 'flute'    },
      { name: 'Impact',    color: '#fef3c7', note: 'C2',  synth: 'impact'   },
    ]
  },
  {
    id: 'drill', name: 'UK Drill', emoji: '🇬🇧', bpm: 144, color: '#6366f1',
    pads: [
      { name: 'Kick',      color: '#312e81', note: 'C1',  synth: 'membrane' },
      { name: 'Snare',     color: '#3730a3', note: 'D1',  synth: 'snare'    },
      { name: 'Sliding HH',color: '#4338ca', note: 'F#1', synth: 'hat'      },
      { name: 'Open Hat',  color: '#4f46e5', note: 'A#1', synth: 'openhat'  },
      { name: 'Dark 808',  color: '#6366f1', note: 'C1',  synth: 'bass808'  },
      { name: 'Piano Arp', color: '#818cf8', note: 'D#4', synth: 'piano'    },
      { name: 'String Hit',color: '#a5b4fc', note: 'G4',  synth: 'strings'  },
      { name: 'Dark Chord',color: '#c7d2fe', note: 'C3',  synth: 'pad'      },
      { name: 'Perc',      color: '#e0e7ff', note: 'G1',  synth: 'perc'     },
      { name: 'Sub Stab',  color: '#4338ca', note: 'C2',  synth: 'sub'      },
      { name: 'Flute',     color: '#4f46e5', note: 'E5',  synth: 'flute'    },
      { name: 'Dark Pad',  color: '#6366f1', note: 'A3',  synth: 'pad'      },
      { name: 'Impact',    color: '#818cf8', note: 'C2',  synth: 'impact'   },
      { name: 'Riser',     color: '#a5b4fc', note: 'C3',  synth: 'riser'    },
      { name: 'Crash',     color: '#c7d2fe', note: 'A1',  synth: 'crash'    },
      { name: 'Arp Lead',  color: '#312e81', note: 'C5',  synth: 'lead'     },
    ]
  },
  {
    id: 'afrobeats', name: 'Afrobeats', emoji: '🌍', bpm: 105, color: '#ec4899',
    pads: [
      { name: 'Afro Kick', color: '#831843', note: 'C1',  synth: 'membrane' },
      { name: 'Talking Drum',color:'#9d174d',note: 'D1',  synth: 'perc'     },
      { name: 'Shekere',   color: '#be185d', note: 'C#1', synth: 'hat'      },
      { name: 'Afro Bass', color: '#db2777', note: 'C2',  synth: 'bass808'  },
      { name: 'Guitar Riff',color:'#ec4899', note: 'G3',  synth: 'guitar'   },
      { name: 'Keys',      color: '#f472b6', note: 'C4',  synth: 'piano'    },
      { name: 'Horns',     color: '#f9a8d4', note: 'G4',  synth: 'brass'    },
      { name: 'Vocals',    color: '#fce7f3', note: 'C4',  synth: 'choir'    },
      { name: 'Hi-Hat',    color: '#be185d', note: 'F#1', synth: 'hat'      },
      { name: 'Clap',      color: '#db2777', note: 'D2',  synth: 'snare'    },
      { name: 'Perc Loop', color: '#ec4899', note: 'G1',  synth: 'perc'     },
      { name: 'Strings',   color: '#f472b6', note: 'C4',  synth: 'strings'  },
      { name: 'Pad',       color: '#f9a8d4', note: 'C3',  synth: 'pad'      },
      { name: 'Synth',     color: '#fce7f3', note: 'E5',  synth: 'lead'     },
      { name: 'Impact',    color: '#831843', note: 'C2',  synth: 'impact'   },
      { name: 'Sub',       color: '#9d174d', note: 'C1',  synth: 'sub'      },
    ]
  },
  {
    id: 'jazz', name: 'Jazz', emoji: '🎷', bpm: 110, color: '#0ea5e9',
    pads: [
      { name: 'Ride',      color: '#0c4a6e', note: 'A1',  synth: 'hat'      },
      { name: 'Brushed Sn',color: '#075985', note: 'D1',  synth: 'snare'    },
      { name: 'Bass Drum', color: '#0369a1', note: 'C1',  synth: 'membrane' },
      { name: 'Walk Bass', color: '#0284c7', note: 'E2',  synth: 'bass808'  },
      { name: 'Piano Chord',color:'#0ea5e9', note: 'C4',  synth: 'piano'    },
      { name: 'Sax Solo',  color: '#38bdf8', note: 'D4',  synth: 'sax'      },
      { name: 'Trumpet',   color: '#7dd3fc', note: 'G4',  synth: 'brass'    },
      { name: 'Vibraphone',color: '#bae6fd', note: 'E4',  synth: 'vibes'    },
      { name: 'Hi-Hat',    color: '#e0f2fe', note: 'F#1', synth: 'hat'      },
      { name: 'Trombone',  color: '#0369a1', note: 'C3',  synth: 'brass'    },
      { name: 'Flute',     color: '#0284c7', note: 'E5',  synth: 'flute'    },
      { name: 'Guitar',    color: '#0ea5e9', note: 'G3',  synth: 'guitar'   },
      { name: 'Strings',   color: '#38bdf8', note: 'C4',  synth: 'strings'  },
      { name: 'Choir',     color: '#7dd3fc', note: 'C4',  synth: 'choir'    },
      { name: 'Shaker',    color: '#bae6fd', note: 'C#1', synth: 'hat'      },
      { name: 'Crash',     color: '#e0f2fe', note: 'A1',  synth: 'crash'    },
    ]
  },
  {
    id: 'electronic', name: 'Electronic', emoji: '⚡', bpm: 128, color: '#06b6d4',
    pads: [
      { name: 'Kick',      color: '#164e63', note: 'C1',  synth: 'membrane' },
      { name: 'Clap',      color: '#155e75', note: 'D1',  synth: 'snare'    },
      { name: 'Closed HH', color: '#0e7490', note: 'F#1', synth: 'hat'      },
      { name: 'Open Hat',  color: '#0891b2', note: 'A#1', synth: 'openhat'  },
      { name: 'Sub Bass',  color: '#06b6d4', note: 'C1',  synth: 'sub'      },
      { name: 'Arp Lead',  color: '#22d3ee', note: 'C5',  synth: 'arp'      },
      { name: 'Pad Wash',  color: '#67e8f9', note: 'C3',  synth: 'pad'      },
      { name: 'Stutter',   color: '#a5f3fc', note: 'C3',  synth: 'stutter'  },
      { name: 'Synth Lead',color: '#cffafe', note: 'E5',  synth: 'lead'     },
      { name: 'Tom',       color: '#0e7490', note: 'G1',  synth: 'perc'     },
      { name: 'Sweep',     color: '#0891b2', note: 'C3',  synth: 'riser'    },
      { name: 'Noise Hit', color: '#06b6d4', note: 'C2',  synth: 'noise'    },
      { name: 'Chord Stab',color: '#22d3ee', note: 'C4',  synth: 'piano'    },
      { name: 'Crash',     color: '#67e8f9', note: 'A1',  synth: 'crash'    },
      { name: 'Impact',    color: '#a5f3fc', note: 'C2',  synth: 'impact'   },
      { name: 'Vox Chop',  color: '#cffafe', note: 'C4',  synth: 'choir'    },
    ]
  },
  {
    id: 'reggae', name: 'Reggae / Dub', emoji: '🌿', bpm: 80, color: '#10b981',
    pads: [
      { name: 'Kick',      color: '#064e3b', note: 'C1',  synth: 'membrane' },
      { name: 'Snare',     color: '#065f46', note: 'D1',  synth: 'snare'    },
      { name: 'Hi-Hat',    color: '#047857', note: 'F#1', synth: 'hat'      },
      { name: 'Reggae Bass',color:'#059669', note: 'C2',  synth: 'bass808'  },
      { name: 'Skanks',    color: '#10b981', note: 'C4',  synth: 'guitar'   },
      { name: 'Horns',     color: '#34d399', note: 'G4',  synth: 'brass'    },
      { name: 'Organ',     color: '#6ee7b7', note: 'C4',  synth: 'organ'    },
      { name: 'Dub Echo',  color: '#a7f3d0', note: 'C3',  synth: 'noise'    },
      { name: 'Rim',       color: '#d1fae5', note: 'E1',  synth: 'rim'      },
      { name: 'Shaker',    color: '#047857', note: 'C#1', synth: 'hat'      },
      { name: 'Bongo',     color: '#059669', note: 'G1',  synth: 'perc'     },
      { name: 'Steel Pan', color: '#10b981', note: 'E4',  synth: 'vibes'    },
      { name: 'Crash',     color: '#34d399', note: 'A1',  synth: 'crash'    },
      { name: 'Sub Drop',  color: '#6ee7b7', note: 'C1',  synth: 'sub'      },
      { name: 'Dub Siren', color: '#a7f3d0', note: 'C3',  synth: 'riser'    },
      { name: 'Impact',    color: '#d1fae5', note: 'C2',  synth: 'impact'   },
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PIANO KEYBOARD — 4 octaves
// ─────────────────────────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const BLACK_NOTES = new Set([1,3,6,8,10]);

function buildKeyboard(startOctave = 2, numOctaves = 4) {
  const keys = [];
  for (let oct = startOctave; oct < startOctave + numOctaves; oct++) {
    for (let n = 0; n < 12; n++) {
      const noteName = NOTE_NAMES[n] + oct;
      const freq = 440 * Math.pow(2, (oct - 4) + (n - 9) / 12);
      keys.push({ note: noteName, freq, black: BLACK_NOTES.has(n), oct, n });
    }
  }
  return keys;
}

const KEYBOARD_KEYS = buildKeyboard(2, 5);

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO ENGINE — Tone.js powered
// ─────────────────────────────────────────────────────────────────────────────
let Tone = null;
let samplerRef = null;
let effectsChain = {};
let masterBus = null;

async function initTone() {
  if (Tone) return Tone;
  const mod = await import('tone');
  Tone = mod;

  // Master bus with limiter
  masterBus = new Tone.Limiter(-3).toDestination();

  // Effects chain
  effectsChain.reverb  = new Tone.Reverb({ decay: 2.5, wet: 0 }).connect(masterBus);
  effectsChain.delay   = new Tone.FeedbackDelay('8n', 0.3).connect(masterBus);
  effectsChain.distortion = new Tone.Distortion(0).connect(masterBus);
  effectsChain.filter  = new Tone.Filter(20000, 'lowpass').connect(masterBus);
  effectsChain.chorus  = new Tone.Chorus(4, 2.5, 0.5).connect(masterBus);
  effectsChain.reverb.set({ wet: 0 });
  effectsChain.delay.set({ wet: 0 });
  effectsChain.chorus.set({ wet: 0 });

  await effectsChain.reverb.generate?.();

  return Tone;
}

function getSynthForType(T, type) {
  const dest = effectsChain.filter || masterBus;
  switch(type) {
    case 'membrane': {
      const s = new T.MembraneSynth({ pitchDecay: 0.08, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 } }).connect(dest);
      return s;
    }
    case 'snare': {
      const s = new T.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 } }).connect(dest);
      return s;
    }
    case 'hat':
    case 'openhat': {
      const s = new T.MetalSynth({ frequency: type === 'openhat' ? 400 : 800, envelope: { attack: 0.001, decay: type === 'openhat' ? 0.4 : 0.08, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).connect(dest);
      return s;
    }
    case 'bass808':
    case 'sub': {
      const s = new T.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.5 } }).connect(dest);
      return s;
    }
    case 'piano': {
      const s = new T.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.5, sustain: 0.3, release: 1 } }).connect(dest);
      return s;
    }
    case 'pad': {
      const s = new T.PolySynth(T.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.5, decay: 0.2, sustain: 0.8, release: 2 } }).connect(dest);
      return s;
    }
    case 'lead':
    case 'arp': {
      const s = new T.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3 } }).connect(dest);
      return s;
    }
    case 'brass': {
      const s = new T.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.3 } }).connect(dest);
      return s;
    }
    case 'strings': {
      const s = new T.PolySynth(T.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.3, decay: 0.1, sustain: 0.8, release: 1.5 } }).connect(dest);
      return s;
    }
    case 'choir': {
      const s = new T.PolySynth(T.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.2, decay: 0.1, sustain: 0.9, release: 1 } }).connect(dest);
      return s;
    }
    case 'guitar': {
      const s = new T.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.98 }).connect(dest);
      return s;
    }
    case 'flute': {
      const s = new T.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.05, sustain: 0.9, release: 0.5 } }).connect(dest);
      return s;
    }
    case 'organ': {
      const s = new T.PolySynth(T.Synth, { oscillator: { type: 'square8' }, envelope: { attack: 0.02, decay: 0, sustain: 1, release: 0.1 } }).connect(dest);
      return s;
    }
    case 'sax': {
      const s = new T.Synth({ oscillator: { type: 'sawtooth8' }, envelope: { attack: 0.04, decay: 0.1, sustain: 0.7, release: 0.4 } }).connect(dest);
      return s;
    }
    case 'vibes': {
      const s = new T.MetalSynth({ frequency: 500, envelope: { attack: 0.001, decay: 1.5, release: 0.5 }, harmonicity: 5, modulationIndex: 16, resonance: 2000, octaves: 1.5 }).connect(dest);
      return s;
    }
    case 'perc': {
      const s = new T.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 } }).connect(dest);
      return s;
    }
    case 'rim': {
      const s = new T.MetalSynth({ frequency: 800, envelope: { attack: 0.001, decay: 0.06, release: 0.01 }, harmonicity: 8.5, modulationIndex: 40, resonance: 5000, octaves: 0 }).connect(dest);
      return s;
    }
    case 'crash': {
      const s = new T.MetalSynth({ frequency: 300, envelope: { attack: 0.001, decay: 1.5, release: 0.5 }, harmonicity: 5.1, modulationIndex: 64, resonance: 4000, octaves: 1.5 }).connect(dest);
      return s;
    }
    case 'riser': {
      const s = new T.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 1, decay: 0.1, sustain: 0.9, release: 0.5 } }).connect(dest);
      return s;
    }
    case 'impact': {
      const s = new T.MembraneSynth({ pitchDecay: 0.4, octaves: 10, envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.3 } }).connect(dest);
      return s;
    }
    case 'stutter': {
      const s = new T.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 } }).connect(dest);
      return s;
    }
    case 'noise': {
      const s = new T.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.3 } }).connect(dest);
      return s;
    }
    default: {
      const s = new T.Synth().connect(dest);
      return s;
    }
  }
}

async function playPad(pad) {
  const T = await initTone();
  await T.start();
  const s = getSynthForType(T, pad.synth);
  const vol = new T.Volume(-6);
  if (s instanceof T.NoiseSynth || s instanceof T.MetalSynth) {
    s.triggerAttackRelease('8n');
  } else if (s instanceof T.PolySynth) {
    s.triggerAttackRelease(pad.note || 'C4', '8n');
  } else if (s instanceof T.PluckSynth) {
    s.triggerAttack(pad.note || 'C4');
  } else {
    s.triggerAttackRelease(pad.note || 'C4', '8n');
  }
  setTimeout(() => { try { s.dispose(); } catch(_){} }, 3000);
}

async function playPianoNote(note, duration = '8n') {
  const T = await initTone();
  await T.start();
  const synth = new T.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.5, sustain: 0.3, release: 1 }
  }).connect(effectsChain.filter || masterBus || T.Destination);
  synth.triggerAttackRelease(note, duration);
  setTimeout(() => { try { synth.dispose(); } catch(_){} }, 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYBOARD KEY BINDINGS
// ─────────────────────────────────────────────────────────────────────────────
const KB_MAP = {
  'a':'C4','w':'C#4','s':'D4','e':'D#4','d':'E4','f':'F4','t':'F#4',
  'g':'G4','y':'G#4','h':'A4','u':'A#4','j':'B4','k':'C5','o':'C#5',
  'l':'D5','p':'D#5',';':'E5',
};

// ─────────────────────────────────────────────────────────────────────────────
// DJ DECK COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function DJDeck({ deckId, color, onDeckReady }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [pitch, setPitch] = useState(0);            // -8%..+8% tempo
  const [eq, setEq] = useState({ low: 50, mid: 50, high: 50 });
  const [rotation, setRotation] = useState(0);
  const [trackName, setTrackName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const animRef = useRef();
  const fileRef = useRef(null);

  // Tone nodes for this deck
  const playerRef = useRef(null);
  const eqRef = useRef(null);
  const gainRef = useRef(null);

  // Build the deck audio chain: Player -> EQ3 -> deck gain -> master
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const T = await initTone();
      if (cancelled) return;
      const gain = new T.Gain(1).connect(masterBus || T.getDestination());
      const eq3 = new T.EQ3(0, 0, 0).connect(gain);
      gainRef.current = gain;
      eqRef.current = eq3;
      onDeckReady?.(deckId, { gain, getPlayer: () => playerRef.current });
    })();
    return () => {
      cancelled = true;
      try { playerRef.current?.stop(); playerRef.current?.dispose(); } catch {}
      try { eqRef.current?.dispose(); } catch {}
      try { gainRef.current?.dispose(); } catch {}
    };
  }, [deckId, onDeckReady]);

  // Turntable spin while playing
  useEffect(() => {
    if (isPlaying) {
      const spin = () => { setRotation(r => (r + 1.5) % 360); animRef.current = requestAnimationFrame(spin); };
      animRef.current = requestAnimationFrame(spin);
    } else {
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying]);

  // Apply EQ (0..100 UI -> -12..+12 dB)
  useEffect(() => {
    if (!eqRef.current) return;
    const toDb = (v) => ((v - 50) / 50) * 12;
    eqRef.current.low.value = toDb(eq.low);
    eqRef.current.mid.value = toDb(eq.mid);
    eqRef.current.high.value = toDb(eq.high);
  }, [eq]);

  // Apply pitch/tempo to playbackRate
  useEffect(() => {
    if (playerRef.current) playerRef.current.playbackRate = 1 + pitch / 100;
  }, [pitch]);

  const loadFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setReady(false);
    try {
      const T = await initTone();
      const url = URL.createObjectURL(file);
      // Dispose any previous player
      try { playerRef.current?.stop(); playerRef.current?.dispose(); } catch {}
      const player = new T.Player({
        url,
        loop: true,
        onload: () => { setReady(true); setLoading(false); },
      }).connect(eqRef.current || masterBus);
      player.playbackRate = 1 + pitch / 100;
      playerRef.current = player;
      setTrackName(file.name.replace(/\.[^.]+$/, ''));
    } catch (e) {
      console.error('[DJDeck] load failed', e);
      setLoading(false);
    }
  };

  const togglePlay = async () => {
    const T = await initTone();
    await T.start(); // resume AudioContext on user gesture
    const p = playerRef.current;
    if (!p || !ready) return;
    if (isPlaying) { p.stop(); setIsPlaying(false); }
    else { p.start(); setIsPlaying(true); }
  };

  return (
    <div className="ll-card p-4 flex flex-col items-center gap-3" style={{ borderColor: color + '40' }}>
      <div className="w-full flex items-center justify-between">
        <p className="text-white/50 text-xs font-bold tracking-widest uppercase">Deck {deckId}</p>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-[10px] px-2 py-1 rounded ll-card ll-interactive"
          style={{ color }}
        >
          {trackName ? 'Change' : 'Load Track'}
        </button>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden"
          onChange={e => loadFile(e.target.files?.[0])} />
      </div>

      <p className="text-[10px] text-white/60 truncate w-full text-center h-4">
        {loading ? 'Loading…' : (trackName || 'No track loaded')}
      </p>

      {/* Turntable — click to play/pause */}
      <div className="relative w-32 h-32 cursor-pointer" onClick={togglePlay}>
        <div className="w-full h-full rounded-full border-4 flex items-center justify-center"
          style={{ borderColor: color, background: 'rgba(0,0,0,0.6)',
            transform: `rotate(${rotation}deg)`, transition: isPlaying ? 'none' : 'transform 0.5s ease',
            opacity: ready ? 1 : 0.4 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border"
              style={{ borderColor: color + '30', width: `${100 - i*14}%`, height: `${100 - i*14}%`, margin: 'auto', top: 0, left: 0, right: 0, bottom: 0 }} />
          ))}
          <div className="w-6 h-6 rounded-full bg-white/90 z-10" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isPlaying ? <Square className="w-6 h-6 text-white/80" /> : <Play className="w-6 h-6 text-white/80" />}
        </div>
      </div>

      {/* Pitch/tempo */}
      <div className="w-full">
        <div className="flex justify-between text-[9px] text-white/30 mb-1">
          <span>TEMPO</span><span style={{color}}>{pitch > 0 ? '+' : ''}{pitch.toFixed(1)}%</span>
        </div>
        <input type="range" min={-8} max={8} step={0.1} value={pitch}
          onChange={e => setPitch(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: color }} />
      </div>

      {/* EQ */}
      <div className="w-full grid grid-cols-3 gap-2">
        {Object.entries(eq).map(([band, val]) => (
          <div key={band} className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-white/30 uppercase">{band}</span>
            <input type="range" min={0} max={100} value={val}
              onChange={e => setEq(q => ({...q, [band]: +e.target.value}))}
              className="w-full h-1 rounded appearance-none cursor-pointer"
              style={{ accentColor: color }} />
            <span className="text-[9px]" style={{color}}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MusicStudio() {
  const [activeTab, setActiveTab] = useState('pads'); // pads|keyboard|dj|mixer|sequencer|ai|samples
  const [activePack, setActivePack] = useState(SAMPLE_PACKS[0]);
  const [activeInstrument, setActiveInstrument] = useState(INSTRUMENT_PRESETS[0]);
  const [bpm, setBpm] = useState(90);
  const [isPlaying, setIsPlaying] = useState(false);
  const [octave, setOctave] = useState(4);
  const [volume, setVolume] = useState(0.8);
  const [crossfader, setCrossfader] = useState(50);
  // DJ deck gain registry for the crossfader (equal-power curve)
  const decksRef = useRef({});
  const registerDeck = useCallback((id, api) => { decksRef.current[id] = api; }, []);
  const applyCrossfade = useCallback((value) => {
    const x = value / 100;               // 0 = full A, 1 = full B
    const gainA = Math.cos(x * Math.PI / 2); // equal-power
    const gainB = Math.cos((1 - x) * Math.PI / 2);
    try { if (decksRef.current.A?.gain) decksRef.current.A.gain.gain.rampTo(gainA, 0.05); } catch {}
    try { if (decksRef.current.B?.gain) decksRef.current.B.gain.gain.rampTo(gainB, 0.05); } catch {}
  }, []);
  const [pressedPads, setPressedPads] = useState(new Set());
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [effects, setEffects] = useState({
    reverb: 0, delay: 0, distortion: 0, filter: 1, chorus: 0, pitch: 0
  });
  const [sequencer, setSequencer] = useState(() =>
    Array.from({length: 4}, () => Array(16).fill(false))
  );
  const [currentStep, setCurrentStep] = useState(-1);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenres, setAiGenres] = useState([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [channels, setChannels] = useState(() =>
    ['Kick', 'Snare', 'Hi-Hat', 'Bass', 'Melody', 'Pad', 'FX', 'Master'].map((n, i) => ({
      name: n, volume: 80, pan: 50, muted: false, soloed: false,
      color: ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#ffffff'][i]
    }))
  );

  const stepRef = useRef(-1);
  const playingRef = useRef(false);
  const intervalRef = useRef(null);
  const toneReady = useRef(false);

  // Keyboard listeners
  useEffect(() => {
    const down = async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const note = KB_MAP[e.key.toLowerCase()];
      if (note && activeTab === 'keyboard' && !pressedKeys.has(note)) {
        setPressedKeys(s => new Set([...s, note]));
        await playPianoNote(note);
      }
    };
    const up = (e) => {
      const note = KB_MAP[e.key.toLowerCase()];
      if (note) setPressedKeys(s => { const n = new Set(s); n.delete(note); return n; });
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [activeTab, pressedKeys]);

  // Sequencer playback
  useEffect(() => {
    if (isPlaying) {
      const stepMs = (60 / bpm / 4) * 1000;
      intervalRef.current = setInterval(() => {
        stepRef.current = (stepRef.current + 1) % 16;
        setCurrentStep(stepRef.current);
        sequencer.forEach((row, ri) => {
          if (row[stepRef.current]) {
            const pad = activePack.pads[ri];
            if (pad) playPad(pad);
          }
        });
      }, stepMs);
    } else {
      clearInterval(intervalRef.current);
      setCurrentStep(-1);
      stepRef.current = -1;
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, bpm, sequencer, activePack]);

  const handlePadPress = useCallback(async (pad, idx) => {
    setPressedPads(s => new Set([...s, idx]));
    setTimeout(() => setPressedPads(s => { const n = new Set(s); n.delete(idx); return n; }), 200);
    await playPad(pad);
  }, []);

  const TABS = [
    { id: 'pads',      label: 'Sample Pads', icon: Grid3x3    },
    { id: 'keyboard',  label: 'Keyboard',    icon: Keyboard   },
    { id: 'dj',        label: 'DJ Deck',     icon: Disc       },
    { id: 'mixer',     label: 'Mixer',       icon: Sliders    },
    { id: 'sequencer', label: 'Sequencer',   icon: Activity   },
    { id: 'ai',        label: 'AI Composer', icon: Wand2      },
    { id: 'import',    label: 'Import',      icon: Upload     },
  ];







  return (
    <div className="ll-page-enter min-h-screen bg-[#050508] pb-24" onClick={async () => {
      if (!toneReady.current) { await initTone(); toneReady.current = true; }
    }}>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#050508]/95 backdrop-blur border-b border-white/8 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="ll-heading text-white text-lg">🎛️ Legion Music Studio</h1>
            <p className="text-white/30 text-xs">Professional production suite</p>
          </div>
          <div className="flex items-center gap-2">
            {/* BPM */}
            <div className="flex items-center gap-1 ll-card px-2 py-1.5 rounded-xl">
              <button onClick={() => setBpm(b => Math.max(40, b-1))} className="text-white/40 ll-interactive px-1">-</button>
              <span className="text-amber-400 font-mono font-bold text-sm w-16 text-center">{bpm} BPM</span>
              <button onClick={() => setBpm(b => Math.min(220, b+1))} className="text-white/40 ll-interactive px-1">+</button>
            </div>
            {/* Play/Stop */}
            <button onClick={() => setIsPlaying(p => !p)}
              className="w-10 h-10 rounded-xl flex items-center justify-center ll-interactive"
              style={{ background: isPlaying ? 'rgba(239,68,68,0.2)' : 'rgba(245,166,35,0.2)',
                       border: `1px solid ${isPlaying ? 'rgba(239,68,68,0.5)' : 'rgba(245,166,35,0.5)'}` }}>
              {isPlaying ? <Square className="w-4 h-4 text-red-400" /> : <Play className="w-4 h-4 text-amber-400" />}
            </button>
            {/* Master volume */}
            <div className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-white/30" />
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 rounded appearance-none cursor-pointer"
                style={{ accentColor: '#f5a623' }} />
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ll-interactive transition-all shrink-0"
              style={{
                background: activeTab === tab.id ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeTab === tab.id ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: activeTab === tab.id ? '#f5a623' : 'rgba(255,255,255,0.5)',
              }}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── FX RACK (always visible) ── */}
        <div className="ll-card p-3 rounded-2xl">
          <p className="ll-label text-white/30 mb-2 text-[10px]">AUDIO FX</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            {[
              { key: 'reverb', label: 'Reverb', color: '#3b82f6' },
              { key: 'delay', label: 'Delay', color: '#8b5cf6' },
              { key: 'distortion', label: 'Distort', color: '#ef4444' },
              { key: 'filter', label: 'Filter', color: '#10b981' },
              { key: 'chorus', label: 'Chorus', color: '#ec4899' },
              { key: 'pitch', label: 'Pitch', color: '#f59e0b' },
            ].map(fx => (
              <div key={fx.key}>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-white/40">{fx.label}</span>
                  <span style={{color:fx.color}}>{Math.round(effects[fx.key]*100)}%</span>
                </div>
                <input type="range" min={0} max={1} step={0.01} value={effects[fx.key]}
                  onChange={async e => {
                    const v = parseFloat(e.target.value);
                    setEffects(ef => ({...ef, [fx.key]: v}));
                    if (effectsChain[fx.key]) {
                      try {
                        if (fx.key === 'reverb') effectsChain.reverb.set({ wet: v });
                        if (fx.key === 'delay') effectsChain.delay.set({ wet: v });
                        if (fx.key === 'distortion') effectsChain.distortion.set({ distortion: v });
                        if (fx.key === 'filter') effectsChain.filter.set({ frequency: 200 + v * 19800 });
                        if (fx.key === 'chorus') effectsChain.chorus.set({ wet: v });
                      } catch(_) {}
                    }
                  }}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: fx.color }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── SAMPLE PADS TAB ── */}
        {activeTab === 'pads' && (
          <div className="space-y-4">
            {/* Pack selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {SAMPLE_PACKS.map(pack => (
                <button key={pack.id} onClick={() => setActivePack(pack)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ll-interactive shrink-0"
                  style={{
                    background: activePack.id === pack.id ? pack.color + '22' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${activePack.id === pack.id ? pack.color + '60' : 'rgba(255,255,255,0.08)'}`,
                    color: activePack.id === pack.id ? pack.color : 'rgba(255,255,255,0.5)',
                  }}>
                  {pack.emoji} {pack.name}
                </button>
              ))}
            </div>

            {/* 16-pad grid */}
            <div className="grid grid-cols-4 gap-2">
              {activePack.pads.map((pad, idx) => (
                <motion.button
                  key={`${activePack.id}-${idx}`}
                  onPointerDown={() => handlePadPress(pad, idx)}
                  whileTap={{ scale: 0.92 }}
                  className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 p-2 text-center ll-interactive"
                  style={{
                    background: pressedPads.has(idx) ? pad.color + 'aa' : pad.color + '18',
                    border: `1.5px solid ${pressedPads.has(idx) ? pad.color : pad.color + '40'}`,
                    boxShadow: pressedPads.has(idx) ? `0 0 20px ${pad.color}66` : 'none',
                  }}>
                  <span className="text-lg leading-none">
                    {activePack.emoji}
                  </span>
                  <span className="text-[9px] font-semibold leading-tight text-white/80">{pad.name}</span>
                  <span className="text-[8px] text-white/30 font-mono">{pad.note}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── KEYBOARD TAB ── */}
        {activeTab === 'keyboard' && (
          <div className="space-y-4">
            {/* Instrument selector */}
            <div>
              <p className="ll-label text-white/30 mb-2 text-[10px]">INSTRUMENT PRESET</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {Object.entries(
                  INSTRUMENT_PRESETS.reduce((acc, inst) => {
                    if (!acc[inst.category]) acc[inst.category] = [];
                    acc[inst.category].push(inst);
                    return acc;
                  }, {})
                ).map(([cat, insts]) => (
                  <div key={cat} className="col-span-2">
                    <p className="text-white/20 text-[9px] uppercase tracking-wider px-1 mb-1">{cat}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {insts.map(inst => (
                        <button key={inst.id} onClick={() => setActiveInstrument(inst)}
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs ll-interactive text-left"
                          style={{
                            background: activeInstrument.id === inst.id ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${activeInstrument.id === inst.id ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.07)'}`,
                            color: activeInstrument.id === inst.id ? '#f5a623' : 'rgba(255,255,255,0.6)',
                          }}>
                          <span>{inst.emoji}</span>
                          <span className="truncate">{inst.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Octave control */}
            <div className="flex items-center gap-3">
              <p className="text-white/40 text-xs">Octave</p>
              <button onClick={() => setOctave(o => Math.max(1, o-1))}
                className="w-8 h-8 rounded-xl ll-card flex items-center justify-center ll-interactive text-white/50">-</button>
              <span className="text-amber-400 font-mono font-bold w-6 text-center">{octave}</span>
              <button onClick={() => setOctave(o => Math.min(7, o+1))}
                className="w-8 h-8 rounded-xl ll-card flex items-center justify-center ll-interactive text-white/50">+</button>
              <p className="text-white/25 text-xs ml-2">Type keys A-L,W-P to play</p>
            </div>

            {/* Piano keyboard */}
            <div className="overflow-x-auto pb-2">
              <div className="relative h-32 min-w-[600px]">
                {/* White keys */}
                <div className="flex h-full">
                  {KEYBOARD_KEYS.filter(k => !k.black).map((key) => {
                    const noteShort = key.note.replace(/\d/, '');
                    const kbKey = Object.entries(KB_MAP).find(([,v]) => v === key.note)?.[0];
                    const pressed = pressedKeys.has(key.note);
                    return (
                      <button
                        key={key.note}
                        onPointerDown={() => { setPressedKeys(s => new Set([...s, key.note])); playPianoNote(key.note); }}
                        onPointerUp={() => setPressedKeys(s => { const n = new Set(s); n.delete(key.note); return n; })}
                        onPointerLeave={() => setPressedKeys(s => { const n = new Set(s); n.delete(key.note); return n; })}
                        className="flex-1 border border-white/20 rounded-b-lg flex flex-col items-center justify-end pb-2 ll-interactive relative transition-colors"
                        style={{
                          background: pressed ? '#f5a623' : '#f8f8f8',
                          minWidth: 28,
                        }}>
                        <span className="text-[8px] text-black/40 font-mono">{kbKey || ''}</span>
                        <span className="text-[8px] text-black/60">{noteShort}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Black keys — positioned absolutely */}
                <div className="absolute top-0 left-0 w-full h-[60%] pointer-events-none flex">
                  {(() => {
                    const whites = KEYBOARD_KEYS.filter(k => !k.black);
                    const whiteWidth = 100 / whites.length;
                    return KEYBOARD_KEYS.filter(k => k.black).map(key => {
                      // Find position: black key sits between two white keys
                      const whitesBefore = KEYBOARD_KEYS.filter(k => !k.black && k.freq < key.freq);
                      const leftPct = (whitesBefore.length - 0.3) * whiteWidth;
                      const pressed = pressedKeys.has(key.note);
                      return (
                        <button
                          key={key.note}
                          onPointerDown={() => { setPressedKeys(s => new Set([...s, key.note])); playPianoNote(key.note); }}
                          onPointerUp={() => setPressedKeys(s => { const n = new Set(s); n.delete(key.note); return n; })}
                          className="absolute h-full rounded-b-md ll-interactive pointer-events-auto"
                          style={{
                            left: `${leftPct}%`,
                            width: `${whiteWidth * 0.6}%`,
                            background: pressed ? '#f5a623' : '#1a1a2e',
                            border: '1px solid rgba(255,255,255,0.1)',
                            zIndex: 10,
                          }}
                        />
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DJ DECK TAB ── */}
        {activeTab === 'dj' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DJDeck deckId="A" color="#f5a623" onDeckReady={registerDeck} />
              <DJDeck deckId="B" color="#3b82f6" onDeckReady={registerDeck} />
            </div>
            {/* Crossfader */}
            <div className="ll-card p-4 rounded-2xl">
              <p className="ll-label text-white/30 mb-3 text-[10px]">CROSSFADER</p>
              <div className="flex items-center gap-3">
                <span className="text-amber-400 text-xs font-bold w-6">A</span>
                <div className="relative flex-1">
                  <input type="range" min={0} max={100} value={crossfader}
                    onChange={e => { setCrossfader(+e.target.value); applyCrossfade(+e.target.value); }}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: '#ffffff' }} />
                </div>
                <span className="text-amber-400 text-xs font-bold w-6 text-right">B</span>
              </div>
              <div className="flex justify-center mt-2">
                <span className="text-white/30 text-[10px] font-mono">A:{100-crossfader}% | B:{crossfader}%</span>
              </div>
            </div>
          </div>
        )}

        {/* ── MIXER TAB ── */}
        {activeTab === 'mixer' && (
          <div className="ll-card rounded-2xl overflow-hidden">
            <div className="flex border-b border-white/8">
              {channels.map((ch, i) => (
                <div key={i} className="flex-1 flex flex-col items-center border-r border-white/5 last:border-0 p-2 min-w-0">
                  <span className="text-[8px] text-white/30 truncate w-full text-center mb-2">{ch.name}</span>

                  {/* VU meter */}
                  <div className="w-3 h-24 rounded-full overflow-hidden bg-white/5 mb-2 relative">
                    <motion.div className="absolute bottom-0 left-0 right-0 rounded-full"
                      animate={{ height: ch.muted ? '0%' : `${ch.volume}%` }}
                      transition={{ duration: 0.1 }}
                      style={{ background: `linear-gradient(to top, ${ch.color}, ${ch.color}88)` }} />
                  </div>

                  {/* Fader */}
                  <div className="relative h-20 flex justify-center">
                    <input type="range" min={0} max={100} value={ch.volume}
                      orient="vertical"
                      onChange={e => setChannels(chs => chs.map((c,j) => j===i ? {...c, volume: +e.target.value} : c))}
                      className="appearance-none cursor-pointer"
                      style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 80, width: 16, accentColor: ch.color }} />
                  </div>

                  {/* Pan */}
                  <input type="range" min={0} max={100} value={ch.pan}
                    onChange={e => setChannels(chs => chs.map((c,j) => j===i ? {...c, pan: +e.target.value} : c))}
                    className="w-full h-1 appearance-none cursor-pointer mt-1 mb-2"
                    style={{ accentColor: ch.color }} />

                  {/* Mute/Solo */}
                  <button onClick={() => setChannels(chs => chs.map((c,j) => j===i ? {...c, muted: !c.muted} : c))}
                    className="w-6 h-5 rounded text-[8px] font-bold mb-0.5 ll-interactive"
                    style={{ background: ch.muted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)',
                             color: ch.muted ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                    M
                  </button>
                  <button onClick={() => setChannels(chs => chs.map((c,j) => j===i ? {...c, soloed: !c.soloed} : c))}
                    className="w-6 h-5 rounded text-[8px] font-bold ll-interactive"
                    style={{ background: ch.soloed ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.06)',
                             color: ch.soloed ? '#eab308' : 'rgba(255,255,255,0.3)' }}>
                    S
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SEQUENCER TAB ── */}
        {activeTab === 'sequencer' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="ll-label text-white/30 text-[10px]">16-STEP SEQUENCER — {activePack.name}</p>
              <button onClick={() => setSequencer(Array.from({length:4}, () => Array(16).fill(false)))}
                className="text-white/30 text-xs ll-interactive flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>
            {sequencer.map((row, ri) => {
              const pad = activePack.pads[ri];
              return (
                <div key={ri} className="flex items-center gap-1">
                  <div className="w-20 shrink-0">
                    <p className="text-white/50 text-[10px] truncate">{pad?.name || `Pad ${ri+1}`}</p>
                  </div>
                  <div className="flex gap-1 flex-1">
                    {row.map((active, si) => (
                      <button key={si}
                        onClick={() => setSequencer(seq => seq.map((r, ri2) =>
                          ri2 === ri ? r.map((s, si2) => si2 === si ? !s : s) : r
                        ))}
                        className="flex-1 h-8 rounded-lg ll-interactive transition-all"
                        style={{
                          background: currentStep === si
                            ? '#f5a623'
                            : active
                              ? (pad?.color || '#6366f1')
                              : si % 4 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${active ? (pad?.color || '#6366f1') + '60' : 'rgba(255,255,255,0.06)'}`,
                          transform: currentStep === si ? 'scaleY(1.1)' : 'none',
                        }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── LEGION AI COMPOSER ── */}
        {activeTab === 'ai' && (
          <LegionAIComposer
            onLoadToSequencer={(track) => {
              // Map AI track structure into sequencer rows
              if (!track?.sections) return;
              const newSeq = Array.from({ length: 4 }, () => Array(16).fill(false));
              track.sections.slice(0, 4).forEach((section, row) => {
                const activity = section.arrangement?.[row]?.activity || 50;
                const active = Math.round(activity / 100 * 16);
                for (let i = 0; i < active; i++) newSeq[row][i * Math.floor(16/active)] = true;
              });
              setSequencer(newSeq);
              if (track.bpm) setBpm(track.bpm);
              setActiveTab('sequencer');
              import('sonner').then(m => m.toast.success('Track loaded into sequencer'));
            }}
          />
        )}
      {/* ── MUSIC IMPORT TAB ── */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <MusicImportTab />
        </div>
      )}
      </div>
    </div>
  );
}
