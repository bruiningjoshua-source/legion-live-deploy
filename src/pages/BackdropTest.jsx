import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { createSplatBackdrop, getBackdropPresets } from '@/components/mocap/LegionSplatBackdrop';

/**
 * BackdropTest — ISOLATED test of the environment/backdrop system.
 *
 * HONEST SCOPE: LegionSplatBackdrop provides pre-made themed environments
 * (Studio, Neon City, Nature, etc.) rendered as an animated backdrop — it is
 * NOT live room-scanning / real Gaussian splatting (no such capture exists in
 * the codebase). This page lets you see the real themed backdrops, plus a
 * photo-upload option (use your own image as the environment) which is the
 * achievable version of "overlay an environment".
 */
export default function BackdropTest() {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const backdropRef = useRef(null);
  const rafRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const [presets, setPresets] = useState([]);
  const [active, setActive] = useState('studio');
  const [status, setStatus] = useState('Loading…');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0.4, 4);
    camera.lookAt(0, 0.4, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // A simple stand-in "avatar" (capsule) so you can see the backdrop behind a subject.
    const subject = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.7, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.5 })
    );
    subject.position.set(0, 0.35, 0.5);
    subject.name = 'subject';
    scene.add(subject);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const dt = clockRef.current.getDelta();
      if (backdropRef.current?.update) backdropRef.current.update(dt);
      renderer.render(scene, camera);
    };
    animate();

    setPresets(getBackdropPresets());
    loadBackdrop('studio');

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBackdrop = useCallback(async (id) => {
    setStatus(`Loading "${id}"…`);
    try {
      if (backdropRef.current?.group) {
        sceneRef.current.remove(backdropRef.current.group);
        backdropRef.current.dispose?.();
      }
      const bd = await createSplatBackdrop(id, THREE);
      sceneRef.current.add(bd.group);
      backdropRef.current = bd;
      setActive(id);
      setStatus(`Environment: ${id}`);
    } catch (e) {
      setStatus(`Failed: ${e.message}`);
    }
  }, []);

  // Photo-as-environment: use an uploaded image as a backdrop plane.
  const onUploadPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    new THREE.TextureLoader().load(url, (tex) => {
      if (backdropRef.current?.group) { sceneRef.current.remove(backdropRef.current.group); backdropRef.current.dispose?.(); }
      const group = new THREE.Group();
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 6),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      plane.position.set(0, 0.5, -2);
      group.add(plane);
      sceneRef.current.add(group);
      backdropRef.current = { group, update: () => {}, dispose: () => tex.dispose() };
      setActive('photo');
      setStatus('Environment: your photo');
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8dcc8', padding: 16, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Environment / Backdrop Test — Isolated</h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 6 }}>
        Themed environments rendered behind a stand-in subject (the gold capsule). Switch presets or upload a photo backdrop.
      </p>
      <p style={{ fontSize: 12, color: '#f5c86a', opacity: 0.9, marginBottom: 12 }}>
        Note: these are pre-made themed backdrops, not live room-scanning. Real 3D room capture isn't in the app (see chat).
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {presets.map(p => (
          <button key={p.id} onClick={() => loadBackdrop(p.id)}
            style={{ background: active === p.id ? '#f5a623' : 'rgba(255,255,255,0.08)', color: active === p.id ? '#000' : '#e8dcc8', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: 12 }}>
            {p.name}
          </button>
        ))}
        <label style={{ background: 'rgba(255,255,255,0.08)', color: '#e8dcc8', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
          Upload photo
          <input type="file" accept="image/*" onChange={onUploadPhoto} style={{ display: 'none' }} />
        </label>
      </div>

      <div style={{ fontSize: 13, marginBottom: 10, color: '#f5c86a' }}>{status}</div>
      <div ref={mountRef} style={{ width: '100%', height: '62vh', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(245,166,35,0.3)' }} />

      <div style={{ fontSize: 12, opacity: 0.55, marginTop: 12, lineHeight: 1.5 }}>
        <strong>What to check:</strong> each preset renders a distinct environment behind the subject and animates (drift/particles).
        The photo upload puts your own image behind the subject. If these render cleanly, the backdrop system works — it's the
        practical "environment overlay" you can ship. True room-scanning would need an external capture service (e.g. Luma AI).
      </div>
    </div>
  );
}
