import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, User, Mic, MicOff, Image } from 'lucide-react';
import { createFilterBank, smoothLandmarks, solveFace, solvePose } from './LegionPoseSolver';
import { buildAvatarFromLAF, applyPoseToAvatar, applyBlendShapes } from './LegionAvatarRenderer';
import { startMicLipSync, stopMicLipSync, isMicLipSyncActive } from './LegionMicLipSync';
import { sampleFrame, detectInitialTier, getRendererConfig, onTierChange, isMobile } from './LegionPerformanceScaler';
import { createSplatBackdrop, getBackdropPresets } from './LegionSplatBackdrop';
import PerfMonitor from '@/components/engine/PerformanceMonitor';
import AdaptiveQuality from '@/components/engine/AdaptiveQuality';
import Disposer from '@/components/engine/ResourceDisposer';

const PRESETS = [
  { id:'warrior',   name:'Warrior',     skinColor:'#e8b89a', hairColor:'#3d2506', bodyColor:'#1a2742', eyeColor:'#1a5276' },
  { id:'neon',      name:'Neon Spirit',  skinColor:'#c9a87c', hairColor:'#7b2fff', bodyColor:'#0d0d1a', eyeColor:'#00ffcc' },
  { id:'shadow',    name:'Shadow Fox',   skinColor:'#d4a574', hairColor:'#1a1a1a', bodyColor:'#2c2c2c', eyeColor:'#ff4500' },
  { id:'frost',     name:'Frost Queen',  skinColor:'#f0e6d3', hairColor:'#e8f4f8', bodyColor:'#1e4b6e', eyeColor:'#00bfff' },
  { id:'ember',     name:'Ember',        skinColor:'#b87042', hairColor:'#c0392b', bodyColor:'#2c1810', eyeColor:'#ff6b35' },
];

