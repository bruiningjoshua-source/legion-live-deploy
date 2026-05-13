/**
 * EngineOrchestrator — Boots up and coordinates all production systems.
 * Call init() once on stream start, shutdown() on stream end.
 * Wires: PerfMonitor → AdaptiveQuality → EffectBudget → StreamHealth
 */

import PerfMonitor from '@/components/engine/PerformanceMonitor';
import AdaptiveQuality from '@/components/engine/AdaptiveQuality';
import EffectBudget from '@/components/engine/EffectBudget';
import StreamHealth from '@/components/engine/StreamHealthMonitor';
import Disposer from '@/components/engine/ResourceDisposer';
import { detectCapabilities } from '@/components/engine/BrowserCompat';

class EngineOrchestratorService {
  constructor() {
    this._initialized = false;
    this._unsubs = [];
  }

  /** Initialize all production systems */
  init(zegoService = null) {
    if (this._initialized) return;
    this._initialized = true;

    // Detect browser capabilities
    const caps = detectCapabilities();

    // Set initial quality tier
    AdaptiveQuality.detectInitial();

    // Sync effect budget with adaptive tier
    EffectBudget.setTier(AdaptiveQuality.getTier());

    // Start performance monitoring
    PerfMonitor.start();

    // Wire PerfMonitor → AdaptiveQuality (feed FPS each second)
    const unsubPerf = PerfMonitor.onUpdate(snap => {
      AdaptiveQuality.sample(snap.fps);

      // Emergency: if FPS critically low, auto-disable expensive effects
      if (snap.fps > 0 && snap.fps < 15) {
        EffectBudget.emergencyReduce();
      }
    });
    this._unsubs.push(unsubPerf);

    // Wire AdaptiveQuality → EffectBudget
    const unsubQuality = AdaptiveQuality.onChange((tier, config) => {
      EffectBudget.setTier(tier);
    });
    this._unsubs.push(unsubQuality);

    // Start stream health monitoring if Zego is available
    if (zegoService) {
      StreamHealth.start(zegoService);
    }

    // Expose for LegionPerformanceScaler bridge
    if (typeof window !== 'undefined') window.__legionAdaptiveQuality = AdaptiveQuality;

    console.log('[EngineOrchestrator] Initialized — tier:', AdaptiveQuality.getTier());
  }

  /** Shutdown all systems */
  shutdown() {
    if (!this._initialized) return;
    this._initialized = false;

    PerfMonitor.stop();
    StreamHealth.stop();
    EffectBudget.clear();
    Disposer.disposeAll();

    this._unsubs.forEach(fn => fn());
    this._unsubs = [];

    console.log('[EngineOrchestrator] Shutdown complete');
  }

  /** Quick access to current state */
  getState() {
    return {
      tier: AdaptiveQuality.getTier(),
      config: AdaptiveQuality.getConfig(),
      perf: PerfMonitor.getSnapshot(),
      health: StreamHealth.getHealth(),
      budget: {
        usage: EffectBudget.getCurrentUsage(),
        limit: EffectBudget.getBudget(),
      },
      resources: Disposer.getStats(),
    };
  }

  isInitialized() { return this._initialized; }
}

const Orchestrator = new EngineOrchestratorService();
export default Orchestrator;