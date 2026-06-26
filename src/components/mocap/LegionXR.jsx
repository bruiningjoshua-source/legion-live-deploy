/**
 * LegionXR — WebXR VR/AR session manager for Legion Live.
 *
 * Enables VR headset viewing of the MoCap avatar scene.
 * Uses Three.js WebXRManager (built-in since r118).
 *
 * Supports: Quest 2/3, Quest Pro, Vision Pro (via WebXR API).
 * Falls back gracefully on non-XR browsers.
 *
 * Usage: pass the Three.js renderer + scene + camera.
 * The XR session replaces the rAF loop automatically.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function useWebXR() {
  const [xrSupported,  setXrSupported]  = useState(false);
  const [xrMode,       setXrMode]       = useState(null); // null | 'vr' | 'ar'
  const [xrSession,    setXrSession]    = useState(null);
  const [xrError,      setXrError]      = useState(null);

  useEffect(() => {
    if (navigator.xr) {
      Promise.all([
        navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
        navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
      ]).then(([vr, ar]) => {
        setXrSupported(vr || ar);
      });
    }
  }, []);

  const enterVR = useCallback(async (renderer, scene, camera) => {
    if (!renderer || !navigator.xr) return;
    setXrError(null);
    try {
      // Enable XR on the renderer
      renderer.xr.enabled = true;

      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });

      await renderer.xr.setSession(session);
      setXrSession(session);
      setXrMode('vr');

      // XR rAF loop — Three.js handles this internally via setAnimationLoop
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });

      session.addEventListener('end', () => {
        renderer.setAnimationLoop(null);
        renderer.xr.enabled = false;
        setXrSession(null);
        setXrMode(null);
      });
    } catch (e) {
      setXrError(e.message || 'VR session failed');
      console.error('[LegionXR] VR error:', e);
    }
  }, []);

  const enterAR = useCallback(async (renderer, scene, camera) => {
    if (!renderer || !navigator.xr) return;
    setXrError(null);
    try {
      renderer.xr.enabled = true;
      const session = await navigator.xr.requestSession('immersive-ar', {
        optionalFeatures: ['dom-overlay', 'hit-test'],
        domOverlay: { root: document.body },
      });
      await renderer.xr.setSession(session);
      setXrSession(session);
      setXrMode('ar');
      renderer.setAnimationLoop(() => renderer.render(scene, camera));
      session.addEventListener('end', () => {
        renderer.setAnimationLoop(null);
        renderer.xr.enabled = false;
        setXrSession(null);
        setXrMode(null);
      });
    } catch (e) {
      setXrError(e.message || 'AR session failed');
    }
  }, []);

  const exitXR = useCallback(async () => {
    if (xrSession) {
      try { await xrSession.end(); } catch (e) {}
    }
  }, [xrSession]);

  return { xrSupported, xrMode, xrError, enterVR, enterAR, exitXR };
}

/**
 * XRButton — renders VR/AR entry buttons.
 * Pass renderer/scene/camera refs from LegionMoCap.
 */
export function XRButton({ rendererRef, sceneRef, cameraRef, className = '' }) {
  const { xrSupported, xrMode, xrError, enterVR, enterAR, exitXR } = useWebXR();

  if (!xrSupported) return null;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {xrMode ? (
        <button onClick={exitXR}
          className="px-3 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.5)' }}>
          ✕ Exit {xrMode.toUpperCase()}
        </button>
      ) : (
        <>
          <button
            onClick={() => enterVR(rendererRef?.current, sceneRef?.current, cameraRef?.current)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'rgba(168,85,247,0.25)', border: '1px solid rgba(168,85,247,0.5)' }}>
            🥽 Enter VR
          </button>
          <button
            onClick={() => enterAR(rendererRef?.current, sceneRef?.current, cameraRef?.current)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)' }}>
            📱 Enter AR
          </button>
        </>
      )}
      {xrError && <p className="text-red-400 text-[10px] text-center">{xrError}</p>}
    </div>
  );
}

/**
 * XRHandVisualizer — renders tracked hand skeletons in VR.
 * Call update() each frame with XRFrame + referenceSpace.
 */
export function createXRHandVisualizer(THREE, scene) {
  const jointGeo   = new THREE.SphereGeometry(0.008, 6, 6);
  const jointMat   = new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.7 });
  const boneGeo    = new THREE.CylinderGeometry(0.004, 0.004, 1, 5);
  const boneMat    = new THREE.MeshBasicMaterial({ color: 0x4466cc, transparent: true, opacity: 0.5 });
  const joints     = { left: [], right: [] };
  const bones      = { left: [], right: [] };

  const JOINT_COUNT = 25;

  ['left', 'right'].forEach(hand => {
    for (let i = 0; i < JOINT_COUNT; i++) {
      const m = new THREE.Mesh(jointGeo, jointMat); m.visible = false; scene.add(m); joints[hand].push(m);
    }
    for (let i = 0; i < JOINT_COUNT - 1; i++) {
      const m = new THREE.Mesh(boneGeo, boneMat); m.visible = false; scene.add(m); bones[hand].push(m);
    }
  });

  function update(frame, refSpace, inputSources) {
    if (!frame || !refSpace) return;
    for (const source of (inputSources || [])) {
      if (!source.hand) continue;
      const hand = source.handedness === 'left' ? 'left' : 'right';
      let j = 0;
      for (const [jointName, joint] of source.hand.entries()) {
        const pose = frame.getJointPose(joint, refSpace);
        if (pose && j < JOINT_COUNT) {
          joints[hand][j].position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
          joints[hand][j].visible = true;
        } else if (j < JOINT_COUNT) {
          joints[hand][j].visible = false;
        }
        j++;
      }
    }
  }

  function dispose() {
    jointGeo.dispose(); jointMat.dispose(); boneGeo.dispose(); boneMat.dispose();
    [...joints.left, ...joints.right, ...bones.left, ...bones.right].forEach(m => scene.remove(m));
  }

  return { update, dispose };
}
