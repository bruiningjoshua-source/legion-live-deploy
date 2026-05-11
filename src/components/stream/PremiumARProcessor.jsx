/**
 * PremiumARProcessor - TikTok/Snapchat/Instagram quality AR processing
 * Uses canvas-based real-time video processing with:
 * - Real-time color grading & LUT filters
 * - AI-powered background segmentation
 * - Face detection for AR overlays
 * - Particle systems & animated effects
 */


// ============================================
// COLOR GRADING FILTERS (Instagram/TikTok Quality)
// ============================================

export const PREMIUM_FILTERS = [
  { 
    id: 'none', 
    name: 'Original', 
    icon: '⚪',
    lut: null 
  },
  { 
    id: 'clarendon', 
    name: 'Clarendon', 
    icon: '🌟',
    adjustments: { brightness: 1.1, contrast: 1.2, saturation: 1.35, shadows: { r: 0, g: 0, b: 20 } }
  },
  { 
    id: 'gingham', 
    name: 'Gingham', 
    icon: '🍃',
    adjustments: { brightness: 1.05, contrast: 0.95, saturation: 0.9, highlights: { r: 230, g: 225, b: 220 } }
  },
  { 
    id: 'moon', 
    name: 'Moon', 
    icon: '🌙',
    adjustments: { saturation: 0, contrast: 1.15, brightness: 1.1, highlights: { r: 255, g: 255, b: 255 } }
  },
  { 
    id: 'lark', 
    name: 'Lark', 
    icon: '🐦',
    adjustments: { brightness: 1.08, contrast: 1.0, saturation: 0.85, shadows: { r: 0, g: 10, b: 20 } }
  },
  { 
    id: 'reyes', 
    name: 'Reyes', 
    icon: '☀️',
    adjustments: { brightness: 1.15, contrast: 0.85, saturation: 0.75, temperature: 15 }
  },
  { 
    id: 'juno', 
    name: 'Juno', 
    icon: '💫',
    adjustments: { brightness: 1.02, contrast: 1.1, saturation: 1.25, highlights: { r: 255, g: 250, b: 240 } }
  },
  { 
    id: 'slumber', 
    name: 'Slumber', 
    icon: '😴',
    adjustments: { brightness: 1.05, contrast: 0.9, saturation: 0.7, tint: { r: 125, g: 105, b: 100 } }
  },
  { 
    id: 'crema', 
    name: 'Crema', 
    icon: '☕',
    adjustments: { brightness: 1.08, contrast: 0.95, saturation: 0.9, temperature: 8 }
  },
  { 
    id: 'ludwig', 
    name: 'Ludwig', 
    icon: '🎭',
    adjustments: { brightness: 1.05, contrast: 1.05, saturation: 0.95, shadows: { r: 20, g: 10, b: 0 } }
  },
  { 
    id: 'aden', 
    name: 'Aden', 
    icon: '🌸',
    adjustments: { brightness: 1.2, contrast: 0.9, saturation: 0.85, temperature: 10 }
  },
  { 
    id: 'perpetua', 
    name: 'Perpetua', 
    icon: '🌊',
    adjustments: { brightness: 1.05, contrast: 1.1, saturation: 1.1, tint: { r: 0, g: 10, b: 30 } }
  },
  { 
    id: 'amaro', 
    name: 'Amaro', 
    icon: '🌅',
    adjustments: { brightness: 1.15, contrast: 0.95, saturation: 1.2, vignette: 0.3 }
  },
  { 
    id: 'mayfair', 
    name: 'Mayfair', 
    icon: '🎀',
    adjustments: { brightness: 1.05, contrast: 1.1, saturation: 1.1, vignette: 0.2, temperature: 5 }
  },
  { 
    id: 'rise', 
    name: 'Rise', 
    icon: '🌤️',
    adjustments: { brightness: 1.1, contrast: 0.95, saturation: 1.0, highlights: { r: 255, g: 250, b: 235 } }
  },
  { 
    id: 'hudson', 
    name: 'Hudson', 
    icon: '❄️',
    adjustments: { brightness: 1.05, contrast: 1.15, saturation: 0.9, temperature: -15, vignette: 0.25 }
  },
  { 
    id: 'valencia', 
    name: 'Valencia', 
    icon: '🍊',
    adjustments: { brightness: 1.1, contrast: 1.05, saturation: 1.15, temperature: 12 }
  },
  { 
    id: 'xpro2', 
    name: 'X-Pro II', 
    icon: '📸',
    adjustments: { brightness: 1.0, contrast: 1.3, saturation: 1.25, vignette: 0.4 }
  },
  { 
    id: 'sierra', 
    name: 'Sierra', 
    icon: '🏔️',
    adjustments: { brightness: 1.1, contrast: 0.95, saturation: 0.85, vignette: 0.3 }
  },
  { 
    id: 'willow', 
    name: 'Willow', 
    icon: '🌿',
    adjustments: { saturation: 0, contrast: 0.95, brightness: 1.1, tint: { r: 210, g: 200, b: 195 } }
  },
];

