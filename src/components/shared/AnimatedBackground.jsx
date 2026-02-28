import React, { useEffect, useRef, useMemo, memo } from 'react';
import { motion } from 'framer-motion';

const PRESET_THEMES = {
  roman: {
    particles: ['✨', '⚡', '🌟'],
    colors: ['#d97706', '#f59e0b', '#fbbf24'],
    gradient: 'from-stone-950 via-amber-950/20 to-stone-950'
  },
  neon: {
    particles: ['💫', '✨', '🔮'],
    colors: ['#ec4899', '#8b5cf6', '#06b6d4'],
    gradient: 'from-purple-950 via-pink-950/30 to-slate-950'
  },
  ocean: {
    particles: ['🌊', '💎', '✨'],
    colors: ['#0ea5e9', '#06b6d4', '#22d3ee'],
    gradient: 'from-slate-950 via-cyan-950/30 to-slate-950'
  },
  fire: {
    particles: ['🔥', '⚡', '💥'],
    colors: ['#ef4444', '#f97316', '#eab308'],
    gradient: 'from-stone-950 via-red-950/30 to-stone-950'
  },
  forest: {
    particles: ['🌿', '✨', '🍃'],
    colors: ['#22c55e', '#10b981', '#14b8a6'],
    gradient: 'from-slate-950 via-emerald-950/30 to-slate-950'
  },
  midnight: {
    particles: ['⭐', '🌙', '✨'],
    colors: ['#6366f1', '#8b5cf6', '#a855f7'],
    gradient: 'from-slate-950 via-indigo-950/30 to-slate-950'
  }
};

const AnimatedBackground = memo(function AnimatedBackground({ 
  theme = 'roman', 
  intensity = 'medium',
  showParticles = true,
  children,
  className = ''
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const currentTheme = useMemo(() => PRESET_THEMES[theme] || PRESET_THEMES.roman, [theme]);
  
  // Reduced particle count for better mobile performance
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
    
    const ctx = canvas.getContext('2d', { alpha: true });
    let particles = [];
    let lastTime = 0;
    const targetFPS = 30; // Cap FPS for performance
    const frameInterval = 1000 / targetFPS;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      constructor() {
        this.reset();
      }
      
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 20;
        this.size = Math.random() * 3 + 1;
        this.speedY = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.color = currentTheme.colors[Math.floor(Math.random() * currentTheme.colors.length)];
      }
      
      update() {
        this.y -= this.speedY;
        this.x += this.speedX;
        this.opacity -= 0.002;
        
        if (this.y < -20 || this.opacity <= 0) {
          this.reset();
        }
      }
      
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color + Math.floor(this.opacity * 255).toString(16).padStart(2, '0');
        ctx.fill();
        
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
        particles[i].y = Math.random() * canvas.height; // Scatter initially
      }
    };

    const animate = (currentTime) => {
      animationRef.current = requestAnimationFrame(animate);
      
      // Throttle to target FPS
      const deltaTime = currentTime - lastTime;
      if (deltaTime < frameInterval) return;
      lastTime = currentTime - (deltaTime % frameInterval);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
    };

    resize();
    init();
    animationRef.current = requestAnimationFrame(animate);

    // Debounced resize handler
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 150);
    };
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedResize);
    };
  }, [theme, particleCount, showParticles, currentTheme.colors]);

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Base gradient */}
      <div className={`fixed inset-0 bg-gradient-to-b ${currentTheme.gradient} -z-20`} />
      
      {/* Optimized CSS-based gradient animation */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div 
          className="absolute w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] rounded-full blur-[80px] opacity-15 animate-blob-1"
          style={{ background: currentTheme.colors[0], willChange: 'transform' }}
        />
        <div 
          className="absolute w-[40vw] h-[40vw] max-w-[350px] max-h-[350px] rounded-full blur-[60px] opacity-12 animate-blob-2"
          style={{ background: currentTheme.colors[1], willChange: 'transform' }}
        />
        <div 
          className="absolute w-[35vw] h-[35vw] max-w-[300px] max-h-[300px] rounded-full blur-[50px] opacity-10 animate-blob-3"
          style={{ background: currentTheme.colors[2], willChange: 'transform' }}
        />
      </div>
      
      <style>{`
        @keyframes blob1 { 0%, 100% { transform: translate(10%, 10%); } 50% { transform: translate(60%, 40%); } }
        @keyframes blob2 { 0%, 100% { transform: translate(70%, 60%); } 50% { transform: translate(20%, 20%); } }
        @keyframes blob3 { 0%, 100% { transform: translate(30%, 70%); } 50% { transform: translate(60%, 30%); } }
        .animate-blob-1 { animation: blob1 25s ease-in-out infinite; }
        .animate-blob-2 { animation: blob2 30s ease-in-out infinite; }
        .animate-blob-3 { animation: blob3 22s ease-in-out infinite; }
      `}</style>
      
      {/* Particle canvas */}
      {showParticles && (
        <canvas 
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none -z-5"
          style={{ zIndex: -5 }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
});

export default AnimatedBackground;