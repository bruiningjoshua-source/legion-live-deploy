/**
 * AdvancedFilters — 50 filter/effect definitions organized by category.
 * Each filter has: id, name, emoji, category, cost, shader/apply function.
 * These are consumed by the EffectStack and FilterMenu.
 */

// ── CATEGORY DEFINITIONS ──
export const FILTER_CATEGORIES = [
  { id: 'trending', label: '🔥 Trending', color: '#ef4444' },
  { id: 'beauty', label: '✨ Beauty', color: '#ec4899' },
  { id: 'cinematic', label: '🎬 Cinematic', color: '#f59e0b' },
  { id: 'retro', label: '📼 Retro', color: '#a78bfa' },
  { id: 'horror', label: '👻 Horror', color: '#6b7280' },
  { id: 'anime', label: '🌸 Anime', color: '#f472b6' },
  { id: 'cyberpunk', label: '🌃 Cyberpunk', color: '#06b6d4' },
  { id: 'fantasy', label: '🔮 Fantasy', color: '#8b5cf6' },
  { id: 'interactive', label: '🎯 Interactive', color: '#10b981' },
  { id: 'particle', label: '✦ Particle FX', color: '#fbbf24' },
];

// ── 50 FILTERS ──
export const ADVANCED_FILTERS = [
  // VISUAL FILTERS (1-20)
  { id: 'dither', name: 'Dither', emoji: '▪️', category: 'retro', cost: 1,
    css: 'contrast(1.4) brightness(0.9)',
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
        const px = Math.floor(i / 4); const x = px % w; const y = Math.floor(px / w);
        const threshold = ((x + y) % 2 === 0) ? 128 : 96;
        const val = gray > threshold ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = val;
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'vhs', name: 'VHS', emoji: '📼', category: 'retro', cost: 2,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const noise = (Math.random() - 0.5) * 30;
        d[i] += noise; d[i+1] += noise * 0.5; d[i+2] += noise;
        // Scanline effect
        const y = Math.floor(i / 4 / w);
        if (y % 3 === 0) { d[i] *= 0.85; d[i+1] *= 0.85; d[i+2] *= 0.85; }
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'chromatic_aberration', name: 'Chromatic', emoji: '🌈', category: 'cyberpunk', cost: 2,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const out = ctx.createImageData(w, h);
      const shift = 3;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const rIdx = (y * w + Math.min(w-1, x + shift)) * 4;
          const bIdx = (y * w + Math.max(0, x - shift)) * 4;
          out.data[i] = img.data[rIdx];
          out.data[i+1] = img.data[i+1];
          out.data[i+2] = img.data[bIdx+2];
          out.data[i+3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
    }
  },
  { id: 'rgb_split', name: 'RGB Split', emoji: '🔴🟢🔵', category: 'cyberpunk', cost: 2,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h);
      const out = ctx.createImageData(w, h);
      const s = 5;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        out.data[i] = img.data[(y * w + Math.min(w-1, x + s)) * 4];
        out.data[i+1] = img.data[i+1];
        out.data[i+2] = img.data[(y * w + Math.max(0, x - s)) * 4 + 2];
        out.data[i+3] = 255;
      }
      ctx.putImageData(out, 0, 0);
    }
  },
  { id: 'film_grain', name: 'Film Grain', emoji: '🎞️', category: 'cinematic', cost: 1,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const grain = (Math.random() - 0.5) * 25;
        d[i] += grain; d[i+1] += grain; d[i+2] += grain;
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'crt_scanlines', name: 'CRT Scanlines', emoji: '📺', category: 'retro', cost: 1,
    apply: (ctx, w, h) => {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    }
  },
  { id: 'analog_noise', name: 'Analog Noise', emoji: '📡', category: 'retro', cost: 1,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 16) { // sample every 4th pixel for perf
        const n = (Math.random() - 0.5) * 40;
        d[i] += n; d[i+1] += n; d[i+2] += n;
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'bloom', name: 'Bloom', emoji: '🌟', category: 'beauty', cost: 1,
    css: 'brightness(1.15) contrast(0.95) blur(0.3px)' },
  { id: 'soft_glow', name: 'Soft Glow', emoji: '💫', category: 'beauty', cost: 1,
    css: 'brightness(1.12) saturate(0.9) contrast(0.88) blur(0.5px)' },
  { id: 'sharpen', name: 'Sharpen', emoji: '🔪', category: 'cinematic', cost: 1,
    css: 'contrast(1.2) brightness(1.02)' },
  { id: 'tilt_shift', name: 'Tilt Shift', emoji: '🔍', category: 'cinematic', cost: 2,
    apply: (ctx, w, h) => {
      // Darken top and bottom edges
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0.4)');
      grad.addColorStop(0.35, 'rgba(0,0,0,0)');
      grad.addColorStop(0.65, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    }
  },
  { id: 'dream_blur', name: 'Dream Blur', emoji: '☁️', category: 'fantasy', cost: 1,
    css: 'brightness(1.1) blur(1px) saturate(0.85)' },
  { id: 'gaussian_blur', name: 'Gaussian Blur', emoji: '🌫️', category: 'cinematic', cost: 1,
    css: 'blur(2px)' },
  { id: 'pixelate', name: 'Pixelate', emoji: '🟩', category: 'retro', cost: 2,
    apply: (ctx, w, h) => {
      const size = 8;
      ctx.imageSmoothingEnabled = false;
      const temp = document.createElement('canvas');
      temp.width = Math.ceil(w / size); temp.height = Math.ceil(h / size);
      temp.getContext('2d').drawImage(ctx.canvas, 0, 0, temp.width, temp.height);
      ctx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
    }
  },
  { id: 'thermal', name: 'Thermal Vision', emoji: '🌡️', category: 'horror', cost: 2,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const temp = (d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114) / 255;
        d[i] = temp > 0.5 ? 255 : temp * 510;
        d[i+1] = temp > 0.5 ? (1 - temp) * 510 : temp * 510;
        d[i+2] = temp < 0.5 ? 255 - temp * 510 : 0;
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'infrared', name: 'Infrared', emoji: '🔴', category: 'horror', cost: 1,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        d[i] = Math.min(255, r * 1.5);
        d[i+1] = Math.max(0, g * 0.3);
        d[i+2] = Math.max(0, b * 0.3);
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'night_vision', name: 'Night Vision', emoji: '🟢', category: 'horror', cost: 1,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
        d[i] = 0; d[i+1] = Math.min(255, lum * 1.5); d[i+2] = lum * 0.3;
        d[i] += (Math.random() - 0.5) * 15;
        d[i+1] += (Math.random() - 0.5) * 15;
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'xray', name: 'X-Ray', emoji: '☠️', category: 'horror', cost: 1,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i]; d[i+1] = 255 - d[i+1]; d[i+2] = 255 - d[i+2];
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'cyberpunk_neon', name: 'Cyberpunk Neon', emoji: '🌃', category: 'cyberpunk', cost: 2,
    css: 'brightness(0.9) contrast(1.3) saturate(1.8) hue-rotate(20deg)',
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] * 1.1);
        d[i+1] = Math.min(255, d[i+1] * 0.85);
        d[i+2] = Math.min(255, d[i+2] * 1.3);
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'vaporwave', name: 'Vaporwave', emoji: '🌴', category: 'retro', cost: 2,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] * 1.2 + 20);
        d[i+1] = Math.min(255, d[i+1] * 0.6);
        d[i+2] = Math.min(255, d[i+2] * 1.3 + 30);
      }
      ctx.putImageData(img, 0, 0);
      // Scanlines
      ctx.fillStyle = 'rgba(255,0,255,0.03)';
      for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
    }
  },

  // BEAUTY FILTERS (21-30)
  { id: 'skin_smooth', name: 'Skin Smoothing', emoji: '✨', category: 'beauty', cost: 1,
    css: 'brightness(1.06) contrast(0.95) blur(0.3px)' },
  { id: 'eye_bright', name: 'Eye Brightening', emoji: '👁️', category: 'beauty', cost: 1,
    css: 'brightness(1.08) contrast(1.05)' },
  { id: 'teeth_white', name: 'Teeth Whitening', emoji: '😁', category: 'beauty', cost: 1,
    css: 'brightness(1.05) saturate(0.9)' },
  { id: 'face_slim', name: 'Face Slimming', emoji: '💆', category: 'beauty', cost: 2 },
  { id: 'jawline', name: 'Jawline Enhance', emoji: '💪', category: 'beauty', cost: 2 },
  { id: 'makeup', name: 'Makeup Overlay', emoji: '💄', category: 'beauty', cost: 2 },
  { id: 'lip_tint', name: 'Lip Tint', emoji: '💋', category: 'beauty', cost: 1 },
  { id: 'anime_face', name: 'Anime Face', emoji: '🌸', category: 'anime', cost: 3,
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] + 15);
        d[i+1] = Math.min(255, d[i+1] + 8);
        d[i+2] = Math.min(255, d[i+2] + 15);
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'doll_face', name: 'Doll Face', emoji: '🎀', category: 'anime', cost: 2,
    css: 'brightness(1.15) saturate(0.8) contrast(0.9) blur(0.4px)' },
  { id: 'k_beauty', name: 'K-Beauty', emoji: '🇰🇷', category: 'beauty', cost: 1,
    css: 'brightness(1.1) saturate(0.85) contrast(0.92) blur(0.2px)',
    apply: (ctx, w, h) => {
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] + 8);
        d[i+1] = Math.min(255, d[i+1] + 4);
        d[i+2] = Math.min(255, d[i+2] + 6);
      }
      ctx.putImageData(img, 0, 0);
    }
  },

  // PARTICLE EFFECTS (31-40)
  { id: 'floating_hearts', name: 'Floating Hearts', emoji: '💕', category: 'particle', cost: 2, particleType: 'hearts' },
  { id: 'snow', name: 'Snow', emoji: '❄️', category: 'particle', cost: 2, particleType: 'snow' },
  { id: 'rain', name: 'Rain', emoji: '🌧️', category: 'particle', cost: 2, particleType: 'rain' },
  { id: 'fire_embers', name: 'Fire Embers', emoji: '🔥', category: 'particle', cost: 3, particleType: 'fire' },
  { id: 'lightning', name: 'Lightning', emoji: '⚡', category: 'particle', cost: 2, particleType: 'lightning' },
  { id: 'sakura', name: 'Sakura Petals', emoji: '🌸', category: 'particle', cost: 2, particleType: 'sakura' },
  { id: 'smoke', name: 'Smoke', emoji: '💨', category: 'particle', cost: 2, particleType: 'smoke' },
  { id: 'bubbles', name: 'Bubble FX', emoji: '🫧', category: 'particle', cost: 1, particleType: 'bubbles' },
  { id: 'spark_trails', name: 'Spark Trails', emoji: '⚡', category: 'particle', cost: 2, particleType: 'sparks' },
  { id: 'golden_aura', name: 'Golden Aura', emoji: '✦', category: 'particle', cost: 2, particleType: 'aura' },

  // INTERACTIVE EFFECTS (41-50)
  { id: 'water_ripple', name: 'Water Ripple', emoji: '🌊', category: 'interactive', cost: 3,
    apply: (ctx, w, h, t) => {
      const amp = 2 * Math.sin(t * 0.003);
      ctx.save();
      ctx.translate(amp, Math.sin(t * 0.004) * amp);
      ctx.restore();
    }
  },
  { id: 'spotlight', name: 'Spotlight', emoji: '🔦', category: 'interactive', cost: 1,
    apply: (ctx, w, h, t, handPos) => {
      const cx = handPos ? handPos.x * w : w / 2;
      const cy = handPos ? handPos.y * h : h / 2;
      const grad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 200);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    }
  },
  { id: 'portal', name: 'Portal Ring', emoji: '🌀', category: 'fantasy', cost: 3,
    apply: (ctx, w, h, t) => {
      const cx = w / 2, cy = h / 2;
      const r = 80 + Math.sin(t * 0.002) * 20;
      ctx.save(); ctx.strokeStyle = `hsl(${(t * 0.1) % 360}, 100%, 60%)`;
      ctx.lineWidth = 4; ctx.shadowBlur = 20;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r + 15, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  },
  { id: 'shockwave', name: 'Shockwave Pulse', emoji: '💥', category: 'interactive', cost: 2 },
  { id: 'bass_pulse', name: 'Bass Reactive', emoji: '🎵', category: 'interactive', cost: 2,
    apply: (ctx, w, h, t) => {
      const pulse = Math.abs(Math.sin(t * 0.008)) * 0.15;
      ctx.fillStyle = `rgba(168,85,247,${pulse})`;
      ctx.fillRect(0, 0, w, h);
    }
  },
  { id: 'hologram', name: 'Hologram', emoji: '📡', category: 'cyberpunk', cost: 3,
    apply: (ctx, w, h) => {
      ctx.fillStyle = 'rgba(0,255,255,0.04)';
      for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
      const img = ctx.getImageData(0, 0, w, h); const d = img.data;
      for (let i = 0; i < d.length; i += 8) {
        d[i+1] = Math.min(255, d[i+1] + 10);
        d[i+2] = Math.min(255, d[i+2] + 15);
      }
      ctx.putImageData(img, 0, 0);
    }
  },
  { id: 'matrix_rain', name: 'Matrix Rain', emoji: '🟩', category: 'cyberpunk', cost: 2 },
  { id: 'energy_field', name: 'Energy Field', emoji: '⚡', category: 'fantasy', cost: 2,
    apply: (ctx, w, h, t) => {
      ctx.save();
      ctx.globalAlpha = 0.15;
      const grad = ctx.createRadialGradient(w/2, h/2, 50, w/2, h/2, Math.max(w, h) * 0.4);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.7, `hsla(${(t*0.05)%360}, 80%, 60%, 0.3)`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  },
  { id: 'glitch', name: 'Glitch Warp', emoji: '📺', category: 'cyberpunk', cost: 3,
    apply: (ctx, w, h) => {
      if (Math.random() > 0.7) {
        const sliceH = 5 + Math.random() * 20;
        const sliceY = Math.random() * h;
        const shift = (Math.random() - 0.5) * 20;
        const slice = ctx.getImageData(0, sliceY, w, sliceH);
        ctx.putImageData(slice, shift, sliceY);
      }
    }
  },
  { id: 'letterbox', name: 'Cinematic Letterbox', emoji: '🎬', category: 'cinematic', cost: 0,
    apply: (ctx, w, h) => {
      const barH = h * 0.1;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, barH);
      ctx.fillRect(0, h - barH, w, barH);
    }
  },
];

