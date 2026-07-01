/**
 * AceStepTab — Real ACE-Step AI music generation client
 *
 * Connects to a user-configurable ACE-Step server (local or remote).
 * Implements the full ACE-Step API contract from ace-step-ui-main:
 *   POST /api/generate         — start a generation job
 *   GET  /api/generate/status/:id — poll until complete
 *   GET  /api/generate/random-description — random style prompt
 *
 * No external dependencies beyond the user's own ACE-Step server.
 * Download link for the server setup is provided in the UI.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2, Play, Pause, Download, RefreshCw, Settings,
  ChevronDown, ChevronUp, Shuffle, Package, Wifi, WifiOff, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_SERVER = 'http://localhost:3005';

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    idle:       { color: 'rgba(255,255,255,0.2)', label: 'Ready'      },
    connecting: { color: '#f59e0b',               label: 'Connecting…'},
    connected:  { color: '#10b981',               label: 'Connected'  },
    generating: { color: '#3b82f6',               label: 'Generating…'},
    complete:   { color: '#10b981',               label: 'Done'       },
    error:      { color: '#ef4444',               label: 'Error'      },
  };
  const s = map[status] || map.idle;
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: s.color + '20', border: `1px solid ${s.color}40`, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

// ── Generated track player ───────────────────────────────────────────────────
function TrackPlayer({ track, onDownload }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime  = () => setProgress(audio.currentTime);
    const onMeta  = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('loadedmetadata', onMeta); audio.removeEventListener('ended', onEnded); };
  }, [track]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  return (
    <div className="ll-card p-3 rounded-2xl" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
      <audio ref={audioRef} src={track.audioUrl} preload="metadata" />
      <div className="flex items-start gap-3 mb-3">
        <button onClick={toggle}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ll-interactive"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
          {playing ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{track.title || 'Generated Track'}</p>
          <p className="text-white/40 text-xs truncate">{track.style}</p>
        </div>
        <button onClick={() => onDownload(track)}
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ll-interactive"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Download className="w-3.5 h-3.5 text-white/50" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="relative h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          if (audioRef.current) { audioRef.current.currentTime = pct * duration; setProgress(pct * duration); }
        }}>
        <motion.div className="absolute left-0 top-0 h-full rounded-full bg-emerald-400"
          style={{ width: duration ? `${(progress/duration)*100}%` : '0%' }} />
      </div>
      <div className="flex justify-between text-[10px] text-white/25 mt-1">
        <span>{fmt(progress)}</span><span>{fmt(duration)}</span>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AceStepTab({ AI_GENRES, AI_KEYS }) {
  const [serverUrl, setServerUrl] = useState(() =>
    localStorage.getItem('ll_acestep_server') || DEFAULT_SERVER
  );
  const [serverStatus, setServerStatus] = useState('idle');
  const [showServerConfig, setShowServerConfig] = useState(false);

  // Generation params
  const [mode, setMode] = useState('simple'); // simple | custom
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [title, setTitle] = useState('');
  const [genres, setGenres] = useState([]);
  const [genreSearch, setGenreSearch] = useState('');
  const [key, setKey] = useState('');
  const [bpm, setBpm] = useState(0);
  const [duration, setDuration] = useState(180);
  const [instrumental, setInstrumental] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced params matching ace-step's CreatePanel
  const [guidanceScale, setGuidanceScale] = useState(9.0);
  const [inferenceSteps, setInferenceSteps] = useState(12);
  const [randomSeed, setRandomSeed] = useState(true);
  const [seed, setSeed] = useState(-1);
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [enhance, setEnhance] = useState(false);

  // Generation state
  const [jobId, setJobId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStage, setGenStage] = useState('');
  const [generatedTracks, setGeneratedTracks] = useState([]);
  const pollRef = useRef(null);

  // Test server connection
  const testConnection = useCallback(async (url) => {
    setServerStatus('connecting');
    try {
      const res = await fetch(`${url}/api/auth/auto`, { 
        method: 'GET',
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        setServerStatus('connected');
        toast.success('Connected to ACE-Step server');
        return true;
      }
      throw new Error('Bad response');
    } catch {
      setServerStatus('error');
      return false;
    }
  }, []);

  // Get random description from server
  const randomize = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/generate/random-description`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.description) {
        setDescription(data.description);
        setInstrumental(data.instrumental || false);
      }
    } catch {
      // Fallback to local random prompt
      const samples = [
        'Chill lo-fi hip hop with jazzy piano, vinyl crackle, late night vibes',
        'Energetic trap beat with heavy 808s, hi-hat rolls, melodic synth lead',
        'Soulful R&B with warm Rhodes, smooth bass, emotional vocals',
        'Dark drill beat with sliding hi-hats, orchestral strings, hard 808s',
        'Afrobeats fusion with percussive guitars, talking drum, afro bass',
      ];
      setDescription(samples[Math.floor(Math.random() * samples.length)]);
    }
  };

  // Start generation
  const generate = async () => {
    if (serverStatus !== 'connected') {
      const ok = await testConnection(serverUrl);
      if (!ok) {
        toast.error('Cannot reach ACE-Step server. Check the server URL and make sure ACE-Step is running.');
        return;
      }
    }

    setGenerating(true);
    setGenProgress(0);
    setGenStage('Preparing…');

    const styleStr = [style, ...genres].filter(Boolean).join(', ');
    const params = {
      customMode: mode === 'custom',
      songDescription: mode === 'simple' ? description : undefined,
      prompt: mode === 'custom' ? description : undefined,
      lyrics: instrumental ? '' : lyrics,
      style: styleStr,
      title: title || undefined,
      instrumental,
      bpm: bpm > 0 ? bpm : undefined,
      duration,
      guidanceScale,
      inferenceSteps,
      seed: randomSeed ? -1 : seed,
      audioFormat,
      enhance,
      ...(key ? { keyScale: key } : {}),
    };

    try {
      const res = await fetch(`${serverUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const job = await res.json();
      setJobId(job.id || job.jobId);
      pollForCompletion(job.id || job.jobId);
    } catch (err) {
      setGenerating(false);
      setGenStage('');
      toast.error('Generation failed: ' + err.message);
    }
  };

  const pollForCompletion = (id) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${serverUrl}/api/generate/status/${id}`, {
          signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) return;
        const job = await res.json();

        setGenProgress(job.progress || 0);
        setGenStage(job.stage || 'Generating…');

        if (job.status === 'complete' || job.audioUrl || (job.songs && job.songs.length > 0)) {
          clearInterval(pollRef.current);
          setGenerating(false);
          setGenProgress(100);
          setGenStage('Complete');

          const tracks = job.songs || (job.audioUrl ? [{ ...job, audioUrl: job.audioUrl.startsWith('/')
            ? `${serverUrl}${job.audioUrl}` : job.audioUrl }] : []);
          if (tracks.length > 0) {
            setGeneratedTracks(prev => [...tracks.map(t => ({
              ...t,
              audioUrl: t.audioUrl?.startsWith('/') ? `${serverUrl}${t.audioUrl}` : t.audioUrl,
            })), ...prev]);
            toast.success('Track generated!');
          }
        }

        if (job.status === 'error' || job.status === 'failed') {
          clearInterval(pollRef.current);
          setGenerating(false);
          setGenStage('');
          toast.error('Generation failed: ' + (job.error || 'Unknown error'));
        }
      } catch { /* ignore poll errors */ }
    }, 2000);
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const saveServer = (url) => {
    setServerUrl(url);
    localStorage.setItem('ll_acestep_server', url);
    setServerStatus('idle');
  };

  const downloadTrack = (track) => {
    if (!track.audioUrl) return;
    const a = document.createElement('a');
    a.href = track.audioUrl;
    a.download = `${track.title || 'legion-track'}.${audioFormat}`;
    a.click();
  };

  const buildStyleString = () => [style, ...genres].filter(Boolean).join(', ');

  return (
    <div className="space-y-4">

      {/* ── Server config ── */}
      <div className="ll-card p-3 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {serverStatus === 'connected'
              ? <Wifi className="w-4 h-4 text-emerald-400" />
              : <WifiOff className="w-4 h-4 text-white/30" />}
            <span className="text-white/60 text-xs font-medium truncate max-w-[140px]">
              {serverUrl.replace('http://', '')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={serverStatus} />
            <button onClick={() => setShowServerConfig(s => !s)}
              className="w-7 h-7 rounded-lg ll-card flex items-center justify-center ll-interactive">
              <Settings className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showServerConfig && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-3 space-y-2">
                <p className="text-white/30 text-[10px] uppercase tracking-wider">ACE-Step Server URL</p>
                <div className="flex gap-2">
                  <input defaultValue={serverUrl}
                    onChange={e => saveServer(e.target.value)}
                    className="ll-input text-xs py-2 flex-1"
                    placeholder="http://localhost:3005" />
                  <button onClick={() => testConnection(serverUrl)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold ll-interactive shrink-0"
                    style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', color: '#f5a623' }}>
                    Test
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-white/3 border border-white/6">
                  <p className="text-white/50 text-xs leading-relaxed">
                    Run ACE-Step locally and enter its URL above. The server handles all GPU processing on your machine — no cloud needed.
                  </p>
                  <a href="https://github.com/fspecii/ace-step-ui/archive/refs/heads/main.zip"
                    className="mt-2 flex items-center gap-1.5 text-emerald-400 text-xs font-medium ll-interactive">
                    <Package className="w-3 h-3" /> Download ACE-Step Setup
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mode toggle ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8">
        {['simple', 'custom'].map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold ll-interactive capitalize transition-all"
            style={{
              background: mode === m ? 'rgba(245,166,35,0.15)' : 'transparent',
              border: `1px solid ${mode === m ? 'rgba(245,166,35,0.35)' : 'transparent'}`,
              color: mode === m ? '#f5a623' : 'rgba(255,255,255,0.4)',
            }}>
            {m === 'simple' ? '✦ Quick Generate' : '⚙ Custom Mode'}
          </button>
        ))}
      </div>

      {/* ── Generation form ── */}
      <div className="ll-card p-4 rounded-2xl space-y-3"
        style={{ borderColor: 'rgba(139,92,246,0.25)' }}>

        {/* Title */}
        <input value={title} onChange={e => setTitle(e.target.value)}
          className="ll-input text-sm" placeholder="Track title (optional)" />

        {/* Description / prompt */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <p className="ll-label text-white/30 text-[10px]">
              {mode === 'simple' ? 'DESCRIBE YOUR TRACK' : 'STYLE PROMPT'}
            </p>
            <button onClick={randomize}
              className="flex items-center gap-1 text-white/25 text-[10px] ll-interactive hover:text-white/50">
              <Shuffle className="w-3 h-3" /> Random
            </button>
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder={mode === 'simple'
              ? 'e.g. Chill lo-fi hip hop with jazzy piano, vinyl crackle, late night vibes'
              : 'e.g. dark trap, aggressive 808s, melodic minor, atmospheric strings'}
            className="ll-input text-sm resize-none" rows={2} />
        </div>

        {/* Genre tags */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="ll-label text-white/30 text-[10px]">GENRES</p>
            {genres.length > 0 && (
              <button onClick={() => setGenres([])} className="text-white/20 text-[9px] ll-interactive">clear</button>
            )}
          </div>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {genres.map(g => (
                <span key={g} onClick={() => setGenres(p => p.filter(x => x !== g))}
                  className="px-2 py-0.5 rounded-full text-[10px] cursor-pointer ll-interactive"
                  style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)', color: '#a78bfa' }}>
                  {g} ×
                </span>
              ))}
            </div>
          )}
          <input value={genreSearch} onChange={e => setGenreSearch(e.target.value)}
            className="ll-input text-xs mb-1.5" placeholder="Search 105+ genres…" />
          <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
            {(AI_GENRES || [])
              .filter(g => !genreSearch || g.toLowerCase().includes(genreSearch.toLowerCase()))
              .slice(0, 50)
              .map(g => (
              <button key={g} onClick={() => setGenres(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g])}
                className="px-2 py-0.5 rounded-full text-[10px] ll-interactive"
                style={{
                  background: genres.includes(g) ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${genres.includes(g) ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: genres.includes(g) ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Lyrics (custom mode / non-instrumental) */}
        <div className="flex items-center justify-between">
          <p className="ll-label text-white/30 text-[10px]">INSTRUMENTAL</p>
          <div onClick={() => setInstrumental(v => !v)}
            className="w-10 h-5 rounded-full relative cursor-pointer transition-colors ll-interactive"
            style={{ background: instrumental ? '#a78bfa' : 'rgba(255,255,255,0.1)' }}>
            <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow"
              style={{ left: instrumental ? '22px' : '2px' }} />
          </div>
        </div>

        {!instrumental && (
          <div>
            <p className="ll-label text-white/30 mb-1.5 text-[10px]">LYRICS</p>
            <textarea value={lyrics} onChange={e => setLyrics(e.target.value)}
              placeholder={"[verse]\nYour lyrics here...\n\n[chorus]\n..."}
              className="ll-input text-xs resize-none font-mono" rows={4} />
          </div>
        )}

        {/* Quick params row */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="ll-label text-white/30 text-[10px] mb-1">BPM</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setBpm(b => Math.max(0, b - 5))}
                className="w-6 h-6 rounded ll-card text-white/40 text-xs ll-interactive">−</button>
              <span className="text-amber-400 font-mono text-xs flex-1 text-center">{bpm || 'Auto'}</span>
              <button onClick={() => setBpm(b => Math.min(220, b + 5))}
                className="w-6 h-6 rounded ll-card text-white/40 text-xs ll-interactive">+</button>
            </div>
          </div>
          <div>
            <p className="ll-label text-white/30 text-[10px] mb-1">KEY</p>
            <select value={key} onChange={e => setKey(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-lg px-1.5 py-1 text-white/60 text-xs outline-none">
              <option value="">Auto</option>
              {(AI_KEYS || []).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <p className="ll-label text-white/30 text-[10px] mb-1">FORMAT</p>
            <select value={audioFormat} onChange={e => setAudioFormat(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-lg px-1.5 py-1 text-white/60 text-xs outline-none">
              <option value="mp3">MP3</option>
              <option value="flac">FLAC</option>
            </select>
          </div>
        </div>

        {/* Duration */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-white/30 uppercase tracking-wider">Duration</span>
            <span className="text-amber-400 font-mono">{Math.floor(duration/60)}:{String(duration%60).padStart(2,'0')}</span>
          </div>
          <input type="range" min={15} max={240} step={15} value={duration}
            onChange={e => setDuration(+e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#f5a623' }} />
        </div>

        {/* Advanced toggle */}
        <button onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between text-white/25 text-xs ll-interactive py-0.5">
          <span className="uppercase tracking-wider text-[10px]">Advanced Parameters</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-3 pt-1">
                {/* Guidance scale */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-white/30">Guidance Scale</span>
                    <span className="text-purple-400 font-mono">{guidanceScale.toFixed(1)}</span>
                  </div>
                  <input type="range" min={1} max={20} step={0.5} value={guidanceScale}
                    onChange={e => setGuidanceScale(+e.target.value)}
                    className="w-full h-1 rounded appearance-none cursor-pointer"
                    style={{ accentColor: '#a78bfa' }} />
                  <p className="text-white/20 text-[9px] mt-0.5">7–12 recommended. Higher = more prompt adherence.</p>
                </div>
                {/* Inference steps */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-white/30">Inference Steps</span>
                    <span className="text-purple-400 font-mono">{inferenceSteps}</span>
                  </div>
                  <input type="range" min={4} max={50} step={1} value={inferenceSteps}
                    onChange={e => setInferenceSteps(+e.target.value)}
                    className="w-full h-1 rounded appearance-none cursor-pointer"
                    style={{ accentColor: '#a78bfa' }} />
                </div>
                {/* Enhance + Seed */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div onClick={() => setEnhance(v => !v)}
                      className="w-8 h-4 rounded-full relative cursor-pointer transition-colors"
                      style={{ background: enhance ? '#a78bfa' : 'rgba(255,255,255,0.1)' }}>
                      <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                        style={{ left: enhance ? '18px' : '2px' }} />
                    </div>
                    <span className="text-white/40 text-xs">AI Enhance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div onClick={() => setRandomSeed(v => !v)}
                      className="w-8 h-4 rounded-full relative cursor-pointer transition-colors"
                      style={{ background: randomSeed ? '#a78bfa' : 'rgba(255,255,255,0.1)' }}>
                      <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                        style={{ left: randomSeed ? '18px' : '2px' }} />
                    </div>
                    <span className="text-white/40 text-xs">Random seed</span>
                  </div>
                </div>
                {!randomSeed && (
                  <input type="number" value={seed} onChange={e => setSeed(+e.target.value)}
                    className="ll-input text-xs py-1.5" placeholder="Seed value" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Style summary */}
        {(genres.length > 0 || style || key || bpm > 0) && (
          <div className="px-2.5 py-1.5 rounded-xl bg-white/3 border border-white/6">
            <p className="text-white/30 text-[10px] font-mono truncate">
              {[buildStyleString(), key, bpm > 0 ? `${bpm}bpm` : '', `${Math.floor(duration/60)}m${duration%60}s`].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}

        {/* Generate button */}
        {generating ? (
          <div className="space-y-2">
            <div className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-purple-400 font-semibold text-sm">{genStage || 'Generating…'}</span>
            </div>
            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
              <motion.div className="h-full bg-purple-500 rounded-full"
                animate={{ width: `${genProgress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        ) : (
          <button onClick={generate} disabled={!description.trim() && !style.trim() && genres.length === 0}
            className="w-full py-3 rounded-2xl font-bold text-sm ll-interactive disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff',
                     boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
            <Wand2 className="w-4 h-4" />
            Generate with ACE-Step
          </button>
        )}
      </div>

      {/* ── Generated tracks ── */}
      {generatedTracks.length > 0 && (
        <div>
          <p className="ll-label text-white/30 mb-2 text-[10px]">GENERATED TRACKS</p>
          <div className="space-y-2">
            {generatedTracks.map((track, i) => (
              <TrackPlayer key={i} track={track} onDownload={downloadTrack} />
            ))}
          </div>
        </div>
      )}

      {/* ── Setup card ── */}
      <div className="ll-card p-4 rounded-2xl" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="text-white font-semibold text-sm">ACE-Step Server Setup</p>
            <p className="text-white/35 text-xs">Run AI generation locally on your GPU</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            'Full songs up to 4 minutes',
            'Works offline after setup',
            'You own all generated audio',
            'Requires Nvidia GPU + Python',
          ].map((f, i) => (
            <p key={i} className="text-white/40 text-xs flex items-start gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />{f}
            </p>
          ))}
        </div>
        <div className="flex gap-2">
          <a href="https://github.com/fspecii/ace-step-ui/archive/refs/heads/main.zip"
            target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 ll-interactive"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
            <Download className="w-3.5 h-3.5" /> Download UI
          </a>
          <a href="https://github.com/ace-step/ACE-Step" target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 ll-interactive"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
            Model Repo
          </a>
        </div>
      </div>
    </div>
  );
}
