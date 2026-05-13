/**
 * SessionWatchdog — Long-session stability monitor.
 * Detects memory growth, stale resources, and performance degradation
 * over multi-hour livestream sessions. Auto-triggers cleanup when needed.
 */

import PerfMonitor from './PerformanceMonitor';
import Disposer from './ResourceDisposer';
import EffectBudget from './EffectBudget';

const CHECK_INTERVAL_MS = 60_000;         // Check every 60s
const MEMORY_GROWTH_THRESHOLD_MB = 200;   // Warn if memory grew > 200MB since start
const MEMORY_CRITICAL_MB = 800;           // Emergency cleanup at 800MB
const FPS_DEGRADATION_THRESHOLD = 20;     // If avg FPS < 20 for 3 checks, intervene

class SessionWatchdogService {
  constructor() {
    this._interval = null;
    this._startMemory = 0;
    this._lowFpsStreak = 0;
    this._listeners = new Set();
    this._cleanupCount = 0;
    this._sessionStart = 0;
  }

  start() {
    if (this._interval) return;
    this._sessionStart = Date.now();
    this._startMemory = this._getMemoryMB();
    this._lowFpsStreak = 0;
    this._cleanupCount = 0;

    this._interval = setInterval(() => this._check(), CHECK_INTERVAL_MS);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  onAlert(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  getStatus() {
    const currentMem = this._getMemoryMB();
    return {
      uptimeMinutes: Math.round((Date.now() - this._sessionStart) / 60_000),
      memoryMB: currentMem,
      memoryGrowthMB: currentMem - this._startMemory,
      lowFpsStreak: this._lowFpsStreak,
      cleanupCount: this._cleanupCount,
      resources: Disposer.getStats(),
    };
  }

  /** @private */
  _check() {
    const snap = PerfMonitor.getSnapshot();
    const memMB = this._getMemoryMB();
    const growth = memMB - this._startMemory;

    // FPS degradation tracking
    if (snap.avgFps > 0 && snap.avgFps < FPS_DEGRADATION_THRESHOLD) {
      this._lowFpsStreak++;
    } else {
      this._lowFpsStreak = 0;
    }

    // Emergency: critical memory
    if (memMB > MEMORY_CRITICAL_MB) {
      this._emergencyCleanup('critical_memory');
      return;
    }

    // Warning: excessive growth
    if (growth > MEMORY_GROWTH_THRESHOLD_MB) {
      this._alert('memory_growth', `Memory grew ${growth.toFixed(0)}MB since session start`);
    }

    // FPS degradation intervention
    if (this._lowFpsStreak >= 3) {
      this._emergencyCleanup('sustained_low_fps');
      this._lowFpsStreak = 0;
    }
  }

  /** @private */
  _emergencyCleanup(reason) {
    this._cleanupCount++;
    console.warn(`[SessionWatchdog] Emergency cleanup (${reason}) #${this._cleanupCount}`);

    // Reduce effects budget
    EffectBudget.emergencyReduce();
    EffectBudget.emergencyReduce(); // Remove 2 heavy effects

    this._alert('emergency_cleanup', `Auto-cleanup triggered: ${reason}`);
  }

  /** @private */
  _alert(type, message) {
    const payload = { type, message, timestamp: Date.now(), status: this.getStatus() };
    for (const cb of this._listeners) {
      try { cb(payload); } catch (_) {}
    }
  }

  /** @private */
  _getMemoryMB() {
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1_048_576);
    }
    return 0;
  }
}

const SessionWatchdog = new SessionWatchdogService();
export default SessionWatchdog;