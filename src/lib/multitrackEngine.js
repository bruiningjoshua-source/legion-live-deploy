/**
 * multitrackEngine — a lightweight multitrack recorder/player built on the
 * Web Audio graph the studio already uses (Tone.js context + master bus).
 *
 * Model:
 *  - Each Track has its own GainNode ("channel strip": volume + mute/solo) that
 *    feeds the master bus, plus a per-track MediaRecorder tap so a performance
 *    can be captured to that track without capturing the whole mix.
 *  - A track holds recorded audio clips (decoded AudioBuffers) with a start time
 *    on the shared timeline.
 *  - Transport plays all non-muted tracks in sync from a playhead position.
 *
 * This does NOT try to be Ableton — it's a real, working browser multitrack:
 * record layered takes, control each track, arrange clips, and export stems.
 */

let ctx = null;             // shared AudioContext (from Tone)
let masterInput = null;     // node to connect track outputs into (master bus)

export function initMultitrack(audioContext, masterNode) {
  ctx = audioContext;
  masterInput = masterNode || audioContext.destination;
  // A monitor tap on the master so tracks can record what's currently played
  // (instruments play to the master bus). This gives working layered recording.
  try {
    monitorTap = ctx.createMediaStreamDestination();
    if (masterNode && masterNode.connect) masterNode.connect(monitorTap);
  } catch (_) { monitorTap = null; }
}

let monitorTap = null;
export function getMonitorTap() { return monitorTap; }

export function getContext() { return ctx; }

let trackSeq = 1;

export function createTrack(name) {
  if (!ctx) throw new Error('Multitrack not initialized');
  const gain = ctx.createGain();
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) { gain.connect(pan); pan.connect(masterInput); }
  else { gain.connect(masterInput); }

  // Per-track recording tap
  const tap = ctx.createMediaStreamDestination();
  gain.connect(tap);

  return {
    id: `track_${trackSeq++}`,
    name: name || `Track ${trackSeq - 1}`,
    gainNode: gain,
    panNode: pan,
    tap,
    volume: 1,
    pan: 0,
    muted: false,
    solo: false,
    armed: false,
    clips: [],           // { id, buffer, startTime, duration }
    _recorder: null,
    _recChunks: [],
  };
}

/** Route a source node (e.g. an instrument output) into a track's input. */
export function connectSourceToTrack(track, sourceNode) {
  try { sourceNode.connect(track.gainNode); } catch (_) {}
}

export function setTrackVolume(track, v) {
  track.volume = v;
  const effective = track.muted ? 0 : v;
  track.gainNode.gain.setTargetAtTime(effective, ctx.currentTime, 0.01);
}

export function setTrackPan(track, p) {
  track.pan = p;
  if (track.panNode) track.panNode.pan.setTargetAtTime(p, ctx.currentTime, 0.01);
}

export function setTrackMuted(track, muted) {
  track.muted = muted;
  track.gainNode.gain.setTargetAtTime(muted ? 0 : track.volume, ctx.currentTime, 0.01);
}

/** Apply solo logic across all tracks: if any are soloed, only those are heard. */
export function applySolo(tracks) {
  const anySolo = tracks.some(t => t.solo);
  tracks.forEach(t => {
    const shouldHear = anySolo ? t.solo : !t.muted;
    t.gainNode.gain.setTargetAtTime(shouldHear && !t.muted ? t.volume : 0, ctx.currentTime, 0.01);
  });
}

/** Start recording whatever is routed into this track, at timeline position. */
export function startTrackRecording(track, timelinePos = 0) {
  const src = monitorTap || track.tap;
  if (!src) return false;
  track._recChunks = [];
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
             : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
  track._recorder = new MediaRecorder(src.stream, mime ? { mimeType: mime } : undefined);
  track._recStart = timelinePos;
  track._recorder.ondataavailable = (e) => { if (e.data.size > 0) track._recChunks.push(e.data); };
  track._recorder.start();
  track._recT0 = ctx.currentTime;
  return true;
}

/** Stop recording and decode the take into a clip on the track. */
export async function stopTrackRecording(track) {
  return new Promise((resolve) => {
    if (!track._recorder || track._recorder.state === 'inactive') { resolve(null); return; }
    track._recorder.onstop = async () => {
      const blob = new Blob(track._recChunks, { type: track._recorder.mimeType || 'audio/webm' });
      const arrayBuf = await blob.arrayBuffer();
      let buffer = null;
      try { buffer = await ctx.decodeAudioData(arrayBuf); } catch (e) { console.warn('[multitrack] decode failed', e?.message); }
      if (buffer) {
        const clip = { id: `clip_${Date.now()}`, buffer, startTime: track._recStart || 0, duration: buffer.duration };
        track.clips.push(clip);
        resolve(clip);
      } else resolve(null);
    };
    track._recorder.stop();
  });
}

/** Play all tracks in sync from a playhead position. Returns a stop function. */
export function playTracks(tracks, fromTime = 0) {
  const startAt = ctx.currentTime + 0.1;
  const sources = [];
  const anySolo = tracks.some(t => t.solo);
  tracks.forEach(track => {
    const audible = anySolo ? track.solo : !track.muted;
    if (!audible) return;
    track.clips.forEach(clip => {
      const clipEnd = clip.startTime + clip.duration;
      if (clipEnd <= fromTime) return; // already passed
      const src = ctx.createBufferSource();
      src.buffer = clip.buffer;
      src.connect(track.gainNode);
      const offset = Math.max(0, fromTime - clip.startTime);
      const when = startAt + Math.max(0, clip.startTime - fromTime);
      src.start(when, offset);
      sources.push(src);
    });
  });
  return () => sources.forEach(s => { try { s.stop(); } catch (_) {} });
}

/** Compute the total length of the session (seconds). */
export function sessionDuration(tracks) {
  let max = 0;
  tracks.forEach(t => t.clips.forEach(c => { max = Math.max(max, c.startTime + c.duration); }));
  return max;
}

/** Render a single track's clips to a WAV Blob (stem export). */
export async function exportTrackStem(track, totalDuration) {
  const dur = totalDuration || sessionDuration([track]) || 1;
  const offline = new OfflineAudioContext(2, Math.ceil(dur * 44100), 44100);
  const gain = offline.createGain();
  gain.gain.value = track.muted ? 0 : track.volume;
  gain.connect(offline.destination);
  track.clips.forEach(clip => {
    const src = offline.createBufferSource();
    // Re-decode into the offline context is unnecessary; buffers are compatible.
    src.buffer = clip.buffer;
    src.connect(gain);
    src.start(clip.startTime);
  });
  const rendered = await offline.startRendering();
  return audioBufferToWav(rendered);
}

/** Minimal WAV encoder (16-bit PCM) for stem export. */
export function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); writeStr(36, 'data'); view.setUint32(40, dataSize, true);
  let offset = 44;
  const channels = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}
