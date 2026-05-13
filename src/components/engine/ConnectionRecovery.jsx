/**
 * ConnectionRecovery — Resilient stream reconnection handler.
 * Implements exponential backoff, network change detection,
 * and automatic reconnection for livestream sessions.
 */

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

class ConnectionRecoveryService {
  constructor() {
    this._retryCount = 0;
    this._reconnecting = false;
    this._listeners = new Set();
    this._onlineHandler = null;
    this._reconnectFn = null;
  }

  /** Start monitoring connection for a stream session */
  init(reconnectFn) {
    this._reconnectFn = reconnectFn;
    this._retryCount = 0;
    this._reconnecting = false;

    // Listen for network state changes
    this._onlineHandler = () => {
      if (navigator.onLine && this._retryCount > 0) {
        console.log('[ConnectionRecovery] Network restored, attempting reconnect');
        this._attemptReconnect();
      }
    };
    window.addEventListener('online', this._onlineHandler);

    this._notify('connected');
  }

  /** Called when a stream disconnect is detected */
  onDisconnect(reason) {
    if (this._reconnecting) return;
    console.warn(`[ConnectionRecovery] Disconnected: ${reason}`);
    this._notify('disconnected', reason);
    this._attemptReconnect();
  }

  /** Manual reconnect trigger */
  forceReconnect() {
    this._retryCount = 0;
    this._attemptReconnect();
  }

  /** Called when reconnect succeeds */
  onReconnected() {
    this._retryCount = 0;
    this._reconnecting = false;
    this._notify('connected');
    console.log('[ConnectionRecovery] Reconnected successfully');
  }

  /** Cleanup */
  destroy() {
    if (this._onlineHandler) {
      window.removeEventListener('online', this._onlineHandler);
      this._onlineHandler = null;
    }
    this._reconnectFn = null;
    this._listeners.clear();
  }

  /** Subscribe to status changes */
  onStatusChange(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  getStatus() {
    return {
      retryCount: this._retryCount,
      reconnecting: this._reconnecting,
      online: navigator.onLine,
    };
  }

  /** @private */
  async _attemptReconnect() {
    if (!this._reconnectFn) return;
    if (this._retryCount >= MAX_RETRIES) {
      this._notify('failed', 'Max retries exceeded');
      return;
    }
    if (!navigator.onLine) {
      this._notify('waiting_network');
      return;
    }

    this._reconnecting = true;
    this._retryCount++;

    const delay = Math.min(
      BASE_DELAY_MS * Math.pow(2, this._retryCount - 1) + Math.random() * 1000,
      MAX_DELAY_MS
    );

    this._notify('reconnecting', `Attempt ${this._retryCount}/${MAX_RETRIES} in ${Math.round(delay / 1000)}s`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this._reconnectFn();
      this.onReconnected();
    } catch (e) {
      console.warn(`[ConnectionRecovery] Attempt ${this._retryCount} failed:`, e.message);
      this._attemptReconnect(); // Retry
    }
  }

  /** @private */
  _notify(status, detail) {
    const payload = { status, detail, retryCount: this._retryCount, timestamp: Date.now() };
    for (const cb of this._listeners) {
      try { cb(payload); } catch (_) {}
    }
  }
}

const ConnectionRecovery = new ConnectionRecoveryService();
export default ConnectionRecovery;