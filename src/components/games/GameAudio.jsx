/**
 * GameAudio — procedural Web Audio API sound effects
 * No files needed. All sounds are synthesized on the fly.
 * Import and call anywhere; AudioContext is lazy-initialized on first use.
 */

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function play(fn) {
  try { fn(getCtx()); } catch (_) {}
}

// ── Oscillator helpers ──────────────────────────────────────────────────────

function osc(ac, type, freq, start, duration, gainVal = 0.3, gainEnd = 0) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(gainVal, start);
  g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.001), start + duration);
  o.start(start);
  o.stop(start + duration + 0.01);
}

function sweep(ac, type, freqStart, freqEnd, start, duration, gainVal = 0.25) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.type = type;
  o.frequency.setValueAtTime(freqStart, start);
  o.frequency.exponentialRampToValueAtTime(freqEnd, start + duration);
  g.gain.setValueAtTime(gainVal, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  o.start(start);
  o.stop(start + duration + 0.01);
}

function noise(ac, start, duration, gainVal = 0.15, filterFreq = 1000) {
  const bufSize = ac.sampleRate * duration;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 1;
  const g = ac.createGain();
  src.connect(filter); filter.connect(g); g.connect(ac.destination);
  g.gain.setValueAtTime(gainVal, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.start(start);
  src.stop(start + duration + 0.01);
}

// ── Public API ───────────────────────────────────────────────────────────────

const GameAudio = {
  /** Jump — rising pitch chirp */
  jump() {
    play((ac) => {
      const t = ac.currentTime;
      sweep(ac, 'square', 220, 520, t, 0.12, 0.2);
      sweep(ac, 'sine', 180, 440, t, 0.14, 0.08);
    });
  },

  /** Coin collect — classic ascending arpeggio */
  coin() {
    play((ac) => {
      const t = ac.currentTime;
      [523, 659, 784, 1047].forEach((freq, i) => {
        osc(ac, 'sine', freq, t + i * 0.06, 0.1, 0.2);
      });
    });
  },

  /** Shoot — short snappy zap */
  shoot() {
    play((ac) => {
      const t = ac.currentTime;
      sweep(ac, 'sawtooth', 600, 80, t, 0.12, 0.25);
      noise(ac, t, 0.06, 0.08, 3000);
    });
  },

  /** Punch/attack — thuddy impact */
  attack() {
    play((ac) => {
      const t = ac.currentTime;
      sweep(ac, 'sine', 180, 40, t, 0.18, 0.35);
      noise(ac, t, 0.08, 0.2, 400);
    });
  },

  /** Kick — lower, heavier thud */
  kick() {
    play((ac) => {
      const t = ac.currentTime;
      sweep(ac, 'sine', 120, 30, t, 0.22, 0.4);
      noise(ac, t, 0.1, 0.25, 200);
    });
  },

  /** Enemy stomp (Mario) */
  stomp() {
    play((ac) => {
      const t = ac.currentTime;
      sweep(ac, 'square', 300, 80, t, 0.1, 0.3);
      noise(ac, t, 0.06, 0.15, 600);
    });
  },

  /** Player hit / take damage */
  hit() {
    play((ac) => {
      const t = ac.currentTime;
      osc(ac, 'sawtooth', 220, t, 0.05, 0.3);
      osc(ac, 'sawtooth', 180, t + 0.05, 0.08, 0.25);
      noise(ac, t, 0.12, 0.18, 800);
    });
  },

  /** Rupee pickup (Zelda style) */
  rupee() {
    play((ac) => {
      const t = ac.currentTime;
      sweep(ac, 'sine', 740, 1100, t, 0.1, 0.2);
      osc(ac, 'sine', 1400, t + 0.08, 0.12, 0.15);
    });
  },

  /** Sword swing */
  sword() {
    play((ac) => {
      const t = ac.currentTime;
      sweep(ac, 'sawtooth', 800, 200, t, 0.15, 0.22);
      noise(ac, t, 0.1, 0.1, 2000);
    });
  },

  /** Tetris piece land */
  land() {
    play((ac) => {
      const t = ac.currentTime;
      noise(ac, t, 0.07, 0.18, 500);
      osc(ac, 'sine', 120, t, 0.07, 0.2);
    });
  },

  /** Tetris line clear */
  lineClear(count = 1) {
    play((ac) => {
      const t = ac.currentTime;
      const freqs = count >= 4
        ? [523, 659, 784, 1047, 1319]  // Tetris! fanfare
        : [440, 554, 659];
      freqs.forEach((f, i) => osc(ac, 'sine', f, t + i * 0.07, 0.18, 0.25));
      if (count >= 4) {
        sweep(ac, 'sine', 800, 1600, t + 0.35, 0.2, 0.3);
      }
    });
  },

  /** Game over — descending gloom */
  gameOver() {
    play((ac) => {
      const t = ac.currentTime;
      [440, 370, 311, 220].forEach((f, i) => {
        osc(ac, 'sawtooth', f, t + i * 0.18, 0.25, 0.28 - i * 0.04);
      });
      sweep(ac, 'sine', 200, 60, t + 0.8, 0.5, 0.2);
    });
  },

  /** Win / level complete — triumphant arpeggio */
  win() {
    play((ac) => {
      const t = ac.currentTime;
      [523, 659, 784, 1047, 1319, 1047, 784, 659, 523].forEach((f, i) => {
        osc(ac, 'sine', f, t + i * 0.09, 0.15, 0.3);
      });
      osc(ac, 'triangle', 1047, t + 0.85, 0.4, 0.35);
    });
  },
};

export default GameAudio;