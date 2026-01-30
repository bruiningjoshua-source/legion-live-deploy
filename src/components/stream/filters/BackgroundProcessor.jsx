/**
 * BackgroundProcessor - Real-time background segmentation and replacement
 * Uses MediaPipe Selfie Segmentation for person/background separation
 */

import React from 'react';

class BackgroundProcessorCore {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.tempCanvas = null;
    this.tempCtx = null;
    this.backgroundImage = null;
    this.backgroundLoaded = false;
    this.currentBackground = null;
    this.edgeSmoothAmount = 0.1;
  }
  
  initialize(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Create temp canvas for processing
    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = canvas.width;
    this.tempCanvas.height = canvas.height;
    this.tempCtx = this.tempCanvas.getContext('2d');
  }
  
  async setBackground(background) {
    this.currentBackground = background;
    
    if (!background || background.type === 'none') {
      this.backgroundImage = null;
      this.backgroundLoaded = false;
      return;
    }
    
    if (background.type === 'image' && background.url) {
      try {
        this.backgroundImage = await this.loadImage(background.url);
        this.backgroundLoaded = true;
      } catch (error) {
        console.error('Failed to load background image:', error);
        this.backgroundLoaded = false;
      }
    } else {
      this.backgroundLoaded = true;
    }
  }
  
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
  
  setEdgeSmoothing(amount) {
    this.edgeSmoothAmount = Math.max(0, Math.min(1, amount));
  }
  
  processFrame(videoFrame, segmentationMask) {
    if (!this.ctx || !this.currentBackground || !segmentationMask) {
      return videoFrame;
    }
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Draw video frame to temp canvas
    this.tempCtx.drawImage(videoFrame, 0, 0, width, height);
    
    // Get video frame data
    const videoData = this.tempCtx.getImageData(0, 0, width, height);
    const videoPixels = videoData.data;
    
    // Draw mask to get mask data
    this.tempCtx.drawImage(segmentationMask, 0, 0, width, height);
    const maskData = this.tempCtx.getImageData(0, 0, width, height);
    const maskPixels = maskData.data;
    
    // Create output image data
    const outputData = this.ctx.createImageData(width, height);
    const outputPixels = outputData.data;
    
    // Generate background pixels
    const bgPixels = this.generateBackground(width, height);
    
    // Process each pixel
    for (let i = 0; i < videoPixels.length; i += 4) {
      // Mask value (0 = background, 255 = person)
      let maskValue = maskPixels[i] / 255;
      
      // Apply edge smoothing
      if (this.edgeSmoothAmount > 0) {
        maskValue = this.smoothstep(
          0.5 - this.edgeSmoothAmount,
          0.5 + this.edgeSmoothAmount,
          maskValue
        );
      }
      
      // Blend foreground and background
      outputPixels[i] = maskValue * videoPixels[i] + (1 - maskValue) * bgPixels[i];
      outputPixels[i + 1] = maskValue * videoPixels[i + 1] + (1 - maskValue) * bgPixels[i + 1];
      outputPixels[i + 2] = maskValue * videoPixels[i + 2] + (1 - maskValue) * bgPixels[i + 2];
      outputPixels[i + 3] = 255;
    }
    
    // Draw result
    this.ctx.putImageData(outputData, 0, 0);
    
    return this.canvas;
  }
  
  smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }
  
  generateBackground(width, height) {
    const bg = this.currentBackground;
    const pixels = new Uint8ClampedArray(width * height * 4);
    
    if (!bg) {
      // Transparent background
      return pixels;
    }
    
    switch (bg.type) {
      case 'blur':
        // For blur, we'll handle this differently in the main processor
        // Return transparent for now - blur is handled by applying blur filter to video
        return pixels;
        
      case 'color':
        return this.generateSolidColor(width, height, bg.color);
        
      case 'gradient':
        return this.generateGradient(width, height, bg.colors);
        
      case 'image':
        if (this.backgroundImage && this.backgroundLoaded) {
          return this.getImagePixels(width, height);
        }
        return pixels;
        
      default:
        return pixels;
    }
  }
  
  generateSolidColor(width, height, hexColor) {
    const pixels = new Uint8ClampedArray(width * height * 4);
    const rgb = this.hexToRgb(hexColor);
    
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = rgb.r;
      pixels[i + 1] = rgb.g;
      pixels[i + 2] = rgb.b;
      pixels[i + 3] = 255;
    }
    
    return pixels;
  }
  
  generateGradient(width, height, colors) {
    const pixels = new Uint8ClampedArray(width * height * 4);
    const color1 = this.hexToRgb(colors[0]);
    const color2 = this.hexToRgb(colors[1]);
    
    for (let y = 0; y < height; y++) {
      const t = y / height;
      const r = Math.round(color1.r + (color2.r - color1.r) * t);
      const g = Math.round(color1.g + (color2.g - color1.g) * t);
      const b = Math.round(color1.b + (color2.b - color1.b) * t);
      
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = 255;
      }
    }
    
    return pixels;
  }
  
  getImagePixels(width, height) {
    if (!this.backgroundImage) {
      return new Uint8ClampedArray(width * height * 4);
    }
    
    // Draw background image to temp canvas (scaled to fit)
    this.tempCtx.drawImage(this.backgroundImage, 0, 0, width, height);
    const imageData = this.tempCtx.getImageData(0, 0, width, height);
    return imageData.data;
  }
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
  
  // Apply blur to background only (person stays sharp)
  processBlurBackground(videoFrame, segmentationMask, blurAmount = 15) {
    if (!this.ctx || !segmentationMask) return videoFrame;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Draw blurred video
    this.ctx.filter = `blur(${blurAmount}px)`;
    this.ctx.drawImage(videoFrame, 0, 0, width, height);
    this.ctx.filter = 'none';
    
    // Save blurred background
    const blurredData = this.ctx.getImageData(0, 0, width, height);
    
    // Draw sharp video to temp canvas
    this.tempCtx.drawImage(videoFrame, 0, 0, width, height);
    const sharpData = this.tempCtx.getImageData(0, 0, width, height);
    
    // Get mask
    this.tempCtx.drawImage(segmentationMask, 0, 0, width, height);
    const maskData = this.tempCtx.getImageData(0, 0, width, height);
    
    // Composite: sharp person over blurred background
    const outputData = this.ctx.createImageData(width, height);
    
    for (let i = 0; i < blurredData.data.length; i += 4) {
      let maskValue = maskData.data[i] / 255;
      
      // Smooth edges
      maskValue = this.smoothstep(0.4, 0.6, maskValue);
      
      outputData.data[i] = maskValue * sharpData.data[i] + (1 - maskValue) * blurredData.data[i];
      outputData.data[i + 1] = maskValue * sharpData.data[i + 1] + (1 - maskValue) * blurredData.data[i + 1];
      outputData.data[i + 2] = maskValue * sharpData.data[i + 2] + (1 - maskValue) * blurredData.data[i + 2];
      outputData.data[i + 3] = 255;
    }
    
    this.ctx.putImageData(outputData, 0, 0);
    return this.canvas;
  }
  
  // High-quality background replacement with edge refinement
  processBackgroundReplacement(videoFrame, segmentationMask) {
    if (!this.ctx || !segmentationMask || !this.currentBackground) {
      return videoFrame;
    }
    
    if (this.currentBackground.type === 'blur') {
      return this.processBlurBackground(
        videoFrame, 
        segmentationMask, 
        this.currentBackground.intensity || 15
      );
    }
    
    return this.processFrame(videoFrame, segmentationMask);
  }
  
  destroy() {
    this.canvas = null;
    this.ctx = null;
    this.tempCanvas = null;
    this.tempCtx = null;
    this.backgroundImage = null;
  }
}

export const BackgroundProcessor = new BackgroundProcessorCore();
export default BackgroundProcessor;