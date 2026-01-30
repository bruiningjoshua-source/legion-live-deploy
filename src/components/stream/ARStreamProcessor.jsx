/**
 * ARStreamProcessor - Main component that orchestrates all AR/filter processing
 * Combines face tracking, filters, accessories, and background replacement
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { Camera } from '@mediapipe/camera_utils';
import { FILTER_PRESETS, BACKGROUNDS } from './ARFilterEngine';
import { AccessoryRenderer } from './filters/AccessoryRenderer';
import { BackgroundProcessor } from './filters/BackgroundProcessor';

// Face landmark indices
const LANDMARKS = {
  noseTip: 1,
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  chin: 152,
  foreheadCenter: 10,
};

export default function ARStreamProcessor({
  videoRef,
  canvasRef,
  enabled = true,
  filter = 'none',
  accessory = 'none',
  background = null,
  customSettings = {},
  onFpsUpdate,
  onFaceDetected,
  mirrorVideo = true,
}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [faceLandmarks, setFaceLandmarks] = useState(null);
  const [segmentationMask, setSegmentationMask] = useState(null);
  const [fps, setFps] = useState(0);
  
  const faceMeshRef = useRef(null);
  const selfieSegRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);
  const processingCanvasRef = useRef(null);
  const accessoryCanvasRef = useRef(null);

  // Initialize MediaPipe models
  useEffect(() => {
    if (!enabled || !videoRef?.current) return;

    const initializeAR = async () => {
      try {
        // Create processing canvases
        if (!processingCanvasRef.current) {
          processingCanvasRef.current = document.createElement('canvas');
        }
        if (!accessoryCanvasRef.current) {
          accessoryCanvasRef.current = document.createElement('canvas');
        }

        // Initialize Face Mesh
        faceMeshRef.current = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMeshRef.current.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMeshRef.current.onResults((results) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            setFaceLandmarks(results.multiFaceLandmarks[0]);
            onFaceDetected?.(true);
          } else {
            setFaceLandmarks(null);
            onFaceDetected?.(false);
          }
        });

        // Initialize Selfie Segmentation (only if background effects needed)
        selfieSegRef.current = new SelfieSegmentation({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });

        selfieSegRef.current.setOptions({
          modelSelection: 1,
          selfieMode: true,
        });

        selfieSegRef.current.onResults((results) => {
          setSegmentationMask(results.segmentationMask);
        });

        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current.readyState >= 2) {
            resolve();
          } else {
            videoRef.current.onloadeddata = resolve;
          }
        });

        // Set canvas dimensions
        const videoWidth = videoRef.current.videoWidth || 1280;
        const videoHeight = videoRef.current.videoHeight || 720;
        
        if (canvasRef?.current) {
          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
        }
        processingCanvasRef.current.width = videoWidth;
        processingCanvasRef.current.height = videoHeight;
        accessoryCanvasRef.current.width = videoWidth;
        accessoryCanvasRef.current.height = videoHeight;

        // Initialize processors
        BackgroundProcessor.initialize(processingCanvasRef.current);
        AccessoryRenderer.initialize(accessoryCanvasRef.current);

        // Start camera processing
        cameraRef.current = new Camera(videoRef.current, {
          onFrame: async () => {
            // Process face mesh
            if (faceMeshRef.current && accessory !== 'none') {
              await faceMeshRef.current.send({ image: videoRef.current });
            }
            
            // Process segmentation (only when background is enabled)
            if (selfieSegRef.current && background && background.type !== 'none') {
              await selfieSegRef.current.send({ image: videoRef.current });
            }
            
            // Update FPS
            frameCountRef.current++;
            const now = Date.now();
            if (now - lastFrameTimeRef.current >= 1000) {
              const currentFps = frameCountRef.current;
              setFps(currentFps);
              onFpsUpdate?.(currentFps);
              frameCountRef.current = 0;
              lastFrameTimeRef.current = now;
            }
          },
          width: videoWidth,
          height: videoHeight,
        });

        await cameraRef.current.start();
        setIsInitialized(true);
        
      } catch (error) {
        console.error('AR initialization error:', error);
      }
    };

    initializeAR();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, videoRef]);

  // Update background when changed
  useEffect(() => {
    if (background) {
      BackgroundProcessor.setBackground(background);
    }
  }, [background]);

  // Main render loop
  useEffect(() => {
    if (!isInitialized || !canvasRef?.current || !videoRef?.current) return;

    const ctx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Apply mirror transform if needed
      ctx.save();
      if (mirrorVideo) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      // Step 1: Process background replacement
      if (background && background.type !== 'none' && segmentationMask) {
        BackgroundProcessor.processBackgroundReplacement(
          videoRef.current,
          segmentationMask
        );
        ctx.drawImage(processingCanvasRef.current, 0, 0);
      } else {
        // No background processing - just draw video
        ctx.drawImage(videoRef.current, 0, 0, width, height);
      }

      // Step 2: Apply color filters
      const filterSettings = getFilterSettings(filter, customSettings);
      applyFilters(ctx, filterSettings, width, height);

      ctx.restore();

      // Step 3: Draw face accessories (drawn after restore so they're not mirrored weirdly)
      if (accessory !== 'none' && faceLandmarks) {
        ctx.save();
        if (mirrorVideo) {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }
        
        const faceBounds = calculateFaceBounds(faceLandmarks);
        const rotation = calculateFaceRotation(faceLandmarks);
        
        AccessoryRenderer.clear();
        AccessoryRenderer.drawAccessory(accessory, faceLandmarks, faceBounds, rotation);
        
        // Composite accessory canvas onto main canvas
        ctx.drawImage(accessoryCanvasRef.current, 0, 0);
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized, filter, accessory, background, customSettings, faceLandmarks, segmentationMask, mirrorVideo]);

  return null; // This is a processing component, no UI
}

// Helper functions
function getFilterSettings(filterName, customSettings) {
  const preset = FILTER_PRESETS[filterName];
  if (!preset) return customSettings;
  
  // Merge preset with custom settings (custom takes priority)
  return {
    ...preset.settings,
    ...customSettings,
  };
}

function applyFilters(ctx, settings, width, height) {
  if (!settings) return;

  // Build CSS filter string
  const filters = [];
  
  if (settings.brightness && settings.brightness !== 1) {
    filters.push(`brightness(${settings.brightness})`);
  }
  if (settings.contrast && settings.contrast !== 1) {
    filters.push(`contrast(${settings.contrast})`);
  }
  if (settings.saturation && settings.saturation !== 1) {
    filters.push(`saturate(${settings.saturation})`);
  }
  if (settings.temperature) {
    // Approximate temperature with sepia and hue-rotate
    if (settings.temperature > 0) {
      filters.push(`sepia(${settings.temperature * 0.3})`);
    } else {
      filters.push(`hue-rotate(${settings.temperature * 30}deg)`);
    }
  }

  if (filters.length > 0) {
    ctx.filter = filters.join(' ');
    // Redraw with filters
    const imageData = ctx.getImageData(0, 0, width, height);
    ctx.putImageData(imageData, 0, 0);
    ctx.filter = 'none';
  }

  // Apply vignette
  if (settings.vignette && settings.vignette > 0) {
    applyVignette(ctx, width, height, settings.vignette);
  }

  // Apply glow
  if (settings.glow && settings.glow > 0) {
    applyGlow(ctx, width, height, settings.glow);
  }

  // Apply color overlay
  if (settings.colorOverlay && settings.overlayStrength > 0) {
    applyColorOverlay(ctx, width, height, settings.colorOverlay, settings.overlayStrength);
  }
}

function applyVignette(ctx, width, height, intensity) {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) / 2
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${intensity * 0.7})`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function applyGlow(ctx, width, height, intensity) {
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = intensity * 0.3;
  ctx.filter = `blur(${20 * intensity}px) brightness(1.5)`;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function applyColorOverlay(ctx, width, height, color, strength) {
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = strength;
  ctx.fillStyle = `rgb(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255})`;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function calculateFaceBounds(landmarks) {
  if (!landmarks) return null;
  
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  
  for (const point of landmarks) {
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

function calculateFaceRotation(landmarks) {
  if (!landmarks) return null;
  
  const nose = landmarks[LANDMARKS.noseTip];
  const leftEye = landmarks[LANDMARKS.leftEyeOuter];
  const rightEye = landmarks[LANDMARKS.rightEyeOuter];
  
  if (!nose || !leftEye || !rightEye) return null;
  
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
  
  return { roll };
}