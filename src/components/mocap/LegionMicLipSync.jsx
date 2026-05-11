/**
 * LegionMicLipSync — Lightweight WebAudio mic analyser for livestream lip sync.
 * Feeds normalized volume (0–1) into LegionAvatarRenderer.setMicVolume().
 * CPU-light: single AnalyserNode, no FFT processing beyond getByteFrequencyData.
 */

import { setMicVolume } from './LegionAvatarRenderer';

let _audioCtx = null;
let _analyser = null;
let _source = null;
let _dataArray = null;
let _rafId = null;
let _active = false;

// Smoothed volume state
let _smoothVol = 0;

/**
 * Start mic lip-sync from an existing MediaStream (the camera stream).
 * Extracts audio tracks; if none exist, does nothing gracefully.
 */
export function startMicLipSync(mediaStream) {
  if (_active) return;
  if (!mediaStream) return;

  const audioTracks = mediaStream.getAudioTracks();
  if (!audioTracks.length) {
    console.warn('[MicLipSync] No audio tracks in stream');
    return;
  }

  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _analyser = _audioCtx.createAnalyser();
    _analyser.fftSize = 256;
    _analyser.smoothingTimeConstant = 0.6;

    _source = _audioCtx.createMediaStreamSource(mediaStream);
    _source.connect(_analyser);
    // Do NOT connect analyser to destination — we don't want echo

    _dataArray = new Uint8Array(_analyser.frequencyBinCount);
    _active = true;

    tick();
    console.log('[MicLipSync] Started');
  } catch (e) {
    console.warn('[MicLipSync] Init failed:', e.message);
    cleanup();
  }
}

function tick() {
  if (!_active) return;
  _rafId = requestAnimationFrame(tick);

  _analyser.getByteFrequencyData(_dataArray);

  // Average volume across speech frequencies (bins ~4–40 ≈ 120Hz–5kHz at 256 FFT / 48kHz)
  let sum = 0;
  const lo = 4, hi = Math.min(40, _dataArray.length);
  for (let i = lo; i < hi; i++) sum += _dataArray[i];
  const raw = sum / ((hi - lo) * 255); // 0–1

  // Smooth with asymmetric attack/release for natural feel
  const attack = 0.25;
  const release = 0.08;
  const t = raw > _smoothVol ? attack : release;
  _smoothVol += (raw - _smoothVol) * t;

  // Normalize: speech volume is usually 0.05–0.4 raw; map to 0–1
  const normalized = Math.min(1, Math.max(0, (_smoothVol - 0.02) * 3.5));

  setMicVolume(normalized);
}

/** Stop mic lip-sync and release resources. */
export function stopMicLipSync() {
  _active = false;
  if (_rafId) cancelAnimationFrame(_rafId);
  _rafId = null;
  cleanup();
  setMicVolume(0);
  _smoothVol = 0;
  console.log('[MicLipSync] Stopped');
}

function cleanup() {
  try { _source?.disconnect(); } catch (e) {}
  try {
    if (_audioCtx && _audioCtx.state !== 'closed') _audioCtx.close();
  } catch (e) {}
  _source = null;
  _analyser = null;
  _audioCtx = null;
  _dataArray = null;
}

export function isMicLipSyncActive() {
  return _active;
}