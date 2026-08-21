/**
 * LegionMoCap — Full VTuber / MoCap system for Legion Live.
 *
 * Features:
 * - LAF procedural avatars (built-in, no download)
 * - VRM 0.x / 1.0 file import via LegionVRMLoader
 * - MediaPipe Holistic: face + body + hand tracking
 * - Expression presets panel (😊 😢 😠 😲 😉)
 * - Avatar color customizer
 * - 5 splat backdrops
 * - Mic lip-sync
 * - Adaptive quality (mobile-safe)
 * - captureStream → onProcessedStream for Zego WebRTC
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, User, Mic, MicOff, Image, Upload, Palette, Smile } from 'lucide-react';
import { createFilterBank, smoothLandmarks, solveFace, solvePose } from './LegionPoseSolver';
import { buildAvatarFromLAF, applyPoseToAvatar, applyBlendShapes, triggerExpression } from './LegionAvatarRenderer';
import { startMicLipSync, stopMicLipSync, isMicLipSyncActive } from './LegionMicLipSync';
import { sampleFrame, getRendererConfig, onTierChange, isMobile } from './LegionPerformanceScaler';
import { createSplatBackdrop, getBackdropPresets } from './LegionSplatBackdrop';
import { loadVRM, isVRMFile } from './LegionVRMLoader';
import LegionLive2D from './LegionLive2D';
import PerfMonitor from '@/components/engine/PerformanceMonitor';
import AdaptiveQuality from '@/components/engine/AdaptiveQuality';
import Disposer from '@/components/engine/ResourceDisposer';
import { XRButton } from './LegionXR';

const LAF_PRESETS = [
  { id:'warrior',   name:'Warrior',     emoji:'⚔️',  skinColor:'#e8b89a', hairColor:'#3d2506', bodyColor:'#1a2742', eyeColor:'#1a5276', lipColor:'#c47070' },
  { id:'neon',      name:'Neon Spirit', emoji:'💫',  skinColor:'#c9a87c', hairColor:'#7b2fff', bodyColor:'#0d0d1a', eyeColor:'#00ffcc', lipColor:'#cc44ff' },
  { id:'shadow',    name:'Shadow Fox',  emoji:'🦊',  skinColor:'#d4a574', hairColor:'#1a1a1a', bodyColor:'#2c2c2c', eyeColor:'#ff4500', lipColor:'#cc3322' },
  { id:'frost',     name:'Frost Queen', emoji:'❄️',  skinColor:'#f0e6d3', hairColor:'#e8f4f8', bodyColor:'#1e4b6e', eyeColor:'#00bfff', lipColor:'#88bbdd' },
  { id:'ember',     name:'Ember',       emoji:'🔥',  skinColor:'#b87042', hairColor:'#c0392b', bodyColor:'#2c1810', eyeColor:'#ff6b35', lipColor:'#dd5533' },
  { id:'cyber',     name:'Cyberpunk',   emoji:'🤖',  skinColor:'#d0eeff', hairColor:'#00ffcc', bodyColor:'#0a0a2a', eyeColor:'#ff0090', lipColor:'#ff44aa' },
  { id:'nature',    name:'Forest Sage', emoji:'🌿',  skinColor:'#c8a87a', hairColor:'#1a4a1a', bodyColor:'#2d5a27', eyeColor:'#44aa44', lipColor:'#aa7755' },
  { id:'galaxy',    name:'Galaxy',      emoji:'🌌',  skinColor:'#8866cc', hairColor:'#220044', bodyColor:'#0a0020', eyeColor:'#ff88ff', lipColor:'#8844cc' },
];

const EXPRESSIONS = [
  { id:'happy',     emoji:'😊', name:'Happy'     },
  { id:'sad',       emoji:'😢', name:'Sad'       },
  { id:'angry',     emoji:'😠', name:'Angry'     },
  { id:'surprised', emoji:'😲', name:'Surprised' },
  { id:'wink',      emoji:'😉', name:'Wink'      },
];

const TABS = [
  { id:'avatar',   icon: User,    label:'Avatar'    },
  { id:'color',    icon: Palette, label:'Color'     },
  { id:'expr',     icon: Smile,   label:'Emotions'  },
  { id:'backdrop', icon: Image,   label:'Scene'     },
];

export default function LegionMoCap({ videoRef, onProcessedStream, onClose, initialVrmUrl, hideControls = false }) {
  const canvasRef         = useRef(null);
  const rendererRef       = useRef(null);
  const sceneRef          = useRef(null);
  const cameraRef         = useRef(null);
  const avatarRef         = useRef(null);
  const holisticRef       = useRef(null);
  const filtersRef        = useRef(null);
  const animFrameRef      = useRef(null);
  const streamSentRef     = useRef(false);
  const backdropRef       = useRef(null);
  const tierCleanupRef    = useRef(null);
  const fpsCountRef       = useRef({ frames: 0, last: Date.now() });
  const lastRenderRef     = useRef(0);
  const vrmFileInputRef   = useRef(null);
  const vrmAvatarRef      = useRef(null); // holds VRM-specific data

  const [loading,          setLoading]          = useState(true);
  const [loadingMsg,       setLoadingMsg]       = useState('Initialising…');
  const [fps,              setFps]              = useState(0);
  const [selectedPreset,   setSelectedPreset]   = useState(LAF_PRESETS[0]);
  const [trackingActive,   setTrackingActive]   = useState(false);
  const [micEnabled,       setMicEnabled]       = useState(false);
  const [currentBackdrop,  setCurrentBackdrop]  = useState('studio');
  const [activeTab,        setActiveTab]        = useState('avatar');
  const [vrmLoaded,        setVrmLoaded]        = useState(null); // VRM file name
  const [live2dMode,       setLive2dMode]       = useState(false); // true = use Live2D renderer
  const [live2dFaceRig,    setLive2dFaceRig]    = useState(null); // pass face rig to Live2D
  const [vrmLoading,       setVrmLoading]       = useState(false);
  const [customColors,     setCustomColors]     = useState({});  // overrides on selectedPreset
  const [exprActive,       setExprActive]       = useState(null);
  const [showPanel,        setShowPanel]        = useState(!hideControls);

  // ── Init Three.js ──────────────────────────────────────────────────────
  const initThree = useCallback(async (preset) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setLoadingMsg('Starting 3D renderer…');

    const config = getRendererConfig();
    const THREE = await import('three');

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: config.antialias,
      preserveDrawingBuffer: true,
      powerPreference: isMobile() ? 'low-power' : 'high-performance',
    });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setPixelRatio(config.pixelRatio);
    renderer.setClearColor(0x0a0a14, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (config.shadowMapEnabled) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    rendererRef.current = renderer;
    Disposer.register('mocap', 'three-renderer', renderer);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(35, canvas.width / canvas.height, 0.1, 20);
    cam.position.set(0, 0.5, 2.8);
    cam.lookAt(0, 0.5, 0);
    cameraRef.current = cam;

    // Lighting: ambient + key + fill + rim
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xfff5e6, 1.3);
    key.position.set(1.5, 2.5, 3);
    if (config.shadowMapEnabled) {
      key.castShadow = true;
      key.shadow.mapSize.set(config.shadowMapSize, config.shadowMapSize);
      key.shadow.bias = -0.002;
      key.shadow.camera.near = 0.1; key.shadow.camera.far = 10;
    }
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcce8ff, 0.35);
    fill.position.set(-2, 1, 1); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x8888ff, 0.45);
    rim.position.set(-2, 1, -3); scene.add(rim);
    // Ground bounce
    const bounce = new THREE.HemisphereLight(0xffffff, 0x303050, 0.3);
    scene.add(bounce);

    setLoadingMsg('Loading environment…');
    const backdrop = await createSplatBackdrop(currentBackdrop, THREE);
    scene.add(backdrop.group);
    backdropRef.current = backdrop;

    setLoadingMsg('Building avatar…');
    const avatar = await buildAvatarFromLAF(preset, THREE);
    scene.add(avatar.group);
    avatarRef.current = avatar;

    tierCleanupRef.current = onTierChange((_, newConfig) => {
      renderer.setPixelRatio(newConfig.pixelRatio);
      if (!newConfig.shadowMapEnabled && renderer.shadowMap.enabled) renderer.shadowMap.enabled = false;
    });

    setLoading(false);
  }, [currentBackdrop]);

  // ── Init MediaPipe Holistic ────────────────────────────────────────────
  const initMediaPipe = useCallback(async () => {
    setLoadingMsg('Loading motion tracking…');
    const { Holistic } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/holistic.js');
    const holistic = new Holistic({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${f}` });
    holistic.setOptions({
      modelComplexity: isMobile() ? 0 : 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    filtersRef.current = createFilterBank(543);
    holistic.onResults(onHolisticResults);
    holisticRef.current = holistic;
    setTrackingActive(true);
  }, []);

  // ── Holistic results → avatar ──────────────────────────────────────────
  const onHolisticResults = useCallback((results) => {
    const now = Date.now();
    fpsCountRef.current.frames++;
    if (now - fpsCountRef.current.last > 1000) {
      setFps(fpsCountRef.current.frames);
      fpsCountRef.current = { frames: 0, last: now };
    }
    const avatar = avatarRef.current;
    if (!avatar) return;

    const faceLM = smoothLandmarks(results.faceLandmarks, filtersRef.current?.slice(0, 468), now);
    const poseLM = smoothLandmarks(results.poseLandmarks, filtersRef.current?.slice(468, 501), now);
    const faceRig = solveFace(faceLM);
    if (live2dMode) { setLive2dFaceRig(faceRig); }
    const poseRig = solvePose(poseLM);

    // Hand rig from MediaPipe hand landmarks
    let handRig = null;
    if (results.leftHandLandmarks || results.rightHandLandmarks) {
      handRig = {};
      if (results.leftHandLandmarks) handRig.left  = solveHand(results.leftHandLandmarks);
      if (results.rightHandLandmarks) handRig.right = solveHand(results.rightHandLandmarks);
    }

    // If VRM loaded, use its bone map
    if (vrmAvatarRef.current?.isVRM) {
      applyPoseToAvatar(vrmAvatarRef.current.bones, faceRig, poseRig, handRig);
      // Apply VRM expressions from face tracking
      if (vrmAvatarRef.current.applyExpression && faceRig) {
        vrmAvatarRef.current.applyExpression('blinkLeft',  faceRig.blinkL);
        vrmAvatarRef.current.applyExpression('blinkRight', faceRig.blinkR);
        vrmAvatarRef.current.applyExpression('aa', Math.min(1, (faceRig.mouthOpen ?? 0) * 1.5));
      }
    } else {
      applyPoseToAvatar(avatar.bones, faceRig, poseRig, handRig);
      applyBlendShapes(avatar.blendShapes, faceRig);
    }

    const dt = (now - lastRenderRef.current) / 1000;
    lastRenderRef.current = now;
    if (backdropRef.current) backdropRef.current.update(dt);
    // Update spring bone physics for VRM hair/clothing
    if (vrmAvatarRef.current?.update) vrmAvatarRef.current.update(Math.min(dt, 0.033));
    sampleFrame();

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    const canvas = canvasRef.current;
    if (canvas && !streamSentRef.current && onProcessedStream) {
      try {
        onProcessedStream(canvas.captureStream(30));
        streamSentRef.current = true;
      } catch (e) { console.warn('[LegionMoCap] captureStream:', e.message); }
    }
  }, [onProcessedStream]);

  // ── Simple hand curl solver ────────────────────────────────────────────
  function solveHand(lm) {
    if (!lm || lm.length < 21) return null;
    const curl = (tip, mid, base) => {
      const tipP = lm[tip], midP = lm[mid], baseP = lm[base];
      if (!tipP || !midP || !baseP) return 0;
      const d = Math.sqrt((tipP.x-baseP.x)**2 + (tipP.y-baseP.y)**2);
      return Math.max(0, Math.min(1, 1 - d * 4));
    };
    return {
      Thumb:  curl(4,  3,  2),
      Index:  curl(8,  6,  5),
      Middle: curl(12, 10, 9),
      Ring:   curl(16, 14, 13),
      Pinky:  curl(20, 18, 17),
    };
  }

  // ── Process loop ────────────────────────────────────────────────────────
  const processLoop = useCallback(() => {
    const video = videoRef?.current;
    const holistic = holisticRef.current;
    if (video && holistic && video.readyState >= 2 && AdaptiveQuality.shouldTrack()) {
      holistic.send({ image: video }).catch(() => {});
    }
    animFrameRef.current = requestAnimationFrame(processLoop);
  }, [videoRef]);

  // ── Mount / unmount ────────────────────────────────────────────────────
  useEffect(() => {
    lastRenderRef.current = performance.now();
    PerfMonitor.start();
    initThree(selectedPreset);
    initMediaPipe();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      Disposer.disposeScope('mocap');
      holisticRef.current?.close();
      rendererRef.current?.dispose();
      backdropRef.current?.dispose();
      vrmAvatarRef.current?.dispose?.();
      tierCleanupRef.current?.();
      stopMicLipSync();
      streamSentRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && trackingActive) {
      animFrameRef.current = requestAnimationFrame(processLoop);
      return () => cancelAnimationFrame(animFrameRef.current);
    }
  }, [loading, trackingActive, processLoop]);

  // ── Mic toggle ──────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (isMicLipSyncActive()) { stopMicLipSync(); setMicEnabled(false); }
    else {
      const video = videoRef?.current;
      if (video?.srcObject) { startMicLipSync(video.srcObject); setMicEnabled(true); }
    }
  }, [videoRef]);

  // ── LAF avatar switch ───────────────────────────────────────────────────
  const switchAvatar = useCallback(async (preset, colorOverrides = {}) => {
    if (!sceneRef.current) return;
    const THREE = await import('three');
    // Remove VRM if present
    if (vrmAvatarRef.current) {
      sceneRef.current.remove(vrmAvatarRef.current.group);
      vrmAvatarRef.current.dispose?.();
      vrmAvatarRef.current = null;
      setVrmLoaded(null);
    }
    if (avatarRef.current) sceneRef.current.remove(avatarRef.current.group);
    const merged = { ...preset, ...colorOverrides };
    const avatar = await buildAvatarFromLAF(merged, THREE);
    sceneRef.current.add(avatar.group);
    avatarRef.current = avatar;
    streamSentRef.current = false;
  }, []);

  // ── VRM file import ─────────────────────────────────────────────────────
  const handleVRMImport = useCallback(async (file) => {
    if (!file || !isVRMFile(file)) return;
    setVrmLoading(true);
    try {
      const THREE = await import('three');
      if (avatarRef.current) sceneRef.current?.remove(avatarRef.current.group);
      if (vrmAvatarRef.current) { sceneRef.current?.remove(vrmAvatarRef.current.group); vrmAvatarRef.current.dispose?.(); }

      const vrm = await loadVRM(file, THREE, setLoadingMsg);
      sceneRef.current?.add(vrm.group);
      vrmAvatarRef.current = vrm;
      setVrmLoaded(file.name);
      streamSentRef.current = false;
    } catch (e) {
      console.error('[LegionMoCap] VRM import failed:', e);
    } finally {
      setVrmLoading(false);
    }
  }, []);

  // Auto-load a VRM from a URL (e.g. the test page passing Luxe) once ready.
  useEffect(() => {
    if (!initialVrmUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(initialVrmUrl);
        const blob = await res.blob();
        const name = initialVrmUrl.split('/').pop() || 'avatar.vrm';
        const file = new File([blob], name, { type: 'application/octet-stream' });
        if (!cancelled) handleVRMImport(file);
      } catch (e) { console.error('[LegionMoCap] initial VRM load failed', e); }
    })();
    return () => { cancelled = true; };
  }, [initialVrmUrl, handleVRMImport]);

  // ── Backdrop switch ─────────────────────────────────────────────────────
  const switchBackdrop = useCallback(async (presetId) => {
    setCurrentBackdrop(presetId);
    if (!sceneRef.current) return;
    const THREE = await import('three');
    if (backdropRef.current) { sceneRef.current.remove(backdropRef.current.group); backdropRef.current.dispose(); }
    const backdrop = await createSplatBackdrop(presetId, THREE);
    sceneRef.current.add(backdrop.group);
    backdropRef.current = backdrop;
    streamSentRef.current = false;
  }, []);

  // ── Color customizer ────────────────────────────────────────────────────
  const applyColorChange = useCallback((key, value) => {
    const next = { ...customColors, [key]: value };
    setCustomColors(next);
    switchAvatar(selectedPreset, next);
  }, [customColors, selectedPreset, switchAvatar]);

  // ── Expression trigger ──────────────────────────────────────────────────
  const fireExpression = useCallback((exprId) => {
    setExprActive(exprId);
    triggerExpression(exprId, 2500);
    if (vrmAvatarRef.current?.applyExpression) {
      const vrmMap = { happy:'happy', sad:'sad', angry:'angry', surprised:'surprised', wink:'blinkLeft' };
      const vrmName = vrmMap[exprId];
      if (vrmName) {
        vrmAvatarRef.current.applyExpression(vrmName, 1.0);
        setTimeout(() => vrmAvatarRef.current?.applyExpression(vrmName, 0), 2500);
      }
    }
    setTimeout(() => setExprActive(null), 2500);
  }, []);

  const backdrops = getBackdropPresets();
  const colorFields = [
    { key:'skinColor',  label:'Skin',   default: selectedPreset.skinColor },
    { key:'hairColor',  label:'Hair',   default: selectedPreset.hairColor },
    { key:'bodyColor',  label:'Outfit', default: selectedPreset.bodyColor },
    { key:'eyeColor',   label:'Eyes',   default: selectedPreset.eyeColor  },
    { key:'lipColor',   label:'Lips',   default: selectedPreset.lipColor  },
  ];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* 3D Canvas — hidden in Live2D mode */}
      <canvas ref={canvasRef} width={720} height={1280}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ pointerEvents: 'none', display: live2dMode ? 'none' : 'block' }} />

      {/* Live2D Renderer */}
      {live2dMode && (
        <div className="absolute inset-0">
          <LegionLive2D
            faceRig={live2dFaceRig}
            micVolume={micEnabled ? 0.5 : 0}
            onStreamReady={(stream) => { onProcessedStream?.(stream); streamSentRef.current = true; }}
          />
        </div>
      )}

      {/* Loading overlay */}
      <AnimatePresence>
        {(loading || vrmLoading) && (
          <motion.div initial={{ opacity:1 }} exit={{ opacity:0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm pointer-events-auto">
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-amber-400 font-semibold text-sm">{loadingMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status badges */}
      {trackingActive && !loading && (
        <div className="absolute top-4 left-4 flex-col gap-1.5 pointer-events-none" style={{ display: hideControls ? 'none' : 'flex' }}>
          <div className="flex items-center gap-1.5 bg-purple-500/20 border border-purple-400/40 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-purple-300 text-[10px] font-bold">{vrmLoaded ? 'VRM' : 'LEGION'} MOCAP</span>
          </div>
          {vrmLoaded && (
            <div className="flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/40 rounded-full px-3 py-1">
              <span className="text-blue-300 text-[10px] font-bold truncate max-w-[120px]">{vrmLoaded}</span>
            </div>
          )}
          {micEnabled && (
            <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-400/40 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 text-[10px] font-bold">LIP SYNC</span>
            </div>
          )}
          {fps > 0 && (
            <div className="bg-black/60 backdrop-blur rounded-full px-3 py-1">
              <span className="text-amber-400 font-mono text-[10px]">{fps} fps</span>
            </div>
          )}
        </div>
      )}

      {/* Control bar — top right */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
        <button onClick={() => setShowPanel(v => !v)}
          className="w-10 h-10 rounded-full bg-black/70 backdrop-blur border border-white/20 flex items-center justify-center"
          style={{ borderColor: showPanel ? 'rgba(168,85,247,0.6)' : undefined }}>
          <span className="text-white text-sm">{showPanel ? '✕' : '⚙️'}</span>
        </button>
        <button onClick={toggleMic}
          className="w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center transition-all"
          style={{ borderColor: micEnabled ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.2)', background: micEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.6)' }}>
          {micEnabled ? <Mic className="w-4 h-4 text-green-400" /> : <MicOff className="w-4 h-4 text-white/60" />}
        </button>
        <button onClick={() => { streamSentRef.current = false; }}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center">
          <RotateCcw className="w-4 h-4 text-white/60" />
        </button>
        <button onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center">
          <X className="w-4 h-4 text-white/60" />
        </button>
        <XRButton rendererRef={rendererRef} sceneRef={sceneRef} cameraRef={cameraRef} className="pointer-events-auto" />
      </div>

      {/* Main control panel */}
      <AnimatePresence>
        {showPanel && !loading && (
          <motion.div
            initial={{ opacity:0, x: 20 }} animate={{ opacity:1, x: 0 }} exit={{ opacity:0, x: 20 }}
            className="absolute top-4 right-16 w-64 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden pointer-events-auto"
            style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>

            {/* Tab bar */}
            <div className="flex border-b border-white/8">
              {TABS.map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all"
                  style={{ color: activeTab === id ? '#a855f7' : 'rgba(255,255,255,0.35)', borderBottom: activeTab === id ? '2px solid #a855f7' : '2px solid transparent' }}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">{label}</span>
                </button>
              ))}
            </div>

            <div className="p-3">
              {/* ── AVATAR TAB ──────────────────────────────────────────── */}
              {activeTab === 'avatar' && (
                <div className="space-y-2">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Built-in Avatars</p>
                  {LAF_PRESETS.map(preset => (
                    <button key={preset.id}
                      onClick={() => { setSelectedPreset(preset); setCustomColors({}); switchAvatar(preset, {}); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all"
                      style={{
                        background: !vrmLoaded && selectedPreset.id === preset.id ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
                        border: !vrmLoaded && selectedPreset.id === preset.id ? '1px solid rgba(168,85,247,0.55)' : '1px solid rgba(255,255,255,0.08)',
                        color: !vrmLoaded && selectedPreset.id === preset.id ? '#c084fc' : 'rgba(255,255,255,0.7)',
                      }}>
                      <div className="w-7 h-7 rounded-full shrink-0 border border-white/10 flex items-center justify-center text-sm"
                        style={{ background: `radial-gradient(circle at 35% 35%, ${preset.skinColor}, #000)` }}>
                        {preset.emoji}
                      </div>
                      <span className="font-medium">{preset.name}</span>
                    </button>
                  ))}

                  {/* Live2D Mode Toggle */}
                  <div className="mt-3 pt-3 border-t border-white/8">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/40 text-[10px] uppercase tracking-wider">Live2D Mode</p>
                      <button onClick={() => setLive2dMode(v => !v)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold ll-interactive transition-all"
                        style={{
                          background: live2dMode ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${live2dMode ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.1)'}`,
                          color: live2dMode ? '#f472b6' : 'rgba(255,255,255,0.4)',
                        }}>
                        {live2dMode ? '✓ Live2D Active' : '2D Anime Mode'}
                      </button>
                    </div>
                    {live2dMode && (
                      <p className="text-white/25 text-[10px] mb-3">
                        Upload your .model3.json via the canvas controls below
                      </p>
                    )}
                  </div>

                  {/* VRM Import */}
                  <div className="mt-3 pt-3 border-t border-white/8">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">VRM File Import</p>
                    <input ref={vrmFileInputRef} type="file" accept=".vrm" className="hidden"
                      onChange={e => e.target.files?.[0] && handleVRMImport(e.target.files[0])} />
                    <button onClick={() => vrmFileInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl border border-dashed border-purple-500/40 flex items-center justify-center gap-2 transition-all hover:border-purple-500/70"
                      style={{ background: vrmLoaded ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)' }}>
                      <Upload className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-semibold text-purple-300">
                        {vrmLoaded ? `✓ ${vrmLoaded.slice(0,18)}…` : 'Import .vrm file'}
                      </span>
                    </button>
                    {vrmLoaded && (
                      <button onClick={() => { vrmAvatarRef.current?.dispose?.(); vrmAvatarRef.current=null; setVrmLoaded(null); switchAvatar(selectedPreset, customColors); }}
                        className="w-full mt-1.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                        Remove VRM
                      </button>
                    )}
                    <p className="text-white/25 text-[10px] mt-2 text-center">VRM 0.x and 1.0 supported</p>
                  </div>
                </div>
              )}

              {/* ── COLOR TAB ────────────────────────────────────────────── */}
              {activeTab === 'color' && (
                <div className="space-y-3">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider">Customize Colors</p>
                  {colorFields.map(({ key, label, default: def }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-white/70 font-medium w-14">{label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg border border-white/20 overflow-hidden cursor-pointer relative">
                          <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            value={customColors[key] || def}
                            onChange={e => applyColorChange(key, e.target.value)} />
                          <div className="w-full h-full" style={{ background: customColors[key] || def }} />
                        </div>
                        <span className="text-[10px] font-mono text-white/40">{customColors[key] || def}</span>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { setCustomColors({}); switchAvatar(selectedPreset, {}); }}
                    className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-semibold mt-2">
                    Reset Colors
                  </button>
                </div>
              )}

              {/* ── EXPRESSIONS TAB ──────────────────────────────────────── */}
              {activeTab === 'expr' && (
                <div className="space-y-2">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Trigger Emotion</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPRESSIONS.map(({ id, emoji, name }) => (
                      <button key={id} onClick={() => fireExpression(id)}
                        className="py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95"
                        style={{
                          background: exprActive === id ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.05)',
                          border: exprActive === id ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                          boxShadow: exprActive === id ? '0 0 12px rgba(168,85,247,0.3)' : 'none',
                        }}>
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-[10px] font-semibold text-white/60">{name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-white/25 text-[10px] text-center mt-2">
                    Taps trigger 2.5s animated expression
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/8">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Auto Tracking</p>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-white/60">Face-driven blinks</span>
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    </div>
                    <div className="flex items-center justify-between px-1 mt-1">
                      <span className="text-xs text-white/60">Mouth tracking</span>
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    </div>
                    <div className="flex items-center justify-between px-1 mt-1">
                      <span className="text-xs text-white/60">Finger curl</span>
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── BACKDROP TAB ─────────────────────────────────────────── */}
              {activeTab === 'backdrop' && (
                <div className="space-y-2">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Scene Backdrop</p>
                  {backdrops.map(b => (
                    <button key={b.id} onClick={() => switchBackdrop(b.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
                      style={{
                        background: currentBackdrop === b.id ? 'rgba(139,92,246,0.20)' : 'rgba(255,255,255,0.04)',
                        border: currentBackdrop === b.id ? '1px solid rgba(139,92,246,0.55)' : '1px solid rgba(255,255,255,0.08)',
                        color: currentBackdrop === b.id ? '#a78bfa' : 'rgba(255,255,255,0.70)',
                      }}>
                      <div className="w-6 h-6 rounded-lg shrink-0"
                        style={{ background: currentBackdrop === b.id ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)' }} />
                      <span className="font-medium">{b.name}</span>
                      {currentBackdrop === b.id && <span className="ml-auto text-purple-400 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
