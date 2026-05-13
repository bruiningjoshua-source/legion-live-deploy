/**
 * EffectBudget — Filter safety limits + GPU budget management.
 * Prevents users from enabling too many heavy effects simultaneously.
 * Automatically disables expensive effects when FPS drops.
 *
 * Classifies effects by cost and enforces a max budget per tier.
 */

// Effect cost classification
const EFFECT_COSTS = {
  // Filters
  none: 0,
  beauty_soft: 1,
  beauty_glam: 1,
  dream_glow: 1,
  cinematic: 1,
  golden_hour: 1,
  cool_fade: 1,
  warm_vintage: 1,
  bw_crisp: 1,
  vivid_pop: 2,
  neon_dream: 2,
  synthwave: 2,

  // Overlays (particles)
  sparkles: 2,
  fire: 3,
  hearts: 2,
  stars: 2,
  galaxy: 3,
  halo: 1,

  // Background effects
  blur_light: 2,
  blur_strong: 3,
  gradient_purple: 1,
  gradient_gold: 1,
  gradient_dark: 0,

  // MoCap
  mocap_active: 4,
  ar_processing: 2,
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