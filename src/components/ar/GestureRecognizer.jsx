/**
 * GestureRecognizer — Detects 20 hand gestures + 10 facial gestures
 * from HandTracker and FaceTracker data. Emits gesture events with
 * cooldown to prevent rapid-fire triggers.
 */

const GESTURE_COOLDOWN = 600; // ms between same gesture triggers

// ── HAND GESTURE DEFINITIONS ──
// Each detector receives hand data { fingerStates, openness, palm, landmarks, thumbTip, indexTip, rotation }
const HAND_GESTURES = {
  fist: (h) => h.fingerStates.every(s => !s) && h.openness < 0.12,
  open_hand: (h) => h.fingerStates.every(s => s) && h.openness > 0.18,
  peace: (h) => !h.fingerStates[0] && h.fingerStates[1] && h.fingerStates[2] && !h.fingerStates[3] && !h.fingerStates[4],
  pointing: (h) => !h.fingerStates[0] && h.fingerStates[1] && !h.fingerStates[2] && !h.fingerStates[3] && !h.fingerStates[4],
  thumbs_up: (h) => h.fingerStates[0] && !h.fingerStates[1] && !h.fingerStates[2] && !h.fingerStates[3] && !h.fingerStates[4] && h.thumbTip.y < h.palm.y,
  thumbs_down: (h) => h.fingerStates[0] && !h.fingerStates[1] && !h.fingerStates[2] && !h.fingerStates[3] && !h.fingerStates[4] && h.thumbTip.y > h.palm.y,
  finger_heart: (h) => h.fingerStates[0] && h.fingerStates[1] && !h.fingerStates[2] && !h.fingerStates[3] && !h.fingerStates[4] && dist2d(h.thumbTip, h.indexTip) < 0.05,
  rock: (h) => !h.fingerStates[0] && h.fingerStates[1] && !h.fingerStates[2] && !h.fingerStates[3] && h.fingerStates[4],
  ok_sign: (h) => dist2d(h.thumbTip, h.indexTip) < 0.04 && h.fingerStates[2] && h.fingerStates[3] && h.fingerStates[4],
  pinch: (h) => dist2d(h.thumbTip, h.indexTip) < 0.03 && !h.fingerStates[2] && !h.fingerStates[3],
  palm_push: (h) => h.fingerStates.every(s => s) && h.palm.z < -0.05,
  claw: (h) => {
    // All fingers partially curled (not fully extended, not fist)
    return h.openness > 0.08 && h.openness < 0.16 && h.fingerStates.filter(s => s).length >= 3;
  },
};

// ── TWO-HAND GESTURES ──
const TWO_HAND_GESTURES = {
  two_hand_open: (h1, h2) => HAND_GESTURES.open_hand(h1) && HAND_GESTURES.open_hand(h2),
  two_hand_heart: (h1, h2) => {
    // Both index tips close together, forming a heart shape
    return dist2d(h1.indexTip, h2.indexTip) < 0.08 && dist2d(h1.thumbTip, h2.thumbTip) < 0.08;
  },
  double_point: (h1, h2) => HAND_GESTURES.pointing(h1) && HAND_GESTURES.pointing(h2),
};

// ── SWIPE DETECTION ──
class SwipeDetector {
  constructor() {
    this._history = [];
    this._maxHistory = 8;
  }
  
  addPosition(palm) {
    this._history.push({ x: palm.x, y: palm.y, t: performance.now() });
    if (this._history.length > this._maxHistory) this._history.shift();
  }

  detect() {
    if (this._history.length < 4) return null;
    const first = this._history[0];
    const last = this._history[this._history.length - 1];
    const dt = last.t - first.t;
    if (dt > 500 || dt < 80) return null; // must be a quick motion
    
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.12) return null; // must travel enough

    const angle = Math.atan2(dy, dx);
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'swipe_right' : 'swipe_left';
    } else {
      return dy > 0 ? 'swipe_down' : 'swipe_up';
    }
  }

  clear() { this._history = []; }
}

// Circle motion detector
class CircleDetector {
  constructor() {
    this._history = [];
  }

  addPosition(palm) {
    this._history.push({ x: palm.x, y: palm.y, t: performance.now() });
    if (this._history.length > 20) this._history.shift();
  }

  detect() {
    if (this._history.length < 12) return false;
    const pts = this._history.slice(-12);
    // Check for circular motion: measure angle progression
    let totalAngle = 0;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    for (let i = 1; i < pts.length; i++) {
      const a1 = Math.atan2(pts[i-1].y - cy, pts[i-1].x - cx);
      const a2 = Math.atan2(pts[i].y - cy, pts[i].x - cx);
      let da = a2 - a1;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      totalAngle += da;
    }
    return Math.abs(totalAngle) > Math.PI * 1.5; // at least 270 degrees
  }

  clear() { this._history = []; }
}

