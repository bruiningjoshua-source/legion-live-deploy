import React, { useState } from 'react';
import { Sparkles, Sliders, Zap, Filter, Type, Music } from 'lucide-react';

const FILTERS = [
  { id: 'none', label: 'None', preview: '#333' },
  { id: 'vivid', label: 'Vivid', preview: 'linear-gradient(135deg,#ff6b6b,#ffd93d)' },
  { id: 'cinema', label: 'Cinema', preview: 'linear-gradient(135deg,#1a1a2e,#16213e)' },
  { id: 'vintage', label: 'Vintage', preview: 'linear-gradient(135deg,#d4a574,#8b6f47)' },
  { id: 'cool', label: 'Cool', preview: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { id: 'warm', label: 'Warm', preview: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { id: 'moody', label: 'Moody', preview: 'linear-gradient(135deg,#2c3e50,#3498db)' },
  { id: 'summer', label: 'Summer', preview: 'linear-gradient(135deg,#f9ca24,#f0932b)' },
  { id: 'noir', label: 'Noir', preview: 'linear-gradient(135deg,#111,#333)' },
  { id: 'dreamy', label: 'Dreamy', preview: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)' },
];

const TRANSITIONS = [
  { id: 'cut', label: 'Cut', icon: '✂️' },
  { id: 'fade', label: 'Fade', icon: '⬛' },
  { id: 'dissolve', label: 'Dissolve', icon: '🔄' },
  { id: 'wipe_left', label: 'Wipe Left', icon: '◀' },
  { id: 'wipe_right', label: 'Wipe Right', icon: '▶' },
  { id: 'zoom_in', label: 'Zoom In', icon: '🔍' },
  { id: 'slide_up', label: 'Slide Up', icon: '⬆' },
  { id: 'spin', label: 'Spin', icon: '🔃' },
  { id: 'glitch', label: 'Glitch', icon: '⚡' },
];

const TEXT_PRESETS = [
  { id: 'title', label: 'Big Title', style: 'text-4xl font-black text-white drop-shadow-lg' },
  { id: 'subtitle', label: 'Subtitle', style: 'text-xl font-medium text-white/80' },
  { id: 'lower_third', label: 'Lower Third', style: 'text-sm font-bold text-white bg-black/70 px-3 py-1' },
  { id: 'caption', label: 'Caption', style: 'text-xs text-white/60' },
  { id: 'kinetic', label: 'Kinetic', style: 'text-2xl font-black text-amber-400 animate-pulse' },
  { id: 'credits', label: 'Credits', style: 'text-sm text-white/50 tracking-widest uppercase' },
];

const SOUND_FX = [
  { id: 'whoosh', label: 'Whoosh', emoji: '💨' },
  { id: 'pop', label: 'Pop', emoji: '💥' },
  { id: 'ding', label: 'Ding', emoji: '🔔' },
  { id: 'swipe', label: 'Swipe', emoji: '👆' },
  { id: 'boom', label: 'Boom', emoji: '💣' },
  { id: 'laugh', label: 'Laugh', emoji: '😂' },
  { id: 'clap', label: 'Clap', emoji: '👏' },
  { id: 'coin', label: 'Coin', emoji: '🪙' },
];

const ADJUSTMENT_CONTROLS = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100, default: 0 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, default: 0 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, default: 0 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100, default: 0 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100, default: 0 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 100, default: 0 },
  { key: 'grain', label: 'Film Grain', min: 0, max: 100, default: 0 },
  { key: 'fade', label: 'Fade', min: 0, max: 100, default: 0 },
];

