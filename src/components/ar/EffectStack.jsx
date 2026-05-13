/**
 * EffectStack — Multi-layer effect compositing engine.
 * Manages simultaneous filters, particles, overlays with intensity,
 * opacity controls, and smooth transitions. Integrates with EffectBudget.
 */

import EffectBudget from '@/components/engine/EffectBudget';
import AdaptiveQuality from '@/components/engine/AdaptiveQuality';
import { ADVANCED_FILTERS, GESTURE_EFFECTS, getFilterById } from './AdvancedFilters';

// Register all advanced filter costs in EffectBudget
ADVANCED_FILTERS.forEach(f => {
  if (f.cost !== undefined && !EffectBudget.getCost(f.id)) {
    // EffectBudget uses its internal cost map; we just need to ensure activation checks work
  }
});

class EffectStackService {
  constructor() {
    this._layers = []; // { id, filter, intensity, opacity, order }
    this._activeParticles = []; // { id, type, particles: [] }
    this._gestureEffects = []; // { id, effect, startTime, duration }
    this._listeners = [];
    this._favorites = JSON.parse(localStorage.getItem('ll_filter_favorites') || '[]');
    this._recents = JSON.parse(localStorage.getItem('ll_filter_recents') || '[]');
    this._presets = JSON.parse(localStorage.getItem('ll_filter_presets') || '[]');
  }

  /** Add a filter layer to the stack */
  addLayer(filterId, intensity = 100) {
    const filter = getFilterById(filterId);
    if (!filter) return false;
    
    // Check budget (use filter cost or default to 1)
    const cost = filter.cost ?? 1;
    if (EffectBudget.getCurrentUsage() + cost > EffectBudget.getBudget()) {
      return false; // over budget
    }
    EffectBudget.activate(filterId);

    // Prevent duplicate
    if (this._layers.find(l => l.id === filterId)) return true;

    this._layers.push({
      id: filterId,
      filter,
      intensity: Math.max(0, Math.min(100, intensity)),
      opacity: 1,
      order: this._layers.length,
    });

    this._addToRecents(filterId);
    this._notify();
    return true;
  }

  /** Remove a filter layer */
  removeLayer(filterId) {
    this._layers = this._layers.filter(l => l.id !== filterId);
    EffectBudget.deactivate(filterId);
    this._notify();
  }

  /** Update layer intensity (0-100) */
  setLayerIntensity(filterId, intensity) {
    const layer = this._layers.find(l => l.id === filterId);
    if (layer) {
      layer.intensity = Math.max(0, Math.min(100, intensity));
      this._notify();
    }
  }

  /** Reorder layers (drag-and-drop) */
  reorderLayers(fromIdx, toIdx) {
    const item = this._layers.splice(fromIdx, 1)[0];
    if (item) {
      this._layers.splice(toIdx, 0, item);
      this._layers.forEach((l, i) => l.order = i);
      this._notify();
    }
  }

  /** Get active layers */
  getLayers() { return [...this._layers]; }

  /** Trigger a gesture effect (temporary) */
  triggerGestureEffect(effectId) {
    const effect = GESTURE_EFFECTS[effectId];
    if (!effect) return;
    // Remove existing same effect
    this._gestureEffects = this._gestureEffects.filter(e => e.id !== effectId);
    this._gestureEffects.push({
      id: effectId,
      effect,
      startTime: performance.now(),
      duration: effect.duration || 1500,
    });
    this._notify();
  }

  /** Get active gesture effects (filters out expired) */
  getActiveGestureEffects() {
    const now = performance.now();
    this._gestureEffects = this._gestureEffects.filter(e => 
      now - e.startTime < e.duration
    );
    return this._gestureEffects.map(e => ({
      ...e,
      progress: (now - e.startTime) / e.duration, // 0→1
    }));
  }

