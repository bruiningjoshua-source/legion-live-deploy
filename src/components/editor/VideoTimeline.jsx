import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';

const TRACK_H = 48;
const RULER_H = 28;

function formatTime(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

const TRACK_COLORS = {
  video: { bar: '#3b82f6', bg: '#1e3a5f' },
  audio: { bar: '#10b981', bg: '#064e3b' },
  text: { bar: '#f59e0b', bg: '#451a03' },
  effect: { bar: '#8b5cf6', bg: '#2e1065' },
  transition: { bar: '#ec4899', bg: '#500724' },
  music: { bar: '#06b6d4', bg: '#083344' },
};

export default function VideoTimeline({ tracks, duration, currentTime, onSeek, onTracksChange, zoom = 1 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [selectedClip, setSelectedClip] = useState(null);
  const [scrollX, setScrollX] = useState(0);

  const pxPerSec = 60 * zoom;

  const timeToX = useCallback((t) => t * pxPerSec - scrollX + 120, [pxPerSec, scrollX]);
  const xToTime = useCallback((x) => (x - 120 + scrollX) / pxPerSec, [pxPerSec, scrollX]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, W, H);

    // Track lanes backgrounds
    tracks.forEach((track, ti) => {
      const y = RULER_H + ti * TRACK_H;
      ctx.fillStyle = ti % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.2)';
      ctx.fillRect(120, y, W - 120, TRACK_H);
    });

    // Ruler
    ctx.fillStyle = '#111120';
    ctx.fillRect(0, 0, W, RULER_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120, 0); ctx.lineTo(120, H); ctx.stroke();

    // Time markers
    const step = zoom < 0.5 ? 10 : zoom < 1 ? 5 : zoom < 2 ? 2 : 1;
    for (let t = 0; t <= duration + step; t += step) {
      const x = timeToX(t);
      if (x < 120 || x > W) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.moveTo(x, RULER_H); ctx.lineTo(x, H); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x, RULER_H); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px monospace';
      ctx.fillText(formatTime(t), x + 2, 14);
    }

    // Clips
    tracks.forEach((track, ti) => {
      const y = RULER_H + ti * TRACK_H;
      const colors = TRACK_COLORS[track.type] || TRACK_COLORS.video;

      track.clips.forEach((clip, ci) => {
        const x = timeToX(clip.start);
        const w = clip.duration * pxPerSec;
        if (x + w < 120 || x > W) return;

        const isSelected = selectedClip?.trackId === track.id && selectedClip?.clipId === clip.id;

        // Clip body
        ctx.fillStyle = colors.bg;
        ctx.strokeStyle = isSelected ? '#fbbf24' : colors.bar;
        ctx.lineWidth = isSelected ? 2 : 1;
        const rx = Math.max(x, 120), rw = Math.min(x + w, W) - rx;

        ctx.beginPath();
        ctx.roundRect(rx + 1, y + 3, rw - 2, TRACK_H - 6, 4);
        ctx.fill();
        ctx.stroke();

        // Top bar
        ctx.fillStyle = colors.bar;
        ctx.fillRect(rx + 1, y + 3, rw - 2, 4);

        // Clip label
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '10px sans-serif';
        ctx.save();
        ctx.rect(rx + 1, y + 3, rw - 2, TRACK_H - 6);
        ctx.clip();
        ctx.fillText(clip.label || track.name, rx + 6, y + 22);
        ctx.restore();

        // Waveform for audio/music tracks
        if ((track.type === 'audio' || track.type === 'music') && clip.waveform) {
          ctx.strokeStyle = colors.bar + '88';
          ctx.lineWidth = 1;
          const ww = rw - 4;
          ctx.beginPath();
          clip.waveform.forEach((v, wi) => {
            const wx = rx + 2 + (wi / clip.waveform.length) * ww;
            const wh = v * (TRACK_H - 18);
            if (wi === 0) ctx.moveTo(wx, y + TRACK_H / 2 + wh / 2);
            else ctx.lineTo(wx, y + TRACK_H / 2 + wh / 2);
          });
          ctx.stroke();
        }
      });
    });

    // Playhead
    const px = timeToX(currentTime);
    if (px >= 120 && px <= W) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(px - 7, 0); ctx.lineTo(px + 7, 0); ctx.lineTo(px + 7, 14); ctx.lineTo(px, 22); ctx.lineTo(px - 7, 14); ctx.closePath();
      ctx.fill();
    }
  }, [tracks, duration, currentTime, timeToX, selectedClip, pxPerSec, scrollX]);

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    if (y < RULER_H) { onSeek?.(Math.max(0, xToTime(x))); return; }
    const trackIdx = Math.floor((y - RULER_H) / TRACK_H);
    const track = tracks[trackIdx];
    if (!track) return;
    const t = xToTime(x);
    const clip = track.clips.find(c => t >= c.start && t <= c.start + c.duration);
    if (clip) setSelectedClip({ trackId: track.id, clipId: clip.id });
    else { setSelectedClip(null); onSeek?.(Math.max(0, t)); }
  };

  const handleScroll = (e) => setScrollX(s => Math.max(0, s + e.deltaY * 0.5));

  const totalW = Math.max(800, duration * pxPerSec + 200);

  return (
    <div className="flex flex-col" style={{ height: RULER_H + tracks.length * TRACK_H + 2 }}>
      {/* Track headers */}
      <div className="flex" style={{ height: RULER_H + tracks.length * TRACK_H }}>
        <div className="w-30 shrink-0 bg-[#0d0d18] border-r border-white/[0.06]" style={{ width: 120 }}>
          <div style={{ height: RULER_H }} className="border-b border-white/[0.06]" />
          {tracks.map((track, i) => {
            const colors = TRACK_COLORS[track.type] || TRACK_COLORS.video;
            return (
              <div
                key={track.id}
                style={{ height: TRACK_H }}
                className="flex items-center px-2 gap-1.5 border-b border-white/[0.04] group"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors.bar }} />
                <span className="text-white/50 text-[10px] flex-1 truncate group-hover:text-white/70 transition-colors">{track.name}</span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onTracksChange?.(tracks.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t))}
                    className={`w-4 h-4 flex items-center justify-center rounded transition-colors ${track.muted ? 'text-red-400' : 'text-white/30 hover:text-white/60'}`}
                  >
                    {track.muted ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
                  </button>
                  <button
                    onClick={() => onTracksChange?.(tracks.map(t => t.id === track.id ? { ...t, hidden: !t.hidden } : t))}
                    className={`w-4 h-4 flex items-center justify-center rounded transition-colors ${track.hidden ? 'text-white/20' : 'text-white/30 hover:text-white/60'}`}
                  >
                    {track.hidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-hidden" ref={containerRef} onWheel={handleScroll}>
          <canvas
            ref={canvasRef}
            width={900}
            height={RULER_H + tracks.length * TRACK_H}
            className="block w-full"
            style={{ height: RULER_H + tracks.length * TRACK_H, cursor: 'crosshair' }}
            onClick={handleCanvasClick}
          />
        </div>
      </div>
    </div>
  );
}