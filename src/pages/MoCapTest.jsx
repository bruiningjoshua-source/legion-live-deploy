import React, { useRef, useState, useEffect, useCallback } from 'react';
import LegionMoCap from '@/components/mocap/LegionMoCap';

/**
 * MoCapTest — ISOLATED test of the FULL LegionMoCap system (MediaPipe Holistic:
 * face + body + hands driving a VRM/LAF avatar). Starts a camera, hands the
 * video to LegionMoCap, and shows the processed avatar output.
 *
 * This tests the REAL mocap pipeline (not the stripped face-only demo).
 */
export default function MoCapTest() {
  const videoRef = useRef(null);
  const [camReady, setCamReady] = useState(false);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true, // mocap uses audio for mic lip-sync
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamReady(true);
      setStarted(true);
    } catch (e) {
      setError(`Camera failed: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    return () => {
      const s = videoRef.current?.srcObject;
      s?.getTracks?.().forEach(t => t.stop());
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8dcc8', padding: 16, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Full MoCap Test — Isolated</h1>
      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 12 }}>
        Tests the real LegionMoCap system: MediaPipe Holistic (face + body + hands) driving your avatar. Move your whole
        upper body, wave your hands, turn your head — the avatar should follow all of it.
      </p>

      {!started && (
        <button onClick={startCamera} style={{ background: '#f5a623', color: '#000', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 700, fontSize: 15 }}>
          ▶ Start Camera + MoCap
        </button>
      )}

      {error && <div style={{ color: '#ff9a9a', fontSize: 13, marginTop: 10 }}>{error}</div>}

      {/* Hidden source video the camera feeds; LegionMoCap reads from this ref */}
      <video ref={videoRef} playsInline muted
        style={{ position: 'absolute', width: 160, height: 120, bottom: 16, right: 16, borderRadius: 8, opacity: camReady ? 0.8 : 0, transform: 'scaleX(-1)', border: '1px solid rgba(255,255,255,0.2)', zIndex: 60 }} />

      {/* Mount the real mocap system once the camera is live. LegionMoCap renders
          as `absolute inset-0` inside its parent, so the parent MUST be
          position:relative with an explicit size or the canvas collapses. */}
      {started && camReady && (
        <div style={{ marginTop: 12, position: 'relative', width: '100%', height: '75vh', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
          <LegionMoCap
            videoRef={videoRef}
            initialVrmUrl="/avatars/luxe.vrm"
            hideControls
            onProcessedStream={() => { /* isolated test — no streaming */ }}
            onClose={() => {
              const s = videoRef.current?.srcObject;
              s?.getTracks?.().forEach(t => t.stop());
              setStarted(false); setCamReady(false);
            }}
          />
        </div>
      )}

      <div style={{ fontSize: 12, opacity: 0.55, marginTop: 12, lineHeight: 1.5 }}>
        <strong>What to check:</strong> avatar loads → turn head (follows) → open mouth / talk (mouth moves) →
        move shoulders/lean (body follows) → raise & wave hands (arms/hands follow). Watch the FPS the mocap panel reports.
        If body + hands track, you have full upper-body VTubing. Legs aren't trackable from a front phone cam (expected).
      </div>
    </div>
  );
}
