/**
 * AdaptiveQuality — Production thermal protection + quality scaling.
 * Extends the existing LegionPerformanceScaler with:
 * - 5 quality tiers (ultra/high/medium/low/battery_saver)
 * - Thermal degradation detection via sustained low FPS
 * - Auto-downgrade of effects, particles, tracking frequency
 * - Hysteresis to prevent tier oscillation
 *
 * Does NOT replace LegionPerformanceScaler — works alongside it.
 */

const TIERS = ['ultra', 'high', 'medium', 'low', 'battery_saver'];

const TIER_CONFIGS = {
  ultra: {
    pixelRatio: Math.min(window.devicePixelRatio, 2.5),
    maxParticles: 200,
    trackingInterval: 0,      // every frame
    shadowMapEnabled: true,
    shadowMapSize: 1024,
    antialias: true,
    maxEffects: 5,
    postProcessing: true,
    renderScale: 1.0,
  },
  high: {
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    maxParticles: 120,
    trackingInterval: 0,
    shadowMapEnabled: true,
    shadowMapSize: 512,
    antialias: true,
    maxEffects: 4,
    postProcessing: true,
    renderScale: 1.0,
  },
  medium: {
    pixelRatio: Math.min(window.devicePixelRatio, 1.5),
    maxParticles: 60,
    trackingInterval: 1,      // skip every other frame
    shadowMapEnabled: false,
    shadowMapSize: 0,
    antialias: false,
    maxEffects: 3,
    postProcessing: true,
    renderScale: 0.85,
  },
  low: {
    pixelRatio: 1,
    maxParticles: 30,
    trackingInterval: 2,      // skip 2 of 3 frames
    shadowMapEnabled: false,
    shadowMapSize: 0,
    antialias: false,
    maxEffects: 2,
    postProcessing: false,
    renderScale: 0.7,
  },
  battery_saver: {
    pixelRatio: 1,
    maxParticles: 10,
    trackingInterval: 3,      // skip 3 of 4 frames
    shadowMapEnabled: false,
    shadowMapSize: 0,
    antialias: false,
    maxEffects: 1,
    postProcessing: false,
    renderScale: 0.5,
  },
};

// Thresholds with hysteresis
const DOWNGRADE_FPS = 22;    // sustained below this → drop tier
const UPGRADE_FPS = 35;      // sustained above this → raise tier
const SAMPLE_WINDOW = 8;     // seconds of sustained perf before tier change
const COOLDOWN_MS = 10000;   // minimum time between tier changes

class AdaptiveQualityService {
  constructor() {
    this._tier = 'high';
    this._fpsBuffer = [];
    this._lastTierChange = 0;
    this._listeners = [];
    this._forcedTier = null;   // manual override
    this._frameSkipCounter = 0;
  }

  /** Feed FPS sample (call once per second) */
  sample(fps) {
    if (this._forcedTier) return; // manual override active

    this._fpsBuffer.push(fps);
    if (this._fpsBuffer.length > SAMPLE_WINDOW) this._fpsBuffer.shift();
    if (this._fpsBuffer.length < 3) return; // need minimum samples

    const now = Date.now();
    if (now - this._lastTierChange < COOLDOWN_MS) return; // cooldown

    const avg = this._fpsBuffer.reduce((a, b) => a + b, 0) / this._fpsBuffer.length;
    const currentIdx = TIERS.indexOf(this._tier);

    if (avg < DOWNGRADE_FPS && currentIdx < TIERS.length - 1) {
      this._setTier(TIERS[currentIdx + 1], `FPS avg ${avg.toFixed(1)} < ${DOWNGRADE_FPS}`);
    } else if (avg > UPGRADE_FPS && currentIdx > 0) {
      this._setTier(TIERS[currentIdx - 1], `FPS avg ${avg.toFixed(1)} > ${UPGRADE_FPS}`);
    }
  }

  _setTier(tier, reason) {
    if (tier === this._tier) return;
    const prev = this._tier;
    this._tier = tier;
    this._lastTierChange = Date.now();
    this._fpsBuffer = []; // reset after change
    console.log(`[AdaptiveQuality] ${prev} → ${tier} (${reason})`);
    this._notify();
  }

  /** Force a specific tier (user setting) */
  forceTier(tier) {
    if (TIERS.includes(tier)) {
      this._forcedTier = tier;
      this._tier = tier;
      this._notify();
    }
  }

  /** Release forced tier, return to adaptive */
  releaseForce() {
    this._forcedTier = null;
  }

  /** Get current tier config */
  getConfig() {
    return { ...TIER_CONFIGS[this._tier] };
  }

  getTier() { return this._tier; }
  getTiers() { return [...TIERS]; }

  /**
   * Should this frame be processed for tracking?
   * Call per-frame; returns false when frames should be skipped.
   */
  shouldTrack() {
    const interval = TIER_CONFIGS[this._tier].trackingInterval;
    if (interval === 0) return true;
    this._frameSkipCounter = (this._frameSkipCounter + 1) % (interval + 1);
    return this._frameSkipCounter === 0;
  }

  /** Subscribe to tier changes */
  onChange(cb) {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(c => c !== cb); };
  }

  _notify() {
    const tier = this._tier;
    const config = this.getConfig();
    this._listeners.forEach(cb => cb(tier, config));
  }

  /** Detect initial tier based on device */
  detectInitial() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const cores = navigator.hardwareConcurrency || 4;
    const isLowEnd = isMobile && cores <= 4;
    const memoryGB = navigator.deviceMemory || 4;

    if (isLowEnd || memoryGB <= 2) {
      this._tier = 'low';
    } else if (isMobile) {
      this._tier = 'medium';
    } else if (cores >= 8 && memoryGB >= 8) {
      this._tier = 'ultra';
    } else {
      this._tier = 'high';
    }
    return this._tier;
  }
}

const AdaptiveQuality = new AdaptiveQualityService();
export default AdaptiveQuality;