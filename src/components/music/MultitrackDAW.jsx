import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  initMultitrack, createTrack, setTrackVolume, setTrackPan, setTrackMuted,
  applySolo, startTrackRecording, stopTrackRecording, playTracks, sessionDuration,
  exportTrackStem, connectSourceToTrack,
} from '@/lib/multitrackEngine';

/**
 * MultitrackDAW — the Tracks tab. Record layered takes onto separate tracks,
 * control each track (volume/pan/mute/solo), play them in sync, and export
 * individual stems as WAV. `getInstrumentOutput` lets a track capture what the
 * keyboard/pads are producing.
 */
export default function MultitrackDAW({ audioContext, masterNode, instrumentOutput }) {
  const [tracks, setTracks] = useState([]);
  const [armedId, setArmedId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const stopRef = useRef(null);
  const initedRef = useRef(false);

  useEffect(() => {
    if (audioContext && masterNode && !initedRef.current) {
      initMultitrack(audioContext, masterNode);
      initedRef.current = true;
    }
  }, [audioContext, masterNode]);

  const addTrack = useCallback(() => {
    if (!initedRef.current) { toast.error('Play a note first to start the audio engine'); return; }
    const t = createTrack(`Track ${tracks.length + 1}`);
    // Route the live instrument output into this track so it can be recorded
    if (instrumentOutput) connectSourceToTrack(t, instrumentOutput);
    setTracks(prev => [...prev, t]);
    setArmedId(t.id);
  }, [tracks.length, instrumentOutput]);

  const armTrack = (id) => setArmedId(id);

  const toggleRecord = useCallback(async () => {
    const track = tracks.find(t => t.id === armedId);
    if (!track) { toast.error('Add and arm a track first'); return; }
    if (!isRecording) {
      const pos = 0; // record from start; timeline positioning is the next pass
      startTrackRecording(track, pos);
      setIsRecording(true);
      toast('Recording — play the keyboard/pads', { icon: '🔴' });
    } else {
      const clip = await stopTrackRecording(track);
      setIsRecording(false);
      setTracks(prev => [...prev]); // refresh clip list
      toast.success(clip ? `Take recorded (${clip.duration.toFixed(1)}s)` : 'Nothing captured');
    }
  }, [tracks, armedId, isRecording]);

  const togglePlay = useCallback(() => {
    if (isPlaying) { stopRef.current?.(); setIsPlaying(false); return; }
    if (!tracks.some(t => t.clips.length)) { toast.error('Record something first'); return; }
    stopRef.current = playTracks(tracks, 0);
    setIsPlaying(true);
    const dur = sessionDuration(tracks);
    setTimeout(() => setIsPlaying(false), (dur + 0.2) * 1000);
  }, [isPlaying, tracks]);

  const updateVol = (track, v) => { setTrackVolume(track, v); setTracks(prev => [...prev]); };
  const updatePan = (track, p) => { setTrackPan(track, p); setTracks(prev => [...prev]); };
  const toggleMute = (track) => { setTrackMuted(track, !track.muted); setTracks(prev => [...prev]); };
  const toggleSolo = (track) => { track.solo = !track.solo; applySolo(tracks); setTracks(prev => [...prev]); };

  const exportStem = async (track) => {
    if (!track.clips.length) { toast.error('Track is empty'); return; }
    toast('Rendering stem…');
    try {
      const wav = await exportTrackStem(track, sessionDuration(tracks));
      const url = URL.createObjectURL(wav);
      const a = document.createElement('a');
      a.href = url; a.download = `${track.name.replace(/\s+/g, '_')}.wav`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${track.name}.wav`);
    } catch (e) { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-3">
      {/* Transport */}
      <div className="flex items-center gap-2">
        <button onClick={addTrack}
          className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(245,166,35,0.15)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.4)' }}>
          ＋ Add Track
        </button>
        <button onClick={toggleRecord}
          className="px-3 py-2 rounded-lg text-sm font-semibold"
          style={{ background: isRecording ? '#c42a2a' : 'rgba(255,255,255,0.06)', color: isRecording ? '#fff' : 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {isRecording ? '■ Stop' : '● Record'}
        </button>
        <button onClick={togglePlay}
          className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      {tracks.length === 0 && (
        <div className="text-center py-10 text-white/40 text-sm">
          <p className="mb-1">No tracks yet.</p>
          <p className="text-xs">Add a track, arm it, hit Record, and play the keyboard or pads to lay down a take. Layer more tracks on top.</p>
        </div>
      )}

      {/* Track channel strips */}
      <div className="space-y-2">
        {tracks.map((track, i) => (
          <div key={track.id}
            onClick={() => armTrack(track.id)}
            className="rounded-xl p-3 cursor-pointer transition-all"
            style={{ background: armedId === track.id ? 'rgba(245,166,35,0.10)' : 'rgba(255,255,255,0.04)', border: `1px solid ${armedId === track.id ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {armedId === track.id && <span className="w-2 h-2 rounded-full bg-red-500" />}
                <span className="text-white text-sm font-semibold">{track.name}</span>
                <span className="text-white/30 text-xs">{track.clips.length} clip{track.clips.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); toggleMute(track); }}
                  className="w-7 h-7 rounded text-xs font-bold" style={{ background: track.muted ? '#c42a2a' : 'rgba(255,255,255,0.08)', color: track.muted ? '#fff' : 'rgba(255,255,255,0.5)' }}>M</button>
                <button onClick={(e) => { e.stopPropagation(); toggleSolo(track); }}
                  className="w-7 h-7 rounded text-xs font-bold" style={{ background: track.solo ? '#f5a623' : 'rgba(255,255,255,0.08)', color: track.solo ? '#000' : 'rgba(255,255,255,0.5)' }}>S</button>
                <button onClick={(e) => { e.stopPropagation(); exportStem(track); }}
                  className="px-2 h-7 rounded text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>Stem</button>
              </div>
            </div>
            {/* Volume + pan */}
            <div className="flex items-center gap-3">
              <span className="text-white/40 text-[10px] w-8">VOL</span>
              <input type="range" min="0" max="1" step="0.01" value={track.volume}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateVol(track, parseFloat(e.target.value))}
                className="flex-1 accent-amber-500" />
              <span className="text-white/40 text-[10px] w-8">PAN</span>
              <input type="range" min="-1" max="1" step="0.01" value={track.pan}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updatePan(track, parseFloat(e.target.value))}
                className="w-16 accent-amber-500" />
            </div>
          </div>
        ))}
      </div>

      {tracks.length > 0 && (
        <p className="text-white/30 text-[11px] text-center pt-1">
          Arm a track (tap it) → Record → play the keyboard/pads. Export stems to finish in your DAW.
        </p>
      )}
    </div>
  );
}