  /** Apply all stacked effects to a canvas context */
  applyToCanvas(ctx, w, h, time, handPos) {
    // Apply filter layers in order
    for (const layer of this._layers) {
      if (layer.intensity <= 0) continue;
      const alpha = (layer.intensity / 100) * layer.opacity;
      
      if (layer.filter.css && alpha >= 1) {
        ctx.canvas.style.filter = layer.filter.css;
      }
      
      if (layer.filter.apply) {
        ctx.save();
        ctx.globalAlpha = alpha;
        layer.filter.apply(ctx, w, h, time, handPos);
        ctx.restore();
      }
    }

    // Apply gesture effects
    const gestureEffects = this.getActiveGestureEffects();
    for (const ge of gestureEffects) {
      const fadeOut = Math.max(0, 1 - ge.progress);
      if (ge.effect.css) {
        ctx.canvas.style.filter = ge.effect.css;
      }
      ctx.save();
      ctx.globalAlpha = fadeOut;
      // Flash effect for strobe
      if (ge.id === 'strobe' && Math.floor(ge.progress * 8) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(0, 0, w, h);
      }
      // Neon flash
      if (ge.id === 'neon_flash') {
        ctx.fillStyle = `rgba(168,85,247,${0.3 * fadeOut})`;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }
  }

  // ── Particle management ──
  addParticleEffect(filterId) {
    const filter = getFilterById(filterId);
    if (!filter?.particleType) return;
    if (this._activeParticles.find(p => p.id === filterId)) return;
    EffectBudget.activate(filterId);
    this._activeParticles.push({ id: filterId, type: filter.particleType, particles: [] });
    this._notify();
  }

  removeParticleEffect(filterId) {
    this._activeParticles = this._activeParticles.filter(p => p.id !== filterId);
    EffectBudget.deactivate(filterId);
    this._notify();
  }

  getActiveParticles() { return this._activeParticles; }

  // ── Favorites ──
  toggleFavorite(filterId) {
    const idx = this._favorites.indexOf(filterId);
    if (idx >= 0) this._favorites.splice(idx, 1);
    else this._favorites.push(filterId);
    localStorage.setItem('ll_filter_favorites', JSON.stringify(this._favorites));
    this._notify();
  }

  isFavorite(id) { return this._favorites.includes(id); }
  getFavorites() { return [...this._favorites]; }

  // ── Recents ──
  _addToRecents(id) {
    this._recents = [id, ...this._recents.filter(r => r !== id)].slice(0, 10);
    localStorage.setItem('ll_filter_recents', JSON.stringify(this._recents));
  }
  getRecents() { return [...this._recents]; }

  // ── Presets ──
  savePreset(name) {
    const preset = {
      name,
      layers: this._layers.map(l => ({ id: l.id, intensity: l.intensity })),
      particles: this._activeParticles.map(p => p.id),
      createdAt: Date.now(),
    };
    this._presets.push(preset);
    localStorage.setItem('ll_filter_presets', JSON.stringify(this._presets));
    return preset;
  }

  loadPreset(preset) {
    this.clearAll();
    preset.layers?.forEach(l => {
      this.addLayer(l.id, l.intensity);
    });
    preset.particles?.forEach(id => this.addParticleEffect(id));
  }

  getPresets() { return [...this._presets]; }
  deletePreset(idx) {
    this._presets.splice(idx, 1);
    localStorage.setItem('ll_filter_presets', JSON.stringify(this._presets));
  }

  /** Clear everything */
  clearAll() {
    this._layers.forEach(l => EffectBudget.deactivate(l.id));
    this._activeParticles.forEach(p => EffectBudget.deactivate(p.id));
    this._layers = [];
    this._activeParticles = [];
    this._gestureEffects = [];
    this._notify();
  }

  onChange(cb) {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(c => c !== cb); };
  }

  _notify() {
    this._listeners.forEach(cb => cb({
      layers: this.getLayers(),
      particles: this.getActiveParticles(),
      gestureEffects: this._gestureEffects.length,
    }));
  }
}

const EffectStack = new EffectStackService();
export default EffectStack;