function dist2d(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── FACIAL GESTURE DEFINITIONS ──
const FACE_GESTURES = {
  smile: (f) => f.expressions.smile,
  blink_left: (f) => f.expressions.leftBlink && !f.expressions.rightBlink,
  blink_right: (f) => f.expressions.rightBlink && !f.expressions.leftBlink,
  mouth_open: (f) => f.expressions.mouthOpen,
  raised_eyebrows: (f) => f.expressions.browRaise,
  kiss: (f) => f.expressions.pucker,
  angry_brow: (f) => f.expressions.angryBrow,
  wink: (f) => f.expressions.wink,
  head_nod: (f) => f.expressions.headNod,
  head_shake: (f) => f.expressions.headShake,
};

// ── DEFAULT GESTURE → EFFECT MAPPING ──
export const DEFAULT_GESTURE_MAP = {
  fist: 'dither',
  peace: 'vhs',
  pointing: 'spotlight',
  open_hand: 'water_ripple',
  thumbs_up: 'golden_aura',
  thumbs_down: 'glitch',
  finger_heart: 'floating_hearts',
  rock: 'strobe',
  ok_sign: 'lens_warp',
  pinch: 'zoom_pulse',
  swipe_left: 'film_burn',
  swipe_right: 'rgb_split_sweep',
  swipe_up: 'ascension_glow',
  swipe_down: 'shadow_fade',
  circle_motion: 'portal',
  smile: 'beauty_glow',
  blink_left: 'anime_spark',
  blink_right: 'anime_spark',
  mouth_open: 'fire_breath',
  head_nod: 'bass_pulse',
  wink: 'neon_flash',
};

class GestureRecognizerService {
  constructor() {
    this._listeners = [];
    this._lastTrigger = {};
    this._gestureMap = { ...DEFAULT_GESTURE_MAP };
    this._enabled = true;
    this._swipeDetector = new SwipeDetector();
    this._circleDetector = new CircleDetector();
    this._activeGestures = new Set();
  }

  /** Process hand + face data each frame */
  process(handData, faceData) {
    if (!this._enabled) return;
    
    const now = performance.now();
    const detected = [];

    // Hand gestures
    if (handData?.count >= 1) {
      const h = handData.hands[0];
      
      // Track motion for swipe/circle
      this._swipeDetector.addPosition(h.palm);
      this._circleDetector.addPosition(h.palm);

      // Static hand gestures
      for (const [name, detector] of Object.entries(HAND_GESTURES)) {
        if (detector(h) && this._canTrigger(name, now)) {
          detected.push({ type: 'hand', gesture: name });
          this._lastTrigger[name] = now;
        }
      }

      // Swipe gestures
      const swipe = this._swipeDetector.detect();
      if (swipe && this._canTrigger(swipe, now)) {
        detected.push({ type: 'hand', gesture: swipe });
        this._lastTrigger[swipe] = now;
        this._swipeDetector.clear();
      }

      // Circle motion
      if (this._circleDetector.detect() && this._canTrigger('circle_motion', now)) {
        detected.push({ type: 'hand', gesture: 'circle_motion' });
        this._lastTrigger['circle_motion'] = now;
        this._circleDetector.clear();
      }
    }

    // Two-hand gestures
    if (handData?.count >= 2) {
      const [h1, h2] = handData.hands;
      for (const [name, detector] of Object.entries(TWO_HAND_GESTURES)) {
        if (detector(h1, h2) && this._canTrigger(name, now)) {
          detected.push({ type: 'hand', gesture: name });
          this._lastTrigger[name] = now;
        }
      }
    }

    // Face gestures
    if (faceData) {
      for (const [name, detector] of Object.entries(FACE_GESTURES)) {
        if (detector(faceData) && this._canTrigger(name, now)) {
          detected.push({ type: 'face', gesture: name });
          this._lastTrigger[name] = now;
        }
      }
    }

    // Update active gestures set and notify
    const newActive = new Set(detected.map(d => d.gesture));
    this._activeGestures = newActive;

    if (detected.length > 0) {
      this._notifyGestures(detected);
    }
  }

  _canTrigger(name, now) {
    return !this._lastTrigger[name] || (now - this._lastTrigger[name]) > GESTURE_COOLDOWN;
  }

  /** Get the effect mapped to a gesture */
  getEffect(gesture) {
    return this._gestureMap[gesture] || null;
  }

  /** Update gesture→effect mapping */
  setMapping(gesture, effectId) {
    this._gestureMap[gesture] = effectId;
  }

  /** Get full mapping */
  getMapping() { return { ...this._gestureMap }; }

  /** Get currently active gestures */
  getActive() { return [...this._activeGestures]; }

  /** Enable/disable */
  setEnabled(v) { this._enabled = v; }
  isEnabled() { return this._enabled; }

  /** Subscribe to gesture events */
  onGesture(cb) {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(c => c !== cb); };
  }

  _notifyGestures(gestures) {
    gestures.forEach(g => {
      const effect = this._gestureMap[g.gesture];
      this._listeners.forEach(cb => cb({ ...g, mappedEffect: effect }));
    });
  }

  destroy() {
    this._listeners = [];
    this._activeGestures.clear();
  }
}

const GestureRecognizer = new GestureRecognizerService();
export default GestureRecognizer;