/**
 * AccessoryRenderer - Renders AR face accessories
 * Draws accessories that track facial landmarks
 */


// SVG-based accessories for crisp rendering at any scale
const ACCESSORY_SVGS = {
  crown: `
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="crownGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#FFD700"/>
          <stop offset="50%" style="stop-color:#FFA500"/>
          <stop offset="100%" style="stop-color:#B8860B"/>
        </linearGradient>
        <filter id="crownShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.4"/>
        </filter>
      </defs>
      <g filter="url(#crownShadow)">
        <path d="M20,100 L40,40 L70,70 L100,20 L130,70 L160,40 L180,100 Z" 
              fill="url(#crownGold)" stroke="#8B4513" stroke-width="3"/>
        <circle cx="100" cy="30" r="8" fill="#FF0000"/>
        <circle cx="50" cy="55" r="6" fill="#00FF00"/>
        <circle cx="150" cy="55" r="6" fill="#0000FF"/>
        <rect x="20" y="100" width="160" height="15" rx="3" fill="url(#crownGold)" stroke="#8B4513" stroke-width="2"/>
      </g>
    </svg>
  `,
  
  sunglasses: `
    <svg viewBox="0 0 240 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lensGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#16213e"/>
        </linearGradient>
        <filter id="glassShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.5"/>
        </filter>
      </defs>
      <g filter="url(#glassShadow)">
        <!-- Left lens -->
        <ellipse cx="60" cy="40" rx="50" ry="35" fill="url(#lensGradient)" stroke="#333" stroke-width="4"/>
        <!-- Right lens -->
        <ellipse cx="180" cy="40" rx="50" ry="35" fill="url(#lensGradient)" stroke="#333" stroke-width="4"/>
        <!-- Bridge -->
        <path d="M110,40 Q120,55 130,40" fill="none" stroke="#333" stroke-width="4"/>
        <!-- Reflection -->
        <ellipse cx="45" cy="30" rx="15" ry="8" fill="rgba(255,255,255,0.15)"/>
        <ellipse cx="165" cy="30" rx="15" ry="8" fill="rgba(255,255,255,0.15)"/>
      </g>
    </svg>
  `,
  
  catEars: `
    <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="earFur" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#8B4513"/>
          <stop offset="100%" style="stop-color:#5D3A1A"/>
        </linearGradient>
        <filter id="earShadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g filter="url(#earShadow)">
        <!-- Left ear -->
        <path d="M20,95 L10,20 L60,60 Z" fill="url(#earFur)" stroke="#3D2314" stroke-width="2"/>
        <path d="M25,85 L18,35 L50,60 Z" fill="#FFB6C1"/>
        <!-- Right ear -->
        <path d="M180,95 L190,20 L140,60 Z" fill="url(#earFur)" stroke="#3D2314" stroke-width="2"/>
        <path d="M175,85 L182,35 L150,60 Z" fill="#FFB6C1"/>
      </g>
    </svg>
  `,
  
  devilHorns: `
    <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hornRed" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color:#8B0000"/>
          <stop offset="50%" style="stop-color:#FF0000"/>
          <stop offset="100%" style="stop-color:#FF4500"/>
        </linearGradient>
        <filter id="hornGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#hornGlow)">
        <path d="M35,95 Q20,50 5,10 Q30,30 50,80 Z" fill="url(#hornRed)"/>
        <path d="M165,95 Q180,50 195,10 Q170,30 150,80 Z" fill="url(#hornRed)"/>
      </g>
    </svg>
  `,
  
  angelHalo: `
    <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="haloGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#FFD700"/>
          <stop offset="50%" style="stop-color:#FFEC8B"/>
          <stop offset="100%" style="stop-color:#FFD700"/>
        </linearGradient>
        <filter id="haloGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="100" cy="30" rx="80" ry="20" fill="none" stroke="url(#haloGold)" stroke-width="8" filter="url(#haloGlow)"/>
      <ellipse cx="100" cy="30" rx="80" ry="20" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
    </svg>
  `,
  
  partyHat: `
    <svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hatGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#FF1493"/>
          <stop offset="33%" style="stop-color:#00CED1"/>
          <stop offset="66%" style="stop-color:#FFD700"/>
          <stop offset="100%" style="stop-color:#FF1493"/>
        </linearGradient>
        <filter id="hatShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g filter="url(#hatShadow)">
        <path d="M80,10 L20,180 L140,180 Z" fill="url(#hatGradient)" stroke="#333" stroke-width="2"/>
        <circle cx="80" cy="10" r="12" fill="#FFD700"/>
        <ellipse cx="80" cy="180" rx="70" ry="15" fill="#FF1493"/>
        <!-- Stripes -->
        <path d="M65,50 L40,180" stroke="rgba(255,255,255,0.3)" stroke-width="8"/>
        <path d="M95,50 L120,180" stroke="rgba(255,255,255,0.3)" stroke-width="8"/>
      </g>
    </svg>
  `,
  
  beard: `
    <svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="beardColor" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#8B4513"/>
          <stop offset="100%" style="stop-color:#5D3A1A"/>
        </linearGradient>
      </defs>
      <path d="M30,20 Q20,60 30,100 Q50,140 100,145 Q150,140 170,100 Q180,60 170,20 
               Q160,40 140,50 Q120,55 100,55 Q80,55 60,50 Q40,40 30,20 Z" 
            fill="url(#beardColor)"/>
      <!-- Hair texture -->
      <g stroke="#3D2314" stroke-width="1" fill="none" opacity="0.5">
        <path d="M50,40 Q60,80 55,120"/>
        <path d="M70,45 Q75,85 70,125"/>
        <path d="M90,48 Q92,90 88,130"/>
        <path d="M110,48 Q108,90 112,130"/>
        <path d="M130,45 Q125,85 130,125"/>
        <path d="M150,40 Q140,80 145,120"/>
      </g>
    </svg>
  `,
  
  mask: `
    <svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="maskGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#FFD700"/>
          <stop offset="100%" style="stop-color:#B8860B"/>
        </linearGradient>
        <filter id="maskShadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.4"/>
        </filter>
      </defs>
      <g filter="url(#maskShadow)">
        <path d="M20,60 Q40,20 80,30 Q100,35 120,35 Q140,35 160,30 Q200,20 220,60 
                 Q210,90 180,100 Q150,110 120,100 Q90,110 60,100 Q30,90 20,60 Z" 
              fill="url(#maskGold)" stroke="#8B4513" stroke-width="3"/>
        <!-- Eye holes -->
        <ellipse cx="70" cy="55" rx="25" ry="20" fill="#000"/>
        <ellipse cx="170" cy="55" rx="25" ry="20" fill="#000"/>
        <!-- Decorations -->
        <path d="M110,40 L120,25 L130,40" fill="none" stroke="#8B4513" stroke-width="3"/>
        <circle cx="120" cy="80" r="5" fill="#FF0000"/>
      </g>
    </svg>
  `,
  
  butterfly: `
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wingLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FF69B4"/>
          <stop offset="50%" style="stop-color:#9370DB"/>
          <stop offset="100%" style="stop-color:#4169E1"/>
        </linearGradient>
        <linearGradient id="wingRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#FF69B4"/>
          <stop offset="50%" style="stop-color:#9370DB"/>
          <stop offset="100%" style="stop-color:#4169E1"/>
        </linearGradient>
        <filter id="butterflyGlow">
          <feGaussianBlur stdDeviation="2"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#butterflyGlow)">
        <!-- Left wing -->
        <path d="M100,80 Q50,30 20,50 Q10,80 40,100 Q60,110 100,80" fill="url(#wingLeft)" opacity="0.9"/>
        <path d="M100,80 Q60,100 40,130 Q50,150 80,140 Q95,120 100,80" fill="url(#wingLeft)" opacity="0.9"/>
        <!-- Right wing -->
        <path d="M100,80 Q150,30 180,50 Q190,80 160,100 Q140,110 100,80" fill="url(#wingRight)" opacity="0.9"/>
        <path d="M100,80 Q140,100 160,130 Q150,150 120,140 Q105,120 100,80" fill="url(#wingRight)" opacity="0.9"/>
        <!-- Body -->
        <ellipse cx="100" cy="80" rx="5" ry="30" fill="#333"/>
        <!-- Antennae -->
        <path d="M98,55 Q90,40 85,35" stroke="#333" stroke-width="2" fill="none"/>
        <path d="M102,55 Q110,40 115,35" stroke="#333" stroke-width="2" fill="none"/>
        <circle cx="85" cy="35" r="3" fill="#333"/>
        <circle cx="115" cy="35" r="3" fill="#333"/>
      </g>
    </svg>
  `,
};

