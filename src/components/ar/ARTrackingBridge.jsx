/**
 * ARTrackingBridge — Connects HandTracker + FaceTracker + GestureRecognizer
 * to the EffectStack. Runs per-frame in the existing render loop.
 * Call processFrame() from LegionAREngine's render loop.
 */

import HandTracker from './HandTracker';
import FaceTracker from './FaceTracker';
import GestureRecognizer from './GestureRecognizer';
import EffectStack from './EffectStack';
import AdaptiveQuality from '@/components/engine/AdaptiveQuality';

class ARTrackingBridgeService {
  constructor() {
    this._initialized = false;
    this._handEnabled = false;
    this._faceEnabled = false;
    this._gesturesEnabled = false;
    this._frameCount = 0;
    this._unsubGesture = null;
  }

  /** Initialize tracking systems (lazy — only loads what's needed) */
  async enableHands() {
    if (this._handEnabled) return;
    await HandTracker.init();
    this._handEnabled = true;
    this._ensureGestureWiring();
    console.log('[ARBridge] Hand tracking enabled');
  }

  async enableFace() {
    if (this._faceEnabled) return;
    await FaceTracker.init();
    this._faceEnabled = true;
    this._ensureGestureWiring();
    console.log('[ARBridge] Face tracking enabled');
  }

  enableGestures() {
    this._gesturesEnabled = true;
    GestureRecognizer.setEnabled(true);
    this._ensureGestureWiring();
  }

  disableGestures() {
    this._gesturesEnabled = false;
    GestureRecognizer.setEnabled(false);
  }

  _ensureGestureWiring() {
    if (this._unsubGesture) return;
    this._unsubGesture = GestureRecognizer.onGesture((event) => {
      if (event.mappedEffect) {
        EffectStack.triggerGestureEffect(event.mappedEffect);
      }
    });
  }

  /** Call every frame from the AR engine render loop */
  processFrame(videoElement) {
    this._frameCount++;
    
    // Skip frames based on adaptive quality tier
    const config = AdaptiveQuality.getConfig();
    const skipInterval = config.trackingInterval || 0;
    if (skipInterval > 0 && this._frameCount % (skipInterval + 1) !== 0) return;

    // Send video to trackers
    if (this._handEnabled) HandTracker.processFrame(videoElement);
    if (this._faceEnabled) FaceTracker.processFrame(videoElement);

    // Feed data to gesture recognizer
    if (this._gesturesEnabled) {
      const handData = HandTracker.getHands();
      const faceData = FaceTracker.getFace();
      GestureRecognizer.process(handData, faceData);
    }
  }

  /** Get current hand position (for interactive effects like spotlight) */
  getHandPosition() {
    const data = HandTracker.getHands();
    if (!data || data.count === 0) return null;
    return data.hands[0].indexTip;
  }

  /** Get face data (for face-attached effects) */
  getFaceData() {
    return FaceTracker.getFace();
  }

  isHandEnabled() { return this._handEnabled; }
  isFaceEnabled() { return this._faceEnabled; }
  isGesturesEnabled() { return this._gesturesEnabled; }

  /** Full cleanup */
  destroy() {
    HandTracker.destroy();
    FaceTracker.destroy();
    GestureRecognizer.destroy();
    this._unsubGesture?.();
    this._unsubGesture = null;
    this._handEnabled = false;
    this._faceEnabled = false;
    this._gesturesEnabled = false;
    this._frameCount = 0;
  }
}

const ARBridge = new ARTrackingBridgeService();
export default ARBridge;