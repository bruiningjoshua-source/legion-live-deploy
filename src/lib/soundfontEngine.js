/**
 * soundfontEngine — real sampled instruments via smplr's Soundfont player.
 * Loads General MIDI instruments (128 melodic + drums) from a free,
 * commercial-use soundfont, sharing Tone.js's AudioContext so audio routes
 * through the studio's master bus/effects. Falls back gracefully if a sample
 * fails to load (the caller can still use the Tone.js synth voice).
 */
import { Soundfont } from 'smplr';

// Map the studio's instrument IDs to General MIDI instrument names that smplr /
// the soundfont expose. These are the standard GM names.
const GM_NAME = {
  acoustic_grand_piano: 'acoustic_grand_piano',
  electric_piano_1: 'electric_piano_1',
  harpsichord: 'harpsichord',
  vibraphone: 'vibraphone',
  marimba: 'marimba',
  church_organ: 'church_organ',
  rock_organ: 'rock_organ',
  acoustic_guitar_nylon: 'acoustic_guitar_nylon',
  acoustic_guitar_steel: 'acoustic_guitar_steel',
  electric_guitar_clean: 'electric_guitar_clean',
  electric_guitar_muted: 'electric_guitar_muted',
  distortion_guitar: 'distortion_guitar',
  acoustic_bass: 'acoustic_bass',
  electric_bass_finger: 'electric_bass_finger',
  slap_bass_1: 'slap_bass_1',
  synth_bass_1: 'synth_bass_1',
  lead_1_square: 'lead_1_square',
  lead_2_sawtooth: 'lead_2_sawtooth',
  pad_2_warm: 'pad_2_warm',
  trumpet: 'trumpet',
  trombone: 'trombone',
  tenor_sax: 'tenor_sax',
  flute: 'flute',
  violin: 'violin',
};

const loaded = new Map();      // instrumentId -> Soundfont instance
const loading = new Map();     // instrumentId -> Promise
let sharedContext = null;
let destinationNode = null;

/** Provide the Tone.js AudioContext + a destination node so soundfont audio
 *  routes through the studio's master bus. Call once at studio init. */
export function initSoundfontEngine(audioContext, destination) {
  sharedContext = audioContext;
  destinationNode = destination;
}

export function isSampledAvailable(instrumentId) {
  return !!GM_NAME[instrumentId];
}

/** Load (once) and return a sampled instrument. Returns null if unavailable. */
export async function getSampledInstrument(instrumentId) {
  const gmName = GM_NAME[instrumentId];
  if (!gmName || !sharedContext) return null;
  if (loaded.has(instrumentId)) return loaded.get(instrumentId);
  if (loading.has(instrumentId)) return loading.get(instrumentId);

  const p = (async () => {
    try {
      const inst = new Soundfont(sharedContext, {
        instrument: gmName,
        kit: 'FluidR3_GM',   // free, GM (128 instruments), commercial-use OK
        destination: destinationNode || sharedContext.destination,
      });
      await inst.ready;
      loaded.set(instrumentId, inst);
      return inst;
    } catch (e) {
      console.warn(`[soundfont] failed to load ${instrumentId}:`, e?.message);
      return null;
    } finally {
      loading.delete(instrumentId);
    }
  })();
  loading.set(instrumentId, p);
  return p;
}

/** Play a note on a sampled instrument. Returns true if it played, false if the
 *  sample wasn't available (so the caller can fall back to the synth voice). */
export async function playSampledNote(instrumentId, note, durationSec = 1.2, velocity = 100) {
  const inst = await getSampledInstrument(instrumentId);
  if (!inst) return false;
  try {
    inst.start({ note, duration: durationSec, velocity });
    return true;
  } catch (e) {
    console.warn('[soundfont] play error:', e?.message);
    return false;
  }
}

/** Preload a set of instruments (e.g. the current kit) in the background. */
export function preloadInstruments(ids = []) {
  ids.forEach(id => { if (GM_NAME[id]) getSampledInstrument(id).catch(() => {}); });
}
