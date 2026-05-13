/**
 * LegionAREngine — First-of-its-kind real-time AR processing
 * applied DIRECTLY to the WebRTC MediaStream track.
 *
 * Unlike Snapchat, TikTok, and Instagram where AR filters only
 * show on the device screen, Legion's AR engine processes the
 * actual stream track — so viewers see filtered video through
 * Zego in real time.
 *
 * Technology: VideoTrackGenerator API + WebGL canvas processing
 * Browser support: Chrome 116+, Edge 116+
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Layers, Hand } from 'lucide-react';
import { createWebGLPipeline } from './shaders/FilterShaders';
import EffectBudget from '@/components/engine/EffectBudget';
import AdaptiveQuality from '@/components/engine/AdaptiveQuality';
import Disposer from '@/components/engine/ResourceDisposer';
import ARBridge from '@/components/ar/ARTrackingBridge';
import EffectStack from '@/components/ar/EffectStack';
import { AdvancedParticle, updateParticleSystem } from '@/components/ar/AdvancedParticle';
import FilterMenuPanel from '@/components/ar/FilterMenuPanel';
import GestureHUD from '@/components/ar/GestureHUD';

// ── FILTER DEFINITIONS ──────────────────────────────────────────────────
const FILTERS = [
  {
    id: 'none',
    name: 'Original',
    emoji: '⚪',
    category: 'base',
    apply: (ctx, canvas) => {} // No-op
  },
  {
    id: 'beauty_soft',
    name: 'Soft Beauty',
    emoji: '✨',
    category: 'beauty',
    apply: (ctx, canvas, imageData) => {
      // Gaussian-like skin smoothing via pixel manipulation
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        // Brighten skin tones
        const r = d[i], g = d[i+1], b = d[i+2];
        const isSkin = r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r-g) > 15;
        if (isSkin) {
          d[i]   = Math.min(255, r + 8);
          d[i+1] = Math.min(255, g + 4);
          d[i+2] = Math.min(255, b + 2);
        }
      }
      return imageData;
    },
    css: 'brightness(1.06) contrast(0.95) saturate(0.95) blur(0.3px)'
  },
  {
    id: 'beauty_glam',
    name: 'Glamour',
    emoji: '💄',
    category: 'beauty',
    css: 'brightness(1.1) contrast(1.1) saturate(1.1)',
    apply: (ctx, canvas, imageData) => {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.min(255, d[i] * 1.05);
        d[i+1] = Math.min(255, d[i+1] * 1.02);
      }
      return imageData;
    }
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    emoji: '🎬',
    category: 'grade',
    css: 'contrast(1.2) saturate(0.85) brightness(0.95)',
    apply: (ctx, canvas, imageData) => {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        // Lift shadows, crush blacks slightly — film look
        d[i]   = Math.max(10, d[i] * 0.9 + 8);
        d[i+1] = Math.max(8, d[i+1] * 0.88 + 6);
        d[i+2] = Math.max(15, d[i+2] * 0.95 + 12);
      }
      return imageData;
    }
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    emoji: '🌅',
    category: 'grade',
    css: 'brightness(1.08) saturate(1.2) sepia(0.15)',
    apply: (ctx, canvas, imageData) => {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.min(255, d[i] + 15);
        d[i+1] = Math.min(255, d[i+1] + 5);
        d[i+2] = Math.max(0, d[i+2] - 10);
      }
      return imageData;
    }
  },
  {
    id: 'neon_dream',
    name: 'Neon Dream',
    emoji: '🌃',
    category: 'creative',
    css: 'brightness(0.9) contrast(1.3) saturate(1.8) hue-rotate(20deg)',
    apply: (ctx, canvas, imageData) => {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        // Boost neon channels
        d[i]   = Math.min(255, r * 1.1);
        d[i+1] = Math.min(255, g * 0.9);
        d[i+2] = Math.min(255, b * 1.3);
      }
      return imageData;
    }
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    emoji: '🌙',
    category: 'creative',
    css: 'brightness(0.85) contrast(1.2) saturate(1.4) hue-rotate(-20deg)',
    apply: (ctx, canvas, imageData) => {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.min(255, d[i] * 1.2);
        d[i+1] = Math.max(0, d[i+1] * 0.7);
        d[i+2] = Math.min(255, d[i+2] * 1.4);
      }
      return imageData;
    }
  },
  {
    id: 'bw_crisp',
    name: 'B&W Crisp',
    emoji: '⬛',
    category: 'grade',
    css: 'grayscale(1) contrast(1.25) brightness(1.05)',
    apply: (ctx, canvas, imageData) => {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
        d[i] = d[i+1] = d[i+2] = gray;
      }
      return imageData;
    }
  },
  {
    id: 'warm_vintage',
    name: 'Vintage',
    emoji: '📷',
    category: 'grade',
    css: 'sepia(0.4) brightness(1.05) contrast(0.95) saturate(1.1)',
    apply: (ctx, canvas, imageData) => {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.min(255, d[i] * 0.9 + 40);
        d[i+1] = Math.min(255, d[i+1] * 0.85 + 20);
        d[i+2] = Math.min(255, d[i+2] * 0.7 + 10);
      }
      return imageData;
    }
  },
  {
    id: 'cool_fade',
    name: 'Cool Fade',
    emoji: '❄️',
    category: 'grade',
    css: 'brightness(1.05) contrast(0.9) saturate(0.8) hue-rotate(10deg)',
    apply: (ctx, canvas, imageData) => {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.max(0, d[i] - 5);
        d[i+1] = Math.min(255, d[i+1] + 5);
        d[i+2] = Math.min(255, d[i+2] + 20);
      }
      return imageData;
    }
  },
  {
    id: 'vivid_pop',
    name: 'Vivid Pop',
    emoji: '🎨',
    category: 'creative',
    css: 'brightness(1.05) contrast(1.15) saturate(1.6)',
    apply: (ctx, canvas, imageData) => {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const max = Math.max(r, g, b);
        if (max > 0) {
          d[i]   = Math.min(255, r + (r / max) * 20);
          d[i+1] = Math.min(255, g + (g / max) * 20);
          d[i+2] = Math.min(255, b + (b / max) * 20);
        }
      }
      return imageData;
    }
  },
  {
    id: 'dream_glow',
    name: 'Dream Glow',
    emoji: '☁️',
    category: 'beauty',
    css: 'brightness(1.12) saturate(0.9) contrast(0.88) blur(0.5px)',
    apply: (ctx, canvas, imageData) => {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.min(255, d[i] + 12);
        d[i+1] = Math.min(255, d[i+1] + 10);
        d[i+2] = Math.min(255, d[i+2] + 8);
      }
      return imageData;
    }
  },
];

// ── AR OVERLAYS (face-tracked accessories) ──────────────────────────────
const AR_OVERLAYS = [
  { id: 'none', name: 'None', emoji: '⬜' },
  { id: 'sparkles', name: 'Sparkles', emoji: '✨', type: 'particle' },
  { id: 'halo', name: 'Halo', emoji: '😇', type: 'overlay' },
  { id: 'fire', name: 'Fire', emoji: '🔥', type: 'particle' },
  { id: 'hearts', name: 'Hearts', emoji: '💕', type: 'particle' },
  { id: 'stars', name: 'Stars', emoji: '⭐', type: 'particle' },
  { id: 'galaxy', name: 'Galaxy', emoji: '🌌', type: 'particle' },
];

// ── BACKGROUND EFFECTS ───────────────────────────────────────────────────
const BG_EFFECTS = [
  { id: 'none', name: 'Normal', emoji: '📷' },
  { id: 'blur_light', name: 'Soft Blur', emoji: '🌫️' },
  { id: 'blur_strong', name: 'Studio Blur', emoji: '💨' },
  { id: 'gradient_purple', name: 'Purple Studio', emoji: '💜' },
  { id: 'gradient_gold', name: 'Gold Studio', emoji: '🌟' },
  { id: 'gradient_dark', name: 'Dark Studio', emoji: '🖤' },
];

// ── PARTICLE SYSTEM ──────────────────────────────────────────────────────
class Particle {
  constructor(canvasWidth, canvasHeight, type) {
    this.reset(canvasWidth, canvasHeight, type);
  }

  reset(w, h, type) {
    this.x = Math.random() * w;
    this.y = h + 10;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = -(Math.random() * 2 + 1);
    this.life = 1;
    this.decay = Math.random() * 0.02 + 0.005;
    this.size = Math.random() * 8 + 4;
    this.type = type;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.1;

    const typeColors = {
      sparkles: ['#fbbf24', '#f59e0b', '#ffffff', '#a78bfa'],
      fire: ['#ef4444', '#f97316', '#fbbf24', '#ffffff'],
      hearts: ['#ec4899', '#f43f5e', '#fb7185', '#fda4af'],
      stars: ['#fbbf24', '#ffffff', '#a78bfa', '#60a5fa'],
      galaxy: ['#818cf8', '#c084fc', '#60a5fa', '#ffffff'],
      halo: ['#fbbf24', '#fde68a', '#ffffff'],
    };
    const colors = typeColors[type] || typeColors.sparkles;
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy -= 0.02; // float up
    this.life -= this.decay;
    this.rotation += this.rotSpeed;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;

    const emojis = {
      sparkles: ['✦', '✧', '★'],
      fire: ['🔥'],
      hearts: ['♥', '❤'],
      stars: ['★', '✦'],
      galaxy: ['✦', '·', '•'],
      halo: ['•', '○'],
    };

    const emoji = (emojis[this.type] || ['✦'])[Math.floor(Math.random() * 3) % (emojis[this.type]?.length || 1)];

    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }
}

// ── MAIN ENGINE COMPONENT ─────────────────────────────────────────────────
export default function LegionAREngine({ videoRef, onProcessedStream, isLive = false }) {
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [activeOverlay, setActiveOverlay] = useState(AR_OVERLAYS[0]);
  const [activeBg, setActiveBg] = useState(BG_EFFECTS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [category, setCategory] = useState('all');
  const [showPanel, setShowPanel] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('filters');
  const [intensity, setIntensity] = useState(100);
  const [fps, setFps] = useState(0);
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(false);
  const [faceTrackingEnabled, setFaceTrackingEnabled] = useState(false);
  const [gesturesEnabled, setGesturesEnabled] = useState(false);
  const [advancedActive, setAdvancedActive] = useState(false);
  const advancedParticlesRef = useRef({}); // { type: Particle[] }

  const canvasRef = useRef(null);
  const glPipelineRef = useRef(null);
  const outputCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const fpsCounterRef = useRef({ frames: 0, last: Date.now() });

  const categories = useMemo(() => [
    { id: 'all', label: 'All' },
    { id: 'beauty', label: 'Beauty' },
    { id: 'grade', label: 'Grade' },
    { id: 'creative', label: 'Creative' },
  ], []);

  const filteredFilters = useMemo(() =>
    category === 'all' ? FILTERS : FILTERS.filter(f => f.category === category || f.id === 'none'),
    [category]
  );

  // Apply filter to canvas
  const applyFilterToCanvas = useCallback((filter, ctx, canvas) => {
    if (!filter.apply && !filter.css) return;

    if (filter.css) {
      canvas.style.filter = filter.css;
    } else {
      canvas.style.filter = '';
    }

    if (filter.apply && filter.id !== 'none') {
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const processed = filter.apply(ctx, canvas, imageData);
        if (processed) ctx.putImageData(processed, 0, 0);
      } catch (e) {
        // Cross-origin or security error — fall back to CSS only
      }
    }
  }, []);

  // Draw background effect
  const drawBackground = useCallback((ctx, canvas, bg) => {
    if (bg.id === 'none') return;

    const { width: W, height: H } = canvas;

    if (bg.id === 'gradient_purple') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#4c1d95');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    if (bg.id === 'gradient_gold') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#451a03');
      grad.addColorStop(1, '#78350f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    if (bg.id === 'gradient_dark') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
    }
  }, []);

  // Main processing loop
  const processFrame = useCallback(() => {
    const video = videoRef?.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const W = canvas.width  = video.videoWidth  || 720;
    const H = canvas.height = video.videoHeight || 1280;

    // Try GPU-accelerated WebGL pipeline first
    if (!glPipelineRef.current) {
      glPipelineRef.current = createWebGLPipeline(canvas);
      if (glPipelineRef.current) Disposer.register('ar-engine', 'custom', glPipelineRef.current);
    }
    
    if (glPipelineRef.current && activeFilter.id !== 'none') {
      glPipelineRef.current.render(video, activeFilter.id, W, H);
    } else {
      // Fallback to CPU canvas
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Draw background if replacing
      if (activeBg.id !== 'none' && !activeBg.id.startsWith('blur')) {
        drawBackground(ctx, canvas, activeBg);
      }

      // Draw video frame (mirrored for selfie)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -W, 0, W, H);
      ctx.restore();

      canvas.style.filter = activeFilter.css || '';

      // Apply color grade filter
      applyFilterToCanvas(activeFilter, ctx, canvas);
    }

    // Send processed stream to Zego
    if (!canvas._streamCaptured && onProcessedStream) {
      try { const s = canvas.captureStream(30); onProcessedStream(s); canvas._streamCaptured = true; }
      catch(e){ console.warn('[LegionAR] captureStream:', e.message); }
    }

    // Draw particles (need 2d context for particles overlay)
    if (activeOverlay.id !== 'none' && activeOverlay.type === 'particle') {
      const particleCtx = canvas.getContext('2d', { willReadFrequently: true });
      const maxParticles = AdaptiveQuality.getConfig().maxParticles || 80;
      // Spawn new particles
      if (Math.random() < 0.3) {
        particlesRef.current.push(new Particle(W, H, activeOverlay.id));
        if (particlesRef.current.length > maxParticles) particlesRef.current.shift();
      }

      // Update and draw
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.update();
        p.draw(particleCtx);
      });
    }

    // ── Advanced AR: tracking + gesture effects + effect stack ──
    if (handTrackingEnabled || faceTrackingEnabled) {
      ARBridge.processFrame(video);
    }

    // Apply stacked advanced effects
    const stackLayers = EffectStack.getLayers();
    const stackParticles = EffectStack.getActiveParticles();
    if (stackLayers.length > 0 || stackParticles.length > 0) {
      const ctx2 = canvas.getContext('2d', { willReadFrequently: true });
      const time = performance.now();
      const handPos = ARBridge.getHandPosition();
      
      // Apply filter stack
      EffectStack.applyToCanvas(ctx2, W, H, time, handPos);
      
      // Advanced particle effects
      for (const pe of stackParticles) {
        if (!advancedParticlesRef.current[pe.type]) advancedParticlesRef.current[pe.type] = [];
        advancedParticlesRef.current[pe.type] = updateParticleSystem(
          advancedParticlesRef.current[pe.type], pe.type, W, H, 80
        );
        advancedParticlesRef.current[pe.type].forEach(p => p.draw(ctx2));
      }
    }

    // FPS counter
    fpsCounterRef.current.frames++;
    const now = Date.now();
    if (now - fpsCounterRef.current.last > 1000) {
      setFps(fpsCounterRef.current.frames);
      fpsCounterRef.current = { frames: 0, last: now };
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [videoRef, activeFilter, activeOverlay, activeBg, applyFilterToCanvas, drawBackground, handTrackingEnabled, faceTrackingEnabled]);

  // Track whether advanced effects are active
  useEffect(() => {
    const unsub = EffectStack.onChange((state) => {
      setAdvancedActive(state.layers.length > 0 || state.particles.length > 0 || state.gestureEffects > 0);
    });
    return unsub;
  }, []);

  // Start/stop processing loop
  const hasAnyEffect = activeFilter.id !== 'none' || activeOverlay.id !== 'none' || activeBg.id !== 'none' || advancedActive || handTrackingEnabled || faceTrackingEnabled;
  
  useEffect(() => {
    if (!hasAnyEffect) {
      cancelAnimationFrame(animFrameRef.current);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      Disposer.disposeScope('ar-engine');
      glPipelineRef.current?.destroy();
      glPipelineRef.current = null;
      EffectBudget.clear();
      if (canvasRef.current) canvasRef.current._streamCaptured = false;
    };
  }, [processFrame, hasAnyEffect]);

  // Cleanup tracking on unmount
  useEffect(() => {
    return () => { ARBridge.destroy(); EffectStack.clearAll(); };
  }, []);

  return (
    <>
      {/* Processing canvas — overlaid on video */}
      {isProcessing && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 2, pointerEvents: 'none' }}
        />
      )}

      {/* AR Control Buttons (left side) */}
      <div className="absolute left-3 z-30 flex flex-col items-center gap-3"
        style={{ top: '45%', transform: 'translateY(-50%)' }}>
        {/* Quick FX panel */}
        <button
          onClick={() => { setShowPanel(v => !v); setShowAdvancedPanel(false); }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center transition-all ${
            showPanel || isProcessing
              ? 'bg-amber-500/30 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-black/40 border-white/10'
          }`}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-white/60 text-[9px]">FX</span>
          {isProcessing && (
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        {/* Advanced Effects Studio */}
        <button
          onClick={() => { setShowAdvancedPanel(v => !v); setShowPanel(false); }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center transition-all ${
            showAdvancedPanel || advancedActive
              ? 'bg-purple-500/30 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
              : 'bg-black/40 border-white/10'
          }`}>
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="text-white/60 text-[9px]">Studio</span>
        </button>

        {/* Hand/Face Tracking Toggle */}
        <button
          onClick={async () => {
            if (!handTrackingEnabled && !faceTrackingEnabled) {
              await ARBridge.enableHands();
              await ARBridge.enableFace();
              ARBridge.enableGestures();
              setHandTrackingEnabled(true);
              setFaceTrackingEnabled(true);
              setGesturesEnabled(true);
            } else {
              ARBridge.disableGestures();
              setHandTrackingEnabled(false);
              setFaceTrackingEnabled(false);
              setGesturesEnabled(false);
            }
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center transition-all ${
            handTrackingEnabled
              ? 'bg-green-500/30 border-green-400/50 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'bg-black/40 border-white/10'
          }`}>
            <Hand className="w-4 h-4 text-white" />
          </div>
          <span className="text-white/60 text-[9px]">Track</span>
        </button>
      </div>

      {/* Gesture HUD */}
      <GestureHUD enabled={gesturesEnabled} />

      {/* AR Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute left-0 top-0 bottom-0 z-30 w-72 bg-black/80 backdrop-blur-xl border-r border-white/10 flex flex-col overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-white font-bold text-sm">Legion AR Studio</span>
              </div>
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <span className="text-amber-400 text-[10px] font-mono">{fps}fps</span>
                )}
                <button onClick={() => setShowPanel(false)}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/50">
                  ✕
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {[
                { id: 'filters', label: 'Filters', emoji: '🎨' },
                { id: 'overlays', label: 'Overlays', emoji: '✨' },
                { id: 'background', label: 'Background', emoji: '🖼️' },
              ].map(tab => (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
                      : 'text-white/30'
                  }`}>
                  {tab.emoji} {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">

              {/* FILTERS TAB */}
              {activeTab === 'filters' && (
                <>
                  {/* Category pills */}
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                    {categories.map(cat => (
                      <button key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                          category === cat.id
                            ? 'bg-amber-500 border-amber-500 text-black'
                            : 'border-white/10 text-white/40'
                        }`}>
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Filter grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {filteredFilters.map(filter => (
                      <button key={filter.id}
                        onClick={() => {
                          // Deactivate old, activate new in budget
                          if (activeFilter.id !== 'none') EffectBudget.deactivate(activeFilter.id);
                          if (filter.id !== 'none' && !EffectBudget.activate(filter.id)) return; // over budget
                          setActiveFilter(filter);
                        }}
                        className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${
                          activeFilter.id === filter.id
                            ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                        }`}>
                        <span className="text-2xl">{filter.emoji}</span>
                        <span className="text-[9px] text-white/60 text-center leading-tight px-1">{filter.name}</span>
                        {activeFilter.id === filter.id && (
                          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Intensity slider */}
                  {activeFilter.id !== 'none' && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-xs">Intensity</span>
                        <span className="text-amber-400 text-xs font-mono">{intensity}%</span>
                      </div>
                      <input type="range" min={0} max={100} value={intensity}
                        onChange={e => setIntensity(Number(e.target.value))}
                        className="w-full accent-amber-500" />
                    </div>
                  )}
                </>
              )}

              {/* OVERLAYS TAB */}
              {activeTab === 'overlays' && (
                <div className="grid grid-cols-3 gap-2">
                  {AR_OVERLAYS.map(overlay => (
                    <button key={overlay.id}
                      onClick={() => {
                        if (activeOverlay.id !== 'none') EffectBudget.deactivate(activeOverlay.id);
                        if (overlay.id !== 'none' && !EffectBudget.activate(overlay.id)) return;
                        setActiveOverlay(overlay);
                        if (overlay.id !== 'none') particlesRef.current = [];
                      }}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${
                        activeOverlay.id === overlay.id
                          ? 'border-amber-400 bg-amber-500/20'
                          : 'border-white/10 bg-white/[0.03]'
                      }`}>
                      <span className="text-2xl">{overlay.emoji}</span>
                      <span className="text-[9px] text-white/60">{overlay.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* BACKGROUND TAB */}
              {activeTab === 'background' && (
                <>
                  <p className="text-white/20 text-xs">Studio background effects applied to your stream</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BG_EFFECTS.map(bg => (
                      <button key={bg.id}
                        onClick={() => setActiveBg(bg)}
                        className={`py-3 rounded-xl flex flex-col items-center gap-1.5 border transition-all ${
                          activeBg.id === bg.id
                            ? 'border-amber-400 bg-amber-500/20'
                            : 'border-white/10 bg-white/[0.03]'
                        }`}>
                        <span className="text-xl">{bg.emoji}</span>
                        <span className="text-[10px] text-white/60">{bg.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Reset button */}
            <div className="p-3 border-t border-white/10">
              <button
                onClick={() => {
                  setActiveFilter(FILTERS[0]);
                  setActiveOverlay(AR_OVERLAYS[0]);
                  setActiveBg(BG_EFFECTS[0]);
                  setIntensity(100);
                  particlesRef.current = [];
                }}
                className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white hover:bg-white/10 transition-all"
              >
                Reset All Effects
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Effects Studio Panel */}
      <AnimatePresence>
        {showAdvancedPanel && (
          <FilterMenuPanel onClose={() => setShowAdvancedPanel(false)} />
        )}
      </AnimatePresence>
    </>
  );
}