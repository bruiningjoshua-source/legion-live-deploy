import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Pause, Play, Trash2, Volume2, VolumeX, Settings2, Radio, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

function formatTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export default function StudioRecorder({ onRecordingReady }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [level, setLevel] = useState(0);
  const [levels, setLevels] = useState(Array(60).fill(0));
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [inputDevice, setInputDevice] = useState('');
  const [devices, setDevices] = useState([]);
  const [noiseCancel, setNoiseCancel] = useState(true);

  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(d => {
      setDevices(d.filter(d => d.kind === 'audioinput'));
    });
    return () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.strokeStyle = 'rgba(245,158,11,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();

    // Waveform
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#ef4444');
    grad.addColorStop(1, '#f59e0b');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sliceWidth = W / buf.length;
    let x = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i] / 128.0;
      const y = (v * H) / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();

    // Level meter
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += Math.abs(buf[i] - 128);
    const avg = sum / buf.length / 128;
    setLevel(avg);
    setLevels(prev => [...prev.slice(1), avg]);

    animRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: inputDevice || undefined,
        echoCancellation: noiseCancel,
        noiseSuppression: noiseCancel,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 2,
      }
    });
    streamRef.current = stream;
    chunksRef.current = [];
    setRecordedUrl(null);

    // Analyser
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;
    drawWaveform();

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const rec = new MediaRecorder(stream, { mimeType });
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animRef.current);
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      setUploading(true);
      const result = await base44.integrations.Core.UploadFile({ file });
      setUploading(false);
      setRecordedUrl(result.file_url);
      onRecordingReady?.(result.file_url);
      toast.success('Recording ready!');
    };

    rec.start(100);
    mediaRecRef.current = rec;
    setIsRecording(true); setIsPaused(false); setTime(0);
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
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
    setIsRecording(false); setIsPaused(false);
  };

  const discard = () => { setRecordedUrl(null); setTime(0); setLevels(Array(60).fill(0)); };

  return (
    <div className="space-y-4">
      {/* Device + settings bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Mic className="w-4 h-4 text-amber-400 shrink-0" />
          <select
            value={inputDevice}
            onChange={e => setInputDevice(e.target.value)}
            disabled={isRecording}
            className="flex-1 bg-transparent text-white/70 text-sm outline-none truncate"
          >
            <option value="">Default Microphone</option>
            {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,8)}`}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setNoiseCancel(v => !v)}
            className={`w-9 h-5 rounded-full transition-colors ${noiseCancel ? 'bg-amber-500' : 'bg-white/10'} relative`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${noiseCancel ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-white/50 text-xs">Noise Cancel</span>
        </label>
      </div>

      {/* Waveform canvas */}
      <div className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-black">
        <canvas ref={canvasRef} width={800} height={120} className="w-full" style={{ height: 120 }} />
        {!isRecording && !recordedUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/20 text-sm">Press record to start</p>
          </div>
        )}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-amber-400 font-bold tracking-widest text-sm">⏸ PAUSED</p>
          </div>
        )}
      </div>

      {/* Level meters */}
      <div className="flex items-end gap-0.5 h-8 px-1">
        {levels.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(4, v * 200)}%`,
              backgroundColor: v > 0.6 ? '#ef4444' : v > 0.3 ? '#f59e0b' : '#10b981',
            }}
          />
        ))}
      </div>

      {/* Timer + controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isRecording && !isPaused && (
            <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-3 h-3 rounded-full bg-red-500" />
          )}
          <span className="text-white font-mono text-2xl font-bold tabular-nums">{formatTime(time)}</span>
          {isRecording && <span className="text-white/30 text-xs">{isPaused ? 'PAUSED' : 'RECORDING'}</span>}
        </div>

        <div className="flex items-center gap-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors"
            >
              <Mic className="w-4 h-4" /> Record
            </button>
          ) : (
            <>
              <button
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors"
              >
                <Square className="w-4 h-4 fill-current" /> Finish
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recorded result */}
      <AnimatePresence>
        {(recordedUrl || uploading) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-green-500/30 bg-green-500/5 p-4"
          >
            {uploading ? (
              <div className="flex items-center gap-3 text-green-400">
                <Activity className="w-4 h-4 animate-pulse" />
                <span className="text-sm">Processing recording...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-green-400 text-sm font-medium">✓ Recording ready — {formatTime(time)}</span>
                  <button onClick={discard} className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <audio src={recordedUrl} controls className="w-full h-8" style={{ height: 32 }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}