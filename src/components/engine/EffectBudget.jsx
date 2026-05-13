/**
 * EffectBudget — Filter safety limits + GPU budget management.
 * Prevents users from enabling too many heavy effects simultaneously.
 * Automatically disables expensive effects when FPS drops.
 *
 * Classifies effects by cost and enforces a max budget per tier.
 */

// Effect cost classification
const EFFECT_COSTS = {
  // Original filters
  none: 0,
  beauty_soft: 1, beauty_glam: 1, dream_glow: 1, cinematic: 1,
  golden_hour: 1, cool_fade: 1, warm_vintage: 1, bw_crisp: 1,
  vivid_pop: 2, neon_dream: 2, synthwave: 2,

  // Original overlays (particles)
  sparkles: 2, fire: 3, hearts: 2, stars: 2, galaxy: 3, halo: 1,

  // Background effects
  blur_light: 2, blur_strong: 3, gradient_purple: 1, gradient_gold: 1, gradient_dark: 0,

  // MoCap
  mocap_active: 4, ar_processing: 2,

  // Advanced visual filters
  dither: 1, vhs: 2, chromatic_aberration: 2, rgb_split: 2,
  film_grain: 1, crt_scanlines: 1, analog_noise: 1, bloom: 1,
  soft_glow: 1, sharpen: 1, tilt_shift: 2, dream_blur: 1,
  gaussian_blur: 1, pixelate: 2, thermal: 2, infrared: 1,
  night_vision: 1, xray: 1, cyberpunk_neon: 2, vaporwave: 2,

  // Advanced beauty
  skin_smooth: 1, eye_bright: 1, teeth_white: 1, face_slim: 2,
  jawline: 2, makeup: 2, lip_tint: 1, anime_face: 3,
  doll_face: 2, k_beauty: 1,

  // Advanced particles
  floating_hearts: 2, snow: 2, rain: 2, fire_embers: 3,
  lightning: 2, sakura: 2, smoke: 2, bubbles: 1,
  spark_trails: 2, golden_aura: 2,

  // Advanced interactive
  water_ripple: 3, spotlight: 1, portal: 3, shockwave: 2,
  bass_pulse: 2, hologram: 3, matrix_rain: 2, energy_field: 2,
  glitch: 3, letterbox: 0,
};

// Budget per quality tier
const TIER_BUDGETS = {
  ultra: 12,
  high: 10,
  medium: 7,
  low: 4,
  battery_saver: 2,
};

class EffectBudgetService {
  constructor() {
    this._activeEffects = new Map(); // effectId → cost
    this._tier = 'high';
    this._listeners = [];
    this._autoDisabledEffects = new Set();
  }

  setTier(tier) {
    this._tier = tier;
    this._enforceLimit();
  }

  /** Get cost of an effect */
  getCost(effectId) {
    return EFFECT_COSTS[effectId] ?? 1;
  }

  /** Get current total budget usage */
  getCurrentUsage() {
    let total = 0;
    for (const cost of this._activeEffects.values()) total += cost;
    return total;
  }

  /** Get budget limit for current tier */
  getBudget() {
    return TIER_BUDGETS[this._tier] ?? TIER_BUDGETS.high;
  }

  /** Check if adding an effect would exceed budget */
  canActivate(effectId) {
    const cost = this.getCost(effectId);
    return this.getCurrentUsage() + cost <= this.getBudget();
  }

  /** Activate an effect (returns false if over budget) */
  activate(effectId) {
    const cost = this.getCost(effectId);
    if (cost === 0) {
      this._activeEffects.set(effectId, 0);
      return true;
    }
    if (this.getCurrentUsage() + cost > this.getBudget()) {
      console.warn(`[EffectBudget] Cannot activate "${effectId}" — budget exceeded (${this.getCurrentUsage()}+${cost} > ${this.getBudget()})`);
      return false;
    }
    this._activeEffects.set(effectId, cost);
    this._autoDisabledEffects.delete(effectId);
    this._notify();
    return true;
  }

  /** Deactivate an effect */
  deactivate(effectId) {
    this._activeEffects.delete(effectId);
    this._notify();
  }

  /** Called when FPS drops below threshold — auto-disable heaviest effects */
  emergencyReduce() {
    const sorted = [...this._activeEffects.entries()].sort((a, b) => b[1] - a[1]);
    for (const [id, cost] of sorted) {
      if (cost >= 2) {
        this._activeEffects.delete(id);
        this._autoDisabledEffects.add(id);
        console.warn(`[EffectBudget] Emergency: disabled "${id}" (cost ${cost})`);
        this._notify();
        return id; // disable one at a time
      }
    }
    return null;
  }

  /** Get list of auto-disabled effects (user can see what was turned off) */
  getAutoDisabled() {
    return [...this._autoDisabledEffects];
  }

  /** Clear all active effects */
  clear() {
    this._activeEffects.clear();
    this._autoDisabledEffects.clear();
    this._notify();
  }

  _enforceLimit() {
    while (this.getCurrentUsage() > this.getBudget()) {
      const disabled = this.emergencyReduce();
      if (!disabled) break;
    }
  }

  onChange(cb) {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(c => c !== cb); };
  }

  _notify() {
    const state = {
      usage: this.getCurrentUsage(),
      budget: this.getBudget(),
      active: [...this._activeEffects.keys()],
      autoDisabled: this.getAutoDisabled(),
    };
    this._listeners.forEach(cb => cb(state));
  }
}

const EffectBudget = new EffectBudgetService();
export default EffectBudget;