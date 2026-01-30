import React, { useEffect, useRef } from 'react';
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

export default function AnimatedBackground({ 
  theme = 'roman', 
  intensity = 'medium',
  showParticles = true,
  children,
  className = ''
}) {
  const canvasRef = useRef(null);
  const currentTheme = PRESET_THEMES[theme] || PRESET_THEMES.roman;
  
  const particleCount = intensity === 'low' ? 15 : intensity === 'high' ? 40 : 25;

  useEffect(() => {
    if (!showParticles) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

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

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      
      animationId = requestAnimationFrame(animate);
    };

    resize();
    init();
    animate();

    window.addEventListener('resize', resize);
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [theme, particleCount, showParticles, currentTheme.colors]);

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Base gradient */}
      <div className={`fixed inset-0 bg-gradient-to-b ${currentTheme.gradient} -z-20`} />
      
      {/* Animated mesh gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{ background: currentTheme.colors[0] }}
          animate={{
            x: ['-10%', '60%', '-10%'],
            y: ['-20%', '40%', '-20%'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15"
          style={{ background: currentTheme.colors[1] }}
          animate={{
            x: ['80%', '20%', '80%'],
            y: ['60%', '10%', '60%'],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-10"
          style={{ background: currentTheme.colors[2] }}
          animate={{
            x: ['30%', '70%', '30%'],
            y: ['80%', '30%', '80%'],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      
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
}