export default function VideoEffectsPanel({ onApplyFilter, onApplyTransition, onAddText, onAddEffect }) {
  const [activeSection, setActiveSection] = useState('adjust');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [adjustments, setAdjustments] = useState(
    Object.fromEntries(ADJUSTMENT_CONTROLS.map(c => [c.key, c.default]))
  );
  const [textInput, setTextInput] = useState('');
  const [selectedTextPreset, setSelectedTextPreset] = useState('title');

  const sections = [
    { id: 'adjust', label: 'Adjust', icon: Sliders },
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'transitions', label: 'Transitions', icon: Zap },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'effects', label: 'Effects', icon: Sparkles },
    { id: 'audio', label: 'Audio FX', icon: Music },
  ];

  const resetAdjustments = () => setAdjustments(Object.fromEntries(ADJUSTMENT_CONTROLS.map(c => [c.key, c.default])));

  return (
    <div className="flex flex-col h-full bg-[#0d0d18] border-l border-white/[0.06]">
      {/* Section tabs */}
      <div className="flex overflow-x-auto scrollbar-hide border-b border-white/[0.06]">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2.5 shrink-0 text-xs font-medium transition-all border-b-2 ${
              activeSection === id
                ? 'border-amber-500 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-white/30 hover:text-white/60'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Adjust */}
        {activeSection === 'adjust' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white/30 text-xs uppercase tracking-wide">Color & Tone</p>
              <button onClick={resetAdjustments} className="text-white/20 hover:text-amber-400 text-xs transition-colors">Reset All</button>
            </div>
            {ADJUSTMENT_CONTROLS.map(c => (
              <div key={c.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-white/50 text-xs">{c.label}</span>
                  <span className="text-white/30 text-xs tabular-nums">{adjustments[c.key] > 0 ? '+' : ''}{adjustments[c.key]}</span>
                </div>
                <input
                  type="range" min={c.min} max={c.max} step={1}
                  value={adjustments[c.key]}
                  onChange={e => {
                    const v = +e.target.value;
                    setAdjustments(a => ({ ...a, [c.key]: v }));
                    onApplyFilter?.({ ...adjustments, [c.key]: v });
                  }}
                  className="w-full accent-amber-500 h-1"
                />
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        {activeSection === 'filters' && (
          <div>
            <p className="text-white/30 text-xs uppercase tracking-wide mb-3">Preset Filters</p>
            <div className="grid grid-cols-2 gap-2">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setSelectedFilter(f.id); onApplyFilter?.({ filter: f.id }); }}
                  className={`rounded-xl overflow-hidden border-2 transition-all ${
                    selectedFilter === f.id ? 'border-amber-500' : 'border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="h-14 w-full" style={{ background: f.preview }} />
                  <div className="py-1 px-2 text-xs text-white/60 text-center">{f.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transitions */}
        {activeSection === 'transitions' && (
          <div>
            <p className="text-white/30 text-xs uppercase tracking-wide mb-3">Clip Transitions</p>
            <div className="grid grid-cols-3 gap-2">
              {TRANSITIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => onApplyTransition?.(t.id)}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20 transition-all"
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-white/50 text-[10px]">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text */}
        {activeSection === 'text' && (
          <div className="space-y-4">
            <p className="text-white/30 text-xs uppercase tracking-wide">Add Text</p>
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="Type your text..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/50 placeholder:text-white/20"
            />
            <div className="grid grid-cols-2 gap-2">
              {TEXT_PRESETS.map(tp => (
                <button
                  key={tp.id}
                  onClick={() => setSelectedTextPreset(tp.id)}
                  className={`py-3 px-2 rounded-xl text-xs transition-all border ${
                    selectedTextPreset === tp.id ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60'
                  }`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { if (textInput.trim()) { onAddText?.({ text: textInput, preset: selectedTextPreset }); setTextInput(''); } }}
              disabled={!textInput.trim()}
              className="w-full py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-sm disabled:opacity-40 transition-colors"
            >
              + Add to Timeline
            </button>
          </div>
        )}

        {/* Effects */}
        {activeSection === 'effects' && (
          <div className="space-y-3">
            <p className="text-white/30 text-xs uppercase tracking-wide">Motion Effects</p>
            {[
              { id: 'zoom_in', label: 'Ken Burns Zoom In', desc: 'Slow zoom into center' },
              { id: 'zoom_out', label: 'Ken Burns Zoom Out', desc: 'Slow zoom out from center' },
              { id: 'pan_left', label: 'Pan Left', desc: 'Slow horizontal pan' },
              { id: 'pan_right', label: 'Pan Right', desc: 'Slow horizontal pan' },
              { id: 'shake', label: 'Camera Shake', desc: 'Handheld shake effect' },
              { id: 'glitch', label: 'Digital Glitch', desc: 'RGB split glitch' },
              { id: 'vhs', label: 'VHS Tape', desc: 'Retro scan lines' },
              { id: 'bokeh', label: 'Focus Blur', desc: 'Depth of field effect' },
            ].map(ef => (
              <button
                key={ef.id}
                onClick={() => onAddEffect?.(ef.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] group transition-all text-left"
              >
                <div>
                  <p className="text-white/70 text-sm group-hover:text-white transition-colors">{ef.label}</p>
                  <p className="text-white/25 text-xs">{ef.desc}</p>
                </div>
                <span className="text-amber-400/50 group-hover:text-amber-400 text-xs transition-colors">+ Add</span>
              </button>
            ))}
          </div>
        )}

        {/* Audio FX */}
        {activeSection === 'audio' && (
          <div className="space-y-3">
            <p className="text-white/30 text-xs uppercase tracking-wide">Sound Effects</p>
            <div className="grid grid-cols-2 gap-2">
              {SOUND_FX.map(fx => (
                <button
                  key={fx.id}
                  onClick={() => onAddEffect?.({ type: 'sfx', id: fx.id })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-left transition-all"
                >
                  <span className="text-lg">{fx.emoji}</span>
                  <span className="text-white/50 text-xs">{fx.label}</span>
                </button>
              ))}
            </div>
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-white/30 text-xs uppercase tracking-wide mb-3">Audio Settings</p>
              {[
                { label: 'Volume', key: 'vol', min: 0, max: 200 },
                { label: 'Bass Boost', key: 'bass', min: 0, max: 100 },
                { label: 'Speed', key: 'speed', min: 25, max: 400 },
                { label: 'Pitch', key: 'pitch', min: -12, max: 12 },
              ].map(s => (
                <div key={s.key} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-white/40 text-xs">{s.label}</span>
                    <span className="text-white/30 text-xs">{s.key === 'speed' ? '100%' : '0'}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} defaultValue={(s.min + s.max) / 2} className="w-full accent-cyan-500 h-1" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}