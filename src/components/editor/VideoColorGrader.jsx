import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Copy, Download } from 'lucide-react';

const LUTS = [
  { id: 'none',       name: 'None',         preview: '#1a1a1a' },
  { id: 'cinematic',  name: 'Cinematic',    preview: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)' },
  { id: 'golden',     name: 'Golden Hour',  preview: 'linear-gradient(135deg,#2d1b00,#7a4100,#c87941)' },
  { id: 'teal_org',   name: 'Teal & Orange',preview: 'linear-gradient(135deg,#006060,#007070,#c85f00)' },
  { id: 'bleach',     name: 'Bleach Bypass',preview: 'linear-gradient(135deg,#2a2a2a,#3d3d3a,#4a4840)' },
  { id: 'vintage',    name: 'Vintage',      preview: 'linear-gradient(135deg,#3d2b1f,#5c4033,#8b6e57)' },
  { id: 'neon',       name: 'Neon Pop',     preview: 'linear-gradient(135deg,#0d0d2b,#6600ff,#ff0066)' },
  { id: 'moonlight',  name: 'Moonlight',    preview: 'linear-gradient(135deg,#0a1628,#1a2d4a,#2d4a6e)' },
  { id: 'desert',     name: 'Desert Dunes', preview: 'linear-gradient(135deg,#3d2800,#7a5c20,#c8a030)' },
  { id: 'horror',     name: 'Horror Red',   preview: 'linear-gradient(135deg,#1a0000,#4d0000,#8b0000)' },
  { id: 'arctic',     name: 'Arctic',       preview: 'linear-gradient(135deg,#e8f4f8,#b0d4e8,#7ab8d4)' },
  { id: 'kodak',      name: 'Kodak Film',   preview: 'linear-gradient(135deg,#3d2a1a,#8b6040,#c8a060)' },
];

const WHEELS = ['Shadows', 'Midtones', 'Highlights'];

function ColorWheel({ label, value, onChange }) {
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const x = ((e.clientX - rect.left - cx) / cx) * 100;
    const y = ((e.clientY - rect.top - cy) / cy) * 100;
    onChange({ x: Math.round(x), y: Math.round(y) });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-20 h-20 rounded-full cursor-crosshair border border-white/[0.1]"
        style={{
          background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
        }}
        onClick={handleClick}
      >
        {/* White center radial */}
        <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)' }} />
        {/* Indicator dot */}
        <div
          className="absolute w-3 h-3 rounded-full bg-white border-2 border-black shadow-lg"
          style={{
            left: `calc(50% + ${(value?.x || 0) * 0.4}%)`,
            top: `calc(50% + ${(value?.y || 0) * 0.4}%)`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
      <span className="text-white/40 text-[10px] font-medium">{label}</span>
    </div>
  );
}

const CONTROLS = [
  { key: 'exposure',    label: 'Exposure',    min: -3, max: 3,   step: 0.1, unit: 'EV' },
  { key: 'contrast',    label: 'Contrast',    min: -100, max: 100, step: 1,   unit: '' },
  { key: 'highlights',  label: 'Highlights',  min: -100, max: 100, step: 1,   unit: '' },
  { key: 'shadows',     label: 'Shadows',     min: -100, max: 100, step: 1,   unit: '' },
  { key: 'whites',      label: 'Whites',      min: -100, max: 100, step: 1,   unit: '' },
  { key: 'blacks',      label: 'Blacks',      min: -100, max: 100, step: 1,   unit: '' },
  { key: 'temperature', label: 'Temp (K)',    min: 2000, max: 10000, step: 100, unit: 'K' },
  { key: 'tint',        label: 'Tint',        min: -100, max: 100, step: 1,   unit: '' },
  { key: 'vibrance',    label: 'Vibrance',    min: -100, max: 100, step: 1,   unit: '' },
  { key: 'saturation',  label: 'Saturation',  min: -100, max: 100, step: 1,   unit: '' },
  { key: 'clarity',     label: 'Clarity',     min: -100, max: 100, step: 1,   unit: '' },
  { key: 'sharpness',   label: 'Sharpness',   min: 0,    max: 100, step: 1,   unit: '' },
  { key: 'noise_reduct',label: 'Noise Reduc.',min: 0,    max: 100, step: 1,   unit: '' },
  { key: 'vignette',    label: 'Vignette',    min: -100, max: 100, step: 1,   unit: '' },
  { key: 'grain',       label: 'Film Grain',  min: 0,    max: 100, step: 1,   unit: '' },
  { key: 'fade',        label: 'Fade',        min: 0,    max: 100, step: 1,   unit: '' },
];

