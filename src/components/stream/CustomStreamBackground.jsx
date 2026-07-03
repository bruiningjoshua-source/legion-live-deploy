/**
 * CustomStreamBackground — lets a host upload their own image/video and have it
 * appear BEHIND them using real person segmentation (MediaPipe Selfie Segmentation).
 *
 * Unlike the old "background" tab (which drew a background then covered it with the
 * full opaque video, so it was never visible), this actually separates the host from
 * their real background and composites the uploaded background behind them.
 *
 * Output: a MediaStream (via canvas.captureStream) that replaces the published track.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';

export default function CustomStreamBackground({ videoRef, onProcessedStream, onClose }) {
  const canvasRef = useRef(null);
  const segRef = useRef(null);
  const bgMediaRef = useRef(null);         // HTMLImageElement or HTMLVideoElement
  const rafRef = useRef(null);
  const [bgUrl, setBgUrl] = useState(null);
  const [bgType, setBgType] = useState(null); // 'image' | 'video'
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Load a background to begin');
  const fileRef = useRef(null);

  // ── Load MediaPipe Selfie Segmentation (from CDN, matches project convention) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus('Loading segmentation…');
        const mod = await import(
          /* @vite-ignore */
          'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js'
        );
        if (cancelled) return;
        const SelfieSegmentation = mod.SelfieSegmentation || window.SelfieSegmentation;
        const seg = new SelfieSegmentation({
          locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${f}`,
        });
        seg.setOptions({ modelSelection: 1 }); // 1 = general (better quality)
        seg.onResults(onResults);
        segRef.current = seg;
        setReady(true);
        setStatus('Ready — upload a background');
      } catch (e) {
        console.error('[CustomBG] segmentation load failed', e);
        setStatus('Segmentation failed to load');
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      try { segRef.current?.close?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Composite: background media, then the segmented person on top ──
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = results.image.width;
    const H = canvas.height = results.image.height;

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    // 1) Draw the person mask, then keep only the person from the camera frame
    ctx.drawImage(results.segmentationMask, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(results.image, 0, 0, W, H);

    // 2) Draw the uploaded background BEHIND the person
    ctx.globalCompositeOperation = 'destination-over';
    const bg = bgMediaRef.current;
    if (bg) {
      // cover-fit the background
      const bw = bg.videoWidth || bg.naturalWidth || W;
      const bh = bg.videoHeight || bg.naturalHeight || H;
      const scale = Math.max(W / bw, H / bh);
      const dw = bw * scale, dh = bh * scale;
      ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }, []);

  // ── Drive frames from the host camera video ──
  useEffect(() => {
    if (!ready || !bgUrl) return;
    let cancelled = false;
    const pump = async () => {
      if (cancelled) return;
      const video = videoRef?.current;
      const seg = segRef.current;
      if (video && seg && video.readyState >= 2) {
        try { await seg.send({ image: video }); } catch {}
      }
      rafRef.current = requestAnimationFrame(pump);
    };
    pump();

    // Hand the composited canvas out as a stream for publishing
    const canvas = canvasRef.current;
    if (canvas && onProcessedStream) {
      const stream = canvas.captureStream(30);
      onProcessedStream(stream);
    }
    return () => { cancelled = true; cancelAnimationFrame(rafRef.current); };
  }, [ready, bgUrl, videoRef, onProcessedStream]);

  const loadBackground = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    setBgType(isVideo ? 'video' : 'image');
    setBgUrl(url);
    setStatus('Compositing your background…');

    if (isVideo) {
      const v = document.createElement('video');
      v.src = url; v.loop = true; v.muted = true; v.playsInline = true;
      v.play().catch(() => {});
      bgMediaRef.current = v;
    } else {
      const img = new Image();
      img.onload = () => { bgMediaRef.current = img; };
      img.src = url;
    }
  };

  const clearBackground = () => {
    setBgUrl(null); setBgType(null);
    bgMediaRef.current = null;
    onProcessedStream?.(null); // signal revert to raw camera
    setStatus('Ready — upload a background');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-24 left-3 right-3 z-40 ll-card p-4 rounded-2xl backdrop-blur-xl"
      style={{ background: 'rgba(10,8,4,0.92)', border: '1px solid rgba(200,135,26,0.3)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <span className="text-white font-semibold text-sm">Custom Background</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      <div className="relative rounded-xl overflow-hidden mb-3 bg-black" style={{ aspectRatio: '9/16', maxHeight: 200 }}>
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
        {!bgUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/30 text-xs text-center px-4">{status}</p>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
        onChange={(e) => loadBackground(e.target.files?.[0])} />

      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!ready}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40"
          style={{ background: 'linear-gradient(180deg,#c8871a,#8a5a0e)', color: '#fff' }}
        >
          <Upload className="w-4 h-4" /> {bgUrl ? 'Change' : 'Upload Image / Video'}
        </button>
        {bgUrl && (
          <button onClick={clearBackground}
            className="px-3 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-white/70" />
          </button>
        )}
      </div>
      <p className="text-white/30 text-[10px] mt-2 text-center">
        {ready ? 'You appear in front of your uploaded background.' : status}
      </p>
    </motion.div>
  );
}
