/**
 * BrowserCompat — Feature detection + graceful fallbacks.
 * Checks capabilities once at startup and exposes flags
 * that other systems use to enable/disable features.
 */

let _cached = null;

export function detectCapabilities() {
  if (_cached) return _cached;

  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isSamsungInternet = /SamsungBrowser/.test(ua);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

  // WebGL detection
  let webgl1 = false;
  let webgl2 = false;
  let maxTextureSize = 0;
  try {
    const testCanvas = document.createElement('canvas');
    const gl2 = testCanvas.getContext('webgl2');
    if (gl2) {
      webgl2 = true;
      webgl1 = true;
      maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE);
    } else {
      const gl1 = testCanvas.getContext('webgl');
      if (gl1) {
        webgl1 = true;
        maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE);
      }
    }
  } catch (e) {}

  // OffscreenCanvas support
  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined';

  // Web Worker support
  const webWorkers = typeof Worker !== 'undefined';

  // MediaPipe / WASM support
  const wasmSupported = typeof WebAssembly !== 'undefined';

  // VideoTrackGenerator (for AR pipeline)
  const videoTrackGenerator = typeof VideoTrackGenerator !== 'undefined' ||
    typeof MediaStreamTrackGenerator !== 'undefined';

  // captureStream
  const canCaptureStream = !!HTMLCanvasElement.prototype.captureStream;

  // SharedArrayBuffer (needed for some WASM threading)
  const sharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  // Performance.memory (Chrome only)
  const memoryAPI = !!performance.memory;

  // Device info
  const cores = navigator.hardwareConcurrency || 4;
  const memoryGB = navigator.deviceMemory || 4;

  _cached = {
    browser: {
      isSafari, isIOS, isChrome, isFirefox, isEdge, isSamsungInternet, isMobile,
    },
    graphics: {
      webgl1, webgl2, maxTextureSize,
    },
    features: {
      offscreenCanvas,
      webWorkers,
      wasmSupported,
      videoTrackGenerator,
      canCaptureStream,
      sharedArrayBuffer,
      memoryAPI,
    },
    device: {
      cores,
      memoryGB,
      isLowEnd: isMobile && cores <= 4 && memoryGB <= 4,
      isMidRange: isMobile && cores <= 6,
      isHighEnd: cores >= 8 && memoryGB >= 8,
    },
    // Pre-computed recommendations
    recommendations: {
      useWebGL: webgl1,
      useShadows: !isMobile && webgl2,
      useAntialias: !isMobile && cores >= 4,
      usePostProcessing: webgl2 && cores >= 4,
      maxParticles: isMobile ? (cores <= 4 ? 30 : 80) : 200,
      maxSimultaneousEffects: isMobile ? 2 : 4,
      trackingModelComplexity: isMobile ? 0 : 1,
      preferGPUFilters: webgl2 && !isSafari, // Safari WebGL can be finicky
      canUseOffscreenTracking: offscreenCanvas && webWorkers,
    },
  };

  console.log('[BrowserCompat] Detected:', {
    browser: Object.entries(_cached.browser).filter(([,v]) => v).map(([k]) => k).join(', '),
    webgl: webgl2 ? 'WebGL2' : webgl1 ? 'WebGL1' : 'none',
    cores,
    memoryGB,
    offscreen: offscreenCanvas,
  });

  return _cached;
}

/** Quick check for specific capability */
export function hasCapability(path) {
  const caps = detectCapabilities();
  return path.split('.').reduce((obj, key) => obj?.[key], caps);
}

/** Get a safe WebGL context with fallbacks */
export function getSafeWebGLContext(canvas, options = {}) {
  const caps = detectCapabilities();
  const defaults = {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    antialias: caps.recommendations.useAntialias,
    powerPreference: caps.browser.isMobile ? 'low-power' : 'high-performance',
    failIfMajorPerformanceCaveat: false,
  };
  const opts = { ...defaults, ...options };

  let gl = null;
  if (caps.graphics.webgl2) {
    gl = canvas.getContext('webgl2', opts);
  }
  if (!gl) {
    gl = canvas.getContext('webgl', opts);
  }
  if (!gl) {
    gl = canvas.getContext('experimental-webgl', opts);
  }
  return gl;
}