const defaults = Object.fromEntries(CONTROLS.map(c => [c.key, c.key === 'temperature' ? 6500 : 0]));

export default function VideoColorGrader({ onGradeChange }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedLut, setSelectedLut] = useState('none');
  const [vals, setVals] = useState(defaults);
  const [wheels, setWheels] = useState({
    Shadows: { x: 0, y: 0 },
    Midtones: { x: 0, y: 0 },
    Highlights: { x: 0, y: 0 },
  });
  const [savedLooks, setSavedLooks] = useState([]);

  const update = (key, val) => {
    const next = { ...vals, [key]: val };
    setVals(next);
    onGradeChange?.({ adjustments: next, lut: selectedLut, wheels });
  };

  const reset = () => {
    setVals(defaults);
    setSelectedLut('none');
    setWheels({ Shadows: { x: 0, y: 0 }, Midtones: { x: 0, y: 0 }, Highlights: { x: 0, y: 0 } });
    onGradeChange?.(null);
  };

  const saveLook = () => {
    const name = `Look ${savedLooks.length + 1}`;
    setSavedLooks(p => [...p, { name, vals: { ...vals }, lut: selectedLut, wheels: { ...wheels } }]);
  };

  const applyLook = (look) => {
    setVals(look.vals);
    setSelectedLut(look.lut);
    setWheels(look.wheels);
    onGradeChange?.({ adjustments: look.vals, lut: look.lut, wheels: look.wheels });
  };

  const getDisplayVal = (c) => {
    const v = vals[c.key];
    if (c.key === 'temperature') return `${v}${c.unit}`;
    return `${v > 0 ? '+' : ''}${v}${c.unit}`;
  };

  const TABS = [
    { id: 'basic', label: 'Basic' },
    { id: 'tone', label: 'Tone Curve' },
    { id: 'color', label: 'Color Wheels' },
    { id: 'lut', label: 'LUTs' },
    { id: 'detail', label: 'Detail' },
  ];

  const basicKeys = ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'temperature', 'tint', 'vibrance', 'saturation'];
  const detailKeys = ['clarity', 'sharpness', 'noise_reduct', 'vignette', 'grain', 'fade'];

  return (
    <div className="flex flex-col h-full bg-[#0c0c14] border-l border-white/[0.06]">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-shrink-0 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === t.id
                ? 'border-amber-500 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-white/30 hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Header actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.04]">
        <button onClick={reset} className="flex items-center gap-1 text-white/30 hover:text-white/60 text-[10px] transition-colors">
          <RefreshCw className="w-3 h-3" /> Reset
        </button>
        <div className="flex-1" />
        <button onClick={saveLook} className="flex items-center gap-1 text-amber-400/60 hover:text-amber-400 text-[10px] transition-colors">
          <Copy className="w-3 h-3" /> Save Look
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Basic adjustments */}
        {activeTab === 'basic' && (
          <div className="space-y-2.5">
            {CONTROLS.filter(c => basicKeys.includes(c.key)).map(c => (
              <div key={c.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-white/45 text-[10px]">{c.label}</span>
                  <span className="text-white/30 text-[10px] tabular-nums font-mono">{getDisplayVal(c)}</span>
                </div>
                <div className="relative">
                  <input
                    type="range" min={c.min} max={c.max} step={c.step}
                    value={vals[c.key]}
                    onChange={e => update(c.key, +e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-amber-500"
                    style={{
                      background: `linear-gradient(to right, #f59e0b ${((vals[c.key] - c.min) / (c.max - c.min)) * 100}%, rgba(255,255,255,0.1) ${((vals[c.key] - c.min) / (c.max - c.min)) * 100}%)`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tone curve placeholder */}
        {activeTab === 'tone' && (
          <div className="space-y-3">
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Tone Curve</p>
            <div className="rounded-xl bg-black/40 border border-white/[0.08] overflow-hidden">
              <svg viewBox="0 0 200 200" className="w-full h-40 block">
                <defs>
                  <linearGradient id="diagGrad" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#111" />
                    <stop offset="100%" stopColor="#555" />
                  </linearGradient>
                </defs>
                <rect width="200" height="200" fill="url(#diagGrad)" />
                {/* Grid */}
                {[50,100,150].map(v => (
                  <g key={v}>
                    <line x1={v} y1="0" x2={v} y2="200" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <line x1="0" y1={v} x2="200" y2={v} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  </g>
                ))}
                {/* Default diagonal */}
                <path d="M 0 200 C 50 150, 150 50, 200 0" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
                {/* Control points */}
                {[[50,150],[100,100],[150,50]].map(([cx,cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="4" fill="#f59e0b" className="cursor-pointer" />
                ))}
              </svg>
            </div>
            <p className="text-white/20 text-[10px] text-center">Drag control points to adjust tone mapping</p>
          </div>
        )}

        {/* Color wheels */}
        {activeTab === 'color' && (
          <div className="space-y-4">
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Color Wheels</p>
            <div className="flex justify-around">
              {WHEELS.map(w => (
                <ColorWheel
                  key={w}
                  label={w}
                  value={wheels[w]}
                  onChange={(v) => {
                    const next = { ...wheels, [w]: v };
                    setWheels(next);
                    onGradeChange?.({ adjustments: vals, lut: selectedLut, wheels: next });
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {WHEELS.map(w => (
                <div key={w} className="text-center">
                  <p className="text-white/20 text-[9px]">{w}</p>
                  <p className="text-amber-400/60 text-[10px] font-mono">
                    {wheels[w].x > 0 ? '+' : ''}{wheels[w].x}, {wheels[w].y > 0 ? '+' : ''}{wheels[w].y}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LUTs */}
        {activeTab === 'lut' && (
          <div className="space-y-2">
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Look-Up Tables</p>
            <div className="grid grid-cols-2 gap-2">
              {LUTS.map(lut => (
                <button
                  key={lut.id}
                  onClick={() => { setSelectedLut(lut.id); onGradeChange?.({ adjustments: vals, lut: lut.id, wheels }); }}
                  className={`rounded-xl overflow-hidden border-2 transition-all ${
                    selectedLut === lut.id ? 'border-amber-500' : 'border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="h-12 w-full" style={{ background: lut.preview }} />
                  <div className="py-1 px-2 bg-white/[0.03] text-left">
                    <p className="text-white/60 text-[10px] font-medium">{lut.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detail */}
        {activeTab === 'detail' && (
          <div className="space-y-2.5">
            {CONTROLS.filter(c => detailKeys.includes(c.key)).map(c => (
              <div key={c.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-white/45 text-[10px]">{c.label}</span>
                  <span className="text-white/30 text-[10px] tabular-nums font-mono">{getDisplayVal(c)}</span>
                </div>
                <input
                  type="range" min={c.min} max={c.max} step={c.step}
                  value={vals[c.key]}
                  onChange={e => update(c.key, +e.target.value)}
                  className="w-full h-1.5 rounded-full cursor-pointer accent-amber-500"
                />
              </div>
            ))}
          </div>
        )}

        {/* Saved Looks */}
        {savedLooks.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3">
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Saved Looks</p>
            <div className="space-y-1">
              {savedLooks.map((look, i) => (
                <button
                  key={i}
                  onClick={() => applyLook(look)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-white/50 hover:text-white text-xs transition-all"
                >
                  <span>{look.name}</span>
                  <span className="text-white/20">{look.lut !== 'none' ? LUTS.find(l => l.id === look.lut)?.name : 'Custom'}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}