import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, User } from 'lucide-react';
import { createFilterBank, smoothLandmarks, solveFace, solvePose } from './LegionPoseSolver';
import { buildAvatarFromLAF, applyPoseToAvatar, applyBlendShapes } from './LegionAvatarRenderer';

const PRESETS = [
  { id:'warrior',   name:'Warrior',     skinColor:'#e8b89a', hairColor:'#3d2506', bodyColor:'#1a2742', eyeColor:'#1a5276' },
  { id:'neon',      name:'Neon Spirit',  skinColor:'#c9a87c', hairColor:'#7b2fff', bodyColor:'#0d0d1a', eyeColor:'#00ffcc' },
  { id:'shadow',    name:'Shadow Fox',   skinColor:'#d4a574', hairColor:'#1a1a1a', bodyColor:'#2c2c2c', eyeColor:'#ff4500' },
  { id:'frost',     name:'Frost Queen',  skinColor:'#f0e6d3', hairColor:'#e8f4f8', bodyColor:'#1e4b6e', eyeColor:'#00bfff' },
  { id:'ember',     name:'Ember',        skinColor:'#b87042', hairColor:'#c0392b', bodyColor:'#2c1810', eyeColor:'#ff6b35' },
];

export default function LegionMoCap({ videoRef, onProcessedStream, onClose }) {
  const canvasRef=useRef(null); const rendererRef=useRef(null); const sceneRef=useRef(null);
  const cameraRef=useRef(null); const avatarRef=useRef(null); const holisticRef=useRef(null);
  const filtersRef=useRef(null); const animFrameRef=useRef(null); const streamSentRef=useRef(false);
  const fpsCountRef=useRef({ frames:0, last:Date.now() });

  const [loading, setLoading]=useState(true);
  const [loadingMsg, setLoadingMsg]=useState('Initialising…');
  const [fps, setFps]=useState(0);
  const [selectedPreset, setSelectedPreset]=useState(PRESETS[0]);
  const [showPicker, setShowPicker]=useState(false);
  const [trackingActive, setTrackingActive]=useState(false);

  const initThree = useCallback(async (preset) => {
    const canvas = canvasRef.current; if (!canvas) return;
    setLoadingMsg('Starting 3D renderer…');
    const THREE = await import("three");
    const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:false, preserveDrawingBuffer:true });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setClearColor(0x000000,0);
    rendererRef.current = renderer;
    const scene = new THREE.Scene(); sceneRef.current=scene;
    const cam = new THREE.PerspectiveCamera(35, canvas.width/canvas.height, 0.1, 20);
    cam.position.set(0,0.5,2.8); cam.lookAt(0,0.5,0);
    cameraRef.current = cam;
    scene.add(new THREE.AmbientLight(0xffffff,0.85));
    const dir=new THREE.DirectionalLight(0xffffff,1.0); dir.position.set(1,2,3); scene.add(dir);
    setLoadingMsg('Building avatar…');
    const avatar = await buildAvatarFromLAF(preset, THREE);
    scene.add(avatar.group);
    avatarRef.current = avatar;
    setLoading(false);
  }, []);

  const initMediaPipe = useCallback(async () => {
    setLoadingMsg('Loading motion tracking…');
    const { Holistic } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/holistic.js');
    const holistic = new Holistic({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${f}` });
    holistic.setOptions({ modelComplexity:1, smoothLandmarks:true, enableSegmentation:false, refineFaceLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5 });
    filtersRef.current = createFilterBank(543);
    holistic.onResults(onHolisticResults);
    holisticRef.current = holistic;
    setTrackingActive(true);
  }, []);

  const onHolisticResults = useCallback((results) => {
    const now = Date.now();
    fpsCountRef.current.frames++;
    if (now-fpsCountRef.current.last > 1000) { setFps(fpsCountRef.current.frames); fpsCountRef.current = { frames:0, last:now }; }
    const avatar = avatarRef.current; if (!avatar) return;
    const faceLM = smoothLandmarks(results.faceLandmarks, filtersRef.current?.slice(0,468), now);
    const poseLM = smoothLandmarks(results.poseLandmarks, filtersRef.current?.slice(468,501), now);
    const faceRig = solveFace(faceLM);
    const poseRig = solvePose(poseLM);
    applyPoseToAvatar(avatar.bones, faceRig, poseRig);
    applyBlendShapes(avatar.blendShapes, faceRig);
    if (rendererRef.current && sceneRef.current && cameraRef.current) rendererRef.current.render(sceneRef.current, cameraRef.current);
    const canvas = canvasRef.current;
    if (canvas && !streamSentRef.current && onProcessedStream) {
      try { const stream = canvas.captureStream(30); onProcessedStream(stream); streamSentRef.current = true; }
      catch(e){ console.warn('[LegionMoCap] captureStream:', e.message); }
    }
  }, [onProcessedStream]);

  const processLoop = useCallback(() => {
    const video=videoRef?.current, holistic=holisticRef.current;
    if (video && holistic && video.readyState>=2) holistic.send({image:video}).catch(()=>{});
    animFrameRef.current = requestAnimationFrame(processLoop);
  }, [videoRef]);

  useEffect(() => {
    initThree(selectedPreset);
    initMediaPipe();
    return () => { cancelAnimationFrame(animFrameRef.current); holisticRef.current?.close(); rendererRef.current?.dispose(); streamSentRef.current = false; };
  }, []);

  useEffect(() => {
    if (!loading && trackingActive) { animFrameRef.current = requestAnimationFrame(processLoop); return () => cancelAnimationFrame(animFrameRef.current); }
  }, [loading, trackingActive, processLoop]);

  const switchAvatar = useCallback(async (preset) => {
    setShowPicker(false);
    if (!sceneRef.current||!rendererRef.current) return;
    const THREE = await import("three");
    if (avatarRef.current) sceneRef.current.remove(avatarRef.current.group);
    const avatar = await buildAvatarFromLAF(preset, THREE);
    sceneRef.current.add(avatar.group);
    avatarRef.current = avatar;
    streamSentRef.current = false;
  }, []);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <canvas ref={canvasRef} width={720} height={1280} className="absolute inset-0 w-full h-full object-cover" style={{ pointerEvents:"none" }} />
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity:1 }} exit={{ opacity:0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm pointer-events-auto">
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-amber-400 font-semibold text-sm">{loadingMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
        {trackingActive && !loading && (
          <div className="bg-black/60 backdrop-blur rounded-xl px-2.5 py-1">
            <span className="text-amber-400 font-mono text-[10px]">{fps} fps</span>
          </div>
        )}
        <button onClick={() => setShowPicker(v=>!v)} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-amber-500/40 flex items-center justify-center">
          <User className="w-4 h-4 text-amber-400" />
        </button>
        <button onClick={() => { streamSentRef.current=false; }} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center">
          <RotateCcw className="w-4 h-4 text-white/60" />
        </button>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center">
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>
      <AnimatePresence>
        {showPicker && (
          <motion.div initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:20 }}
            className="absolute top-4 right-16 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 space-y-2 pointer-events-auto">
            <p className="text-white/50 text-[10px] uppercase tracking-wider px-1">Choose Avatar</p>
            {PRESETS.map(preset => (
              <button key={preset.id} onClick={() => { setSelectedPreset(preset); switchAvatar(preset); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={{ background:selectedPreset.id===preset.id?"rgba(245,166,35,0.20)":"rgba(255,255,255,0.04)", border:selectedPreset.id===preset.id?"1px solid rgba(245,166,35,0.55)":"1px solid rgba(255,255,255,0.08)", color:selectedPreset.id===preset.id?"#f5a623":"rgba(255,255,255,0.70)" }}>
                <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor:preset.skinColor }} />
                <span>{preset.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {trackingActive && !loading && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-purple-500/20 border border-purple-400/40 rounded-full px-3 py-1 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-purple-300 text-[10px] font-bold">LEGION MOCAP</span>
        </div>
      )}
    </div>
  );
}