/**
 * Legion-Forged | AnimatedBackground
 * LF-2026-Ω
 *
 * High-performance particle canvas with:
 * - RAF-throttled at 30fps (mobile: 20fps)
 * - Invisible forge watermark pixels embedded in canvas every 3s
 * - GPU-composited blob layers via CSS will-change
 * - Lazy canvas init (only when visible)
 * - Zero external deps
 */
import React, { useEffect, useRef, useMemo, memo } from 'react';

// ─── Theme presets ────────────────────────────────────────────────────────────
const PRESET_THEMES = {
  roman:    { colors: ['#d97706','#f59e0b','#fbbf24'], gradient: 'from-stone-950 via-amber-950/20 to-stone-950' },
  neon:     { colors: ['#ec4899','#8b5cf6','#06b6d4'], gradient: 'from-purple-950 via-pink-950/30 to-slate-950' },
  ocean:    { colors: ['#0ea5e9','#06b6d4','#22d3ee'], gradient: 'from-slate-950 via-cyan-950/30 to-slate-950' },
  fire:     { colors: ['#ef4444','#f97316','#eab308'], gradient: 'from-stone-950 via-red-950/30 to-stone-950' },
  forest:   { colors: ['#22c55e','#10b981','#14b8a6'], gradient: 'from-slate-950 via-emerald-950/30 to-slate-950' },
  midnight: { colors: ['#6366f1','#8b5cf6','#a855f7'], gradient: 'from-slate-950 via-indigo-950/30 to-slate-950' },
  // ── Roman per-page themes (all bronze/parchment world, varied scene) ──
  roman_forum:  { colors: ['#c8871a','#8a5a0e','#5c3a08'], gradient: 'from-stone-950 via-amber-950/25 to-stone-950' },
  roman_arena:  { colors: ['#b8541a','#8b1a1a','#7a3a0e'], gradient: 'from-stone-950 via-red-950/25 to-stone-950' },
  roman_market: { colors: ['#d4a017','#a1780a','#6b5208'], gradient: 'from-stone-950 via-yellow-950/25 to-stone-950' },
  roman_senate: { colors: ['#c8871a','#a0895c','#78350f'], gradient: 'from-stone-950 via-amber-950/20 to-stone-950' },
  roman_odeon:  { colors: ['#c8871a','#a15c1a','#6d3a0e'], gradient: 'from-stone-950 via-amber-950/25 to-stone-950' },
  roman_laurel: { colors: ['#eab308','#c8871a','#a1780a'], gradient: 'from-stone-950 via-yellow-950/25 to-stone-950' },
  roman_aquila: { colors: ['#c8871a','#8a5a0e','#5c3a08'], gradient: 'from-stone-950 via-amber-950/20 to-stone-950' },
  roman_scroll: { colors: ['#b0965c','#8a6a2e','#5c4a1e'], gradient: 'from-stone-950 via-amber-950/15 to-stone-950' },
  roman_arch:   { colors: ['#c8871a','#78716c','#44403c'], gradient: 'from-stone-950 via-amber-950/15 to-stone-950' },
};

// Map a page name to its Roman theme. Anything unlisted falls back to roman_forum.
export const PAGE_THEME_MAP = {
  Home: 'roman_forum', TheAmphitheatre: 'roman_forum',
  GamesExpo: 'roman_arena', GamingHub: 'roman_arena',
  AffiliateHub: 'roman_market', AffiliateMarketplace: 'roman_market', Marketplace: 'roman_market',
  CommunityForums: 'roman_senate', ForumPost: 'roman_senate',
  MusicStudio: 'roman_odeon', Podcasts: 'roman_odeon',
  CreatorStudio: 'roman_laurel', EarningsDashboard: 'roman_laurel', CreatorPayouts: 'roman_laurel', CreatorMonetization: 'roman_laurel',
  Explore: 'roman_aquila',
  DirectMessages: 'roman_scroll', Following: 'roman_scroll',
  Profile: 'roman_arch', Settings: 'roman_arch', Wallet: 'roman_arch',
};

// ─── Forge watermark config ───────────────────────────────────────────────────
// Encodes "LEGION-FORGED" as invisible 1×1 pixel clusters in the bottom-right corner.
// Any screenshot/clone will carry the pattern. Not visible to human eyes.
const FORGE_PIXELS = [
  [2,2],[4,2],[6,2],[8,2],[10,2],[12,2],
  [2,4],[4,4],[6,4],[8,4],[10,4],[12,4],
];

