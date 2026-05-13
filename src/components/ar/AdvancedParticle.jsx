/**
 * AdvancedParticle — Extended particle system supporting all 10 particle
 * effect types: hearts, snow, rain, fire, lightning, sakura, smoke,
 * bubbles, sparks, aura. Adapts to quality tier.
 */

import AdaptiveQuality from '@/components/engine/AdaptiveQuality';

const PARTICLE_CONFIGS = {
  hearts:   { emoji: ['♥', '❤', '💕'], colors: ['#ec4899', '#f43f5e', '#fb7185'], gravity: -0.02, life: 0.008, size: [12, 20], spawn: 'bottom' },
  snow:     { emoji: ['❄', '❆', '•'], colors: ['#ffffff', '#e0e7ff', '#c7d2fe'], gravity: 0.01, life: 0.005, size: [6, 14], spawn: 'top' },
  rain:     { emoji: ['|'], colors: ['#60a5fa', '#93c5fd'], gravity: 0.08, life: 0.02, size: [3, 6], spawn: 'top', fast: true },
  fire:     { emoji: ['🔥', '•', '◆'], colors: ['#ef4444', '#f97316', '#fbbf24', '#fff'], gravity: -0.03, life: 0.015, size: [8, 16], spawn: 'bottom' },
  lightning:{ emoji: ['⚡', '✦'], colors: ['#fbbf24', '#ffffff', '#60a5fa'], gravity: 0, life: 0.04, size: [10, 18], spawn: 'random', burst: true },
  sakura:   { emoji: ['🌸', '✿', '❀'], colors: ['#f472b6', '#fbcfe8', '#fda4af'], gravity: 0.008, life: 0.006, size: [10, 18], spawn: 'top', drift: true },
  smoke:    { emoji: ['○', '◯', '•'], colors: ['#6b7280', '#9ca3af', '#d1d5db'], gravity: -0.01, life: 0.004, size: [15, 30], spawn: 'bottom', grow: true },
  bubbles:  { emoji: ['○', '◯', '•'], colors: ['rgba(96,165,250,0.6)', 'rgba(147,197,253,0.5)', 'rgba(255,255,255,0.4)'], gravity: -0.015, life: 0.008, size: [8, 20], spawn: 'bottom' },
  sparks:   { emoji: ['✦', '✧', '★', '•'], colors: ['#fbbf24', '#f59e0b', '#ffffff'], gravity: -0.01, life: 0.025, size: [4, 10], spawn: 'center', burst: true },
  aura:     { emoji: ['✦', '•', '○'], colors: ['#fbbf24', '#fde68a', 'rgba(245,166,35,0.5)'], gravity: -0.005, life: 0.005, size: [6, 14], spawn: 'center' },
};

export class AdvancedParticle {
  constructor(w, h, type) {
    this.w = w; this.h = h;
    const cfg = PARTICLE_CONFIGS[type] || PARTICLE_CONFIGS.sparks;
    this.cfg = cfg;
    this.type = type;
    this.reset(w, h);
  }

  reset(w, h) {
    const cfg = this.cfg;
    this.w = w; this.h = h;
    
    // Spawn position
    switch (cfg.spawn) {
      case 'top': this.x = Math.random() * w; this.y = -10; break;
      case 'bottom': this.x = Math.random() * w; this.y = h + 10; break;
      case 'center': this.x = w/2 + (Math.random() - 0.5) * w * 0.3; this.y = h/2 + (Math.random() - 0.5) * h * 0.3; break;
      default: this.x = Math.random() * w; this.y = Math.random() * h;
    }
    
    this.vx = (Math.random() - 0.5) * (cfg.drift ? 1.5 : 2);
    this.vy = cfg.spawn === 'top' ? Math.random() * 2 + 0.5 : -(Math.random() * 2 + 1);
    if (cfg.fast) this.vy = Math.random() * 6 + 4;
    
    this.life = 1;
    this.decay = cfg.life + Math.random() * cfg.life;
    this.size = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]);
    this.initialSize = this.size;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.08;
    this.color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
    this.emoji = cfg.emoji[Math.floor(Math.random() * cfg.emoji.length)];
    this.phase = Math.random() * Math.PI * 2; // for oscillation
  }

  update() {
    const cfg = this.cfg;
    this.x += this.vx;
    this.y += this.vy;
    this.vy += cfg.gravity;
    this.life -= this.decay;
    this.rotation += this.rotSpeed;
    
    // Drift (sakura-like sideways motion)
    if (cfg.drift) {
      this.x += Math.sin(this.phase + performance.now() * 0.001) * 0.5;
    }
    
    // Grow (smoke expands)
    if (cfg.grow) {
      this.size = this.initialSize * (1 + (1 - this.life) * 1.5);
    }
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.life);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    if (this.type === 'rain') {
      // Draw rain as lines
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, this.size);
      ctx.stroke();
    } else if (this.type === 'lightning' && Math.random() > 0.5) {
      // Lightning flash
      ctx.fillStyle = `rgba(255,255,255,${this.life * 0.3})`;
      ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
    } else {
      ctx.fillStyle = this.color;
      ctx.font = `${this.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emoji, 0, 0);
    }
    ctx.restore();
  }
}

/** Spawn and manage particles for a given type */
export function updateParticleSystem(particles, type, w, h, maxParticles) {
  const tierMax = AdaptiveQuality.getConfig().maxParticles || 60;
  const limit = Math.min(maxParticles || 80, tierMax);
  
  // Spawn
  const spawnRate = PARTICLE_CONFIGS[type]?.burst ? 0.15 : 0.25;
  if (Math.random() < spawnRate && particles.length < limit) {
    particles.push(new AdvancedParticle(w, h, type));
  }

  // Update and cull dead
  const alive = [];
  for (const p of particles) {
    p.update();
    if (p.life > 0) alive.push(p);
  }
  return alive;
}