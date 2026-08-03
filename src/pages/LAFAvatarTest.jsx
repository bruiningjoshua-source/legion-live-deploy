import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { FaceMesh } from '@mediapipe/face_mesh';
import {
  buildAvatarFromLAF, applyPoseToAvatar, applyBlendShapes, setMicVolume,
} from '@/components/mocap/LegionAvatarRenderer';

/**
 * LAFAvatarTest — ISOLATED test for Legion's OWN procedural avatar system (LAF),
 * driven by real MediaPipe face tracking. Separate from the VRM baseline test.
 * Lets you judge whether your custom avatar + tracking is viable for VTubing.
 */

const PRESETS = [
  { name: 'Default',    skinColor: '#e8b89a', hairColor: '#3d2506', bodyColor: '#1a2742' },
  { name: 'Shadow Fox', skinColor: '#e8b89a', hairColor: '#5b21b6', bodyColor: '#1e1b4b' },
  { name: 'Frost',      skinColor: '#ead9d0', hairColor: '#93c5fd', bodyColor: '#1e3a5f' },
  { name: 'Ember',      skinColor: '#e8b89a', hairColor: '#dc2626', bodyColor: '#3d1010' },
];

export default function LAFAvatarTest() {
  const mountRef = useRef(null);
  const videoRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const avatarRef = useRef(null);     // { group, bones, blendShapes }
  const faceMeshRef = useRef(null);
  const rafRef = useRef(null);
  const sendFrameRef = useRef(0);
  const faceRigRef = useRef(null);
  const targetRig = useRef({ pitch: 0, yaw: 0, roll: 0, blinkL: 0, blinkR: 0, mouthOpen: 0 });

  const [status, setStatus] = useState('Booting…');
  const [tracking, setTracking] = useState(false);
  const [fps, setFps] = useState(0);
  const [preset, setPreset] = useState(PRESETS[0]);
  const fpsRef = useRef({ n: 0, t: performance.now() });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14101a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, mount.clientWidth / mount.clientHeight, 0.01, 20);
    camera.position.set(0, 0.62, 1.1);
    camera.lookAt(0, 0.55, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(1, 2, 2); scene.add(key);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const av = avatarRef.current;
      if (av) {
        // Smooth the live rig toward detection targets.
        const t = targetRig.current;
        const c = (faceRigRef.current ||= { pitch: 0, yaw: 0, roll: 0, blinkL: 0, blinkR: 0, mouthOpen: 0 });
        const k = 0.25;
        for (const key of Object.keys(t)) c[key] += (t[key] - c[key]) * k;
        const rig = tracking ? c : null;   // null = idle animation
        try {
          applyPoseToAvatar(av.bones, rig, null, null);
          applyBlendShapes(av.blendShapes, rig);
        } catch (e) { /* keep rendering */ }
      }
      renderer.render(scene, camera);
    };
    animate();

    buildAvatar(PRESETS[0]);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildAvatar = useCallback(async (p) => {
    setStatus('Building avatar…');
    try {
      const result = await buildAvatarFromLAF(p, THREE);
      // buildAvatarFromLAF returns { group, bones, blendShapes } (or similar)
      const group = result.group || result.scene || result;
      if (avatarRef.current?.group) sceneRef.current.remove(avatarRef.current.group);
      sceneRef.current.add(group);
      avatarRef.current = { group, bones: result.bones, blendShapes: result.blendShapes };

      // Auto-frame: fit the camera to the avatar's bounding box (upper body).
      try {
        const box = new THREE.Box3().setFromObject(group);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const cam = cameraRef.current;
        // Frame the head/upper body: look at the top third, back off by height.
        const focusY = box.max.y - size.y * 0.28;
        const dist = Math.max(size.y, size.x) * 1.6 + 0.3;
        cam.position.set(center.x, focusY, dist);
        cam.lookAt(center.x, focusY, 0);
        cam.updateProjectionMatrix();
        console.log('[LAF] framed', { size, center: center.toArray(), focusY, dist });
      } catch (e) { console.warn('[LAF] auto-frame failed', e?.message); }

      setStatus('Avatar built. Start tracking to drive it with your face.');
    } catch (e) {
      console.error('[LAF] build failed', e);
      setStatus(`Avatar build failed: ${e.message}`);
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      setStatus('Requesting camera…');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, frameRate: 24 }, audio: false });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const faceMesh = new FaceMesh({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
      faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      faceMesh.onResults(onFaceResults);
      faceMeshRef.current = faceMesh;

      const pump = async () => {
        if (!faceMeshRef.current) return;
        sendFrameRef.current = (sendFrameRef.current + 1) % 2;
        if (sendFrameRef.current === 0 && videoRef.current?.readyState >= 2) {
          try { await faceMeshRef.current.send({ image: videoRef.current }); } catch (_) {}
        }
        requestAnimationFrame(pump);
      };
      pump();
      setTracking(true);
      setStatus('Tracking live — move your head, blink, open your mouth.');
    } catch (e) {
      setStatus(`Camera/tracking failed: ${e.message}`);
    }
  }, []);

  const onFaceResults = useCallback((results) => {
    const f = fpsRef.current; f.n++;
    const now = performance.now();
    if (now - f.t > 1000) { setFps(f.n); f.n = 0; f.t = now; }

    const lm = results.multiFaceLandmarks?.[0];
    if (!lm) return;
    const nose = lm[1], leftEye = lm[33], rightEye = lm[263], chin = lm[152], forehead = lm[10];
    const cx = (leftEye.x + rightEye.x) / 2;
    const yaw = (nose.x - cx) * 3.0;
    const pitch = (nose.y - (leftEye.y + rightEye.y) / 2) * 3.0 - 0.15;
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const faceH = Math.hypot(chin.x - forehead.x, chin.y - forehead.y) || 1;
    const upperLip = lm[13], lowerLip = lm[14];
    const mouthOpen = Math.min(1, (Math.hypot(lowerLip.x - upperLip.x, lowerLip.y - upperLip.y) / faceH) * 6);
    const blinkOf = (a, b) => THREE.MathUtils.clamp(1 - (Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y) / faceH) * 30, 0, 1);

    targetRig.current = {
      pitch: THREE.MathUtils.clamp(pitch, -0.6, 0.6),
      yaw: THREE.MathUtils.clamp(-yaw, -0.8, 0.8),
      roll: THREE.MathUtils.clamp(-roll, -0.6, 0.6),
      blinkL: blinkOf(159, 145),
      blinkR: blinkOf(386, 374),
      mouthOpen,
    };
  }, []);

  const stopTracking = () => {
    faceMeshRef.current = null;
    videoRef.current?.srcObject?.getTracks?.().forEach(t => t.stop());
    setTracking(false);
    setStatus('Tracking stopped — avatar returns to idle animation.');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c14', color: '#e8dcc8', padding: 16, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Legion Avatar (LAF) Test — Isolated</h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 12 }}>
        Your OWN procedural avatar system driven by real face tracking. Separate from the VRM baseline (/vtuber-test).
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {!tracking ? (
          <button onClick={startTracking} style={btn('#f5a623', '#000')}>▶ Start Face Tracking</button>
        ) : (
          <button onClick={stopTracking} style={btn('#c42a2a', '#fff')}>■ Stop</button>
        )}
        <span style={{ fontSize: 12, opacity: 0.5, alignSelf: 'center' }}>{fps} detections/s (motion smoothed)</span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {PRESETS.map(p => (
          <button key={p.name} onClick={() => { setPreset(p); buildAvatar(p); }}
            style={{ ...btn(preset.name === p.name ? '#f5a623' : 'rgba(255,255,255,0.08)', preset.name === p.name ? '#000' : '#e8dcc8'), fontSize: 12, padding: '6px 12px' }}>
            {p.name}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 13, marginBottom: 10, minHeight: 18, color: '#f5c86a' }}>{status}</div>

      <div ref={mountRef} style={{ width: '100%', height: '58vh', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(245,166,35,0.3)' }} />

      <video ref={videoRef} playsInline muted style={{ position: 'absolute', width: 140, height: 105, bottom: 16, right: 16, borderRadius: 8, opacity: tracking ? 0.85 : 0, transform: 'scaleX(-1)', border: '1px solid rgba(255,255,255,0.2)' }} />

      <div style={{ fontSize: 12, opacity: 0.55, marginTop: 12, lineHeight: 1.5 }}>
        <strong>Compare vs /vtuber-test:</strong> this is Legion's custom-built avatar (procedural Three.js geometry, no external model),
        the VRM test uses imported models. Judge both on tracking quality, look, and performance.
      </div>
    </div>
  );
}

function btn(bg, color) {
  return { background: bg, color, border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 600, fontSize: 14 };
}
