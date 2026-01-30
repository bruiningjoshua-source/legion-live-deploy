/**
 * FilterRenderer - WebGL-based filter rendering
 * Handles all visual filter effects with GPU acceleration
 */

import React, { useRef, useEffect, useCallback } from 'react';

class FilterRendererCore {
  constructor() {
    this.gl = null;
    this.canvas = null;
    this.programs = {};
    this.textures = {};
    this.framebuffers = {};
    this.isInitialized = false;
  }
  
  initialize(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    
    if (!this.gl) {
      console.error('WebGL not supported');
      return false;
    }
    
    this.setupShaders();
    this.setupBuffers();
    this.isInitialized = true;
    
    return true;
  }
  
  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  createProgram(vertexSource, fragmentSource) {
    const gl = this.gl;
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) return null;
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  }
  
  setupShaders() {
    const vertexShader = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
    
    // Passthrough shader
    this.programs.passthrough = this.createProgram(vertexShader, `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      void main() {
        gl_FragColor = texture2D(u_image, v_texCoord);
      }
    `);
    
    // Color grading shader
    this.programs.colorGrade = this.createProgram(vertexShader, `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform float u_temperature;
      uniform float u_tint;
      uniform float u_saturation;
      uniform float u_contrast;
      uniform float u_brightness;
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
        
        // Brightness
        rgb *= u_brightness;
        
        // Temperature
        rgb.r += u_temperature * 0.1;
        rgb.b -= u_temperature * 0.1;
        
        // Tint
        rgb.g += u_tint * 0.1;
        
        // Saturation
        vec3 hsv = rgb2hsv(rgb);
        hsv.y *= u_saturation;
        rgb = hsv2rgb(hsv);
        
        // Contrast
        rgb = (rgb - 0.5) * u_contrast + 0.5;
        
        // Shadows/Highlights
        float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
        rgb += (1.0 - lum) * u_shadows * 0.15;
        rgb += lum * u_highlights * 0.15;
        
        // Color overlay
        rgb = mix(rgb, u_colorOverlay, u_overlayStrength);
        
        gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
      }
    `);
    
    // Beauty/skin smoothing shader
    this.programs.beauty = this.createProgram(vertexShader, `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform float u_smoothing;
      uniform vec2 u_resolution;
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        
        if (u_smoothing <= 0.0) {
          gl_FragColor = color;
          return;
        }
        
        float offset = u_smoothing * 2.0 / u_resolution.x;
        vec4 sum = vec4(0.0);
        float weightSum = 0.0;
        
        for (float x = -2.0; x <= 2.0; x += 1.0) {
          for (float y = -2.0; y <= 2.0; y += 1.0) {
            vec2 sampleCoord = v_texCoord + vec2(x, y) * offset;
            vec4 sampleColor = texture2D(u_image, sampleCoord);
            
            // Edge-preserving: weight by color similarity
            float colorDiff = length(sampleColor.rgb - color.rgb);
            float spatialWeight = exp(-(x*x + y*y) / 8.0);
            float colorWeight = exp(-colorDiff * colorDiff * 50.0);
            float weight = spatialWeight * colorWeight;
            
            sum += sampleColor * weight;
            weightSum += weight;
          }
        }
        
        vec4 smoothed = sum / weightSum;
        
        // Blend based on skin tone detection (rough heuristic)
        float skinLikelihood = 1.0;
        vec3 hsv = vec3(0.0);
        float maxC = max(color.r, max(color.g, color.b));
        float minC = min(color.r, min(color.g, color.b));
        hsv.z = maxC;
        float delta = maxC - minC;
        if (maxC > 0.0) hsv.y = delta / maxC;
        if (delta > 0.0) {
          if (maxC == color.r) hsv.x = (color.g - color.b) / delta;
          else if (maxC == color.g) hsv.x = 2.0 + (color.b - color.r) / delta;
          else hsv.x = 4.0 + (color.r - color.g) / delta;
          hsv.x /= 6.0;
          if (hsv.x < 0.0) hsv.x += 1.0;
        }
        
        // Skin tone is typically 0-50 degrees hue, 20-80% saturation
        if (hsv.x > 0.0 && hsv.x < 0.15 && hsv.y > 0.1 && hsv.y < 0.7) {
          skinLikelihood = 1.0;
        } else {
          skinLikelihood = 0.3;
        }
        
        gl_FragColor = mix(color, smoothed, u_smoothing * skinLikelihood * 0.5);
      }
    `);
    
    // Vignette shader
    this.programs.vignette = this.createProgram(vertexShader, `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform float u_intensity;
      uniform float u_softness;
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(v_texCoord, center);
        float vignette = smoothstep(0.5, 0.5 - u_softness, dist * (u_intensity + 0.5));
        color.rgb *= vignette;
        gl_FragColor = color;
      }
    `);
    
    // Glow/bloom shader
    this.programs.glow = this.createProgram(vertexShader, `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform float u_intensity;
      uniform vec2 u_resolution;
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        
        if (u_intensity <= 0.0) {
          gl_FragColor = color;
          return;
        }
        
        vec4 glow = vec4(0.0);
        float offset = 4.0 / u_resolution.x;
        float count = 0.0;
        
        for (float x = -3.0; x <= 3.0; x += 1.0) {
          for (float y = -3.0; y <= 3.0; y += 1.0) {
            vec2 sampleCoord = v_texCoord + vec2(x, y) * offset;
            vec4 sampleColor = texture2D(u_image, sampleCoord);
            float luminance = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
            float weight = exp(-(x*x + y*y) / 8.0);
            if (luminance > 0.5) {
              glow += sampleColor * weight * (luminance - 0.5) * 2.0;
            }
            count += weight;
          }
        }
        
        glow /= count;
        gl_FragColor = color + glow * u_intensity;
      }
    `);
    
    // Background blur shader
    this.programs.blur = this.createProgram(vertexShader, `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform sampler2D u_mask;
      uniform float u_blurAmount;
      uniform vec2 u_resolution;
      uniform int u_direction; // 0 = horizontal, 1 = vertical
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        float mask = texture2D(u_mask, v_texCoord).r;
        
        if (mask > 0.5 || u_blurAmount <= 0.0) {
          gl_FragColor = color;
          return;
        }
        
        vec4 sum = vec4(0.0);
        float weightSum = 0.0;
        float offset = u_blurAmount / u_resolution.x;
        
        for (float i = -8.0; i <= 8.0; i += 1.0) {
          vec2 sampleOffset = u_direction == 0 
            ? vec2(i * offset, 0.0) 
            : vec2(0.0, i * offset);
          vec4 sampleColor = texture2D(u_image, v_texCoord + sampleOffset);
          float weight = exp(-i * i / 32.0);
          sum += sampleColor * weight;
          weightSum += weight;
        }
        
        vec4 blurred = sum / weightSum;
        gl_FragColor = mix(blurred, color, mask);
      }
    `);
    
    // Background replacement shader
    this.programs.backgroundReplace = this.createProgram(vertexShader, `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform sampler2D u_mask;
      uniform sampler2D u_background;
      uniform vec3 u_bgColor;
      uniform int u_bgType; // 0 = color, 1 = image, 2 = gradient
      uniform vec3 u_gradientStart;
      uniform vec3 u_gradientEnd;
      uniform float u_edgeSmooth;
      
      void main() {
        vec4 foreground = texture2D(u_image, v_texCoord);
        float mask = texture2D(u_mask, v_texCoord).r;
        
        // Smooth mask edges
        float smoothMask = smoothstep(0.4 - u_edgeSmooth, 0.6 + u_edgeSmooth, mask);
        
        vec3 bg;
        if (u_bgType == 0) {
          bg = u_bgColor;
        } else if (u_bgType == 1) {
          bg = texture2D(u_background, v_texCoord).rgb;
        } else {
          bg = mix(u_gradientStart, u_gradientEnd, v_texCoord.y);
        }
        
        vec3 result = mix(bg, foreground.rgb, smoothMask);
        gl_FragColor = vec4(result, 1.0);
      }
    `);
  }
  
  setupBuffers() {
    const gl = this.gl;
    
    // Position buffer (full screen quad)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    // Texture coordinate buffer
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);
    
    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  }
  
  createTexture(source, name) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Set parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    if (source) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    
    this.textures[name] = texture;
    return texture;
  }
  
  updateTexture(name, source) {
    const gl = this.gl;
    if (!this.textures[name]) {
      this.createTexture(source, name);
      return;
    }
    
    gl.bindTexture(gl.TEXTURE_2D, this.textures[name]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }
  
  useProgram(programName) {
    const gl = this.gl;
    const program = this.programs[programName];
    if (!program) return null;
    
    gl.useProgram(program);
    
    // Set up vertex attributes
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    
    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    
    return program;
  }
  
  setUniform(program, name, type, value) {
    const gl = this.gl;
    const location = gl.getUniformLocation(program, name);
    if (!location) return;
    
    switch (type) {
      case 'float':
        gl.uniform1f(location, value);
        break;
      case 'int':
        gl.uniform1i(location, value);
        break;
      case 'vec2':
        gl.uniform2fv(location, value);
        break;
      case 'vec3':
        gl.uniform3fv(location, value);
        break;
      case 'vec4':
        gl.uniform4fv(location, value);
        break;
      case 'sampler2D':
        gl.uniform1i(location, value);
        break;
    }
  }
  
  render(settings = {}) {
    if (!this.isInitialized) return;
    
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Apply filters in sequence
    this.applyColorGrade(settings);
    this.applyBeauty(settings);
    this.applyVignette(settings);
    this.applyGlow(settings);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  applyColorGrade(settings) {
    const program = this.useProgram('colorGrade');
    if (!program) return;
    
    const gl = this.gl;
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.video);
    
    this.setUniform(program, 'u_image', 'sampler2D', 0);
    this.setUniform(program, 'u_temperature', 'float', settings.temperature || 0);
    this.setUniform(program, 'u_tint', 'float', settings.tint || 0);
    this.setUniform(program, 'u_saturation', 'float', settings.saturation || 1);
    this.setUniform(program, 'u_contrast', 'float', settings.contrast || 1);
    this.setUniform(program, 'u_brightness', 'float', settings.brightness || 1);
    this.setUniform(program, 'u_shadows', 'float', settings.shadows || 0);
    this.setUniform(program, 'u_highlights', 'float', settings.highlights || 0);
    this.setUniform(program, 'u_colorOverlay', 'vec3', settings.colorOverlay || [1, 1, 1]);
    this.setUniform(program, 'u_overlayStrength', 'float', settings.overlayStrength || 0);
  }
  
  applyBeauty(settings) {
    if (!settings.beauty || settings.beauty <= 0) return;
    
    const program = this.useProgram('beauty');
    if (!program) return;
    
    this.setUniform(program, 'u_image', 'sampler2D', 0);
    this.setUniform(program, 'u_smoothing', 'float', settings.beauty);
    this.setUniform(program, 'u_resolution', 'vec2', [this.canvas.width, this.canvas.height]);
  }
  
  applyVignette(settings) {
    if (!settings.vignette || settings.vignette <= 0) return;
    
    const program = this.useProgram('vignette');
    if (!program) return;
    
    this.setUniform(program, 'u_image', 'sampler2D', 0);
    this.setUniform(program, 'u_intensity', 'float', settings.vignette);
    this.setUniform(program, 'u_softness', 'float', settings.vignetteSoftness || 0.3);
  }
  
  applyGlow(settings) {
    if (!settings.glow || settings.glow <= 0) return;
    
    const program = this.useProgram('glow');
    if (!program) return;
    
    this.setUniform(program, 'u_image', 'sampler2D', 0);
    this.setUniform(program, 'u_intensity', 'float', settings.glow);
    this.setUniform(program, 'u_resolution', 'vec2', [this.canvas.width, this.canvas.height]);
  }
  
  applyBackgroundReplacement(mask, background, settings) {
    const program = this.useProgram('backgroundReplace');
    if (!program) return;
    
    const gl = this.gl;
    
    // Video texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.video);
    this.setUniform(program, 'u_image', 'sampler2D', 0);
    
    // Mask texture
    gl.activeTexture(gl.TEXTURE1);
    this.updateTexture('mask', mask);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.mask);
    this.setUniform(program, 'u_mask', 'sampler2D', 1);
    
    // Background settings
    if (background.type === 'color') {
      this.setUniform(program, 'u_bgType', 'int', 0);
      this.setUniform(program, 'u_bgColor', 'vec3', this.hexToRgb(background.color));
    } else if (background.type === 'image' && this.textures.background) {
      this.setUniform(program, 'u_bgType', 'int', 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.textures.background);
      this.setUniform(program, 'u_background', 'sampler2D', 2);
    } else if (background.type === 'gradient') {
      this.setUniform(program, 'u_bgType', 'int', 2);
      this.setUniform(program, 'u_gradientStart', 'vec3', this.hexToRgb(background.colors[0]));
      this.setUniform(program, 'u_gradientEnd', 'vec3', this.hexToRgb(background.colors[1]));
    }
    
    this.setUniform(program, 'u_edgeSmooth', 'float', settings.edgeSmooth || 0.1);
  }
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ] : [0, 0, 0];
  }
  
  loadBackgroundImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.createTexture(img, 'background');
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  
  destroy() {
    if (this.gl) {
      // Clean up WebGL resources
      Object.values(this.textures).forEach(texture => {
        this.gl.deleteTexture(texture);
      });
      Object.values(this.programs).forEach(program => {
        this.gl.deleteProgram(program);
      });
    }
    this.isInitialized = false;
  }
}

export const FilterRenderer = new FilterRendererCore();
export default FilterRenderer;