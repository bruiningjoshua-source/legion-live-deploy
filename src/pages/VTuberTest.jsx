import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { FaceMesh } from '@mediapipe/face_mesh';

/**
 * VTuberTest — a fully ISOLATED test harness for creator VTubing.
 * Nothing here touches the live streaming pipeline, auth, or any other page.
 * It:
 *   1. renders a VRM avatar in a Three.js scene
 *   2. starts the webcam
 *   3. tracks the face with MediaPipe FaceMesh (468 landmarks)
 *   4. drives the avatar's head rotation + mouth/blink/expression live
 *
 * A default public VRM loads automatically; you can also drop in your own .vrm.
 */

// A small, well-known public test VRM (VRoid sample). If it fails to load,
// the page still runs — you can upload your own.
const DEFAULT_VRM =
  'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

export default function VTuberTest() {
  const mountRef = useRef(null);
  const videoRef = useRef(null);
  const vrmRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);
  const rafRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const sendFrameRef = useRef(0);
  // Smoothing targets — detection writes these, the render loop lerps toward them
  // so low-rate face detection still animates fluidly.
  const targetRef = useRef({ pitch: 0, yaw: 0, roll: 0, mouth: 0, blink: 0 });
  const currentRef = useRef({ pitch: 0, yaw: 0, roll: 0, mouth: 0, blink: 0 });

  const [status, setStatus] = useState('Booting…');
  const [tracking, setTracking] = useState(false);
  const [fps, setFps] = useState(0);
  const fpsRef = useRef({ n: 0, t: performance.now() });

  // ── Set up the Three.js scene ──
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14101a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(30, mount.clientWidth / mount.clientHeight, 0.1, 20);
    camera.position.set(0, 1.35, 1.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Render loop
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const vrm = vrmRef.current;
      if (vrm) {
        // Smoothly ease current values toward the latest detection targets.
        const t = targetRef.current, c = currentRef.current;
        const k = Math.min(1, delta * 12); // smoothing rate
        c.pitch += (t.pitch - c.pitch) * k;
        c.yaw   += (t.yaw   - c.yaw)   * k;
        c.roll  += (t.roll  - c.roll)  * k;
        c.mouth += (t.mouth - c.mouth) * k;
        c.blink += (t.blink - c.blink) * k;

        const head = vrm.humanoid?.getNormalizedBoneNode?.('head');
        if (head) head.rotation.set(c.pitch, c.yaw, c.roll);
        const em = vrm.expressionManager;
        if (em) { em.setValue('aa', c.mouth); em.setValue('blink', c.blink); }

        vrm.update(delta);
      }
      renderer.render(scene, camera);
    };
    animate();

    loadVRM('/avatars/luxe.vrm');

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVRM = useCallback(async (url) => {
    setStatus('Loading avatar…');
    try {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      const gltf = await loader.loadAsync(url);
      const vrm = gltf.userData.vrm;
      // remove old
      if (vrmRef.current) {
        sceneRef.current.remove(vrmRef.current.scene);
        VRMUtils.deepDispose(vrmRef.current.scene);
      }
      VRMUtils.rotateVRM0(vrm); // face the camera for VRM0 models
      sceneRef.current.add(vrm.scene);
      vrmRef.current = vrm;
      setStatus('Avatar loaded. Start tracking to drive it with your face.');
    } catch (e) {
      console.error('[vtuber] VRM load failed', e);
      setStatus(`Avatar failed to load: ${e.message}. Try uploading your own .vrm.`);
    }
  }, []);

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) loadVRM(URL.createObjectURL(file));
  };

  // ── Face tracking ──
  const startTracking = useCallback(async () => {
    try {
      setStatus('Requesting camera…');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, frameRate: 24 }, audio: false });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const faceMesh = new FaceMesh({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      faceMesh.onResults(onFaceResults);
      faceMeshRef.current = faceMesh;

      const pump = async () => {
        if (!faceMeshRef.current) return;
        // throttle to ~every 2nd frame
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
    // FPS (detection rate)
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
    const blinkOf = (a, b) => {
      const d = Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y) / faceH;
      return THREE.MathUtils.clamp(1 - d * 30, 0, 1);
    };
    const blink = Math.max(blinkOf(159, 145), blinkOf(386, 374));

    // Write TARGETS — the render loop smoothly interpolates toward these.
    targetRef.current = {
      pitch: THREE.MathUtils.clamp(pitch, -0.6, 0.6),
      yaw: THREE.MathUtils.clamp(-yaw, -0.8, 0.8),
      roll: THREE.MathUtils.clamp(-roll, -0.6, 0.6),
      mouth: mouthOpen,
      blink,
    };
  }, []);

  const stopTracking = () => {
    faceMeshRef.current = null;
    const s = videoRef.current?.srcObject;
    s?.getTracks?.().forEach(t => t.stop());
    setTracking(false);
    setStatus('Tracking stopped.');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0c0c14', color: '#e8dcc8', padding: 16, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>VTuber Test (Isolated)</h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 12 }}>
        Standalone harness — nothing here touches the live app. Test whether webcam face-tracking drives a VRM avatar.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {!tracking ? (
          <button onClick={startTracking} style={btn('#f5a623', '#000')}>▶ Start Face Tracking</button>
        ) : (
          <button onClick={stopTracking} style={btn('#c42a2a', '#fff')}>■ Stop</button>
        )}
        <button onClick={() => loadVRM('/avatars/luxe.vrm')} style={btn('#a855f7', '#fff')}>✦ Load Luxe</button>
        <label style={{ ...btn('rgba(255,255,255,0.08)', '#e8dcc8'), cursor: 'pointer' }}>
          Upload .vrm
          <input type="file" accept=".vrm,.glb" onChange={onUpload} style={{ display: 'none' }} />
        </label>
        <span style={{ fontSize: 12, opacity: 0.5, alignSelf: 'center' }}>{fps} detections/s (motion is smoothed to render rate)</span>
      </div>

      <div style={{ fontSize: 13, marginBottom: 10, minHeight: 18, color: '#f5c86a' }}>{status}</div>

      <div ref={mountRef} style={{ width: '100%', height: '60vh', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(245,166,35,0.3)' }} />

      {/* Hidden webcam feed used only as the tracking source */}
      <video ref={videoRef} playsInline muted style={{ position: 'absolute', width: 160, height: 120, bottom: 16, right: 16, borderRadius: 8, opacity: tracking ? 0.85 : 0, transform: 'scaleX(-1)', border: '1px solid rgba(255,255,255,0.2)' }} />

      <div style={{ fontSize: 12, opacity: 0.55, marginTop: 12, lineHeight: 1.5 }}>
        <strong>What to check:</strong> avatar loads → turn your head (avatar head follows) → open your mouth (avatar mouth opens) →
        blink (avatar blinks). If those work, the core VTuber pipeline is sound and can be wired into Go Live.
        If the default avatar doesn't load, upload any VRM 0.x/1.0 file.
      </div>
    </div>
  );
}

function btn(bg, color) {
  return { background: bg, color, border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 600, fontSize: 14 };
}
