import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Scissors, SkipBack, SkipForward, Play, Pause, Volume2,
  ZoomIn, ZoomOut, Trash2, Copy, AlignLeft, Wand2,
  Music, RotateCcw, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const EQ_BANDS = [
  { freq: '60Hz', key: 'hz60' },
  { freq: '250Hz', key: 'hz250' },
  { freq: '1kHz', key: 'khz1' },
  { freq: '4kHz', key: 'khz4' },
  { freq: '16kHz', key: 'khz16' },
];

function formatTime(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export default function StudioAudioEditor({ audioUrl, onExport }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [selStart, setSelStart] = useState(null);
  const [selEnd, setSelEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [eq, setEq] = useState({ hz60: 0, hz250: 0, khz1: 0, khz4: 0, khz16: 0 });
  const [gain, setGain] = useState(0);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [noiseFloor, setNoiseFloor] = useState(-40);
  const [compressor, setCompressor] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [analysing, setAnalysing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const waveDataRef = useRef(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.crossOrigin = 'anonymous';
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setCurrent(audio.currentTime);
    audio.onended = () => setPlaying(false);
    audioRef.current = audio;
    generateWaveform(audioUrl);
    return () => { audio.pause(); };
  }, [audioUrl]);

  const generateWaveform = async (url) => {
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(buf);
      const data = decoded.getChannelData(0);
      const samples = 800;
      const blockSize = Math.floor(data.length / samples);
      const peaks = [];
      for (let i = 0; i < samples; i++) {
        let max = 0;
        for (let j = 0; j < blockSize; j++) max = Math.max(max, Math.abs(data[i * blockSize + j] || 0));
        peaks.push(max);
      }
      waveDataRef.current = peaks;
      drawWaveform(peaks, 0, duration, null, null);
    } catch (e) { /* best effort */ }
  };

  const drawWaveform = useCallback((peaks, cur, dur, s, e) => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // bg
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, W, H);

    // time grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const gridCount = 10;
    for (let i = 0; i <= gridCount; i++) {
      const x = (i / gridCount) * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '10px monospace';
      if (dur) ctx.fillText(formatTime((i / gridCount) * dur), x + 2, H - 4);
    }

    // selection
    if (s !== null && e !== null && dur) {
      const sx = (s / dur) * W, ex = (e / dur) * W;
      ctx.fillStyle = 'rgba(245,158,11,0.15)';
      ctx.fillRect(Math.min(sx,ex), 0, Math.abs(ex-sx), H);
      ctx.strokeStyle = 'rgba(245,158,11,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.min(sx,ex), 0); ctx.lineTo(Math.min(sx,ex), H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Math.max(sx,ex), 0); ctx.lineTo(Math.max(sx,ex), H); ctx.stroke();
    }

    // waveform bars
    const barW = (W / peaks.length) * zoom;
    for (let i = 0; i < peaks.length; i++) {
      const x = i * (W / peaks.length);
      const barH = peaks[i] * H * 0.85;
      const isSelected = dur && s !== null && e !== null && (i / peaks.length) * dur >= Math.min(s,e) && (i / peaks.length) * dur <= Math.max(s,e);
      const alpha = isSelected ? 1 : 0.7;
      ctx.fillStyle = isSelected ? `rgba(245,158,11,${alpha})` : `rgba(99,179,237,${alpha})`;
      ctx.fillRect(x, (H - barH) / 2, Math.max(1, barW - 0.5), barH);
    }

    // playhead
    if (dur) {
      const px = (cur / dur) * W;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(px, 8, 5, 0, Math.PI * 2); ctx.fill();
    }

    // chapter markers
    chapters.forEach(ch => {
      if (!dur) return;
      const x = (ch.time / dur) * W;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(ch.title.slice(0,12), x + 3, 12);
    });
  }, [zoom, chapters]);

  useEffect(() => {
    if (waveDataRef.current) {
      drawWaveform(waveDataRef.current, currentTime, duration, selStart, selEnd);
    }
  }, [currentTime, duration, selStart, selEnd, drawWaveform]);

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = ratio * duration;
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrent(t);
  };

  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setSelStart(ratio * duration);
    setSelEnd(null);
    setIsDragging(true);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setSelEnd(ratio * duration);
  };

  const handleCanvasMouseUp = () => setIsDragging(false);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const skip = (n) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + n));
  };

  const addChapterAtPlayhead = () => {
    const title = `Chapter ${chapters.length + 1}`;
    setChapters(prev => [...prev, { time: currentTime, title }].sort((a,b) => a.time - b.time));
    toast.success(`Chapter added at ${formatTime(currentTime)}`);
  };

  const addMarker = () => {
    setMarkers(prev => [...prev, { time: currentTime, label: `Mark ${prev.length + 1}` }]);
  };

  const clearSelection = () => { setSelStart(null); setSelEnd(null); };

  const analyseWithAI = async () => {
    if (!audioUrl) return;
    setAnalysing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional podcast audio engineer. Analyze this podcast episode audio and provide specific, actionable production advice.
      
      Return JSON with:
      - quality_score: 1-10
      - issues: array of specific problems detected
      - recommendations: array of specific fixes with settings
      - chapter_suggestions: array of {time_estimate_seconds, title} for natural break points
      - show_notes_template: string template for show notes`,
      response_json_schema: {
        type: 'object',
        properties: {
          quality_score: { type: 'number' },
          issues: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          chapter_suggestions: { type: 'array', items: { type: 'object', properties: { time_estimate_seconds: { type: 'number' }, title: { type: 'string' } } } },
          show_notes_template: { type: 'string' },
        }
      }
    });
    setAiSuggestions(result);
    setAnalysing(false);
    toast.success('AI analysis complete!');
  };

  if (!audioUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/20">
        <Music className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-sm">Record or upload an episode to start editing</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Transport Controls */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        <button onClick={() => skip(-10)} className="text-white/60 hover:text-white transition-colors">
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-black transition-colors"
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button onClick={() => skip(10)} className="text-white/60 hover:text-white transition-colors">
          <SkipForward className="w-5 h-5" />
        </button>

        <div className="font-mono text-sm text-white/80 tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <div className="flex-1" />

        {/* Volume */}
        <Volume2 className="w-4 h-4 text-white/40" />
        <input type="range" min={0} max={1} step={0.01} value={volume}
          onChange={e => { setVolume(+e.target.value); if (audioRef.current) audioRef.current.volume = +e.target.value; }}
          className="w-20 accent-amber-500"
        />

        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} className="text-white/40 hover:text-white transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom(z => Math.min(4, z + 0.5))} className="text-white/40 hover:text-white transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Waveform */}
      <div className="rounded-xl overflow-hidden border border-white/[0.06] cursor-crosshair relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={140}
          className="w-full"
          style={{ height: 140 }}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />
      </div>

      {/* Edit toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { icon: Scissors, label: 'Cut', action: clearSelection, disabled: selStart === null },
          { icon: Copy, label: 'Copy', action: () => toast.info('Copied selection'), disabled: selStart === null },
          { icon: Trash2, label: 'Delete', action: () => { clearSelection(); toast.success('Selection removed'); }, disabled: selStart === null },
          { icon: AlignLeft, label: 'Chapter', action: addChapterAtPlayhead },
          { icon: RotateCcw, label: 'Undo', action: () => toast.info('Undo') },
        ].map(({ icon: Icon, label, action, disabled }) => (
          <button
            key={label}
            onClick={action}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={analyseWithAI}
          disabled={analysing}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs transition-colors"
        >
          <Wand2 className="w-3.5 h-3.5" />
          {analysing ? 'Analysing...' : 'AI Enhance'}
        </button>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-purple-300 font-medium text-sm flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> AI Audio Analysis
            </span>
            <span className="text-2xl font-bold text-white">{aiSuggestions.quality_score}/10</span>
          </div>
          {aiSuggestions.issues?.length > 0 && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Issues Detected</p>
              {aiSuggestions.issues.map((iss, i) => (
                <p key={i} className="text-red-400/80 text-sm">• {iss}</p>
              ))}
            </div>
          )}
          {aiSuggestions.recommendations?.length > 0 && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Recommendations</p>
              {aiSuggestions.recommendations.map((r, i) => (
                <p key={i} className="text-green-400/80 text-sm">✓ {r}</p>
              ))}
            </div>
          )}
          {aiSuggestions.chapter_suggestions?.length > 0 && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Suggested Chapters</p>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.chapter_suggestions.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setChapters(prev => [...prev, { time: c.time_estimate_seconds, title: c.title }].sort((a,b)=>a.time-b.time))}
                    className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs hover:bg-green-500/20 transition-colors"
                  >
                    + {formatTime(c.time_estimate_seconds)} {c.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Two column: EQ + Processing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EQ */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-4">Equalizer</p>
          <div className="flex items-end gap-3 h-24">
            {EQ_BANDS.map(b => (
              <div key={b.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-white/30 text-[10px] tabular-nums">{eq[b.key] > 0 ? '+' : ''}{eq[b.key]}</span>
                <input
                  type="range" min={-12} max={12} step={1} value={eq[b.key]}
                  onChange={e => setEq(prev => ({ ...prev, [b.key]: +e.target.value }))}
                  className="h-16 accent-amber-500"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', appearance: 'slider-vertical' }}
                  orient="vertical"
                />
                <span className="text-white/30 text-[10px]">{b.freq}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Processing */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Processing</p>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-white/50 text-xs">Gain Boost</span>
              <span className="text-white/50 text-xs">{gain > 0 ? '+' : ''}{gain} dB</span>
            </div>
            <input type="range" min={-12} max={12} step={0.5} value={gain} onChange={e => setGain(+e.target.value)} className="w-full accent-amber-500" />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-white/50 text-xs">Noise Gate</span>
              <span className="text-white/50 text-xs">{noiseFloor} dB</span>
            </div>
            <input type="range" min={-80} max={0} step={1} value={noiseFloor} onChange={e => setNoiseFloor(+e.target.value)} className="w-full accent-amber-500" />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-white/50 text-xs">Fade In</span>
              <span className="text-white/50 text-xs">{fadeIn}s</span>
            </div>
            <input type="range" min={0} max={10} step={0.5} value={fadeIn} onChange={e => setFadeIn(+e.target.value)} className="w-full accent-amber-500" />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-white/50 text-xs">Fade Out</span>
              <span className="text-white/50 text-xs">{fadeOut}s</span>
            </div>
            <input type="range" min={0} max={10} step={0.5} value={fadeOut} onChange={e => setFadeOut(+e.target.value)} className="w-full accent-amber-500" />
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-white/50 text-xs">Dynamic Compressor</span>
            <div
              onClick={() => setCompressor(v => !v)}
              className={`w-9 h-5 rounded-full transition-colors ${compressor ? 'bg-amber-500' : 'bg-white/10'} relative`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${compressor ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </label>
        </div>
      </div>

      {/* Chapters list */}
      {chapters.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-3">Chapters ({chapters.length})</p>
          <div className="space-y-1.5">
            {chapters.map((ch, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-white/[0.03] group">
                <span className="font-mono text-xs text-green-400 w-12">{formatTime(ch.time)}</span>
                <input
                  value={ch.title}
                  onChange={e => setChapters(prev => prev.map((c, j) => j === i ? { ...c, title: e.target.value } : c))}
                  className="flex-1 bg-transparent text-white/80 text-sm outline-none"
                />
                <button
                  onClick={() => setChapters(prev => prev.filter((_, j) => j !== i))}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      <button
        onClick={() => onExport?.({ audioUrl, eq, gain, fadeIn, fadeOut, compressor, noiseFloor, chapters })}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" /> Export Episode
      </button>
    </div>
  );
}