// Gesture-triggered effects (not in the main filter list but activated via gestures)
export const GESTURE_EFFECTS = {
  beauty_glow: { name: 'Beauty Glow', css: 'brightness(1.15) blur(0.5px) saturate(0.85)', duration: 2000 },
  anime_spark: { name: 'Anime Spark', particleType: 'sparks', duration: 1500 },
  fire_breath: { name: 'Fire Breath', particleType: 'fire', duration: 2000 },
  neon_flash: { name: 'Neon Flash', css: 'brightness(1.5) saturate(2)', duration: 500 },
  zoom_pulse: { name: 'Zoom Pulse', css: 'brightness(1.1)', duration: 800 },
  lens_warp: { name: 'Lens Warp', css: 'contrast(1.3) brightness(0.95)', duration: 1500 },
  film_burn: { name: 'Film Burn', css: 'sepia(0.6) brightness(1.3)', duration: 1200 },
  rgb_split_sweep: { name: 'RGB Sweep', duration: 1000 },
  ascension_glow: { name: 'Ascension', css: 'brightness(1.3) saturate(0.5)', duration: 1500 },
  shadow_fade: { name: 'Shadow Fade', css: 'brightness(0.5)', duration: 1000 },
  strobe: { name: 'Strobe', duration: 1500 },
};

/** Get filter by ID */
export function getFilterById(id) {
  return ADVANCED_FILTERS.find(f => f.id === id) || null;
}

/** Get filters by category */
export function getFiltersByCategory(cat) {
  return ADVANCED_FILTERS.filter(f => f.category === cat);
}

/** Get trending filters (curated selection) */
export function getTrendingFilters() {
  const trendingIds = ['vhs', 'cyberpunk_neon', 'golden_aura', 'anime_face', 'thermal', 'glitch', 'sakura', 'k_beauty'];
  return trendingIds.map(id => getFilterById(id)).filter(Boolean);
}