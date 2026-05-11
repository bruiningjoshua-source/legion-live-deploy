/**
 * LegionPerformanceScaler — Adaptive quality for mobile livestream rendering.
 * Monitors FPS and dynamically adjusts render scale, shadow quality,
 * and feature flags to maintain stable 30fps.
 */

const FPS_SAMPLES = 30; // rolling window
const TARGET_FPS = 28;  // trigger downscale below this
const RECOVER_FPS = 35; // trigger upscale above this

let _fpsHistory = [];
let _lastSampleTime = 0;
let _currentTier = 'high'; // 'high' | 'medium' | 'low'
let _frameCount = 0;
let _callbacks = [];

// Device capability detection
const _isMobile = typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const _isLowEnd = _isMobile && (navigator.hardwareConcurrency || 4) <= 4;

export function getPerformanceTier() {
  return _currentTier;
}

export function isMobile() {
  return _isMobile;
}

export function isLowEnd() {
  return _isLowEnd;
}

/** Get recommended renderer config for current tier */
export function getRendererConfig() {
  const configs = {
    high: {
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      shadowMapEnabled: true,
      shadowMapSize: 512,
      antialias: !_isMobile,
      maxLights: 4,
    },
    medium: {
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      shadowMapEnabled: !_isMobile,
      shadowMapSize: 256,
      antialias: false,
      maxLights: 3,
    },
    low: {
      pixelRatio: 1,
      shadowMapEnabled: false,
      shadowMapSize: 0,
      antialias: false,
      maxLights: 2,
    },
  };
  return configs[_currentTier] || configs.medium;
}

/** Call each frame to feed FPS data */
export function sampleFrame() {
  _frameCount++;
  const now = performance.now();

  if (now - _lastSampleTime >= 1000) {
    const fps = _frameCount;
    _frameCount = 0;
    _lastSampleTime = now;

    _fpsHistory.push(fps);
    if (_fpsHistory.length > FPS_SAMPLES) _fpsHistory.shift();

    // Only adapt after enough samples
    if (_fpsHistory.length >= 5) {
      const avg = _fpsHistory.reduce((a, b) => a + b, 0) / _fpsHistory.length;

      if (avg < TARGET_FPS && _currentTier !== 'low') {
        const newTier = _currentTier === 'high' ? 'medium' : 'low';
        console.log(`[PerfScaler] Downscaling: ${_currentTier} → ${newTier} (avg ${avg.toFixed(1)} fps)`);
        _currentTier = newTier;
        _fpsHistory = []; // reset after tier change
        _notifyCallbacks();
      } else if (avg > RECOVER_FPS && _currentTier !== 'high') {
        const newTier = _currentTier === 'low' ? 'medium' : 'high';
        console.log(`[PerfScaler] Upscaling: ${_currentTier} → ${newTier} (avg ${avg.toFixed(1)} fps)`);
        _currentTier = newTier;
        _fpsHistory = [];
        _notifyCallbacks();
      }
    }
  }
}

/** Register callback for tier changes */
export function onTierChange(cb) {
  _callbacks.push(cb);
  return () => { _callbacks = _callbacks.filter(c => c !== cb); };
}

function _notifyCallbacks() {
  const config = getRendererConfig();
  _callbacks.forEach(cb => cb(_currentTier, config));
}

/** Initial tier based on device */
export function detectInitialTier() {
  if (_isLowEnd) {
    _currentTier = 'low';
  } else if (_isMobile) {
    _currentTier = 'medium';
  } else {
    _currentTier = 'high';
  }
  return _currentTier;
}