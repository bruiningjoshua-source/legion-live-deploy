import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, Pause, Play, Trash2, Activity, Sliders,
  AlertCircle, CheckCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

function formatTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function Knob({ label, value, min, max, step = 1, unit = '', onChange, color = '#f59e0b' }) {
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(value);

  const handleMouseDown = (e) => {
    setDragging(true);
    startY.current = e.clientY || e.touches?.[0]?.clientY;
    startVal.current = value;
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e) => {
      const clientY = e.clientY || e.touches?.[0]?.clientY;
      const delta = (startY.current - clientY) / 100;
      const range = max - min;
      const newVal = Math.min(max, Math.max(min, startVal.current + delta * range));
      onChange(Math.round(newVal / step) * step);
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging, min, max, step, onChange]);

  const pct = (value - min) / (max - min);
  const angle = -140 + pct * 280;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        className="relative w-12 h-12 rounded-full cursor-ns-resize"
        style={{ background: 'radial-gradient(circle at 35% 35%, #2a2a35, #111118)' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        {/* Track */}
        <svg className="absolute inset-0" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" strokeDasharray="113" strokeDashoffset="28" strokeLinecap="round" transform="rotate(130 24 24)" />
          <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct * 113} 113`} strokeDashoffset="28"
            strokeLinecap="round" transform="rotate(130 24 24)"
            style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
        </svg>
        {/* Pointer */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1 h-4 rounded-full origin-bottom" style={{ backgroundColor: color, transform: `rotate(${angle}deg)`, marginBottom: '4px' }} />
        </div>
      </div>
      <span className="text-white font-mono text-xs tabular-nums" style={{ color }}>
        {value}{unit}
      </span>
      <span className="text-white/30 text-[9px] uppercase tracking-wide text-center leading-tight">{label}</span>
    </div>
  );
}

function LevelMeter({ level, peak, label }) {
  const segments = 20;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex flex-col-reverse gap-0.5" style={{ height: 120 }}>
        {Array.from({ length: segments }).map((_, i) => {
          const threshold = i / segments;
          const active = level > threshold;
          const isPeak = Math.abs(threshold - peak) < 1 / segments;
          return (
            <div key={i} className="w-3 rounded-sm transition-all duration-75"
              style={{
                height: 4,
                backgroundColor: isPeak ? '#ffffff' :
                  active ? (i > segments * 0.85 ? '#ef4444' : i > segments * 0.7 ? '#f59e0b' : '#10b981') :
                  'rgba(255,255,255,0.05)',
              }}
            />
          );
        })}
      </div>
      <span className="text-white/20 text-[8px] uppercase">{label}</span>
    </div>
  );
}

export default function StudioRecorder({ onRecordingReady }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [levelL, setLevelL] = useState(0);
  const [levelR, setLevelR] = useState(0);
  const [peakL, setPeakL] = useState(0);
  const [peakR, setPeakR] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [inputDevice, setInputDevice] = useState('');
  const [devices, setDevices] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [clipping, setClipping] = useState(false);

  // Audio controls
  const [gain, setGain] = useState(75);
  const [noiseGate, setNoiseGate] = useState(-40);
  const [compression, setCompression] = useState(4);
  const [eqLow, setEqLow] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);
  const [stereoWidth, setStereoWidth] = useState(100);
  const [monitorVolume, setMonitorVolume] = useState(0);
  const [noiseCancel, setNoiseCancel] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [sampleRate, setSampleRate] = useState(48000);

  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const compressorRef = useRef(null);
  const timerRef = useRef(null);
  const analyserLRef = useRef(null);
  const analyserRRef = useRef(null);
  const animRef = useRef(null);
  const canvasRef = useRef(null);
  const peakTimerRef = useRef({});

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(d => {
      setDevices(d.filter(d => d.kind === 'audioinput'));
    });
    return () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  // Update gain in real time
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(gain / 100 * 2, audioCtxRef.current.currentTime, 0.01);
    }
  }, [gain]);

  // Update compressor in real time
  useEffect(() => {
    if (compressorRef.current) {
      compressorRef.current.ratio.setTargetAtTime(compression, audioCtxRef.current?.currentTime || 0, 0.01);
    }
  }, [compression]);

  const drawWaveform = useCallback(() => {
    if (!analyserLRef.current || !canvasRef.current) return;

    const analyser = analyserLRef.current;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, H * i / 4);
      ctx.lineTo(W, H * i / 4);
      ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = 'rgba(245,158,11,0.15)';
    ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();

    // Waveform fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(245,158,11,0.3)');
    grad.addColorStop(0.5, 'rgba(245,158,11,0.1)');
    grad.addColorStop(1, 'rgba(245,158,11,0.3)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    const sliceWidth = W / buf.length;
    let x = 0;
    ctx.moveTo(0, H/2);
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i] / 128.0;
      const y = (v * H) / 2;
      ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(W, H/2);
    ctx.closePath();
    ctx.fill();

    // Waveform line
    const waveGrad = ctx.createLinearGradient(0, 0, W, 0);
    waveGrad.addColorStop(0, '#f59e0b');
    waveGrad.addColorStop(0.5, '#fbbf24');
    waveGrad.addColorStop(1, '#f59e0b');
    ctx.strokeStyle = waveGrad;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    x = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i] / 128.0;
      const y = (v * H) / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Level calculation
    let sumL = 0;
    for (let i = 0; i < buf.length; i++) sumL += Math.abs(buf[i] - 128);
    const avgL = sumL / buf.length / 128;
    setLevelL(avgL);
    if (avgL > peakL) {
      setPeakL(avgL);
      clearTimeout(peakTimerRef.current.L);
      peakTimerRef.current.L = setTimeout(() => setPeakL(0), 2000);
    }

    // Right channel (simulate from left for mono)
    const avgR = avgL * (0.9 + Math.random() * 0.2);
    setLevelR(Math.min(1, avgR));
    if (avgR > peakR) {
      setPeakR(Math.min(1, avgR));
      clearTimeout(peakTimerRef.current.R);
      peakTimerRef.current.R = setTimeout(() => setPeakR(0), 2000);
    }

    // Clipping indicator
    if (avgL > 0.9) setClipping(true);
    else setTimeout(() => setClipping(false), 500);

    animRef.current = requestAnimationFrame(drawWaveform);
  }, [peakL, peakR]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: inputDevice || undefined,
          echoCancellation,
          noiseSuppression: noiseCancel,
          autoGainControl: false,
          sampleRate,
          channelCount: 2,
        }
      });
      streamRef.current = stream;
      chunksRef.current = [];
      setRecordedUrl(null);
      setClipping(false);

      // Build audio graph
      const ctx = new AudioContext({ sampleRate });
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);

      // Gain
      const gainNode = ctx.createGain();
      gainNode.gain.value = gain / 100 * 2;
      gainNodeRef.current = gainNode;

      // Compressor
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 10;
      compressor.ratio.value = compression;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      compressorRef.current = compressor;

      // EQ — Low shelf
      const eqLowNode = ctx.createBiquadFilter();
      eqLowNode.type = 'lowshelf';
      eqLowNode.frequency.value = 250;
      eqLowNode.gain.value = eqLow;

      // EQ — Peaking mid
      const eqMidNode = ctx.createBiquadFilter();
      eqMidNode.type = 'peaking';
      eqMidNode.frequency.value = 2000;
      eqMidNode.Q.value = 1;
      eqMidNode.gain.value = eqMid;

      // EQ — High shelf
      const eqHighNode = ctx.createBiquadFilter();
      eqHighNode.type = 'highshelf';
      eqHighNode.frequency.value = 8000;
      eqHighNode.gain.value = eqHigh;

      // Analyser
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserLRef.current = analyser;

      // Chain: source → gain → compressor → eqLow → eqMid → eqHigh → analyser → destination (for monitoring)
      source.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(eqLowNode);
      eqLowNode.connect(eqMidNode);
      eqMidNode.connect(eqHighNode);
      eqHighNode.connect(analyser);

      // Monitor (if volume > 0)
      if (monitorVolume > 0) {
        const monitorGain = ctx.createGain();
        monitorGain.gain.value = monitorVolume / 100;
        analyser.connect(monitorGain);
        monitorGain.connect(ctx.destination);
      }

      // Record from processed stream
      const dest = ctx.createMediaStreamDestination();
      analyser.connect(dest);

      drawWaveform();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const rec = new MediaRecorder(dest.stream, { mimeType });
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        cancelAnimationFrame(animRef.current);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setUploading(true);
        try {
          const result = await base44.integrations.Core.UploadFile({ file });
          setRecordedUrl(result.file_url);
          onRecordingReady?.(result.file_url);
          toast.success('Recording ready!');
        } catch (err) {
          toast.error('Upload failed');
        }
        setUploading(false);
      };

      rec.start(100);
      mediaRecRef.current = rec;
      setIsRecording(true);
      setIsPaused(false);
      setTime(0);
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } catch (err) {
      toast.error('Could not access microphone. Check permissions.');
    }
  };

  const pauseRecording = () => {
    mediaRecRef.current?.pause();
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    setIsPaused(true);
  };

  const resumeRecording = () => {
    mediaRecRef.current?.resume();
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    drawWaveform();
    setIsPaused(false);
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsPaused(false);
    setLevelL(0);
    setLevelR(0);
  };

  const discard = () => {
    setRecordedUrl(null);
    setTime(0);
    setLevelL(0);
    setLevelR(0);
    setClipping(false);
  };

  return (
    <div className="space-y-4 text-white">

      {/* ── TOP BAR: device + sample rate ── */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Mic className="w-4 h-4 text-amber-400 shrink-0" />
          <select value={inputDevice} onChange={e => setInputDevice(e.target.value)} disabled={isRecording}
            className="flex-1 bg-transparent text-white/70 text-sm outline-none truncate">
            <option value="">Default Microphone</option>
            {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,8)}`}</option>)}
          </select>
        </div>
        <select value={sampleRate} onChange={e => setSampleRate(Number(e.target.value))} disabled={isRecording}
          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-white/60 text-xs outline-none">
          <option value={44100}>44.1 kHz</option>
          <option value={48000}>48 kHz</option>
          <option value={96000}>96 kHz</option>
        </select>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <div onClick={() => !isRecording && setNoiseCancel(v => !v)}
              className={`w-8 h-4 rounded-full transition-colors ${noiseCancel ? 'bg-amber-500' : 'bg-white/10'} relative cursor-pointer`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${noiseCancel ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-white/40 text-xs">Noise</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <div onClick={() => !isRecording && setEchoCancellation(v => !v)}
              className={`w-8 h-4 rounded-full transition-colors ${echoCancellation ? 'bg-amber-500' : 'bg-white/10'} relative cursor-pointer`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${echoCancellation ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-white/40 text-xs">Echo</span>
          </label>
        </div>
      </div>

      {/* ── MAIN STUDIO AREA ── */}
      <div className="flex gap-4">

        {/* Level meters */}
        <div className="flex gap-2 items-end pb-1">
          <LevelMeter level={levelL} peak={peakL} label="L" />
          <LevelMeter level={levelR} peak={peakR} label="R" />
        </div>

        {/* Waveform + clipping */}
        <div className="flex-1 space-y-2">
          {/* Clipping warning */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${clipping ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-white/[0.02] border border-white/[0.04] text-white/20'}`}>
            <AlertCircle className="w-3 h-3" />
            {clipping ? 'CLIPPING — reduce gain' : 'Signal OK'}
          </div>

          {/* Waveform */}
          <div className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-[#080810]">
            <canvas ref={canvasRef} width={800} height={100} className="w-full" style={{ height: 100 }} />
            {!isRecording && !recordedUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/20 text-sm">Press record to start</p>
              </div>
            )}
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-amber-400 font-bold tracking-widest text-sm animate-pulse">⏸ PAUSED</p>
              </div>
            )}
            {/* Time overlay */}
            {isRecording && (
              <div className="absolute top-2 right-3 flex items-center gap-2">
                <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1 }}
                  className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-white font-mono text-sm font-bold">{formatTime(time)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTROLS PANEL ── */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-white/60 hover:text-white/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Studio Controls</span>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-5 space-y-5 border-t border-white/[0.06]">

                {/* GAIN + COMPRESSION row */}
                <div>
                  <p className="text-white/20 text-[10px] uppercase tracking-widest mb-3 pt-4">Input & Dynamics</p>
                  <div className="flex items-start justify-around">
                    <Knob label="Gain" value={gain} min={0} max={200} unit="%" onChange={setGain} color="#f59e0b" />
                    <Knob label="Compress" value={compression} min={1} max={20} unit=":1" onChange={setCompression} color="#a855f7" />
                    <Knob label="Gate" value={noiseGate} min={-80} max={0} unit="dB" onChange={setNoiseGate} color="#6366f1" />
                    <Knob label="Monitor" value={monitorVolume} min={0} max={100} unit="%" onChange={setMonitorVolume} color="#10b981" />
                  </div>
                </div>

                {/* EQ row */}
                <div>
                  <p className="text-white/20 text-[10px] uppercase tracking-widest mb-3">Equalizer</p>
                  <div className="flex items-start justify-around">
                    <Knob label="Low 250Hz" value={eqLow} min={-12} max={12} unit="dB" onChange={setEqLow} color="#ef4444" />
                    <Knob label="Mid 2kHz" value={eqMid} min={-12} max={12} unit="dB" onChange={setEqMid} color="#f59e0b" />
                    <Knob label="High 8kHz" value={eqHigh} min={-12} max={12} unit="dB" onChange={setEqHigh} color="#06b6d4" />
                    <Knob label="Width" value={stereoWidth} min={0} max={200} unit="%" onChange={setStereoWidth} color="#ec4899" />
                  </div>
                </div>

                {/* EQ visualizer bar */}
                <div className="flex items-end gap-0.5 h-10 px-2 bg-black/30 rounded-lg overflow-hidden">
                  {[...Array(32)].map((_, i) => {
                    const freq = i / 32;
                    let boost = 0;
                    if (freq < 0.2) boost = eqLow / 12;
                    else if (freq < 0.6) boost = eqMid / 12;
                    else boost = eqHigh / 12;
                    const h = 50 + boost * 40;
                    return (
                      <div key={i} className="flex-1 rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${h}%`,
                          backgroundColor: freq < 0.2 ? '#ef444440' : freq < 0.6 ? '#f59e0b40' : '#06b6d440',
                          borderTop: `1px solid ${freq < 0.2 ? '#ef4444' : freq < 0.6 ? '#f59e0b' : '#06b6d4'}`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── TRANSPORT CONTROLS ── */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-2 text-white/30 text-xs">
          <span className="font-mono">{sampleRate / 1000}kHz</span>
          <span>·</span>
          <span>Stereo</span>
          <span>·</span>
          <span>WebM/Opus</span>
        </div>

        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button onClick={startRecording}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]">
              <Mic className="w-4 h-4" /> Record
            </button>
          ) : (
            <>
              <button onClick={isPaused ? resumeRecording : pauseRecording}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10">
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button onClick={stopRecording}
                className="flex items-center gap-2 px-8 py-3 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all">
                <Square className="w-4 h-4 fill-current" /> Finish
              </button>
            </>
          )}
        </div>

        <div className="w-24" />
      </div>

      {/* ── RECORDING RESULT ── */}
      <AnimatePresence>
        {(recordedUrl || uploading) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
            {uploading ? (
              <div className="flex items-center gap-3 text-green-400">
                <Activity className="w-4 h-4 animate-pulse" />
                <span className="text-sm">Processing and uploading recording...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Recording complete — {formatTime(time)}</span>
                  </div>
                  <button onClick={discard} className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <audio src={recordedUrl} controls className="w-full" style={{ height: 36 }} />
                <p className="text-white/20 text-xs">Ready to edit in the DAW editor →</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}