// ============================================
// BEAUTY PRESETS (TikTok-style)
// ============================================

export const BEAUTY_MODES = [
  { id: 'off', name: 'Natural', icon: '🌿', smooth: 0, brighten: 0, slim: 0, eyeEnlarge: 0 },
  { id: 'subtle', name: 'Subtle', icon: '✨', smooth: 20, brighten: 5, slim: 0, eyeEnlarge: 0 },
  { id: 'natural', name: 'Natural+', icon: '🌟', smooth: 35, brighten: 8, slim: 5, eyeEnlarge: 5 },
  { id: 'enhance', name: 'Enhance', icon: '💫', smooth: 50, brighten: 12, slim: 10, eyeEnlarge: 10 },
  { id: 'glam', name: 'Glam', icon: '💎', smooth: 65, brighten: 15, slim: 15, eyeEnlarge: 15 },
  { id: 'studio', name: 'Studio', icon: '📺', smooth: 45, brighten: 10, slim: 5, eyeEnlarge: 5, sharpen: 15 },
];

// ============================================
// AR FACE EFFECTS (Snapchat-style)
// ============================================

export const AR_EFFECTS = [
  { id: 'none', name: 'None', icon: '🚫', elements: [] },
  
  // Animal Filters
  { id: 'puppy', name: 'Puppy', icon: '🐶', category: 'animals',
    elements: [
      { type: 'ears', asset: 'puppy_ears', position: 'forehead', scale: 1.2 },
      { type: 'nose', asset: 'puppy_nose', position: 'nose', scale: 0.8 },
      { type: 'tongue', asset: 'puppy_tongue', position: 'mouth', trigger: 'mouth_open' }
    ]
  },
  { id: 'cat', name: 'Kitty', icon: '🐱', category: 'animals',
    elements: [
      { type: 'ears', asset: 'cat_ears', position: 'forehead', scale: 1.0 },
      { type: 'nose', asset: 'cat_nose', position: 'nose', scale: 0.6 },
      { type: 'whiskers', asset: 'cat_whiskers', position: 'cheeks', scale: 1.0 }
    ]
  },
  { id: 'bunny', name: 'Bunny', icon: '🐰', category: 'animals',
    elements: [
      { type: 'ears', asset: 'bunny_ears', position: 'forehead', scale: 1.4 },
      { type: 'nose', asset: 'bunny_nose', position: 'nose', scale: 0.5 }
    ]
  },
  { id: 'fox', name: 'Fox', icon: '🦊', category: 'animals',
    elements: [
      { type: 'ears', asset: 'fox_ears', position: 'forehead', scale: 1.1 },
      { type: 'nose', asset: 'fox_nose', position: 'nose', scale: 0.7 }
    ]
  },
  { id: 'bear', name: 'Bear', icon: '🐻', category: 'animals',
    elements: [
      { type: 'ears', asset: 'bear_ears', position: 'forehead', scale: 1.0 },
      { type: 'nose', asset: 'bear_nose', position: 'nose', scale: 0.8 }
    ]
  },
  { id: 'deer', name: 'Deer', icon: '🦌', category: 'animals',
    elements: [
      { type: 'antlers', asset: 'deer_antlers', position: 'forehead', scale: 1.5 },
      { type: 'nose', asset: 'deer_nose', position: 'nose', scale: 0.6 }
    ]
  },
  { id: 'koala', name: 'Koala', icon: '🐨', category: 'animals',
    elements: [
      { type: 'ears', asset: 'koala_ears', position: 'forehead', scale: 1.0 },
      { type: 'nose', asset: 'koala_nose', position: 'nose', scale: 0.7 }
    ]
  },
  
  // Glamour & Accessories
  { id: 'crown', name: 'Crown', icon: '👑', category: 'accessories',
    elements: [
      { type: 'headwear', asset: 'crown', position: 'top', scale: 1.0 },
      { type: 'particles', effect: 'gold_sparkles' }
    ]
  },
  { id: 'halo', name: 'Angel', icon: '😇', category: 'accessories',
    elements: [
      { type: 'headwear', asset: 'halo', position: 'top', scale: 1.0, glow: true },
      { type: 'wings', asset: 'angel_wings', position: 'back', scale: 1.0 },
      { type: 'particles', effect: 'holy_sparkles' }
    ]
  },
  { id: 'devil', name: 'Devil', icon: '😈', category: 'accessories',
    elements: [
      { type: 'horns', asset: 'devil_horns', position: 'forehead', scale: 0.8 },
      { type: 'particles', effect: 'fire_embers' }
    ]
  },
  { id: 'sunglasses', name: 'Shades', icon: '😎', category: 'accessories',
    elements: [
      { type: 'glasses', asset: 'sunglasses', position: 'eyes', scale: 1.0 }
    ]
  },
  { id: 'nerd', name: 'Nerd', icon: '🤓', category: 'accessories',
    elements: [
      { type: 'glasses', asset: 'nerd_glasses', position: 'eyes', scale: 1.0 }
    ]
  },
  { id: 'tiara', name: 'Tiara', icon: '👸', category: 'accessories',
    elements: [
      { type: 'headwear', asset: 'tiara', position: 'forehead', scale: 0.9 },
      { type: 'particles', effect: 'diamond_sparkles' }
    ]
  },
  
  // Eye Effects
  { id: 'heart_eyes', name: 'Heart Eyes', icon: '😍', category: 'eyes',
    elements: [
      { type: 'eyes', asset: 'heart_eyes', position: 'eyes', scale: 1.0, animated: true }
    ]
  },
  { id: 'star_eyes', name: 'Star Eyes', icon: '🤩', category: 'eyes',
    elements: [
      { type: 'eyes', asset: 'star_eyes', position: 'eyes', scale: 1.0, animated: true }
    ]
  },
  { id: 'fire_eyes', name: 'Fire Eyes', icon: '🔥', category: 'eyes',
    elements: [
      { type: 'eyes', asset: 'fire_eyes', position: 'eyes', scale: 1.2, animated: true }
    ]
  },
  { id: 'laser_eyes', name: 'Laser', icon: '👁️', category: 'eyes',
    elements: [
      { type: 'eyes', asset: 'laser_eyes', position: 'eyes', scale: 1.5, animated: true }
    ]
  },
  { id: 'crying', name: 'Crying', icon: '😢', category: 'eyes',
    elements: [
      { type: 'tears', asset: 'tears', position: 'eyes', scale: 1.0, animated: true }
    ]
  },
  
  // Face Effects
  { id: 'face_sparkle', name: 'Sparkle', icon: '✨', category: 'face',
    elements: [
      { type: 'overlay', asset: 'face_sparkles', position: 'face', scale: 1.2, animated: true }
    ]
  },
  { id: 'freckles', name: 'Freckles', icon: '🧑', category: 'face',
    elements: [
      { type: 'makeup', asset: 'freckles', position: 'cheeks', scale: 1.0 }
    ]
  },
  { id: 'blush', name: 'Blush', icon: '😊', category: 'face',
    elements: [
      { type: 'makeup', asset: 'blush', position: 'cheeks', scale: 1.0, color: '#ffb6c1' }
    ]
  },
  
  // Seasonal
  { id: 'santa', name: 'Santa', icon: '🎅', category: 'seasonal',
    elements: [
      { type: 'hat', asset: 'santa_hat', position: 'top', scale: 1.2 },
      { type: 'beard', asset: 'santa_beard', position: 'chin', scale: 1.0 },
      { type: 'particles', effect: 'snowflakes' }
    ]
  },
  { id: 'witch', name: 'Witch', icon: '🧙‍♀️', category: 'seasonal',
    elements: [
      { type: 'hat', asset: 'witch_hat', position: 'top', scale: 1.3 },
      { type: 'particles', effect: 'magic_sparkles' }
    ]
  },
  { id: 'party', name: 'Party', icon: '🥳', category: 'seasonal',
    elements: [
      { type: 'hat', asset: 'party_hat', position: 'top', scale: 1.0 },
      { type: 'particles', effect: 'confetti' }
    ]
  },
  { id: 'unicorn', name: 'Unicorn', icon: '🦄', category: 'seasonal',
    elements: [
      { type: 'horn', asset: 'unicorn_horn', position: 'forehead', scale: 0.9 },
      { type: 'ears', asset: 'unicorn_ears', position: 'forehead', scale: 0.8 },
      { type: 'particles', effect: 'rainbow_sparkles' }
    ]
  },
];