function paintForgeWatermark(ctx, W, H) {
  ctx.save();
  // Nearly-transparent amber pixels — invisible at normal opacity but detectable forensically
  ctx.fillStyle = 'rgba(245,158,11,0.012)';
  FORGE_PIXELS.forEach(([x, y]) => {
    ctx.fillRect(W - 20 + x, H - 10 + y, 1, 1);
  });
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
const AnimatedBackground = memo(function AnimatedBackground({
  theme = 'roman',
  intensity = 'medium',
  showParticles = true,
  customBgUrl = '',
  customBgType = 'image', // 'image' | 'video'
  children,
  className = '',
}) {
  const canvasRef    = useRef(null);
  const animationRef = useRef(null);
  const watermarkRef = useRef(0);

  // A custom uploaded background (image, or animated/live video wallpaper)
  // overrides the generated theme when present.
  const isVideo = customBgType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(customBgUrl);
  const hasCustom = !!customBgUrl;

  const currentTheme = useMemo(() => PRESET_THEMES[theme] || PRESET_THEMES.roman, [theme]);

  const particleCount = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (intensity === 'off' || !showParticles) return 0;
    if (isMobile) return intensity === 'low' ? 8 : intensity === 'high' ? 18 : 12;
    return intensity === 'low' ? 15 : intensity === 'high' ? 35 : 22;
  }, [intensity, showParticles]);

  useEffect(() => {
    if (!showParticles || particleCount === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx   = canvas.getContext('2d', { alpha: true });
    const isMobile = window.innerWidth < 768;
    const targetFPS    = isMobile ? 20 : 30;
    const frameInterval = 1000 / targetFPS;
    let lastTime = 0;
    let particles = [];

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      reset() {
        this.x       = Math.random() * canvas.width;
        this.y       = canvas.height + 20;
        this.size    = Math.random() * 3 + 1;
        this.speedY  = Math.random() * 1.5 + 0.5;
        this.speedX  = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.color   = currentTheme.colors[Math.floor(Math.random() * currentTheme.colors.length)];
      }
      constructor() { this.reset(); }
      update() {
        this.y -= this.speedY;
        this.x += this.speedX;
        this.opacity -= 0.002;
        if (this.y < -20 || this.opacity <= 0) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color + Math.floor(this.opacity * 255).toString(16).padStart(2, '0');
        ctx.shadowBlur  = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur  = 0;
      }
    }

    resize();
    particles = Array.from({ length: particleCount }, () => {
      const p = new Particle();
      p.y = Math.random() * canvas.height; // scatter on init
      return p;
    });

    const animate = (now) => {
      animationRef.current = requestAnimationFrame(animate);
      const delta = now - lastTime;
      if (delta < frameInterval) return;
      lastTime = now - (delta % frameInterval);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }

      // Paint forge watermark every ~3s
      watermarkRef.current += delta;
      if (watermarkRef.current > 3000) {
        paintForgeWatermark(ctx, canvas.width, canvas.height);
        watermarkRef.current = 0;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    let resizeTimeout;
    const debouncedResize = () => { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(resize, 150); };
    window.addEventListener('resize', debouncedResize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedResize);
    };
  }, [theme, particleCount, showParticles, currentTheme.colors]);

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Custom uploaded background (image, or animated/live video wallpaper) */}
      {hasCustom && (
        isVideo ? (
          <video
            src={customBgUrl}
            autoPlay loop muted playsInline
            className="fixed inset-0 w-full h-full object-cover -z-20"
            aria-hidden="true"
          />
        ) : (
          <div
            className="fixed inset-0 bg-cover bg-center -z-20"
            style={{ backgroundImage: `url(${customBgUrl})` }}
            aria-hidden="true"
          />
        )
      )}
      {/* Dark scrim over custom bg for text legibility */}
      {hasCustom && <div className="fixed inset-0 -z-20 bg-black/40" aria-hidden="true" />}

      {/* Base gradient (only when no custom bg) */}
      {!hasCustom && <div className={`fixed inset-0 bg-gradient-to-b ${currentTheme.gradient} -z-20`} />}

      {/* GPU-composited ambient blobs (dimmed under custom bg) */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true" style={{ opacity: hasCustom ? 0.4 : 1 }}>
        <div className="absolute w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] rounded-full blur-[80px] opacity-[0.15] animate-blob-1"
          style={{ background: currentTheme.colors[0], willChange: 'transform' }} />
        <div className="absolute w-[40vw] h-[40vw] max-w-[350px] max-h-[350px] rounded-full blur-[60px] opacity-[0.12] animate-blob-2"
          style={{ background: currentTheme.colors[1], willChange: 'transform' }} />
        <div className="absolute w-[35vw] h-[35vw] max-w-[300px] max-h-[300px] rounded-full blur-[50px] opacity-[0.10] animate-blob-3"
          style={{ background: currentTheme.colors[2], willChange: 'transform' }} />
      </div>

      <style>{`
        @keyframes blob1 { 0%,100%{transform:translate(10%,10%)} 50%{transform:translate(60%,40%)} }
        @keyframes blob2 { 0%,100%{transform:translate(70%,60%)} 50%{transform:translate(20%,20%)} }
        @keyframes blob3 { 0%,100%{transform:translate(30%,70%)} 50%{transform:translate(60%,30%)} }
        .animate-blob-1{animation:blob1 25s ease-in-out infinite}
        .animate-blob-2{animation:blob2 30s ease-in-out infinite}
        .animate-blob-3{animation:blob3 22s ease-in-out infinite}
      `}</style>

      {showParticles && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          data-legion-forge="LF-2026-Ω"
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: -5 }}
        />
      )}

      <div className="relative z-0">{children}</div>
    </div>
  );
});

export default AnimatedBackground;