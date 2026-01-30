/**
 * ARFilterEngine - Professional-grade AR filters using MediaPipe
 * 
 * Features:
 * - Real-time face mesh tracking (468 landmarks)
 * - Background segmentation and replacement
 * - WebGL shader-based effects
 * - Face accessories that track movement
 * - Beauty/skin smoothing filters
 * - Animated overlays and effects
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { Camera } from '@mediapipe/camera_utils';

// Face landmark indices for key facial features
const FACE_LANDMARKS = {
  // Nose
  noseTip: 1,
  noseBottom: 2,
  noseRightCorner: 98,
  noseLeftCorner: 327,
  
  // Eyes
  leftEyeInner: 133,
  leftEyeOuter: 33,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  leftEyeCenter: 468, // Iris center (if available)
  rightEyeInner: 362,
  rightEyeOuter: 263,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  rightEyeCenter: 473, // Iris center (if available)
  
  // Eyebrows
  leftEyebrowInner: 107,
  leftEyebrowOuter: 70,
  rightEyebrowInner: 336,
  rightEyebrowOuter: 300,
  
  // Mouth
  mouthLeft: 61,
  mouthRight: 291,
  mouthTop: 13,
  mouthBottom: 14,
  upperLipTop: 0,
  lowerLipBottom: 17,
  
  // Face outline
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
  foreheadCenter: 10,
  leftTemple: 127,
  rightTemple: 356,
  
  // Jaw
  leftJaw: 172,
  rightJaw: 397,
};

// WebGL Shaders for advanced effects
const SHADERS = {
  // Vertex shader - standard passthrough
  vertex: `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `,
  
  // Beauty/skin smoothing shader
  beauty: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform float u_smoothing;
    uniform float u_brightness;
    uniform vec2 u_resolution;
    
    void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      
      // Bilateral filter approximation for skin smoothing
      float offset = u_smoothing / u_resolution.x;
      vec4 sum = vec4(0.0);
      float weightSum = 0.0;
      
      for (float x = -2.0; x <= 2.0; x += 1.0) {
        for (float y = -2.0; y <= 2.0; y += 1.0) {
          vec2 sampleCoord = v_texCoord + vec2(x, y) * offset;
          vec4 sampleColor = texture2D(u_image, sampleCoord);
          float weight = exp(-(x*x + y*y) / 4.0);
          sum += sampleColor * weight;
          weightSum += weight;
        }
      }
      
      vec4 smoothed = sum / weightSum;
      vec4 result = mix(color, smoothed, u_smoothing * 0.3);
      result.rgb *= u_brightness;
      
      gl_FragColor = result;
    }
  `,
  
  // Color grading shader
  colorGrade: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform float u_temperature;
    uniform float u_tint;
    uniform float u_saturation;
    uniform float u_contrast;
    uniform float u_shadows;
    uniform float u_highlights;
    uniform vec3 u_colorOverlay;
    uniform float u_overlayStrength;
    
    vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }
    
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      vec3 rgb = color.rgb;
      
      // Temperature adjustment (warm/cool)
      rgb.r += u_temperature * 0.1;
      rgb.b -= u_temperature * 0.1;
      
      // Tint adjustment (green/magenta)
      rgb.g += u_tint * 0.1;
      
      // Saturation
      vec3 hsv = rgb2hsv(rgb);
      hsv.y *= u_saturation;
      rgb = hsv2rgb(hsv);
      
      // Contrast
      rgb = (rgb - 0.5) * u_contrast + 0.5;
      
      // Shadows and highlights
      float luminance = dot(rgb, vec3(0.299, 0.587, 0.114));
      rgb += (1.0 - luminance) * u_shadows * 0.2;
      rgb += luminance * u_highlights * 0.2;
      
      // Color overlay
      rgb = mix(rgb, u_colorOverlay, u_overlayStrength);
      
      gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
    }
  `,
  
  // Vignette effect
  vignette: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform float u_intensity;
    uniform float u_softness;
    
    void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(v_texCoord, center);
      float vignette = smoothstep(0.5, 0.5 - u_softness, dist * u_intensity);
      color.rgb *= vignette;
      gl_FragColor = color;
    }
  `,
  
  // Glow/bloom effect
  glow: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform float u_intensity;
    uniform vec2 u_resolution;
    
    void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      vec4 glow = vec4(0.0);
      float offset = 3.0 / u_resolution.x;
      
      for (float x = -3.0; x <= 3.0; x += 1.0) {
        for (float y = -3.0; y <= 3.0; y += 1.0) {
          vec2 sampleCoord = v_texCoord + vec2(x, y) * offset;
          vec4 sampleColor = texture2D(u_image, sampleCoord);
          float luminance = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
          if (luminance > 0.7) {
            glow += sampleColor;
          }
        }
      }
      
      glow /= 49.0;
      gl_FragColor = color + glow * u_intensity;
    }
  `,
};

// Filter presets with professional color grading
export const FILTER_PRESETS = {
  none: {
    name: 'Natural',
    icon: '🌿',
    settings: {
      temperature: 0,
      tint: 0,
      saturation: 1.0,
      contrast: 1.0,
      shadows: 0,
      highlights: 0,
      beauty: 0,
      vignette: 0,
      glow: 0,
    }
  },
  portrait: {
    name: 'Portrait',
    icon: '👤',
    settings: {
      temperature: 0.1,
      tint: 0,
      saturation: 0.95,
      contrast: 1.05,
      shadows: 0.1,
      highlights: 0.05,
      beauty: 0.4,
      vignette: 0.3,
      glow: 0.1,
    }
  },
  glamour: {
    name: 'Glamour',
    icon: '✨',
    settings: {
      temperature: 0.15,
      tint: 0.05,
      saturation: 1.1,
      contrast: 1.1,
      shadows: 0,
      highlights: 0.15,
      beauty: 0.6,
      vignette: 0.2,
      glow: 0.25,
    }
  },
  cinematic: {
    name: 'Cinematic',
    icon: '🎬',
    settings: {
      temperature: -0.05,
      tint: 0.05,
      saturation: 0.9,
      contrast: 1.2,
      shadows: -0.1,
      highlights: -0.05,
      beauty: 0.2,
      vignette: 0.5,
      glow: 0,
      colorOverlay: [0.1, 0.05, 0.15],
      overlayStrength: 0.1,
    }
  },
  warmSunset: {
    name: 'Golden Hour',
    icon: '🌅',
    settings: {
      temperature: 0.3,
      tint: 0.1,
      saturation: 1.15,
      contrast: 1.05,
      shadows: 0.1,
      highlights: 0.1,
      beauty: 0.3,
      vignette: 0.25,
      glow: 0.2,
      colorOverlay: [1.0, 0.8, 0.6],
      overlayStrength: 0.08,
    }
  },
  coolBlue: {
    name: 'Cool Blue',
    icon: '❄️',
    settings: {
      temperature: -0.2,
      tint: -0.05,
      saturation: 0.95,
      contrast: 1.1,
      shadows: 0,
      highlights: 0.05,
      beauty: 0.3,
      vignette: 0.2,
      glow: 0.15,
      colorOverlay: [0.7, 0.85, 1.0],
      overlayStrength: 0.1,
    }
  },
  retroFilm: {
    name: 'Retro Film',
    icon: '📽️',
    settings: {
      temperature: 0.2,
      tint: 0.1,
      saturation: 0.8,
      contrast: 1.15,
      shadows: 0.15,
      highlights: -0.1,
      beauty: 0,
      vignette: 0.6,
      glow: 0,
      colorOverlay: [1.0, 0.95, 0.85],
      overlayStrength: 0.15,
    }
  },
  neonNight: {
    name: 'Neon Night',
    icon: '🌃',
    settings: {
      temperature: -0.1,
      tint: 0.15,
      saturation: 1.4,
      contrast: 1.25,
      shadows: -0.15,
      highlights: 0.1,
      beauty: 0.2,
      vignette: 0.4,
      glow: 0.35,
      colorOverlay: [0.9, 0.7, 1.0],
      overlayStrength: 0.12,
    }
  },
  softDream: {
    name: 'Soft Dream',
    icon: '☁️',
    settings: {
      temperature: 0.1,
      tint: 0.05,
      saturation: 0.85,
      contrast: 0.9,
      shadows: 0.2,
      highlights: 0.15,
      beauty: 0.7,
      vignette: 0.15,
      glow: 0.4,
    }
  },
  dramatic: {
    name: 'Dramatic',
    icon: '🎭',
    settings: {
      temperature: 0,
      tint: 0,
      saturation: 0.7,
      contrast: 1.4,
      shadows: -0.2,
      highlights: 0,
      beauty: 0.1,
      vignette: 0.7,
      glow: 0,
    }
  },
  vintage: {
    name: 'Vintage',
    icon: '📻',
    settings: {
      temperature: 0.25,
      tint: 0.05,
      saturation: 0.75,
      contrast: 1.1,
      shadows: 0.1,
      highlights: -0.1,
      beauty: 0,
      vignette: 0.5,
      glow: 0,
      colorOverlay: [1.0, 0.9, 0.8],
      overlayStrength: 0.2,
    }
  },
  popArt: {
    name: 'Pop Art',
    icon: '🎨',
    settings: {
      temperature: 0,
      tint: 0,
      saturation: 1.6,
      contrast: 1.3,
      shadows: 0,
      highlights: 0,
      beauty: 0,
      vignette: 0,
      glow: 0.2,
    }
  },
};

// AR Face accessories
export const FACE_ACCESSORIES = {
  none: { name: 'None', icon: '🚫' },
  crown: {
    name: 'Golden Crown',
    icon: '👑',
    type: 'head',
    offsetY: -0.15,
    scale: 1.2,
    image: 'crown',
  },
  sunglasses: {
    name: 'Sunglasses',
    icon: '🕶️',
    type: 'eyes',
    offsetY: 0,
    scale: 1.0,
    image: 'sunglasses',
  },
  catEars: {
    name: 'Cat Ears',
    icon: '🐱',
    type: 'head',
    offsetY: -0.2,
    scale: 1.3,
    image: 'catEars',
  },
  devilHorns: {
    name: 'Devil Horns',
    icon: '😈',
    type: 'head',
    offsetY: -0.18,
    scale: 1.1,
    image: 'devilHorns',
  },
  angelHalo: {
    name: 'Angel Halo',
    icon: '😇',
    type: 'head',
    offsetY: -0.22,
    scale: 1.0,
    image: 'angelHalo',
  },
  partyHat: {
    name: 'Party Hat',
    icon: '🎉',
    type: 'head',
    offsetY: -0.2,
    scale: 1.0,
    image: 'partyHat',
  },
  beard: {
    name: 'Viking Beard',
    icon: '🧔',
    type: 'chin',
    offsetY: 0.1,
    scale: 1.2,
    image: 'beard',
  },
  mask: {
    name: 'Masquerade',
    icon: '🎭',
    type: 'face',
    offsetY: 0,
    scale: 1.0,
    image: 'mask',
  },
  butterfly: {
    name: 'Butterfly',
    icon: '🦋',
    type: 'face',
    offsetY: 0,
    scale: 1.2,
    image: 'butterfly',
    animated: true,
  },
  hearts: {
    name: 'Floating Hearts',
    icon: '💕',
    type: 'particle',
    animated: true,
  },
  sparkles: {
    name: 'Sparkle Dust',
    icon: '✨',
    type: 'particle',
    animated: true,
  },
  fire: {
    name: 'Fire Aura',
    icon: '🔥',
    type: 'aura',
    animated: true,
  },
  ice: {
    name: 'Ice Aura',
    icon: '🧊',
    type: 'aura',
    animated: true,
  },
};

// Background options
export const BACKGROUNDS = {
  none: { name: 'None', icon: '🚫' },
  blur: { name: 'Blur', icon: '🌫️', type: 'blur', intensity: 15 },
  blurLight: { name: 'Light Blur', icon: '💨', type: 'blur', intensity: 8 },
  blurHeavy: { name: 'Heavy Blur', icon: '🌁', type: 'blur', intensity: 25 },
  
  // Solid colors
  black: { name: 'Black', icon: '⬛', type: 'color', color: '#000000' },
  white: { name: 'White', icon: '⬜', type: 'color', color: '#ffffff' },
  green: { name: 'Green Screen', icon: '🟩', type: 'color', color: '#00ff00' },
  
  // Gradients
  sunset: { name: 'Sunset', icon: '🌅', type: 'gradient', colors: ['#ff7e5f', '#feb47b'] },
  ocean: { name: 'Ocean', icon: '🌊', type: 'gradient', colors: ['#2193b0', '#6dd5ed'] },
  purple: { name: 'Purple Dream', icon: '💜', type: 'gradient', colors: ['#8e2de2', '#4a00e0'] },
  forest: { name: 'Forest', icon: '🌲', type: 'gradient', colors: ['#134e5e', '#71b280'] },
  
  // Image backgrounds
  romanForum: { 
    name: 'Roman Forum', 
    icon: '🏛️', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1280&q=80' 
  },
  colosseum: { 
    name: 'Colosseum', 
    icon: '🏟️', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1555992336-fb0d29498b13?w=1280&q=80' 
  },
  neonCity: { 
    name: 'Neon City', 
    icon: '🌃', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1280&q=80' 
  },
  beach: { 
    name: 'Tropical Beach', 
    icon: '🏝️', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&q=80' 
  },
  space: { 
    name: 'Space', 
    icon: '🚀', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1280&q=80' 
  },
  studio: { 
    name: 'Studio', 
    icon: '🎬', 
    type: 'image', 
    url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1280&q=80' 
  },
};

class ARFilterEngineCore {
  constructor() {
    this.faceMesh = null;
    this.selfieSegmentation = null;
    this.camera = null;
    this.isInitialized = false;
    this.landmarks = null;
    this.segmentationMask = null;
    this.callbacks = {
      onFaceDetected: null,
      onSegmentationUpdate: null,
      onFrame: null,
    };
    
    // Performance tracking
    this.frameCount = 0;
    this.lastFpsUpdate = Date.now();
    this.fps = 0;
  }
  
  async initialize(videoElement, canvasElement) {
    if (this.isInitialized) return;
    
    // Initialize Face Mesh
    this.faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true, // Enables iris tracking
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    
    this.faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        this.landmarks = results.multiFaceLandmarks[0];
        this.callbacks.onFaceDetected?.(this.landmarks);
      } else {
        this.landmarks = null;
      }
      this.updateFps();
    });
    
    // Initialize Selfie Segmentation
    this.selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
    });
    
    this.selfieSegmentation.setOptions({
      modelSelection: 1, // 0 = general, 1 = landscape (better for full body)
      selfieMode: true,
    });
    
    this.selfieSegmentation.onResults((results) => {
      this.segmentationMask = results.segmentationMask;
      this.callbacks.onSegmentationUpdate?.(results);
    });
    
    // Initialize camera
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.faceMesh.send({ image: videoElement });
        await this.selfieSegmentation.send({ image: videoElement });
        this.callbacks.onFrame?.();
      },
      width: 1280,
      height: 720,
    });
    
    await this.camera.start();
    this.isInitialized = true;
    
    return true;
  }
  
  updateFps() {
    this.frameCount++;
    const now = Date.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }
  
  getFps() {
    return this.fps;
  }
  
  getLandmarks() {
    return this.landmarks;
  }
  
  getSegmentationMask() {
    return this.segmentationMask;
  }
  
  // Get specific facial feature positions
  getFeaturePosition(feature) {
    if (!this.landmarks) return null;
    const index = FACE_LANDMARKS[feature];
    if (index === undefined || !this.landmarks[index]) return null;
    return this.landmarks[index];
  }
  
  // Get face bounding box
  getFaceBounds() {
    if (!this.landmarks) return null;
    
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    
    for (const point of this.landmarks) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }
  
  // Get face rotation
  getFaceRotation() {
    if (!this.landmarks) return null;
    
    const nose = this.landmarks[FACE_LANDMARKS.noseTip];
    const leftEye = this.landmarks[FACE_LANDMARKS.leftEyeOuter];
    const rightEye = this.landmarks[FACE_LANDMARKS.rightEyeOuter];
    
    if (!nose || !leftEye || !rightEye) return null;
    
    // Calculate yaw (left/right rotation)
    const eyeCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
    };
    const yaw = (nose.x - eyeCenter.x) * 2;
    
    // Calculate pitch (up/down rotation)
    const pitch = (nose.y - eyeCenter.y) * 2;
    
    // Calculate roll (tilt)
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    
    return { yaw, pitch, roll };
  }
  
  // Check if mouth is open
  isMouthOpen() {
    if (!this.landmarks) return false;
    
    const mouthTop = this.landmarks[FACE_LANDMARKS.mouthTop];
    const mouthBottom = this.landmarks[FACE_LANDMARKS.mouthBottom];
    
    if (!mouthTop || !mouthBottom) return false;
    
    const distance = Math.abs(mouthBottom.y - mouthTop.y);
    return distance > 0.03; // Threshold for "open"
  }
  
  // Check if eyes are closed (blink detection)
  areEyesClosed() {
    if (!this.landmarks) return { left: false, right: false };
    
    const leftTop = this.landmarks[FACE_LANDMARKS.leftEyeTop];
    const leftBottom = this.landmarks[FACE_LANDMARKS.leftEyeBottom];
    const rightTop = this.landmarks[FACE_LANDMARKS.rightEyeTop];
    const rightBottom = this.landmarks[FACE_LANDMARKS.rightEyeBottom];
    
    const leftOpen = leftTop && leftBottom ? Math.abs(leftBottom.y - leftTop.y) : 0.1;
    const rightOpen = rightTop && rightBottom ? Math.abs(rightBottom.y - rightTop.y) : 0.1;
    
    return {
      left: leftOpen < 0.015,
      right: rightOpen < 0.015,
    };
  }
  
  onFaceDetected(callback) {
    this.callbacks.onFaceDetected = callback;
  }
  
  onSegmentationUpdate(callback) {
    this.callbacks.onSegmentationUpdate = callback;
  }
  
  onFrame(callback) {
    this.callbacks.onFrame = callback;
  }
  
  async stop() {
    if (this.camera) {
      await this.camera.stop();
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const AREngine = new ARFilterEngineCore();

export default AREngine;