/**
 * faceMaskEngine — MediaPipe FaceMesh (468 landmarks) that tracks the face and
 * draws accessories (crown, ears, glasses, etc.) locked to facial positions.
 * Plugs into the LegionAREngine canvas render loop, same pattern as the
 * background segmenter.
 *
 * Masks are drawn procedurally (emoji/shapes at landmark positions) so no image
 * assets are needed. Positions/scale/rotation derive from key landmarks:
 *   10 = forehead top, 152 = chin, 234/454 = cheeks (face width),
 *   1 = nose tip, 33/263 = outer eye corners.
 */
import { FaceMesh } from '@mediapipe/face_mesh';

export class FaceMaskEngine {
  constructor() {
    this.mesh = null;
    this.landmarks = null;
    this.ready = false;
    this.sending = false;
  }

  async init() {
    if (this.mesh) return;
    this.mesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    this.mesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    this.mesh.onResults((results) => {
      this.landmarks = (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) || null;
      this.ready = true;
      this.sending = false;
    });
  }

  async send(video) {
    if (!this.mesh || this.sending) return;
    this.sending = true;
    try { await this.mesh.send({ image: video }); }
    catch { this.sending = false; }
  }

  /** Draw the chosen mask locked to the tracked face. Canvas is already mirrored
   *  (selfie), so we mirror landmark X too. Returns true if a face was drawn. */
  draw(ctx, canvas, maskId) {
    const lm = this.landmarks;
    if (!lm || maskId === 'none') return false;
    const W = canvas.width, H = canvas.height;
    // Mirror X because the video is drawn mirrored.
    const P = (i) => ({ x: (1 - lm[i].x) * W, y: lm[i].y * H });

    const foreheadTop = P(10);
    const chin = P(152);
    const leftCheek = P(234);
    const rightCheek = P(454);
    const noseTip = P(1);
    const leftEye = P(33);
    const rightEye = P(263);

    const faceW = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y);
    const faceH = Math.hypot(chin.y - foreheadTop.y, chin.x - foreheadTop.x);
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const cx = (leftCheek.x + rightCheek.x) / 2;

    const emoji = (char, x, y, size, rot = angle) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.font = `${size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 0, 0);
      ctx.restore();
    };

    switch (maskId) {
      case 'crown':
        emoji('👑', cx, foreheadTop.y - faceH * 0.22, faceW * 0.9);
        break;
      case 'dog':
        // ears at top corners + nose
        emoji('🐶', leftEye.x - faceW * 0.1, foreheadTop.y - faceH * 0.05, faceW * 0.5);
        emoji('🐶', rightEye.x + faceW * 0.1, foreheadTop.y - faceH * 0.05, faceW * 0.5);
        emoji('🐽', noseTip.x, noseTip.y, faceW * 0.28);
        break;
      case 'cat':
        emoji('🐱', cx, foreheadTop.y - faceH * 0.12, faceW * 1.0);
        break;
      case 'glasses':
        emoji('🕶️', cx, (leftEye.y + rightEye.y) / 2, faceW * 0.95);
        break;
      case 'sunglasses':
        emoji('😎', cx, (leftEye.y + rightEye.y) / 2, faceW * 1.1);
        break;
      case 'halo':
        emoji('😇', cx, foreheadTop.y - faceH * 0.28, faceW * 0.8);
        break;
      case 'devil':
        emoji('😈', leftEye.x - faceW * 0.08, foreheadTop.y - faceH * 0.02, faceW * 0.4);
        emoji('😈', rightEye.x + faceW * 0.08, foreheadTop.y - faceH * 0.02, faceW * 0.4);
        break;
      case 'clown':
        emoji('🤡', noseTip.x, noseTip.y, faceW * 0.4);
        break;
      case 'mustache':
        emoji('👨', noseTip.x, noseTip.y + faceH * 0.12, faceW * 0.5);
        break;
      case 'party':
        emoji('🥳', cx, foreheadTop.y - faceH * 0.15, faceW * 1.0);
        break;
      default:
        return false;
    }
    return true;
  }

  dispose() {
    try { this.mesh?.close?.(); } catch (_) {}
    this.mesh = null; this.landmarks = null; this.ready = false;
  }
}

// Available masks for the UI
export const FACE_MASKS = [
  { id: 'none', name: 'None', emoji: '⬜' },
  { id: 'crown', name: 'Crown', emoji: '👑' },
  { id: 'dog', name: 'Puppy', emoji: '🐶' },
  { id: 'cat', name: 'Kitty', emoji: '🐱' },
  { id: 'glasses', name: 'Shades', emoji: '🕶️' },
  { id: 'sunglasses', name: 'Cool', emoji: '😎' },
  { id: 'halo', name: 'Angel', emoji: '😇' },
  { id: 'devil', name: 'Devil', emoji: '😈' },
  { id: 'clown', name: 'Clown', emoji: '🤡' },
  { id: 'party', name: 'Party', emoji: '🥳' },
];
