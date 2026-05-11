/**
 * MediaPipeProcessor - Face Mesh & Selfie Segmentation for AR effects
 * Uses MediaPipe for real-time face tracking and background replacement
 */

import { useEffect, useState, useCallback } from 'react';

// MediaPipe CDN URLs
const FACE_MESH_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh';
const SELFIE_SEGMENTATION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation';
const CAMERA_UTILS_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils';

// Face mesh landmark indices for key features
export const FACE_LANDMARKS = {
  // Face oval
  faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  
  // Eyes
  leftEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
  rightEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  leftEyebrow: [336, 296, 334, 293, 300, 276, 283, 282, 295, 285],
  rightEyebrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  
  // Nose
  noseBridge: [6, 197, 195, 5, 4, 1, 19, 94, 2],
  noseTip: [1],
  
  // Mouth
  upperLip: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
  lowerLip: [146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
  
  // Forehead center (for placing headwear)
  foreheadCenter: [10],
  
  // Chin
  chin: [152],
  
  // Cheeks
  leftCheek: [234, 93, 132, 58, 172, 136, 150, 149, 176, 148],
  rightCheek: [454, 323, 361, 288, 397, 365, 379, 378, 400, 377],
};

// Singleton class for MediaPipe processing
class MediaPipeManager {
  constructor() {
    this.faceMesh = null;
    this.selfieSegmentation = null;
    this.camera = null;
    this.isInitialized = false;
    this.isProcessing = false;
    this.onFaceResults = null;
    this.onSegmentationResults = null;
    this.lastFaceResults = null;
    this.lastSegmentationMask = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.backgroundImage = null;
    this.settings = {
      faceMeshEnabled: true,
      segmentationEnabled: false,
      backgroundType: 'none',
      backgroundValue: null,
    };
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Dynamically load MediaPipe scripts
      await this.loadScript(`${FACE_MESH_CDN}/face_mesh.js`);
      await this.loadScript(`${SELFIE_SEGMENTATION_CDN}/selfie_segmentation.js`);
      await this.loadScript(`${CAMERA_UTILS_CDN}/camera_utils.js`);

      // Initialize Face Mesh
      if (window.FaceMesh) {
        this.faceMesh = new window.FaceMesh({
          locateFile: (file) => `${FACE_MESH_CDN}/${file}`,
        });
        
        this.faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        this.faceMesh.onResults((results) => {
          this.lastFaceResults = results;
          this.onFaceResults?.(results);
        });
      }

      // Initialize Selfie Segmentation
      if (window.SelfieSegmentation) {
        this.selfieSegmentation = new window.SelfieSegmentation({
          locateFile: (file) => `${SELFIE_SEGMENTATION_CDN}/${file}`,
        });

        this.selfieSegmentation.setOptions({
          modelSelection: 1, // 0 = general, 1 = landscape (better for streaming)
          selfieMode: true,
        });

        this.selfieSegmentation.onResults((results) => {
          this.lastSegmentationMask = results.segmentationMask;
          this.onSegmentationResults?.(results);
          this.processSegmentation(results);
        });
      }

      this.isInitialized = true;
      console.log('[MediaPipe] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[MediaPipe] Initialization failed:', error);
      return false;
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  setVideoElement(video) {
    this.videoElement = video;
  }

  setCanvasElement(canvas) {
    this.canvasElement = canvas;
    this.canvasCtx = canvas?.getContext('2d', { willReadFrequently: true });
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Load background image if needed
    if (newSettings.backgroundType === 'image' && newSettings.backgroundValue) {
      this.loadBackgroundImage(newSettings.backgroundValue);
    }
  }

  loadBackgroundImage(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.backgroundImage = img;
    };
    img.src = url;
  }

  async startProcessing() {
    if (!this.isInitialized || !this.videoElement) {
      console.warn('[MediaPipe] Not ready to process');
      return false;
    }

    this.isProcessing = true;
    this.processFrame();
    return true;
  }

  stopProcessing() {
    this.isProcessing = false;
  }

  async processFrame() {
    if (!this.isProcessing || !this.videoElement) return;

    try {
      // Process face mesh if enabled
      if (this.settings.faceMeshEnabled && this.faceMesh) {
        await this.faceMesh.send({ image: this.videoElement });
      }

      // Process segmentation if enabled
      if (this.settings.segmentationEnabled && this.selfieSegmentation) {
        await this.selfieSegmentation.send({ image: this.videoElement });
      }
    } catch (error) {
      console.error('[MediaPipe] Frame processing error:', error);
    }

    // Continue processing
    if (this.isProcessing) {
      requestAnimationFrame(() => this.processFrame());
    }
  }

  processSegmentation(results) {
    if (!this.canvasCtx || !this.canvasElement || !this.videoElement) return;

    const canvas = this.canvasElement;
    const ctx = this.canvasCtx;
    const video = this.videoElement;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Save context
    ctx.save();

    // Draw background based on type
    if (this.settings.backgroundType === 'blur') {
      // Draw blurred video as background
      ctx.filter = `blur(${this.settings.backgroundValue || 10}px)`;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
    } else if (this.settings.backgroundType === 'image' && this.backgroundImage) {
      // Draw background image
      ctx.drawImage(this.backgroundImage, 0, 0, canvas.width, canvas.height);
    } else if (this.settings.backgroundType === 'solid') {
      // Draw solid color
      ctx.fillStyle = this.settings.backgroundValue || '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (this.settings.backgroundType === 'gradient') {
      // Draw gradient
      const colors = this.settings.backgroundValue?.colors || ['#000000', '#333333'];
      const angle = this.settings.backgroundValue?.angle || 135;
      const gradient = ctx.createLinearGradient(
        0, 0,
        canvas.width * Math.cos(angle * Math.PI / 180),
        canvas.height * Math.sin(angle * Math.PI / 180)
      );
      colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), color);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Use segmentation mask to composite person over background
    if (results.segmentationMask) {
      // Draw person using mask
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
      
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      ctx.globalCompositeOperation = 'destination-over';
      // Background is already drawn
    }

    ctx.restore();
  }

  // Get face landmark positions in screen coordinates
  getFaceLandmarks() {
    if (!this.lastFaceResults?.multiFaceLandmarks?.[0]) {
      return null;
    }

    const landmarks = this.lastFaceResults.multiFaceLandmarks[0];
    const width = this.videoElement?.videoWidth || 640;
    const height = this.videoElement?.videoHeight || 480;

    // Convert normalized coordinates to screen coordinates
    const screenLandmarks = landmarks.map(lm => ({
      x: lm.x * width,
      y: lm.y * height,
      z: lm.z * width, // Approximate depth
    }));

    return {
      raw: screenLandmarks,
      features: {
        foreheadCenter: this.getAveragePoint(screenLandmarks, FACE_LANDMARKS.foreheadCenter),
        noseTip: this.getAveragePoint(screenLandmarks, FACE_LANDMARKS.noseTip),
        chin: this.getAveragePoint(screenLandmarks, FACE_LANDMARKS.chin),
        leftEyeCenter: this.getAveragePoint(screenLandmarks, FACE_LANDMARKS.leftEye),
        rightEyeCenter: this.getAveragePoint(screenLandmarks, FACE_LANDMARKS.rightEye),
        mouthCenter: this.getAveragePoint(screenLandmarks, [...FACE_LANDMARKS.upperLip, ...FACE_LANDMARKS.lowerLip]),
        leftCheekCenter: this.getAveragePoint(screenLandmarks, FACE_LANDMARKS.leftCheek),
        rightCheekCenter: this.getAveragePoint(screenLandmarks, FACE_LANDMARKS.rightCheek),
      },
      // Face bounding box
      boundingBox: this.getFaceBoundingBox(screenLandmarks),
      // Face rotation estimate
      rotation: this.estimateFaceRotation(screenLandmarks),
    };
  }

  getAveragePoint(landmarks, indices) {
    if (!indices.length) return { x: 0, y: 0, z: 0 };
    
    const sum = indices.reduce((acc, i) => ({
      x: acc.x + (landmarks[i]?.x || 0),
      y: acc.y + (landmarks[i]?.y || 0),
      z: acc.z + (landmarks[i]?.z || 0),
    }), { x: 0, y: 0, z: 0 });

    return {
      x: sum.x / indices.length,
      y: sum.y / indices.length,
      z: sum.z / indices.length,
    };
  }

  getFaceBoundingBox(landmarks) {
    if (!landmarks.length) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    landmarks.forEach(lm => {
      minX = Math.min(minX, lm.x);
      minY = Math.min(minY, lm.y);
      maxX = Math.max(maxX, lm.x);
      maxY = Math.max(maxY, lm.y);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }

  estimateFaceRotation(landmarks) {
    if (landmarks.length < 468) return { pitch: 0, yaw: 0, roll: 0 };

    // Use nose bridge and face edges to estimate rotation
    const noseTip = landmarks[1];
    const leftFace = landmarks[234];
    const rightFace = landmarks[454];
    const forehead = landmarks[10];
    const chin = landmarks[152];

    // Yaw (left-right rotation)
    const faceWidth = rightFace.x - leftFace.x;
    const noseCenterOffset = noseTip.x - (leftFace.x + faceWidth / 2);
    const yaw = (noseCenterOffset / (faceWidth / 2)) * 45; // Max 45 degrees

    // Pitch (up-down rotation)
    const faceHeight = chin.y - forehead.y;
    const noseCenterOffsetY = noseTip.y - (forehead.y + faceHeight / 2);
    const pitch = (noseCenterOffsetY / (faceHeight / 2)) * 30;

    // Roll (tilt)
    const eyeAngle = Math.atan2(
      landmarks[263].y - landmarks[33].y,
      landmarks[263].x - landmarks[33].x
    ) * (180 / Math.PI);
    const roll = eyeAngle;

    return { pitch, yaw, roll };
  }

  // Check if mouth is open (for triggers)
  isMouthOpen() {
    if (!this.lastFaceResults?.multiFaceLandmarks?.[0]) return false;

    const landmarks = this.lastFaceResults.multiFaceLandmarks[0];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const distance = Math.abs(upperLip.y - lowerLip.y);
    
    return distance > 0.03; // Threshold
  }

  // Check if eyes are closed (for triggers)
  areEyesClosed() {
    if (!this.lastFaceResults?.multiFaceLandmarks?.[0]) return { left: false, right: false };

    const landmarks = this.lastFaceResults.multiFaceLandmarks[0];
    
    // Left eye
    const leftUpper = landmarks[386];
    const leftLower = landmarks[374];
    const leftOpen = Math.abs(leftUpper.y - leftLower.y) > 0.015;

    // Right eye
    const rightUpper = landmarks[159];
    const rightLower = landmarks[145];
    const rightOpen = Math.abs(rightUpper.y - rightLower.y) > 0.015;

    return { left: !leftOpen, right: !rightOpen };
  }

  destroy() {
    this.stopProcessing();
    this.faceMesh = null;
    this.selfieSegmentation = null;
    this.isInitialized = false;
    this.lastFaceResults = null;
    this.lastSegmentationMask = null;
  }
}

// Export singleton
export const mediaPipeManager = new MediaPipeManager();

// React hook for using MediaPipe
export function useMediaPipe(videoRef, canvasRef, settings = {}) {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceLandmarks, setFaceLandmarks] = useState(null);
  const [error, setError] = useState(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        const success = await mediaPipeManager.initialize();
        setIsReady(success);
        if (!success) {
          setError('Failed to initialize MediaPipe');
        }
      } catch (err) {
        setError(err.message);
        setIsReady(false);
      }
    };

    init();

    return () => {
      mediaPipeManager.stopProcessing();
    };
  }, []);

  // Set video/canvas elements
  useEffect(() => {
    if (videoRef?.current) {
      mediaPipeManager.setVideoElement(videoRef.current);
    }
    if (canvasRef?.current) {
      mediaPipeManager.setCanvasElement(canvasRef.current);
    }
  }, [videoRef?.current, canvasRef?.current]);

  // Update settings
  useEffect(() => {
    mediaPipeManager.updateSettings(settings);
  }, [settings]);

  // Face results callback
  useEffect(() => {
    mediaPipeManager.onFaceResults = (results) => {
      const landmarks = mediaPipeManager.getFaceLandmarks();
      setFaceLandmarks(landmarks);
    };

    return () => {
      mediaPipeManager.onFaceResults = null;
    };
  }, []);

  // Start/stop processing
  const startProcessing = useCallback(async () => {
    if (!isReady) return false;
    const success = await mediaPipeManager.startProcessing();
    setIsProcessing(success);
    return success;
  }, [isReady]);

  const stopProcessing = useCallback(() => {
    mediaPipeManager.stopProcessing();
    setIsProcessing(false);
  }, []);

  return {
    isReady,
    isProcessing,
    faceLandmarks,
    error,
    startProcessing,
    stopProcessing,
    isMouthOpen: () => mediaPipeManager.isMouthOpen(),
    areEyesClosed: () => mediaPipeManager.areEyesClosed(),
  };
}

export default mediaPipeManager;