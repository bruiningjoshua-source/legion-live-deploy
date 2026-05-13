/**
 * FaceTracker — MediaPipe FaceMesh integration for facial tracking.
 * Tracks eyes, eyebrows, mouth, jawline, nose, cheeks, head rotation,
 * and facial expressions (blink, smile, mouth open). Singleton service.
 */

// Key landmark indices for FaceMesh (468 landmarks)
const LANDMARKS = {
  leftEyeTop: 159, leftEyeBottom: 145,
  rightEyeTop: 386, rightEyeBottom: 374,
  leftEyeOuter: 33, leftEyeInner: 133,
  rightEyeOuter: 362, rightEyeInner: 263,
  leftEyebrowOuter: 70, leftEyebrowInner: 107,
  rightEyebrowOuter: 300, rightEyebrowInner: 336,
  mouthTop: 13, mouthBottom: 14,
  mouthLeft: 61, mouthRight: 291,
  noseTip: 1, noseBase: 168,
  chin: 152, forehead: 10,
  leftCheek: 234, rightCheek: 454,
  leftTemple: 127, rightTemple: 356,
};

class FaceTrackerService {
  constructor() {
    this._faceMesh = null;
    this._results = null;
    this._listeners = [];
    this._lastProcess = 0;
    this._throttleMs = 33;
    this._prevExpressions = null;
    this._headPositionHistory = [];
  }

