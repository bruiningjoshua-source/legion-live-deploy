/**
 * backgroundSegmentation — MediaPipe SelfieSegmentation wrapper that cuts the
 * person out of the camera feed so a custom background (image or preset) can be
 * composited behind them, live. Designed to plug into the LegionAREngine's
 * canvas render loop.
 *
 * Honest perf note: segmentation is GPU/CPU heavy. We run it at a throttled
 * rate and reuse the last mask between frames so mobile stays usable.
 */
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export class BackgroundSegmenter {
  constructor() {
    this.seg = null;
    this.mask = null;              // latest segmentation mask (ImageBitmap/Canvas)
    this.ready = false;
    this.sending = false;
    this._bgImage = null;          // loaded HTMLImageElement for image backgrounds
    this._bgImageUrl = null;
  }

  async init() {
    if (this.seg) return;
    this.seg = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    this.seg.setOptions({ modelSelection: 1, selfieMode: true });
    this.seg.onResults((results) => {
      this.mask = results.segmentationMask || null;
      this.ready = true;
      this.sending = false;
    });
  }

  /** Feed a video frame to the segmenter (throttle this on the caller side). */
  async send(video) {
    if (!this.seg || this.sending) return;
    this.sending = true;
    try { await this.seg.send({ image: video }); }
    catch { this.sending = false; }
  }

  /** Preload an image background. */
  setImageBackground(url) {
    if (url === this._bgImageUrl) return;
    this._bgImageUrl = url;
    this._bgImage = null;
    if (!url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { this._bgImage = img; };
    img.src = url;
  }

  /**
   * Composite: draw the chosen background, then the person (masked) on top.
   * `bg` is a config: { type: 'image'|'color'|'gradient'|'blur', ... }.
   * Returns true if it composited, false if the mask isn't ready (caller should
   * just draw the raw video instead).
   */
  composite(ctx, canvas, video, bg) {
    if (!this.mask || !this.ready) return false;
    const { width: W, height: H } = canvas;

    // 1) Draw the person, masked, into a temp layer.
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    // Draw the segmentation mask
    ctx.drawImage(this.mask, 0, 0, W, H);
    // Keep only the person where the mask is opaque
    ctx.globalCompositeOperation = 'source-in';
    ctx.save();
    ctx.scale(-1, 1); // mirror selfie
    ctx.drawImage(video, -W, 0, W, H);
    ctx.restore();

    // 2) Draw the background BEHIND the person.
    ctx.globalCompositeOperation = 'destination-over';
    if (bg.type === 'image' && this._bgImage) {
      // cover-fit the image
      const ir = this._bgImage.width / this._bgImage.height;
      const cr = W / H;
      let dw = W, dh = H, dx = 0, dy = 0;
      if (ir > cr) { dh = H; dw = H * ir; dx = (W - dw) / 2; }
      else { dw = W; dh = W / ir; dy = (H - dh) / 2; }
      ctx.drawImage(this._bgImage, dx, dy, dw, dh);
    } else if (bg.type === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, bg.from || '#1e1b4b');
      grad.addColorStop(1, bg.to || '#4c1d95');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    } else if (bg.type === 'blur') {
      // blurred version of the camera as the backdrop
      ctx.filter = 'blur(14px)';
      ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -W, 0, W, H); ctx.restore();
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = bg.color || '#000';
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    return true;
  }

  dispose() {
    try { this.seg?.close?.(); } catch (_) {}
    this.seg = null; this.mask = null; this.ready = false;
  }
}
