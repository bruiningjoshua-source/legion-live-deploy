import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Aperture,
  Box,
  Camera,
  Download,
  Eye,
  FileUp,
  FlaskConical,
  Gauge,
  Hand,
  Layers3,
  Pause,
  Play,
  Radio,
  ScanLine,
  Settings2,
  Sparkles,
  Upload,
  UserRound,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FaceTracker from '@/components/ar/FaceTracker';
import { updateParticleSystem } from '@/components/ar/AdvancedParticle';

const OPEN_SOURCE_MODULES = [
  { name: 'SuperSplat', repo: 'playcanvas/supersplat', role: 'Gaussian splat inspect, trim, optimize, publish', license: 'MIT' },
  { name: 'SuperSplat Viewer', repo: 'playcanvas/supersplat-viewer', role: 'Runtime splat playback and camera framing', license: 'MIT' },
  { name: 'MediaPipe', repo: 'google/mediapipe', role: 'Face Mesh, pose, and hand landmark tracking', license: 'Apache 2.0' },
  { name: 'SysMocap pattern', repo: 'xianfei/SysMocap', role: 'VRM/GLB avatar retargeting workflow', license: 'MPL-2.0' },
  { name: 'WebGL particles', repo: 'skeeto/webgl-particles', role: 'GPU-friendly trails, aura, sparkle emitters', license: 'Public domain' },
];

const PIPELINE_STEPS = [
  { label: 'Capture', detail: 'Record sweep video or multi-photo scan', progress: 72 },
  { label: 'Reconstruct', detail: 'COLMAP/OpenMVG handoff to .ply splat job', progress: 42 },
  { label: 'Clean', detail: 'SuperSplat-style crop, prune, color pass', progress: 61 },
  { label: 'Publish', detail: 'Optimized background asset for live compositing', progress: 35 },
];

const FILTERS = [
  { id: 'beauty', label: 'Beauty', icon: Wand2 },
  { id: 'mask', label: 'Mask', icon: Eye },
  { id: 'hat', label: '3D Hat', icon: Box },
  { id: 'faceSwap', label: 'Face Swap', icon: UserRound },
  { id: 'aura', label: 'Aura', icon: Sparkles },
  { id: 'vtuber', label: 'VTuber', icon: Hand },
];

function useCamera() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');

  const start = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      setStream(media);
      setError('');
    } catch {
      setError('Camera access is required for live filter preview.');
    }
  };

  const stop = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  return { stream, error, start, stop };
}

