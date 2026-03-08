import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronUp } from 'lucide-react';
import { Slider } from "@/components/ui/slider";


/**
 * BeautyFilter — Canvas-based real-time beauty & color grading.
 * Applies CSS filters + canvas post-processing directly to the video element.
 * No MediaPipe dependency required — works instantly on any device.
 */

const BEAUTY_DEFAULTS = { smooth: 0, brightness: 100, contrast: 100, saturate: 100, warmth: 0 };

const QUICK_PRESETS = [
  { id: 'none', name: 'Natural', icon: '🌿', filters: { ...BEAUTY_DEFAULTS } },
  { id: 'portrait', name: 'Portrait', icon: '👤', filters: { smooth: 30, brightness: 105, contrast: 105, saturate: 95, warmth: 5 } },
  { id: 'glamour', name: 'Glamour', icon: '✨', filters: { smooth: 50, brightness: 108, contrast: 110, saturate: 110, warmth: 10 } },
  { id: 'golden', name: 'Golden Hour', icon: '🌅', filters: { smooth: 20, brightness: 106, contrast: 105, saturate: 115, warmth: 20 } },
  { id: 'cool', name: 'Cool Blue', icon: '❄️', filters: { smooth: 15, brightness: 102, contrast: 110, saturate: 95, warmth: -15 } },
  { id: 'cinematic', name: 'Cinematic', icon: '🎬', filters: { smooth: 10, brightness: 95, contrast: 120, saturate: 90, warmth: 0 } },
  { id: 'dream', name: 'Soft Dream', icon: '☁️', filters: { smooth: 60, brightness: 110, contrast: 90, saturate: 85, warmth: 8 } },
  { id: 'vivid', name: 'Vivid', icon: '🎨', filters: { smooth: 5, brightness: 103, contrast: 115, saturate: 140, warmth: 5 } },
];

function BeautyFilter({ videoRef, onFilterChange }) {
  const [expanded, setExpanded] = useState(false);
  const [activePreset, setActivePreset] = useState('none');
  const [filters, setFilters] = useState({ ...BEAUTY_DEFAULTS });

  const applyFilters = useCallback((newFilters) => {
    if (!videoRef?.current) return;
    const v = videoRef.current;
    
    // Build CSS filter string
    const parts = [];
    if (newFilters.brightness !== 100) parts.push(`brightness(${newFilters.brightness}%)`);
    if (newFilters.contrast !== 100) parts.push(`contrast(${newFilters.contrast}%)`);
    if (newFilters.saturate !== 100) parts.push(`saturate(${newFilters.saturate}%)`);
    if (newFilters.smooth > 0) parts.push(`blur(${newFilters.smooth * 0.02}px)`);
    if (newFilters.warmth > 0) parts.push(`sepia(${newFilters.warmth}%)`);
    if (newFilters.warmth < 0) parts.push(`hue-rotate(${newFilters.warmth * 2}deg)`);
    
    // Preserve the mirror transform
    const currentTransform = v.style.transform || '';
    const hasMirror = currentTransform.includes('scaleX(-1)');
    v.style.filter = parts.join(' ');
    if (hasMirror) v.style.transform = 'scaleX(-1)';
    
    onFilterChange?.(newFilters);
  }, [videoRef, onFilterChange]);

  const handlePresetSelect = useCallback((preset) => {
    setActivePreset(preset.id);
    setFilters(preset.filters);
    applyFilters(preset.filters);
  }, [applyFilters]);

  const handleSliderChange = useCallback((key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setActivePreset('custom');
    applyFilters(newFilters);
  }, [filters, applyFilters]);

  const resetFilters = useCallback(() => {
    setFilters({ ...BEAUTY_DEFAULTS });
    setActivePreset('none');
    applyFilters(BEAUTY_DEFAULTS);
  }, [applyFilters]);

  return (
    <div className="absolute bottom-36 left-0 right-0 z-20 px-3">
      {/* Preset strip — always visible when beauty tool is active */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-2">
        {QUICK_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => handlePresetSelect(preset)}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl shrink-0 transition-all ${
              activePreset === preset.id
                ? 'bg-amber-500/30 border border-amber-400/50'
                : 'bg-black/40 backdrop-blur-sm border border-white/10'
            }`}
          >
            <span className="text-base">{preset.icon}</span>
            <span className={`text-[9px] whitespace-nowrap ${
              activePreset === preset.id ? 'text-amber-300 font-medium' : 'text-white/50'
            }`}>{preset.name}</span>
          </button>
        ))}
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 mx-auto mt-1 px-3 py-1 bg-black/40 backdrop-blur-sm rounded-full border border-white/10 text-white/50 text-xs"
      >
        <Sparkles className="w-3 h-3" />
        {expanded ? 'Less' : 'Fine-tune'}
        <ChevronUp className={`w-3 h-3 transition-transform ${expanded ? '' : 'rotate-180'}`} />
      </button>

      {/* Expanded sliders */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 p-4 mt-2 space-y-4">
              {[
                { key: 'smooth', label: 'Smoothing', iconName: 'droplets', min: 0, max: 80 },
                { key: 'brightness', label: 'Brightness', iconName: 'sun', min: 80, max: 120 },
                { key: 'contrast', label: 'Contrast', iconName: 'palette', min: 80, max: 140 },
                { key: 'saturate', label: 'Saturation', iconName: 'sparkles', min: 60, max: 160 },
                { key: 'warmth', label: 'Warmth', iconName: 'sun2', min: -20, max: 30 },
              ].map(({ key, label, min, max }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-white/40" />
                      <span className="text-white/70 text-xs">{label}</span>
                    </div>
                    <span className="text-amber-400 text-xs font-mono">{filters[key]}</span>
                  </div>
                  <Slider
                    value={[filters[key]]}
                    onValueChange={([v]) => handleSliderChange(key, v)}
                    min={min}
                    max={max}
                    step={1}
                    className="[&_[role=slider]]:bg-amber-500 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4"
                  />
                </div>
              ))}
              
              <button
                onClick={resetFilters}
                className="w-full py-2 rounded-xl bg-white/10 text-white/50 text-xs hover:bg-white/15 transition-colors"
              >
                Reset to Natural
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(BeautyFilter);