export default function LegionMoCap({ videoRef, onProcessedStream, onClose }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const avatarRef = useRef(null);
  const holisticRef = useRef(null);
  const filtersRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamSentRef = useRef(false);
  const backdropRef = useRef(null);
  const tierCleanupRef = useRef(null);
  const fpsCountRef = useRef({ frames: 0, last: Date.now() });
  const lastRenderRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Initialising…');
  const [fps, setFps] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [showBackdrops, setShowBackdrops] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [currentBackdrop, setCurrentBackdrop] = useState('studio');

  // ── Initialize Three.js with HDR + adaptive quality ──
  const initThree = useCallback(async (preset) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setLoadingMsg('Starting 3D renderer…');

    const tier = detectInitialTier();
    const config = getRendererConfig();
    const THREE = await import("three");

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false, // opaque — backdrop fills bg
      antialias: config.antialias,
      preserveDrawingBuffer: true,
      powerPreference: isMobile() ? 'low-power' : 'high-performance',
    });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setPixelRatio(config.pixelRatio);
    renderer.setClearColor(0x0a0a14, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
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

    // Lighting — soft ambient + key + rim
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xfff5e6, 1.2);
    key.position.set(1, 2, 3);
    if (config.shadowMapEnabled) {
      key.castShadow = true;
      key.shadow.mapSize.set(config.shadowMapSize, config.shadowMapSize);
      key.shadow.bias = -0.002;
    }
    scene.add(key);

    // Rim light (subtle edge highlight)
    const rim = new THREE.DirectionalLight(0x8888ff, 0.4);
    rim.position.set(-2, 1, -2);
    scene.add(rim);

    // Splat backdrop
    setLoadingMsg('Loading environment…');
    const backdrop = await createSplatBackdrop(currentBackdrop, THREE);
    scene.add(backdrop.group);
    backdropRef.current = backdrop;

    // Avatar
    setLoadingMsg('Building avatar…');
    const avatar = await buildAvatarFromLAF(preset, THREE);
    scene.add(avatar.group);
    avatarRef.current = avatar;

    // Adaptive quality: listen for tier changes
    tierCleanupRef.current = onTierChange((newTier, newConfig) => {
      renderer.setPixelRatio(newConfig.pixelRatio);
      if (!newConfig.shadowMapEnabled && renderer.shadowMap.enabled) {
        renderer.shadowMap.enabled = false;
      }
    });

    setLoading(false);
  }, [currentBackdrop]);

  // ── Initialize MediaPipe (face/pose only, disable hands on mobile) ──
  const initMediaPipe = useCallback(async () => {
    setLoadingMsg('Loading motion tracking…');
    const { Holistic } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/holistic.js');
    const holistic = new Holistic({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${f}` });

    const mobile = isMobile();
    holistic.setOptions({
      modelComplexity: mobile ? 0 : 1,
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

  // ── Holistic results → avatar update ──
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
    const poseRig = solvePose(poseLM);

    applyPoseToAvatar(avatar.bones, faceRig, poseRig);
    applyBlendShapes(avatar.blendShapes, faceRig);

    // Update backdrop animation
    const dt = (now - lastRenderRef.current) / 1000;
    lastRenderRef.current = now;
    if (backdropRef.current) backdropRef.current.update(dt);

    // Performance sampling
    sampleFrame();

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    // Capture stream for WebRTC
    const canvas = canvasRef.current;
    if (canvas && !streamSentRef.current && onProcessedStream) {
      try {
        const stream = canvas.captureStream(30);
        onProcessedStream(stream);
        streamSentRef.current = true;
      } catch (e) {
        console.warn('[LegionMoCap] captureStream:', e.message);
      }
    }
  }, [onProcessedStream]);

  // ── Feed video frames to MediaPipe (with adaptive frame skipping) ──
  const processLoop = useCallback(() => {
    const video = videoRef?.current;
    const holistic = holisticRef.current;
    if (video && holistic && video.readyState >= 2 && AdaptiveQuality.shouldTrack()) {
      holistic.send({ image: video }).catch(() => {});
    }
    animFrameRef.current = requestAnimationFrame(processLoop);
  }, [videoRef]);

  // ── Mount / unmount ──
  useEffect(() => {
    lastRenderRef.current = performance.now();
    PerfMonitor.start();
    initThree(selectedPreset);
    initMediaPipe();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      // Dispose registered resources
      Disposer.disposeScope('mocap');
      // Legacy cleanup for anything not yet registered
      holisticRef.current?.close();
      rendererRef.current?.dispose();
      backdropRef.current?.dispose();
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

  // ── Mic lip-sync toggle ──
  const toggleMic = useCallback(() => {
    if (isMicLipSyncActive()) {
      stopMicLipSync();
      setMicEnabled(false);
    } else {
      const video = videoRef?.current;
      if (video?.srcObject) {
        startMicLipSync(video.srcObject);
        setMicEnabled(true);
      }
    }
  }, [videoRef]);

  // ── Avatar switch ──
  const switchAvatar = useCallback(async (preset) => {
    setShowPicker(false);
    if (!sceneRef.current || !rendererRef.current) return;
    const THREE = await import("three");
    if (avatarRef.current) sceneRef.current.remove(avatarRef.current.group);
    const avatar = await buildAvatarFromLAF(preset, THREE);
    sceneRef.current.add(avatar.group);
    avatarRef.current = avatar;
    streamSentRef.current = false;
  }, []);

  // ── Backdrop switch ──
  const switchBackdrop = useCallback(async (presetId) => {
    setShowBackdrops(false);
    setCurrentBackdrop(presetId);
    if (!sceneRef.current) return;
    const THREE = await import("three");
    if (backdropRef.current) {
      sceneRef.current.remove(backdropRef.current.group);
      backdropRef.current.dispose();
    }
    const backdrop = await createSplatBackdrop(presetId, THREE);
    sceneRef.current.add(backdrop.group);
    backdropRef.current = backdrop;
    streamSentRef.current = false;
  }, []);

  const backdrops = getBackdropPresets();

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <canvas ref={canvasRef} width={720} height={1280} className="absolute inset-0 w-full h-full object-cover" style={{ pointerEvents: "none" }} />

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm pointer-events-auto">
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-amber-400 font-semibold text-sm">{loadingMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
        {trackingActive && !loading && (
          <div className="bg-black/60 backdrop-blur rounded-xl px-2.5 py-1">
            <span className="text-amber-400 font-mono text-[10px]">{fps} fps</span>
          </div>
        )}

        {/* Avatar picker */}
        <button onClick={() => { setShowPicker(v => !v); setShowBackdrops(false); }}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-amber-500/40 flex items-center justify-center">
          <User className="w-4 h-4 text-amber-400" />
        </button>

        {/* Mic lip-sync toggle */}
        <button onClick={toggleMic}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border flex items-center justify-center transition-all"
          style={{
            borderColor: micEnabled ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.2)',
            background: micEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.6)',
          }}>
          {micEnabled ? <Mic className="w-4 h-4 text-green-400" /> : <MicOff className="w-4 h-4 text-white/60" />}
        </button>

        {/* Backdrop picker */}
        <button onClick={() => { setShowBackdrops(v => !v); setShowPicker(false); }}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center">
          <Image className="w-4 h-4 text-white/60" />
        </button>

        {/* Reset */}
        <button onClick={() => { streamSentRef.current = false; }}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center">
          <RotateCcw className="w-4 h-4 text-white/60" />
        </button>

        {/* Close */}
        <button onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center">
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Avatar picker dropdown */}
      <AnimatePresence>
        {showPicker && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-16 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 space-y-2 pointer-events-auto">
            <p className="text-white/50 text-[10px] uppercase tracking-wider px-1">Choose Avatar</p>
            {PRESETS.map(preset => (
              <button key={preset.id} onClick={() => { setSelectedPreset(preset); switchAvatar(preset); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: selectedPreset.id === preset.id ? "rgba(245,166,35,0.20)" : "rgba(255,255,255,0.04)",
                  border: selectedPreset.id === preset.id ? "1px solid rgba(245,166,35,0.55)" : "1px solid rgba(255,255,255,0.08)",
                  color: selectedPreset.id === preset.id ? "#f5a623" : "rgba(255,255,255,0.70)"
                }}>
                <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: preset.skinColor }} />
                <span>{preset.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop picker dropdown */}
      <AnimatePresence>
        {showBackdrops && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-16 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 space-y-2 pointer-events-auto">
            <p className="text-white/50 text-[10px] uppercase tracking-wider px-1">Backdrop</p>
            {backdrops.map(b => (
              <button key={b.id} onClick={() => switchBackdrop(b.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: currentBackdrop === b.id ? "rgba(139,92,246,0.20)" : "rgba(255,255,255,0.04)",
                  border: currentBackdrop === b.id ? "1px solid rgba(139,92,246,0.55)" : "1px solid rgba(255,255,255,0.08)",
                  color: currentBackdrop === b.id ? "#8b5cf6" : "rgba(255,255,255,0.70)"
                }}>
                <span>{b.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status badges */}
      {trackingActive && !loading && (
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-purple-500/20 border border-purple-400/40 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-purple-300 text-[10px] font-bold">LEGION MOCAP</span>
          </div>
          {micEnabled && (
            <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-400/40 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 text-[10px] font-bold">LIP SYNC</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}