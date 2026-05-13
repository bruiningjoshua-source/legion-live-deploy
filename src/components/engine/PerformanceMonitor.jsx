/**
 * PerformanceMonitor — lightweight FPS, memory, and jank tracker.
 * Singleton. Call start() once; subscribers receive snapshots every second.
 */

class PerformanceMonitorService {
  constructor() {
    this._running = false;
    this._raf = null;
    this._subscribers = new Set();
    this._frames = 0;
    this._fpsHistory = [];
    this._startTime = 0;
    this._lastTick = 0;
    this._droppedFrames = 0;
    this._jankFrames = 0;
    this._peakMemoryMB = 0;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._startTime = Date.now();
    this._lastTick = performance.now();
    this._frames = 0;
    this._droppedFrames = 0;
    this._jankFrames = 0;
    this._fpsHistory = [];
    this._tick();
    this._interval = setInterval(() => this._emit(), 1000);
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    clearInterval(this._interval);
  }

  onUpdate(cb) {
    this._subscribers.add(cb);
    return () => this._subscribers.delete(cb);
  }

  getSnapshot() {
    return this._buildSnapshot();
  }

  /** @private */
  _tick() {
    if (!this._running) return;
    const now = performance.now();
    const delta = now - this._lastTick;
    this._lastTick = now;
    this._frames++;

    // Jank: frame took > 50ms (< 20fps equivalent)
    if (delta > 50) this._jankFrames++;
    // Dropped: frame took > 33ms (< 30fps equivalent)
    if (delta > 33) this._droppedFrames++;

    this._raf = requestAnimationFrame(() => this._tick());
  }

  /** @private */
  _emit() {
    const snap = this._buildSnapshot();
    this._fpsHistory.push(snap.fps);
    if (this._fpsHistory.length > 60) this._fpsHistory.shift();
    this._frames = 0; // reset per-second counter
    for (const cb of this._subscribers) {
      try { cb(snap); } catch (_) {}
    }
  }

  /** @private */
  _buildSnapshot() {
    const memoryMB = performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 1048576)
      : 0;
    if (memoryMB > this._peakMemoryMB) this._peakMemoryMB = memoryMB;

    const avgFps = this._fpsHistory.length > 0
      ? Math.round(this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length)
      : this._frames;

    return {
      fps: this._frames,
      avgFps,
      memoryMB,
      peakMemoryMB: this._peakMemoryMB,
      droppedFrames: this._droppedFrames,
      jankFrames: this._jankFrames,
      uptimeMinutes: Math.round((Date.now() - this._startTime) / 60000),
    };
  }
}

const PerfMonitor = new PerformanceMonitorService();
export default PerfMonitor;