  async init() {
    if (this._faceMesh) return;
    try {
      const { FaceMesh } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js');
      this._faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
      });
      this._faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      this._faceMesh.onResults((results) => {
        this._results = this._processResults(results);
        this._notify();
      });
      console.log('[FaceTracker] Initialized');
    } catch (e) {
      console.warn('[FaceTracker] Failed to load FaceMesh:', e.message);
    }
  }

  async processFrame(videoElement) {
    if (!this._faceMesh || !videoElement || videoElement.readyState < 2) return;
    const now = performance.now();
    if (now - this._lastProcess < this._throttleMs) return;
    this._lastProcess = now;
    try {
      await this._faceMesh.send({ image: videoElement });
    } catch (e) {}
  }

  getFace() { return this._results; }

  onChange(cb) {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(c => c !== cb); };
  }

  _notify() {
    this._listeners.forEach(cb => cb(this._results));
  }

  _dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _processResults(raw) {
    if (!raw.multiFaceLandmarks || raw.multiFaceLandmarks.length === 0) {
      return null;
    }

    const lm = raw.multiFaceLandmarks[0];
    
    // Eye aspect ratios (for blink detection)
    const leftEAR = this._dist(lm[LANDMARKS.leftEyeTop], lm[LANDMARKS.leftEyeBottom]) /
                     this._dist(lm[LANDMARKS.leftEyeOuter], lm[LANDMARKS.leftEyeInner]);
    const rightEAR = this._dist(lm[LANDMARKS.rightEyeTop], lm[LANDMARKS.rightEyeBottom]) /
                      this._dist(lm[LANDMARKS.rightEyeOuter], lm[LANDMARKS.rightEyeInner]);

    // Mouth aspect ratio
    const mouthHeight = this._dist(lm[LANDMARKS.mouthTop], lm[LANDMARKS.mouthBottom]);
    const mouthWidth = this._dist(lm[LANDMARKS.mouthLeft], lm[LANDMARKS.mouthRight]);
    const mouthAR = mouthHeight / (mouthWidth || 0.001);

    // Smile detection (mouth corners relative to center)
    const mouthCenterY = (lm[LANDMARKS.mouthTop].y + lm[LANDMARKS.mouthBottom].y) / 2;
    const leftCornerUp = mouthCenterY - lm[LANDMARKS.mouthLeft].y;
    const rightCornerUp = mouthCenterY - lm[LANDMARKS.mouthRight].y;
    const smileScore = Math.max(0, (leftCornerUp + rightCornerUp) * 5);

    // Eyebrow raise detection
    const leftBrowDist = this._dist(lm[LANDMARKS.leftEyebrowInner], lm[LANDMARKS.leftEyeTop]);
    const rightBrowDist = this._dist(lm[LANDMARKS.rightEyebrowInner], lm[LANDMARKS.rightEyeTop]);
    const browRaise = (leftBrowDist + rightBrowDist) * 10;

    // Head rotation (pitch, yaw, roll approximation)
    const nose = lm[LANDMARKS.noseTip];
    const forehead = lm[LANDMARKS.forehead];
    const chin = lm[LANDMARKS.chin];
    const leftTemple = lm[LANDMARKS.leftTemple];
    const rightTemple = lm[LANDMARKS.rightTemple];

    const yaw = (nose.x - (leftTemple.x + rightTemple.x) / 2) * 2;
    const pitch = (nose.y - (forehead.y + chin.y) / 2) * 2;
    const roll = Math.atan2(rightTemple.y - leftTemple.y, rightTemple.x - leftTemple.x);

    // Head nod/shake detection from position history
    this._headPositionHistory.push({ x: nose.x, y: nose.y, t: performance.now() });
    if (this._headPositionHistory.length > 15) this._headPositionHistory.shift();
    
    let headNod = false, headShake = false;
    if (this._headPositionHistory.length >= 10) {
      const recent = this._headPositionHistory.slice(-10);
      const yDeltas = recent.slice(1).map((p, i) => p.y - recent[i].y);
      const xDeltas = recent.slice(1).map((p, i) => p.x - recent[i].x);
      const yReversals = yDeltas.slice(1).filter((d, i) => d * yDeltas[i] < 0).length;
      const xReversals = xDeltas.slice(1).filter((d, i) => d * xDeltas[i] < 0).length;
      const yAmplitude = Math.max(...recent.map(p => p.y)) - Math.min(...recent.map(p => p.y));
      const xAmplitude = Math.max(...recent.map(p => p.x)) - Math.min(...recent.map(p => p.x));
      headNod = yReversals >= 2 && yAmplitude > 0.02;
      headShake = xReversals >= 2 && xAmplitude > 0.03;
    }

    // Pucker/kiss detection (mouth becomes narrow + pursed)
    const pucker = mouthWidth < 0.08 && mouthHeight > 0.02;

    // Angry brow (brows pulled together + down)
    const angryBrow = browRaise < 0.15 && this._dist(lm[LANDMARKS.leftEyebrowInner], lm[LANDMARKS.rightEyebrowInner]) < 0.06;

    const expressions = {
      leftBlink: leftEAR < 0.15,
      rightBlink: rightEAR < 0.15,
      bothBlink: leftEAR < 0.15 && rightEAR < 0.15,
      wink: (leftEAR < 0.15) !== (rightEAR < 0.15),
      smile: smileScore > 0.3,
      smileIntensity: Math.min(1, smileScore),
      mouthOpen: mouthAR > 0.4,
      mouthOpenIntensity: Math.min(1, mouthAR),
      browRaise: browRaise > 0.25,
      browRaiseIntensity: Math.min(1, browRaise),
      pucker,
      angryBrow,
      headNod,
      headShake,
    };

    return {
      landmarks: lm,
      keyPoints: {
        nose: lm[LANDMARKS.noseTip],
        chin: lm[LANDMARKS.chin],
        forehead: lm[LANDMARKS.forehead],
        leftEye: lm[LANDMARKS.leftEyeInner],
        rightEye: lm[LANDMARKS.rightEyeInner],
        mouthCenter: { 
          x: (lm[LANDMARKS.mouthTop].x + lm[LANDMARKS.mouthBottom].x) / 2,
          y: (lm[LANDMARKS.mouthTop].y + lm[LANDMARKS.mouthBottom].y) / 2
        },
        leftCheek: lm[LANDMARKS.leftCheek],
        rightCheek: lm[LANDMARKS.rightCheek],
      },
      expressions,
      headRotation: { pitch, yaw, roll },
      leftEAR,
      rightEAR,
      mouthAR,
    };
  }

  setThrottle(ms) { this._throttleMs = Math.max(16, ms); }

  destroy() {
    this._faceMesh?.close?.();
    this._faceMesh = null;
    this._results = null;
    this._listeners = [];
    this._headPositionHistory = [];
  }
}

const FaceTracker = new FaceTrackerService();
export default FaceTracker;