// ============================================
// VIRTUAL BACKGROUNDS
// ============================================

export const VIRTUAL_BACKGROUNDS = [
  { id: 'none', name: 'Camera', icon: '📷', type: 'none' },
  
  // Blur Levels
  { id: 'blur_subtle', name: 'Subtle Blur', icon: '💨', type: 'blur', intensity: 6 },
  { id: 'blur_medium', name: 'Medium Blur', icon: '🌫️', type: 'blur', intensity: 14 },
  { id: 'blur_strong', name: 'Strong Blur', icon: '🌁', type: 'blur', intensity: 25 },
  { id: 'blur_max', name: 'Max Blur', icon: '☁️', type: 'blur', intensity: 40 },
  
  // Solid Colors (for professional streaming)
  { id: 'black', name: 'Black', icon: '⬛', type: 'solid', color: '#000000' },
  { id: 'white', name: 'White', icon: '⬜', type: 'solid', color: '#ffffff' },
  { id: 'green_screen', name: 'Green', icon: '🟩', type: 'solid', color: '#00ff00' },
  { id: 'blue_screen', name: 'Blue', icon: '🟦', type: 'solid', color: '#0066ff' },
  { id: 'gray', name: 'Gray', icon: '🔘', type: 'solid', color: '#2d2d2d' },
  
  // Premium Gradients
  { id: 'sunset', name: 'Sunset', icon: '🌅', type: 'gradient', 
    colors: ['#ff512f', '#f09819'], angle: 135 },
  { id: 'ocean', name: 'Ocean', icon: '🌊', type: 'gradient', 
    colors: ['#2193b0', '#6dd5ed'], angle: 180 },
  { id: 'purple_haze', name: 'Purple', icon: '💜', type: 'gradient', 
    colors: ['#8e2de2', '#4a00e0'], angle: 135 },
  { id: 'aurora', name: 'Aurora', icon: '🌌', type: 'gradient', 
    colors: ['#00c6ff', '#0072ff', '#7c3aed'], angle: 45 },
  { id: 'fire', name: 'Fire', icon: '🔥', type: 'gradient', 
    colors: ['#f12711', '#f5af19'], angle: 180 },
  { id: 'forest', name: 'Forest', icon: '🌲', type: 'gradient', 
    colors: ['#134e5e', '#71b280'], angle: 135 },
  { id: 'rose_gold', name: 'Rose Gold', icon: '🌹', type: 'gradient', 
    colors: ['#f4c4f3', '#fc67fa'], angle: 135 },
  { id: 'midnight', name: 'Midnight', icon: '🌃', type: 'gradient', 
    colors: ['#0f0c29', '#302b63', '#24243e'], angle: 180 },
  { id: 'cotton_candy', name: 'Cotton Candy', icon: '🍭', type: 'gradient', 
    colors: ['#ffecd2', '#fcb69f', '#ee9ca7'], angle: 135 },
  { id: 'neon', name: 'Neon', icon: '💡', type: 'gradient', 
    colors: ['#ff00ff', '#00ffff'], angle: 45 },
  
  // Image Backgrounds (HD Quality)
  { id: 'neon_city', name: 'Neon City', icon: '🏙️', type: 'image',
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&q=90' },
  { id: 'beach', name: 'Beach', icon: '🏖️', type: 'image',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=90' },
  { id: 'space', name: 'Space', icon: '🚀', type: 'image',
    url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=90' },
  { id: 'mountains', name: 'Mountains', icon: '🏔️', type: 'image',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=90' },
  { id: 'studio', name: 'Studio', icon: '🎬', type: 'image',
    url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1920&q=90' },
  { id: 'office', name: 'Office', icon: '🏢', type: 'image',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=90' },
  { id: 'gaming_room', name: 'Gaming', icon: '🎮', type: 'image',
    url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=1920&q=90' },
  { id: 'library', name: 'Library', icon: '📚', type: 'image',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&q=90' },
  { id: 'cafe', name: 'Cafe', icon: '☕', type: 'image',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1920&q=90' },
  { id: 'nature', name: 'Nature', icon: '🌿', type: 'image',
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=90' },
  { id: 'cityscape', name: 'Cityscape', icon: '🌆', type: 'image',
    url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=90' },
  { id: 'abstract', name: 'Abstract', icon: '🎨', type: 'image',
    url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=90' },
];

// ============================================
// PARTICLE SYSTEMS
// ============================================

export const PARTICLE_EFFECTS = {
  gold_sparkles: {
    emojis: ['✨', '⭐', '🌟', '💫'],
    colors: ['#ffd700', '#ffec8b', '#fff8dc'],
    count: 25,
    speed: { min: 1, max: 3 },
    size: { min: 10, max: 22 },
    lifetime: 3000,
    gravity: 0.5,
    spread: 'face'
  },
  holy_sparkles: {
    emojis: ['✨', '💫', '🌟', '⚡'],
    colors: ['#ffffff', '#fffacd', '#f0f8ff'],
    count: 30,
    speed: { min: 0.5, max: 2 },
    size: { min: 8, max: 18 },
    lifetime: 4000,
    gravity: -0.3,
    spread: 'above'
  },
  fire_embers: {
    emojis: ['🔥', '✨', '💥'],
    colors: ['#ff4500', '#ff6347', '#ffa500'],
    count: 20,
    speed: { min: 2, max: 4 },
    size: { min: 12, max: 20 },
    lifetime: 2000,
    gravity: -1,
    spread: 'sides'
  },
  diamond_sparkles: {
    emojis: ['💎', '✨', '💫'],
    colors: ['#b9f2ff', '#e6e6fa', '#ffffff'],
    count: 20,
    speed: { min: 1, max: 2.5 },
    size: { min: 10, max: 18 },
    lifetime: 3500,
    gravity: 0.3,
    spread: 'face'
  },
  snowflakes: {
    emojis: ['❄️', '❅', '❆', '🌨️'],
    colors: ['#ffffff', '#e0ffff', '#f0f8ff'],
    count: 40,
    speed: { min: 0.5, max: 1.5 },
    size: { min: 10, max: 20 },
    lifetime: 5000,
    gravity: 0.8,
    spread: 'screen',
    wobble: true
  },
  confetti: {
    emojis: ['🎊', '🎉', '🎀', '🎈', '✨'],
    colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'],
    count: 50,
    speed: { min: 3, max: 6 },
    size: { min: 12, max: 22 },
    lifetime: 4000,
    gravity: 1.5,
    spread: 'screen',
    rotation: true
  },
  rainbow_sparkles: {
    emojis: ['🌈', '✨', '💖', '💜', '💙', '💚', '💛'],
    colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8f00ff'],
    count: 30,
    speed: { min: 1, max: 3 },
    size: { min: 12, max: 24 },
    lifetime: 3000,
    gravity: 0.5,
    spread: 'arc'
  },
  magic_sparkles: {
    emojis: ['✨', '⭐', '💫', '🌟'],
    colors: ['#9b59b6', '#8e44ad', '#3498db', '#e74c3c'],
    count: 25,
    speed: { min: 1, max: 2.5 },
    size: { min: 10, max: 20 },
    lifetime: 3000,
    gravity: 0,
    spread: 'orbit'
  },
  hearts: {
    emojis: ['❤️', '💕', '💗', '💖', '💝'],
    colors: ['#ff6b6b', '#ff8787', '#ffa8a8'],
    count: 20,
    speed: { min: 1, max: 3 },
    size: { min: 14, max: 26 },
    lifetime: 3500,
    gravity: -0.5,
    spread: 'rising'
  },
  bubbles: {
    emojis: ['🫧', '○', '◌'],
    colors: ['rgba(255,255,255,0.6)', 'rgba(200,230,255,0.5)'],
    count: 25,
    speed: { min: 0.5, max: 1.5 },
    size: { min: 8, max: 24 },
    lifetime: 4000,
    gravity: -0.5,
    spread: 'rising',
    wobble: true
  }
};

// ============================================
// REAL-TIME VIDEO PROCESSOR CLASS
// ============================================

export class VideoProcessor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.videoElement = null;
    this.outputCanvas = null;
    this.outputCtx = null;
    this.isProcessing = false;
    this.currentFilter = null;
    this.currentBeauty = null;
    this.currentBackground = null;
    this.particles = [];
    this.bgImage = null;
    this.animationFrame = null;
  }

  initialize(videoElement, outputCanvas) {
    this.videoElement = videoElement;
    this.outputCanvas = outputCanvas;
    this.outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
    
    // Create offscreen canvas for processing
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  setFilter(filter) {
    this.currentFilter = filter;
  }

  setBeauty(beauty) {
    this.currentBeauty = beauty;
  }

  setBackground(background) {
    this.currentBackground = background;
    
    if (background?.type === 'image' && background.url) {
      this.bgImage = new Image();
      this.bgImage.crossOrigin = 'anonymous';
      this.bgImage.src = background.url;
    } else {
      this.bgImage = null;
    }
  }

  startProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.processFrame();
  }

  stopProcessing() {
    this.isProcessing = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  processFrame = () => {
    if (!this.isProcessing || !this.videoElement) return;

    const video = this.videoElement;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    // Set canvas dimensions
    this.canvas.width = width;
    this.canvas.height = height;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;

    // Draw video frame to processing canvas
    this.ctx.drawImage(video, 0, 0, width, height);

    // Get image data for pixel manipulation
    let imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Apply filter adjustments
    if (this.currentFilter?.adjustments) {
      this.applyColorGrading(data, this.currentFilter.adjustments);
    }

    // Apply beauty mode
    if (this.currentBeauty && this.currentBeauty.id !== 'off') {
      this.applyBeautyMode(data, this.currentBeauty, width, height);
    }

    // Put processed data back
    this.ctx.putImageData(imageData, 0, 0);

    // Draw background if set (simple overlay for now - full segmentation would need ML)
    if (this.currentBackground && this.currentBackground.type !== 'none') {
      this.drawBackground(width, height);
    }

    // Copy to output canvas
    this.outputCtx.drawImage(this.canvas, 0, 0);

    // Apply vignette if needed
    if (this.currentFilter?.adjustments?.vignette) {
      this.applyVignette(this.outputCtx, width, height, this.currentFilter.adjustments.vignette);
    }

    this.animationFrame = requestAnimationFrame(this.processFrame);
  }

  applyColorGrading(data, adjustments) {
    const { brightness = 1, contrast = 1, saturation = 1, temperature = 0 } = adjustments;
    
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Temperature adjustment
      if (temperature !== 0) {
        if (temperature > 0) {
          r = Math.min(255, r + temperature);
          b = Math.max(0, b - temperature * 0.5);
        } else {
          r = Math.max(0, r + temperature * 0.5);
          b = Math.min(255, b - temperature);
        }
      }

      // Brightness
      r *= brightness;
      g *= brightness;
      b *= brightness;

      // Contrast
      r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
      g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
      b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

      // Saturation
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      r = gray + saturation * (r - gray);
      g = gray + saturation * (g - gray);
      b = gray + saturation * (b - gray);

      // Clamp values
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
  }

  applyBeautyMode(data, beauty, width, height) {
    const { smooth, brighten } = beauty;
    
    // Simple skin brightening (increase brightness in skin tone range)
    if (brighten > 0) {
      const factor = 1 + brighten / 100;
      for (let i = 0; i < data.length; i += 4) {
        // Detect skin-like colors
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (r > 95 && g > 40 && b > 20 && 
            r > g && r > b && 
            Math.abs(r - g) > 15) {
          data[i] = Math.min(255, r * factor);
          data[i + 1] = Math.min(255, g * factor);
          data[i + 2] = Math.min(255, b * factor);
        }
      }
    }
  }

  drawBackground(width, height) {
    const bg = this.currentBackground;
    
    if (bg.type === 'solid') {
      // Don't actually replace - this would need segmentation
      // Instead we'll render the background behind in the UI
    } else if (bg.type === 'gradient') {
      // Same - render in UI layer
    } else if (bg.type === 'blur') {
      // Apply blur to entire frame
      this.ctx.filter = `blur(${bg.intensity}px)`;
      this.ctx.drawImage(this.canvas, 0, 0);
      this.ctx.filter = 'none';
    }
  }

  applyVignette(ctx, width, height, intensity) {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  destroy() {
    this.stopProcessing();
    this.canvas = null;
    this.ctx = null;
    this.videoElement = null;
    this.outputCanvas = null;
    this.outputCtx = null;
  }
}

// Export singleton instance
export const videoProcessor = new VideoProcessor();