/**
 * HandTracker — MediaPipe Hands integration for gesture detection.
 * Tracks 21 hand landmarks per hand, fingertip positions, palm center,
 * hand openness, and rotation. Singleton service.
 */

const LANDMARK_COUNT = 21;
const FINGERTIPS = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky
const FINGER_MCPS = [2, 5, 9, 13, 17];

class HandTrackerService {
  constructor() {
    this._hands = null;
    this._camera = null;
    this._results = null;
    this._listeners = [];
    this._running = false;
    this._lastProcess = 0;
    this._throttleMs = 33; // ~30fps
  }

  /** Initialize MediaPipe Hands (lazy load) */
  async init() {
    if (this._hands) return;
    try {
      // Use CDN-hosted MediaPipe Hands
      const { Hands } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js');
      this._hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
      });
      this._hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      this._hands.onResults((results) => {
        this._results = this._processResults(results);
        this._notify();
      });
      console.log('[HandTracker] Initialized');
    } catch (e) {
      console.warn('[HandTracker] Failed to load MediaPipe Hands:', e.message);
    }
  }

  /** Process a video frame (call from render loop) */
  async processFrame(videoElement) {
    if (!this._hands || !videoElement || videoElement.readyState < 2) return;
    const now = performance.now();
    if (now - this._lastProcess < this._throttleMs) return;
    this._lastProcess = now;
    try {
      await this._hands.send({ image: videoElement });
    } catch (e) {
      // Silently skip frame errors
    }
  }

  /** Get latest hand data */
  getHands() { return this._results; }

  /** Subscribe to hand updates */
  onChange(cb) {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(c => c !== cb); };
  }

  _notify() {
    this._listeners.forEach(cb => cb(this._results));
  }

  _processResults(raw) {
    if (!raw.multiHandLandmarks || raw.multiHandLandmarks.length === 0) {
      return { hands: [], count: 0 };
    }

    const hands = raw.multiHandLandmarks.map((landmarks, idx) => {
      const handedness = raw.multiHandedness?.[idx]?.label || 'Right';
      
      // Fingertip positions (normalized 0-1)
      const fingertips = FINGERTIPS.map(i => landmarks[i]);
      
      // Palm center (average of MCP joints)
      const palmX = FINGER_MCPS.reduce((s, i) => s + landmarks[i].x, 0) / FINGER_MCPS.length;
      const palmY = FINGER_MCPS.reduce((s, i) => s + landmarks[i].y, 0) / FINGER_MCPS.length;
      const palmZ = FINGER_MCPS.reduce((s, i) => s + landmarks[i].z, 0) / FINGER_MCPS.length;
      
      // Finger extension states (is fingertip above MCP?)
      const fingerStates = [
        // Thumb: compare x distance from wrist
        Math.abs(landmarks[4].x - landmarks[0].x) > Math.abs(landmarks[3].x - landmarks[0].x),
        // Other fingers: tip y < pip y (raised)
        landmarks[8].y < landmarks[6].y,
        landmarks[12].y < landmarks[10].y,
        landmarks[16].y < landmarks[14].y,
        landmarks[20].y < landmarks[18].y,
      ];
      
      // Hand openness (avg distance from fingertips to palm center)
      const openness = fingertips.reduce((s, ft) => {
        const dx = ft.x - palmX, dy = ft.y - palmY;
        return s + Math.sqrt(dx * dx + dy * dy);
      }, 0) / fingertips.length;

      // Hand rotation (angle of wrist to middle finger MCP)
      const wrist = landmarks[0];
      const middleMCP = landmarks[9];
      const rotation = Math.atan2(middleMCP.x - wrist.x, middleMCP.y - wrist.y);

      return {
        handedness,
        landmarks,
        fingertips,
        fingerStates, // [thumb, index, middle, ring, pinky] true=extended
        palm: { x: palmX, y: palmY, z: palmZ },
        openness,
        rotation,
        indexTip: landmarks[8],
        thumbTip: landmarks[4],
      };
    });

    return { hands, count: hands.length };
  }

  /** Set tracking frequency (ms between frames) */
  setThrottle(ms) { this._throttleMs = Math.max(16, ms); }

  /** Cleanup */
  destroy() {
    this._hands?.close?.();
    this._hands = null;
    this._results = null;
    this._listeners = [];
  }
}

const HandTracker = new HandTrackerService();
export default HandTracker;