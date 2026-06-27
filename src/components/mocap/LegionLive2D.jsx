/**
 * LegionLive2D — Live2D Cubism 4 renderer for Legion Live VTubing.
 *
 * Live2D is the 2D anime-style avatar format used by most smaller VTubers.
 * This module loads .model3.json files and drives them with the same
 * MediaPipe face tracking data used for 3D VRM avatars.
 *
 * Technical approach:
 * - Loads Cubism 4 Core via CDN (cubismcore.js) — free for non-commercial use
 * - Loads Cubism 4 Framework JS (PIXI-based renderer)
 * - Maps MediaPipe face landmarks to Live2D parameters
 *
 * Live2D parameter → MediaPipe mapping:
 *   ParamAngleX      ← faceRig.yaw   (head turn left/right)
 *   ParamAngleY      ← faceRig.pitch  (head tilt up/down)
 *   ParamAngleZ      ← faceRig.roll   (head tilt clockwise)
 *   ParamEyeLOpen    ← 1 - faceRig.blinkL
 *   ParamEyeROpen    ← 1 - faceRig.blinkR
 *   ParamMouthOpenY  ← faceRig.mouthOpen
 *   ParamBodyAngleX  ← (shoulder tracking)
 *   ParamEyeBallX    ← faceRig.gazeX
 *   ParamEyeBallY    ← faceRig.gazeY
 *
 * Built-in model: a free sample model is bundled for users without their own Live2D file.
 * Custom model: user uploads a .zip containing the .model3.json and all textures.
 *
 * License note: Live2D Cubism Core is free for independent creators earning < $100K/yr.
 * Commercial use requires a license from Live2D Inc. Direct users to live2d.com/en/download/
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';

// ── Live2D parameter names (Cubism 4 standard) ───────────────────────────────
const L2D_PARAMS = {
  angleX:     'ParamAngleX',
  angleY:     'ParamAngleY',
  angleZ:     'ParamAngleZ',
  eyeLOpen:   'ParamEyeLOpen',
  eyeROpen:   'ParamEyeROpen',
  mouthOpen:  'ParamMouthOpenY',
  mouthForm:  'ParamMouthForm',
  bodyAngleX: 'ParamBodyAngleX',
  bodyAngleY: 'ParamBodyAngleY',
  eyeBallX:   'ParamEyeBallX',
  eyeBallY:   'ParamEyeBallY',
  browLY:     'ParamBrowLY',
  browRY:     'ParamBrowRY',
  cheek:      'ParamCheek',
};

// ── CDN URLs for Cubism 4 SDK (MIT for framework, proprietary for core) ──────
const CUBISM_CORE_URL = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
const PIXI_URL        = 'https://cdn.jsdelivr.net/npm/pixi.js@7/dist/pixi.min.js';
const CUBISM_FW_URL   = 'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.js';

// ── Free sample model (Hiyori from Live2D Inc — free for dev use) ─────────────
const SAMPLE_MODEL_URL = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display@master/test/assets/hiyori/hiyori_pro_t10.model3.json';

let _pixiLoaded = false;
let _cubismLoaded = false;
let _fwLoaded = false;

async function loadSDKs() {
  if (_pixiLoaded && _cubismLoaded && _fwLoaded) return true;

  const loadScript = url => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = url; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  try {
    await loadScript(PIXI_URL);        _pixiLoaded = true;
    await loadScript(CUBISM_CORE_URL); _cubismLoaded = true;
    await loadScript(CUBISM_FW_URL);   _fwLoaded = true;
    return true;
  } catch (e) {
    console.error('[Live2D] SDK load failed:', e);
    return false;
  }
}

// ── Lerp helper ──────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

// ── Main Live2D component ─────────────────────────────────────────────────────
export default function LegionLive2D({ faceRig, micVolume = 0, onStreamReady, onClose }) {
  const canvasRef     = useRef(null);
  const appRef        = useRef(null);
  const modelRef      = useRef(null);
  const rafRef        = useRef(null);
  const paramCache    = useRef({});

  const [status, setStatus]     = useState('idle');  // idle|loading|ready|error
  const [modelName, setModelName] = useState('Sample — Hiyori');
  const [showInfo, setShowInfo] = useState(false);

  // ── SDK + model init ────────────────────────────────────────────────────────
  const initLive2D = useCallback(async (modelUrl = SAMPLE_MODEL_URL, name = 'Sample — Hiyori') => {
    setStatus('loading');
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cleanup existing
    if (appRef.current) {
      appRef.current.destroy(true);
      appRef.current = null;
      modelRef.current = null;
    }

    const ok = await loadSDKs();
    if (!ok) { setStatus('error'); toast.error('Live2D SDK failed to load'); return; }

    const { Application, Live2DModel } = window.PIXI
      ? { Application: window.PIXI.Application, Live2DModel: window.PIXI?.live2d?.Live2DModel }
      : {};

    if (!Application || !Live2DModel) {
      setStatus('error');
      toast.error('Live2D not available. Check browser console.');
      return;
    }

    try {
      const app = new Application({
        view: canvas,
        width: canvas.width,
        height: canvas.height,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      });
      appRef.current = app;

      const model = await Live2DModel.from(modelUrl, { autoInteract: false });
      app.stage.addChild(model);

      // Fit model to canvas
      const scale = Math.min(
        canvas.width  / model.internalModel.originalWidth,
        canvas.height / model.internalModel.originalHeight,
      ) * 0.9;
      model.scale.set(scale);
      model.x = canvas.width  / 2 - (model.internalModel.originalWidth  * scale) / 2;
      model.y = canvas.height / 2 - (model.internalModel.originalHeight * scale) / 2 + 20;

      modelRef.current = model;
      setModelName(name);
      setStatus('ready');

      // Expose canvas stream for Zego
      if (onStreamReady && canvas.captureStream) {
        onStreamReady(canvas.captureStream(30));
      }

      // Start drive loop
      startDriveLoop();
      toast.success(`✓ Live2D loaded: ${name}`);
    } catch (e) {
      console.error('[Live2D] Model load error:', e);
      setStatus('error');
      toast.error(`Failed to load model: ${e.message}`);
    }
  }, [onStreamReady]);

  // ── Parameter drive loop ────────────────────────────────────────────────────
  const startDriveLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const drive = () => {
      rafRef.current = requestAnimationFrame(drive);
      const model = modelRef.current;
      if (!model?.internalModel) return;

      const core = model.internalModel.coreModel;
      const pc   = paramCache.current;

      // Face rig → Live2D parameters with smoothing
      if (faceRig) {
        const smooth = (key, target, rate = 0.2) => {
          pc[key] = pc[key] === undefined ? target : lerp(pc[key], target, rate);
          return pc[key];
        };

        setParam(core, L2D_PARAMS.angleX,    smooth('aX',  (faceRig.yaw   || 0) *  30, 0.15));
        setParam(core, L2D_PARAMS.angleY,    smooth('aY',  (faceRig.pitch || 0) * -30, 0.15));
        setParam(core, L2D_PARAMS.angleZ,    smooth('aZ',  (faceRig.roll  || 0) *  30, 0.15));
        setParam(core, L2D_PARAMS.eyeLOpen,  smooth('eL',  Math.max(0, 1 - (faceRig.blinkL || 0)), 0.25));
        setParam(core, L2D_PARAMS.eyeROpen,  smooth('eR',  Math.max(0, 1 - (faceRig.blinkR || 0)), 0.25));

        // Mouth: combine face tracking + mic volume, take whichever is larger
        const mouthVal = Math.max(faceRig.mouthOpen || 0, micVolume * 0.8);
        setParam(core, L2D_PARAMS.mouthOpen, smooth('mo', mouthVal, 0.3));

        // Eye gaze
        setParam(core, L2D_PARAMS.eyeBallX,  smooth('gbX', (faceRig.gazeX || 0),  0.1));
        setParam(core, L2D_PARAMS.eyeBallY,  smooth('gbY', (faceRig.gazeY || 0),  0.1));

        // Brows react to expressions
        setParam(core, L2D_PARAMS.browLY,    smooth('bL',  0,  0.1));
        setParam(core, L2D_PARAMS.browRY,    smooth('bR',  0,  0.1));

      } else {
        // No face tracking: idle animations using sin waves
        const t = performance.now() / 1000;
        const idleBreath = Math.sin(t * 0.8) * 1.5;
        setParam(core, L2D_PARAMS.angleX,    Math.sin(t * 0.4) * 3);
        setParam(core, L2D_PARAMS.angleY,    Math.sin(t * 0.3) * 2 + idleBreath);
        setParam(core, L2D_PARAMS.bodyAngleX,Math.sin(t * 0.5) * 3);
        // Mouth driven by mic only
        const mo = pc.mo_idle = lerp(pc.mo_idle ?? 0, micVolume * 0.9, 0.25);
        setParam(core, L2D_PARAMS.mouthOpen, mo);
      }

      // Update PIXI app
      appRef.current?.renderer?.render(appRef.current.stage);
    };
    rafRef.current = requestAnimationFrame(drive);
  }, [faceRig, micVolume]);

  // Re-run drive loop when faceRig/micVolume changes
  useEffect(() => {
    if (status === 'ready') startDriveLoop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [faceRig, micVolume, status, startDriveLoop]);

  // Init on mount
  useEffect(() => {
    initLive2D();
    return () => {
      cancelAnimationFrame(rafRef.current);
      appRef.current?.destroy(true);
    };
  }, []);

  // ── File upload handler ──────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
      // Direct .model3.json upload
      const url = URL.createObjectURL(file);
      await initLive2D(url, file.name.replace('.model3.json', '').replace('.json', ''));
    } else if (file.name.endsWith('.zip')) {
      // ZIP containing model files — extract and load
      toast.info('Extracting ZIP…');
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(file);
        const model3File = Object.keys(zip.files).find(f => f.endsWith('.model3.json'));
        if (!model3File) { toast.error('No .model3.json found in ZIP'); return; }
        // Create blob URLs for all files
        const urls = {};
        await Promise.all(Object.entries(zip.files).map(async ([path, zipFile]) => {
          if (!zipFile.dir) {
            const blob = await zipFile.async('blob');
            urls[path] = URL.createObjectURL(blob);
          }
        }));
        await initLive2D(urls[model3File], model3File.split('/').pop().replace('.model3.json',''));
      } catch (err) {
        toast.error('ZIP extraction failed: ' + err.message);
      }
    } else {
      toast.error('Upload a .model3.json or .zip file');
    }
  };

  return (
    <div className="relative w-full h-full bg-transparent">
      {/* Canvas */}
      <canvas ref={canvasRef} width={720} height={1280}
        className="w-full h-full object-contain"
        style={{ background: 'transparent' }} />

      {/* Loading overlay */}
      <AnimatePresence>
        {status === 'loading' && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-10 h-10 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-pink-300 text-sm font-semibold">Loading Live2D model…</p>
          </motion.div>
        )}
        {status === 'error' && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-3 p-6 text-center">
            <div className="text-4xl">⚠️</div>
            <p className="text-red-300 font-semibold">Live2D failed to load</p>
            <p className="text-white/40 text-xs">Check your internet connection — the Live2D SDK loads from CDN</p>
            <button onClick={() => initLive2D()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ll-interactive"
              style={{background:'rgba(239,68,68,0.2)',border:'1px solid rgba(239,68,68,0.4)',color:'#f87171'}}>
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls — bottom bar */}
      {status === 'ready' && (
        <div className="absolute bottom-4 left-3 right-3 flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-xl bg-black/60 backdrop-blur border border-pink-500/30">
            <p className="text-pink-300 text-[10px] font-bold">LIVE2D</p>
            <p className="text-white/70 text-xs truncate">{modelName}</p>
          </div>
          <label className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center cursor-pointer ll-interactive">
            <Upload className="w-4 h-4 text-white/50" />
            <input type="file" accept=".json,.zip" className="hidden" onChange={handleUpload} />
          </label>
          <button onClick={() => setShowInfo(v => !v)}
            className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center ll-interactive">
            <Info className="w-4 h-4 text-white/50" />
          </button>
        </div>
      )}

      {/* Info tooltip */}
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
            className="absolute bottom-16 left-3 right-3 p-3 rounded-2xl bg-black/90 border border-white/10 text-xs text-white/60 space-y-1">
            <p className="font-bold text-white/80 mb-2">Live2D — Model Format</p>
            <p>Upload your own model as a <span className="text-pink-300">.model3.json</span> or a <span className="text-pink-300">.zip</span> containing the model and all textures.</p>
            <p className="mt-1">Compatible with VRoid-to-Live2D exports and any Cubism 4 model.</p>
            <a href="https://live2d.com/en/download/" target="_blank" rel="noopener noreferrer"
              className="text-pink-400 underline block mt-1">Get the Cubism Editor →</a>
            <button onClick={() => setShowInfo(false)} className="text-white/30 mt-1">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Safe parameter setter ─────────────────────────────────────────────────────
function setParam(core, paramId, value) {
  try {
    const idx = core.getParameterIndex(paramId);
    if (idx >= 0) core.setParameterValueByIndex(idx, value);
  } catch (_) {}
}