class AccessoryRendererCore {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.loadedImages = {};
    this.animationFrame = 0;
    this.particles = [];
  }
  
  initialize(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.preloadAccessories();
  }
  
  preloadAccessories() {
    // Convert SVGs to Image objects for faster rendering
    Object.entries(ACCESSORY_SVGS).forEach(([name, svg]) => {
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        this.loadedImages[name] = img;
      };
    });
  }
  
  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  drawAccessory(accessory, landmarks, faceBounds, rotation) {
    if (!this.ctx || !accessory || accessory === 'none') return;
    
    const config = this.getAccessoryConfig(accessory);
    if (!config) return;
    
    // Handle particle effects separately
    if (config.type === 'particle') {
      this.drawParticleEffect(accessory, faceBounds);
      return;
    }
    
    // Handle aura effects
    if (config.type === 'aura') {
      this.drawAuraEffect(accessory, faceBounds);
      return;
    }
    
    const img = this.loadedImages[accessory];
    if (!img) return;
    
    const position = this.calculatePosition(config, landmarks, faceBounds);
    if (!position) return;
    
    this.ctx.save();
    
    // Apply rotation
    this.ctx.translate(position.x, position.y);
    if (rotation) {
      this.ctx.rotate(rotation.roll || 0);
    }
    
    // Apply animation if needed
    if (config.animated) {
      const scale = 1 + Math.sin(this.animationFrame * 0.1) * 0.05;
      this.ctx.scale(scale, scale);
    }
    
    // Draw the accessory
    const width = position.width * config.scale;
    const height = (img.height / img.width) * width;
    
    this.ctx.drawImage(
      img,
      -width / 2,
      -height / 2 + (config.offsetY || 0) * faceBounds.height * this.canvas.height,
      width,
      height
    );
    
    this.ctx.restore();
    
    this.animationFrame++;
  }
  
  getAccessoryConfig(name) {
    // Import from ARFilterEngine
    const configs = {
      crown: { type: 'head', offsetY: -0.15, scale: 1.2 },
      sunglasses: { type: 'eyes', offsetY: 0, scale: 1.0 },
      catEars: { type: 'head', offsetY: -0.2, scale: 1.3 },
      devilHorns: { type: 'head', offsetY: -0.18, scale: 1.1 },
      angelHalo: { type: 'head', offsetY: -0.25, scale: 1.0 },
      partyHat: { type: 'head', offsetY: -0.2, scale: 1.0 },
      beard: { type: 'chin', offsetY: 0.1, scale: 1.2 },
      mask: { type: 'face', offsetY: 0, scale: 1.0 },
      butterfly: { type: 'face', offsetY: 0, scale: 1.2, animated: true },
      hearts: { type: 'particle', animated: true },
      sparkles: { type: 'particle', animated: true },
      fire: { type: 'aura', animated: true },
      ice: { type: 'aura', animated: true },
    };
    return configs[name];
  }
  
  calculatePosition(config, landmarks, faceBounds) {
    if (!faceBounds) return null;
    
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    
    let x, y, width;
    
    switch (config.type) {
      case 'head':
        x = faceBounds.centerX * canvasW;
        y = faceBounds.y * canvasH;
        width = faceBounds.width * canvasW * 1.5;
        break;
        
      case 'eyes':
        if (landmarks) {
          const leftEye = landmarks[33]; // Left eye outer
          const rightEye = landmarks[263]; // Right eye outer
          x = ((leftEye.x + rightEye.x) / 2) * canvasW;
          y = ((leftEye.y + rightEye.y) / 2) * canvasH;
          width = Math.abs(rightEye.x - leftEye.x) * canvasW * 2.5;
        } else {
          x = faceBounds.centerX * canvasW;
          y = (faceBounds.y + faceBounds.height * 0.35) * canvasH;
          width = faceBounds.width * canvasW * 1.2;
        }
        break;
        
      case 'chin':
        if (landmarks) {
          const chin = landmarks[152];
          x = chin.x * canvasW;
          y = chin.y * canvasH;
        } else {
          x = faceBounds.centerX * canvasW;
          y = (faceBounds.y + faceBounds.height) * canvasH;
        }
        width = faceBounds.width * canvasW * 1.3;
        break;
        
      case 'face':
      default:
        x = faceBounds.centerX * canvasW;
        y = faceBounds.centerY * canvasH;
        width = faceBounds.width * canvasW * 1.5;
        break;
    }
    
    return { x, y, width };
  }
  
  drawParticleEffect(type, faceBounds) {
    if (!faceBounds) return;
    
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const centerX = faceBounds.centerX * canvasW;
    const centerY = faceBounds.centerY * canvasH;
    
    // Spawn new particles
    if (Math.random() < 0.3) {
      const particle = {
        x: centerX + (Math.random() - 0.5) * faceBounds.width * canvasW,
        y: centerY + (Math.random() - 0.5) * faceBounds.height * canvasH,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3 - 1,
        life: 60,
        maxLife: 60,
        size: Math.random() * 15 + 10,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type,
      };
      this.particles.push(particle);
    }
    
    // Update and draw particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.life--;
      
      if (p.life <= 0) return false;
      
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      
      if (p.type === 'hearts') {
        this.drawHeart(0, 0, p.size, '#FF69B4');
      } else if (p.type === 'sparkles') {
        this.drawSparkle(0, 0, p.size, '#FFD700');
      }
      
      this.ctx.restore();
      return true;
    });
  }
  
  drawHeart(x, y, size, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + size / 4);
    this.ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
    this.ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size);
    this.ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
    this.ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
    this.ctx.fill();
  }
  
  drawSparkle(x, y, size, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const outerX = x + Math.cos(angle) * size;
      const outerY = y + Math.sin(angle) * size;
      const innerAngle = angle + Math.PI / 4;
      const innerX = x + Math.cos(innerAngle) * size * 0.3;
      const innerY = y + Math.sin(innerAngle) * size * 0.3;
      
      if (i === 0) {
        this.ctx.moveTo(outerX, outerY);
      } else {
        this.ctx.lineTo(outerX, outerY);
      }
      this.ctx.lineTo(innerX, innerY);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }
  
  drawAuraEffect(type, faceBounds) {
    if (!faceBounds) return;
    
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const centerX = faceBounds.centerX * canvasW;
    const y = (faceBounds.y + faceBounds.height) * canvasH;
    const width = faceBounds.width * canvasW * 2;
    
    this.ctx.save();
    
    const gradient = this.ctx.createRadialGradient(
      centerX, y, 0,
      centerX, y - faceBounds.height * canvasH, width
    );
    
    if (type === 'fire') {
      gradient.addColorStop(0, 'rgba(255, 100, 0, 0.6)');
      gradient.addColorStop(0.3, 'rgba(255, 200, 0, 0.4)');
      gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
    } else if (type === 'ice') {
      gradient.addColorStop(0, 'rgba(150, 220, 255, 0.6)');
      gradient.addColorStop(0.3, 'rgba(200, 240, 255, 0.4)');
      gradient.addColorStop(0.6, 'rgba(150, 200, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');
    }
    
    // Animated flicker
    const flicker = Math.sin(this.animationFrame * 0.15) * 0.1 + 0.9;
    this.ctx.globalAlpha = flicker;
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvasW, canvasH);
    
    this.ctx.restore();
    this.animationFrame++;
  }
}

export const AccessoryRenderer = new AccessoryRendererCore();
export default AccessoryRenderer;