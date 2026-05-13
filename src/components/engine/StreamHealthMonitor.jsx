/**
 * StreamHealthMonitor — Production stream stability system.
 * Integrates with ZegoService to provide:
 * - Bitrate adaptation based on network quality
 * - Connection health scoring
 * - Reconnect recommendation
 * - Stream freeze detection
 * - Long-session stability tracking
 */

class StreamHealthMonitorService {
  constructor() {
    this._history = [];       // { timestamp, fps, bitrate, latency, packetLoss, quality }
    this._listeners = [];
    this._pollInterval = null;
    this._zegoService = null;
    this._lastVideoFrame = 0;
    this._freezeCount = 0;
    this._reconnectCount = 0;
    this._sessionStart = 0;
    this._healthScore = 100;
  }

  /** Start monitoring — pass the ZegoService singleton */
  start(zegoService) {
    if (this._pollInterval) return;
    this._zegoService = zegoService;
    this._sessionStart = Date.now();
    this._freezeCount = 0;
    this._reconnectCount = 0;

    this._pollInterval = setInterval(() => this._poll(), 3000);
    console.log('[StreamHealth] Monitoring started');
  }

  stop() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
    this._zegoService = null;
    console.log('[StreamHealth] Monitoring stopped');
  }

  _poll() {
    if (!this._zegoService) return;
    const stats = this._zegoService.getStats();

    // Freeze detection: if FPS is 0 for > 2 consecutive polls
    if (stats.fps === 0) {
      this._freezeCount++;
    } else {
      this._freezeCount = 0;
    }

    // Compute health score (0-100)
    let score = 100;
    if (stats.packetLoss > 10) score -= 30;
    else if (stats.packetLoss > 5) score -= 15;
    else if (stats.packetLoss > 2) score -= 5;

    if (stats.rtt > 300) score -= 25;
    else if (stats.rtt > 150) score -= 10;
    else if (stats.rtt > 80) score -= 3;

    if (stats.fps < 10) score -= 20;
    else if (stats.fps < 20) score -= 10;

    if (this._freezeCount > 1) score -= 20;

    score = Math.max(0, Math.min(100, score));
    this._healthScore = score;

    const entry = {
      timestamp: Date.now(),
      fps: stats.fps,
      bitrate: stats.videoBitrate,
      latency: stats.latency,
      rtt: stats.rtt,
      packetLoss: stats.packetLoss,
      quality: stats.networkQuality,
      healthScore: score,
      frozen: this._freezeCount > 1,
    };

    this._history.push(entry);
    // Keep last 20 minutes of history
    if (this._history.length > 400) this._history.shift();

    this._notify(entry);
    this._checkBitrateAdaptation(entry);
  }

  /** Auto-adapt video quality based on network conditions */
  _checkBitrateAdaptation(entry) {
    if (!this._zegoService) return;

    // Only adapt if we have enough history
    if (this._history.length < 3) return;

    const recent = this._history.slice(-3);
    const avgLoss = recent.reduce((a, e) => a + e.packetLoss, 0) / recent.length;
    const avgRtt = recent.reduce((a, e) => a + e.rtt, 0) / recent.length;

    const currentRes = this._zegoService.stats.videoResolution;

    // Downgrade
    if ((avgLoss > 8 || avgRtt > 250) && currentRes !== '360p') {
      const target = currentRes === '1080p' ? '720p' : currentRes === '720p' ? '480p' : '360p';
      console.log(`[StreamHealth] Downgrading quality: ${currentRes} → ${target} (loss=${avgLoss.toFixed(1)}%, rtt=${avgRtt.toFixed(0)}ms)`);
      this._zegoService.setVideoQuality(target);
    }
    // Upgrade (only if sustained good conditions)
    else if (avgLoss < 1 && avgRtt < 60 && this._history.length >= 10) {
      const recent10 = this._history.slice(-10);
      const allGood = recent10.every(e => e.packetLoss < 2 && e.rtt < 80);
      if (allGood && currentRes !== '720p' && currentRes !== '1080p') {
        const target = currentRes === '360p' ? '480p' : '720p';
        console.log(`[StreamHealth] Upgrading quality: ${currentRes} → ${target}`);
        this._zegoService.setVideoQuality(target);
      }
    }
  }

  /** Get current health summary */
  getHealth() {
    const uptimeMin = Math.round((Date.now() - this._sessionStart) / 60000);
    return {
      score: this._healthScore,
      status: this._healthScore >= 80 ? 'excellent' : this._healthScore >= 60 ? 'good' : this._healthScore >= 40 ? 'fair' : 'poor',
      frozen: this._freezeCount > 1,
      freezeEvents: this._freezeCount,
      reconnects: this._reconnectCount,
      uptimeMinutes: uptimeMin,
      historyLength: this._history.length,
    };
  }

  /** Increment reconnect counter (called by ZegoService) */
  recordReconnect() {
    this._reconnectCount++;
  }

  onUpdate(cb) {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(c => c !== cb); };
  }

  _notify(entry) {
    this._listeners.forEach(cb => cb(entry));
  }
}

const StreamHealth = new StreamHealthMonitorService();
export default StreamHealth;