function SplatScanPreview({ intensity, scanFileName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let frame = 0;
    let raf = 0;

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#111816');
      gradient.addColorStop(0.45, '#303126');
      gradient.addColorStop(1, '#090c0d');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 220; i += 1) {
        const orbit = (i * 0.618 + frame * 0.002) % 1;
        const x = width * (0.5 + Math.sin(i * 1.7 + frame * 0.01) * (0.1 + orbit * 0.34));
        const y = height * (0.48 + Math.cos(i * 1.21 + frame * 0.007) * (0.08 + orbit * 0.28));
        const radius = 1.2 + ((i % 13) / 13) * intensity;
        ctx.fillStyle = i % 5 === 0 ? 'rgba(225, 190, 118, 0.72)' : 'rgba(124, 185, 173, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(230, 226, 202, 0.18)';
      ctx.lineWidth = 1;
      for (let y = 24; y < height; y += 34) {
        ctx.beginPath();
        ctx.moveTo(0, y + Math.sin(frame * 0.015 + y) * 4);
        ctx.lineTo(width, y + Math.cos(frame * 0.012 + y) * 4);
        ctx.stroke();
      }

      frame += 1;
      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [intensity]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-stone-200/15 bg-[#0a0d0d]">
      <canvas ref={canvasRef} width="960" height="540" className="aspect-video w-full" />
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-white/10 bg-black/45 px-3 py-2 text-xs text-stone-100 backdrop-blur">
        <ScanLine className="h-4 w-4 text-amber-200" />
        {scanFileName || 'No scan asset loaded'}
      </div>
      <div className="absolute bottom-4 right-4 rounded-md border border-white/10 bg-black/45 px-3 py-2 text-xs text-stone-100 backdrop-blur">
        SuperSplat handoff ready
      </div>
    </div>
  );
}

function LivePreview({ stream, activeFilters, outputEnabled, onFps }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const faceRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    let unsub = () => {};
    FaceTracker.init().then(() => {
      unsub = FaceTracker.onChange((face) => {
        faceRef.current = face;
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return undefined;

    const ctx = canvas.getContext('2d');
    let raf = 0;
    let frames = 0;
    let lastFps = performance.now();

    const render = async () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (video.readyState >= 2) {
        await FaceTracker.processFrame(video);
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();
      } else {
        ctx.fillStyle = '#111816';
        ctx.fillRect(0, 0, width, height);
      }

      if (activeFilters.background) {
        const bg = ctx.createRadialGradient(width * 0.45, height * 0.35, 30, width * 0.5, height * 0.5, width * 0.65);
        bg.addColorStop(0, 'rgba(225, 190, 118, 0.24)');
        bg.addColorStop(1, 'rgba(32, 69, 67, 0.38)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);
      }

      const face = faceRef.current;
      if (face?.keyPoints) {
        const noseX = width - face.keyPoints.nose.x * width;
        const noseY = face.keyPoints.nose.y * height;
        const headWidth = Math.abs(face.keyPoints.leftCheek.x - face.keyPoints.rightCheek.x) * width;

        if (activeFilters.beauty) {
          ctx.fillStyle = 'rgba(255, 226, 204, 0.12)';
          ctx.beginPath();
          ctx.ellipse(noseX, noseY + headWidth * 0.08, headWidth * 0.78, headWidth * 0.95, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        if (activeFilters.mask) {
          ctx.strokeStyle = 'rgba(124, 185, 173, 0.88)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(noseX, noseY - headWidth * 0.1, headWidth * 0.62, headWidth * 0.36, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (activeFilters.hat) {
          ctx.fillStyle = 'rgba(24, 29, 28, 0.86)';
          ctx.fillRect(noseX - headWidth * 0.55, noseY - headWidth * 1.12, headWidth * 1.1, headWidth * 0.18);
          ctx.fillStyle = 'rgba(225, 190, 118, 0.82)';
          ctx.fillRect(noseX - headWidth * 0.32, noseY - headWidth * 1.58, headWidth * 0.64, headWidth * 0.5);
        }

        if (activeFilters.faceSwap) {
          ctx.fillStyle = 'rgba(170, 86, 71, 0.16)';
          ctx.beginPath();
          ctx.ellipse(noseX, noseY + headWidth * 0.04, headWidth * 0.5, headWidth * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (activeFilters.aura || activeFilters.vtuber) {
        particlesRef.current = updateParticleSystem(
          particlesRef.current,
          activeFilters.vtuber ? 'sparks' : 'aura',
          width,
          height,
          activeFilters.vtuber ? 90 : 65
        );
        particlesRef.current.forEach((particle) => particle.draw(ctx));
      } else {
        particlesRef.current = [];
      }

      if (outputEnabled) {
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.85)';
        ctx.lineWidth = 3;
        ctx.strokeRect(12, 12, width - 24, height - 24);
      }

      frames += 1;
      const now = performance.now();
      if (now - lastFps > 1000) {
        onFps(frames);
        frames = 0;
        lastFps = now;
      }
      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [activeFilters, onFps, outputEnabled]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-stone-200/15 bg-[#0a0d0d]">
      <video ref={videoRef} muted playsInline className="hidden" />
      <canvas ref={canvasRef} width="1280" height="720" className="aspect-video w-full" />
      <div className="absolute left-4 top-4 flex gap-2">
        <Badge className="border-emerald-300/30 bg-emerald-400/15 text-emerald-100">MediaPipe Face Mesh</Badge>
        <Badge className="border-stone-300/20 bg-stone-900/55 text-stone-100">30 FPS target</Badge>
      </div>
    </div>
  );
}

export default function LiveSplatFilters() {
  const { stream, error, start, stop } = useCamera();
  const [mode, setMode] = useState('background');
  const [scanFileName, setScanFileName] = useState('');
  const [splatIntensity, setSplatIntensity] = useState([4]);
  const [scanProgress, setScanProgress] = useState(38);
  const [fps, setFps] = useState(0);
  const [outputEnabled, setOutputEnabled] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    beauty: true,
    mask: false,
    hat: true,
    faceSwap: false,
    aura: true,
    vtuber: false,
    background: true,
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setScanProgress((current) => (current >= 96 ? 38 : current + 3));
    }, 1200);
    return () => window.clearInterval(id);
  }, []);

  const activeFilterCount = useMemo(
    () => Object.entries(activeFilters).filter(([key, value]) => key !== 'background' && value).length,
    [activeFilters]
  );

  const toggleFilter = (id) => {
    setActiveFilters((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <div className="min-h-screen bg-[#111816] text-stone-50">
      <div className="border-b border-stone-200/10 bg-[#111816]/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="border-amber-200/30 bg-amber-300/15 text-amber-100">LiveSplatFilters</Badge>
                <Badge variant="outline" className="border-stone-300/20 text-stone-300">MIT / Apache compatible path</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal text-stone-50 md:text-5xl">
                Splat background editing and live AR filters in one broadcast pipeline
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-300">
                A production-oriented workspace for environment scanning, SuperSplat-style cleanup, MediaPipe tracking,
                VRM-style avatar control, particles, and OBS-ready canvas output.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={stream ? stop : start} className="bg-amber-200 text-stone-950 hover:bg-amber-100">
                {stream ? <Pause className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                {stream ? 'Stop Camera' : 'Start Camera'}
              </Button>
              <Button variant="outline" className="border-stone-300/20 bg-stone-950/40 text-stone-100 hover:bg-stone-800" onClick={() => setOutputEnabled((value) => !value)}>
                <Radio className="mr-2 h-4 w-4" />
                {outputEnabled ? 'Output Armed' : 'Arm Output'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:px-8">
        <section className="min-w-0">
          <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList className="mb-4 h-auto gap-1 rounded-lg border border-stone-200/10 bg-stone-950/55 p-1">
              <TabsTrigger value="background" className="data-[state=active]:bg-amber-200 data-[state=active]:text-stone-950">
                <Layers3 className="mr-2 h-4 w-4" />
                Background Mode
              </TabsTrigger>
              <TabsTrigger value="live" className="data-[state=active]:bg-amber-200 data-[state=active]:text-stone-950">
                <Activity className="mr-2 h-4 w-4" />
                Live Filter Mode
              </TabsTrigger>
            </TabsList>

            <TabsContent value="background" className="mt-0">
              <SplatScanPreview intensity={splatIntensity[0]} scanFileName={scanFileName} />
              <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-lg border border-stone-200/10 bg-stone-950/45 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-stone-50">Environment Scan</h2>
                      <p className="text-xs text-stone-400">Video sweep or multi-photo capture can be sent to a .ply reconstruction worker.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center rounded-md border border-stone-300/20 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-950 hover:bg-white">
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                      <input
                        type="file"
                        accept="video/*,image/*,.ply,.splat"
                        className="hidden"
                        onChange={(event) => setScanFileName(event.target.files?.[0]?.name || '')}
                      />
                    </label>
                  </div>
                  <div className="space-y-4">
                    {PIPELINE_STEPS.map((step) => (
                      <div key={step.label}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold text-stone-100">{step.label}</span>
                          <span className="text-stone-400">{step.detail}</span>
                        </div>
                        <Progress value={step.label === 'Reconstruct' ? scanProgress : step.progress} className="bg-stone-800 [&>div]:bg-amber-200" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-stone-200/10 bg-stone-950/45 p-4">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-stone-50">SuperSplat Editor Fit</h2>
                      <p className="text-xs text-stone-400">Crop, prune, color, and publish controls mirror the permissive PlayCanvas flow.</p>
                    </div>
                    <Aperture className="h-5 w-5 text-amber-200" />
                  </div>
                  <div className="space-y-5">
                    <div>
                      <div className="mb-2 flex justify-between text-xs text-stone-300">
                        <span>Splat radius</span>
                        <span>{splatIntensity[0]}</span>
                      </div>
                      <Slider value={splatIntensity} onValueChange={setSplatIntensity} min={1} max={8} step={1} className="[&_[role=slider]]:border-amber-200 [&_[role=slider]]:bg-amber-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {['Trim floor noise', 'Optimize density', 'Color balance', 'Depth matte'].map((item) => (
                        <div key={item} className="rounded-md border border-stone-200/10 bg-[#111816] p-3 text-stone-200">
                          <Settings2 className="mb-3 h-4 w-4 text-amber-200" />
                          {item}
                        </div>
                      ))}
                    </div>
                    <Button className="w-full bg-stone-100 text-stone-950 hover:bg-white">
                      <Download className="mr-2 h-4 w-4" />
                      Save Optimized Background Asset
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="live" className="mt-0">
              <LivePreview stream={stream} activeFilters={activeFilters} outputEnabled={outputEnabled} onFps={setFps} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {FILTERS.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => toggleFilter(filter.id)}
                      className={`flex items-center justify-between rounded-lg border p-4 text-left transition ${
                        activeFilters[filter.id]
                          ? 'border-amber-200/50 bg-amber-200/12 text-amber-50'
                          : 'border-stone-200/10 bg-stone-950/45 text-stone-300 hover:border-stone-200/25'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span className="font-semibold">{filter.label}</span>
                      </span>
                      <span onClick={(event) => event.stopPropagation()}>
                        <Switch checked={activeFilters[filter.id]} onCheckedChange={() => toggleFilter(filter.id)} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-stone-200/10 bg-stone-950/55 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Runtime Budget</h2>
              <Gauge className="h-5 w-5 text-amber-200" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-[#111816] p-3">
                <div className="text-2xl font-semibold text-stone-50">{fps || '--'}</div>
                <div className="text-[11px] uppercase text-stone-500">FPS</div>
              </div>
              <div className="rounded-md bg-[#111816] p-3">
                <div className="text-2xl font-semibold text-stone-50">468</div>
                <div className="text-[11px] uppercase text-stone-500">Face points</div>
              </div>
              <div className="rounded-md bg-[#111816] p-3">
                <div className="text-2xl font-semibold text-stone-50">{activeFilterCount}</div>
                <div className="text-[11px] uppercase text-stone-500">Filters</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-md border border-stone-200/10 bg-[#111816] px-3 py-3">
              <span className="text-sm text-stone-200">Composite splat behind user</span>
              <Switch checked={activeFilters.background} onCheckedChange={() => toggleFilter('background')} />
            </div>
          </div>

          <div className="rounded-lg border border-stone-200/10 bg-stone-950/55 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Integration Map</h2>
              <FlaskConical className="h-5 w-5 text-amber-200" />
            </div>
            <div className="space-y-3">
              {OPEN_SOURCE_MODULES.map((mod) => (
                <div key={mod.repo} className="rounded-md border border-stone-200/10 bg-[#111816] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-stone-100">{mod.name}</span>
                    <Badge variant="outline" className="border-stone-300/20 text-stone-300">{mod.license}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">{mod.repo}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-300">{mod.role}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-stone-200/10 bg-stone-950/55 p-4">
            <h2 className="mb-3 text-base font-semibold">Output Contract</h2>
            <div className="space-y-2 text-sm text-stone-300">
              <div className="flex items-center gap-2"><Play className="h-4 w-4 text-emerald-300" /> Canvas can be captured with `captureStream(30)` for WebRTC.</div>
              <div className="flex items-center gap-2"><FileUp className="h-4 w-4 text-amber-200" /> Uploaded face image or VRM assets stay client-side until a storage flow is added.</div>
              <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-sky-200" /> OBS handoff can consume the armed browser output scene.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
