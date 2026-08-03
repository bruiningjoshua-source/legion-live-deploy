import React, { useState } from 'react';

/**
 * SplatTest — ISOLATED test of REAL Gaussian-splat rendering via the official
 * @playcanvas/supersplat-viewer (served as a static page in public/splat/ and
 * embedded in an iframe so its heavy WebGPU rendering is isolated from React).
 *
 * This tests whether a genuine Gaussian splat renders acceptably on your device
 * — the real question before committing to "upload your scanned environment".
 * Capture still happens externally (Luma AI / Polycam); this is the DISPLAY side.
 */

// A few public sample splats to test rendering + performance.
const SAMPLES = [
  { name: 'PlayCanvas Sample', url: 'https://raw.githubusercontent.com/playcanvas/supersplat-viewer/main/test/assets/scene.compressed.ply' },
];

export default function SplatTest() {
  const [content, setContent] = useState(SAMPLES[0].url);
  const [webgl, setWebgl] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState(null);

  const activeUrl = uploadedUrl || content;
  const viewerSrc = `/splat/index.html?content=${encodeURIComponent(activeUrl)}${webgl ? '&webgl' : ''}`;

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setUploadedUrl(URL.createObjectURL(file));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8dcc8', padding: 16, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Gaussian Splat Test — Isolated</h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 6 }}>
        REAL Gaussian-splat rendering via the official PlayCanvas SuperSplat viewer. Tests whether photorealistic 3D
        environments render acceptably on your device. Drag to orbit the scene.
      </p>
      <p style={{ fontSize: 12, color: '#f5c86a', marginBottom: 12 }}>
        Note: this is the DISPLAY side. Room capture happens in an external app (Luma AI / Polycam) that produces a .ply/splat
        file — then it loads here. Try WebGPU first; if it's black or broken, toggle WebGL fallback.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <button onClick={() => setWebgl(v => !v)}
          style={{ background: webgl ? '#f5a623' : 'rgba(255,255,255,0.08)', color: webgl ? '#000' : '#e8dcc8', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13 }}>
          Renderer: {webgl ? 'WebGL (fallback)' : 'WebGPU (default)'}
        </button>
        <label style={{ background: 'rgba(255,255,255,0.08)', color: '#e8dcc8', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Upload .ply / splat
          <input type="file" accept=".ply,.splat,.sog" onChange={onUpload} style={{ display: 'none' }} />
        </label>
        {uploadedUrl && (
          <button onClick={() => setUploadedUrl(null)} style={{ background: 'rgba(255,255,255,0.08)', color: '#e8dcc8', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
            Use sample instead
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="…or paste a splat file URL"
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13 }} />
        <button onClick={() => { if (customUrl) { setUploadedUrl(null); setContent(customUrl); } }}
          style={{ background: '#f5a623', color: '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13 }}>Load</button>
      </div>

      <div style={{ width: '100%', height: '68vh', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(245,166,35,0.3)', background: '#000' }}>
        <iframe
          key={viewerSrc}
          title="splat-viewer"
          src={viewerSrc}
          allow="camera; xr-spatial-tracking; fullscreen"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>

      <div style={{ fontSize: 12, opacity: 0.55, marginTop: 12, lineHeight: 1.5 }}>
        <strong>What to check:</strong> does the splat scene load and render? Is it smooth to orbit, or choppy? WebGPU is
        fastest but only on recent phones — if you get a black screen, switch to WebGL. If a real splat renders smoothly
        here, "upload your scanned environment" is viable to ship. If it chugs, splats may be too heavy for your target devices.
      </div>
    </div>
  );
}
