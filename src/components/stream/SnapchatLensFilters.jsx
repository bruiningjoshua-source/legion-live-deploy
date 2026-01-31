/**
 * SnapchatLensFilters - Premium AR Lens System
 * Real-time video processing with canvas-based filters, backgrounds, and effects
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Sparkles, 
  Palette,
  Image as ImageIcon,
  Upload,
  FlipHorizontal,
  RefreshCw,
  Smile,
  Wand2,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// FILTER PRESETS - Color grading effects
// ============================================

const COLOR_FILTERS = [
  { id: 'none', name: 'Normal', emoji: '⚪', adjustments: {} },
  { id: 'vivid', name: 'Vivid', emoji: '🌈', adjustments: { saturation: 1.4, contrast: 1.1, brightness: 1.05 } },
  { id: 'warm', name: 'Warm', emoji: '🌅', adjustments: { temperature: 30, saturation: 1.1, brightness: 1.05 } },
  { id: 'cool', name: 'Cool', emoji: '❄️', adjustments: { temperature: -25, saturation: 0.95, brightness: 1.03 } },
  { id: 'vintage', name: 'Vintage', emoji: '📷', adjustments: { sepia: 0.4, contrast: 1.1, saturation: 0.8, vignette: 0.3 } },
  { id: 'bw', name: 'B&W', emoji: '⚫', adjustments: { saturation: 0, contrast: 1.15 } },
  { id: 'dramatic', name: 'Dramatic', emoji: '🎭', adjustments: { contrast: 1.35, saturation: 0.85, brightness: 0.92, vignette: 0.4 } },
  { id: 'dreamy', name: 'Dreamy', emoji: '☁️', adjustments: { brightness: 1.12, contrast: 0.88, saturation: 0.92, blur: 1 } },
  { id: 'neon', name: 'Neon', emoji: '💜', adjustments: { saturation: 1.6, contrast: 1.25, brightness: 1.1, hueShift: 15 } },
  { id: 'retro', name: 'Retro', emoji: '📻', adjustments: { sepia: 0.25, contrast: 1.15, saturation: 0.85, vignette: 0.25 } },
  { id: 'cinema', name: 'Cinema', emoji: '🎬', adjustments: { contrast: 1.2, saturation: 0.88, brightness: 0.94, teal: 0.15 } },
  { id: 'sunset', name: 'Sunset', emoji: '🌇', adjustments: { temperature: 45, saturation: 1.2, contrast: 1.1 } },
  { id: 'moonlight', name: 'Moonlight', emoji: '🌙', adjustments: { temperature: -35, brightness: 0.9, contrast: 1.15, saturation: 0.7 } },
  { id: 'golden', name: 'Golden Hour', emoji: '✨', adjustments: { temperature: 35, saturation: 1.15, brightness: 1.08, contrast: 1.05 } },
];

// ============================================
// BEAUTY FILTERS - Skin smoothing & enhancement
// ============================================

const BEAUTY_PRESETS = [
  { id: 'none', name: 'Natural', emoji: '🌿', smooth: 0, brightness: 0, glow: 0 },
  { id: 'light', name: 'Light Touch', emoji: '✨', smooth: 15, brightness: 3, glow: 5 },
  { id: 'medium', name: 'Soft Glow', emoji: '💫', smooth: 30, brightness: 5, glow: 10 },
  { id: 'glamour', name: 'Glamour', emoji: '💎', smooth: 45, brightness: 8, glow: 15 },
  { id: 'porcelain', name: 'Porcelain', emoji: '🎀', smooth: 55, brightness: 10, glow: 8 },
  { id: 'hd', name: 'HD Ready', emoji: '📺', smooth: 25, brightness: 5, glow: 5, sharpen: 10 },
];

// ============================================
// AR FACE EFFECTS - Overlay accessories
// ============================================

const FACE_EFFECTS = [
  { id: 'none', name: 'None', emoji: '🚫' },
  // Animal ears & features
  { id: 'dog', name: 'Puppy', emoji: '🐶', overlay: 'dog_ears', nose: 'dog_nose' },
  { id: 'cat', name: 'Kitty', emoji: '🐱', overlay: 'cat_ears', nose: 'cat_nose' },
  { id: 'bunny', name: 'Bunny', emoji: '🐰', overlay: 'bunny_ears', nose: 'bunny_nose' },
  { id: 'fox', name: 'Fox', emoji: '🦊', overlay: 'fox_ears', nose: 'fox_nose' },
  { id: 'bear', name: 'Bear', emoji: '🐻', overlay: 'bear_ears', nose: 'bear_nose' },
  { id: 'deer', name: 'Deer', emoji: '🦌', overlay: 'deer_antlers', nose: 'deer_nose' },
  { id: 'lion', name: 'Lion', emoji: '🦁', overlay: 'lion_mane' },
  { id: 'panda', name: 'Panda', emoji: '🐼', overlay: 'panda_face' },
  { id: 'koala', name: 'Koala', emoji: '🐨', overlay: 'koala_ears', nose: 'koala_nose' },
  // Accessories
  { id: 'crown', name: 'Crown', emoji: '👑', overlay: 'crown' },
  { id: 'halo', name: 'Angel', emoji: '😇', overlay: 'halo', particles: 'sparkles' },
  { id: 'devil', name: 'Devil', emoji: '😈', overlay: 'devil_horns' },
  { id: 'glasses', name: 'Cool Glasses', emoji: '😎', overlay: 'sunglasses' },
  { id: 'hearts', name: 'Heart Eyes', emoji: '😍', overlay: 'heart_eyes' },
  { id: 'fire', name: 'Fire Eyes', emoji: '🔥', overlay: 'fire_eyes', animated: true },
  { id: 'tears', name: 'Crying', emoji: '😭', overlay: 'tears', animated: true },
  { id: 'sparkle', name: 'Sparkle', emoji: '✨', overlay: 'face_sparkles', animated: true },
  // Seasonal
  { id: 'santa', name: 'Santa', emoji: '🎅', overlay: 'santa_hat', particles: 'snow' },
  { id: 'witch', name: 'Witch', emoji: '🧙‍♀️', overlay: 'witch_hat' },
  { id: 'party', name: 'Party', emoji: '🎉', overlay: 'party_hat', particles: 'confetti' },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', overlay: 'unicorn_horn', particles: 'rainbow' },
];

// ============================================
// VIRTUAL BACKGROUNDS - Green screen replacement
// ============================================

const BACKGROUNDS = [
  { id: 'none', name: 'Camera', emoji: '📷', type: 'none' },
  // Blur options
  { id: 'blur_light', name: 'Light Blur', emoji: '💨', type: 'blur', intensity: 8 },
  { id: 'blur_medium', name: 'Medium Blur', emoji: '🌫️', type: 'blur', intensity: 18 },
  { id: 'blur_heavy', name: 'Heavy Blur', emoji: '🌁', type: 'blur', intensity: 30 },
  // Solid colors
  { id: 'black', name: 'Black', emoji: '⬛', type: 'color', value: '#000000' },
  { id: 'white', name: 'White', emoji: '⬜', type: 'color', value: '#ffffff' },
  { id: 'green', name: 'Green Screen', emoji: '🟩', type: 'color', value: '#00ff00' },
  { id: 'blue', name: 'Blue Screen', emoji: '🟦', type: 'color', value: '#0066ff' },
  // Gradients
  { id: 'sunset', name: 'Sunset', emoji: '🌅', type: 'gradient', colors: ['#ff7e5f', '#feb47b', '#ff6b6b'] },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', type: 'gradient', colors: ['#2193b0', '#6dd5ed'] },
  { id: 'purple', name: 'Purple Haze', emoji: '💜', type: 'gradient', colors: ['#8e2de2', '#4a00e0'] },
  { id: 'aurora', name: 'Aurora', emoji: '🌌', type: 'gradient', colors: ['#00c6ff', '#0072ff', '#7c3aed'] },
  { id: 'fire', name: 'Fire', emoji: '🔥', type: 'gradient', colors: ['#f12711', '#f5af19'] },
  { id: 'forest', name: 'Forest', emoji: '🌲', type: 'gradient', colors: ['#134e5e', '#71b280'] },
  { id: 'rose', name: 'Rose Gold', emoji: '🌹', type: 'gradient', colors: ['#f4c4f3', '#fc67fa', '#f093fb'] },
  { id: 'midnight', name: 'Midnight', emoji: '🌃', type: 'gradient', colors: ['#0f0c29', '#302b63', '#24243e'] },
  // Image backgrounds
  { id: 'neon_city', name: 'Neon City', emoji: '🏙️', type: 'image', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&q=85' },
  { id: 'beach', name: 'Beach', emoji: '🏖️', type: 'image', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=85' },
  { id: 'space', name: 'Space', emoji: '🚀', type: 'image', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=85' },
  { id: 'mountains', name: 'Mountains', emoji: '🏔️', type: 'image', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=85' },
  { id: 'studio', name: 'Studio', emoji: '🎬', type: 'image', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1920&q=85' },
  { id: 'office', name: 'Office', emoji: '🏢', type: 'image', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=85' },
  { id: 'gaming', name: 'Gaming Room', emoji: '🎮', type: 'image', url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=1920&q=85' },
  { id: 'library', name: 'Library', emoji: '📚', type: 'image', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&q=85' },
];

// ============================================
// PARTICLE EFFECTS
// ============================================

const PARTICLE_TYPES = {
  sparkles: { emojis: ['✨', '⭐', '🌟', '💫'], count: 20, speed: 2, size: [12, 24] },
  hearts: { emojis: ['❤️', '💕', '💗', '💖', '💝'], count: 15, speed: 2.5, size: [14, 28] },
  snow: { emojis: ['❄️', '❅', '❆', '🌨️'], count: 30, speed: 1.5, size: [10, 20] },
  confetti: { emojis: ['🎊', '🎉', '🎀', '🎈', '🎁'], count: 25, speed: 4, size: [12, 22] },
  rainbow: { emojis: ['🌈', '✨', '💖', '💜', '💙', '💚', '💛'], count: 18, speed: 2, size: [14, 26] },
  bubbles: { emojis: ['🫧', '○', '◌', '●'], count: 20, speed: 1, size: [8, 20] },
  leaves: { emojis: ['🍂', '🍁', '🍃', '🌿'], count: 15, speed: 2, size: [14, 26] },
  stars: { emojis: ['⭐', '🌟', '✨', '💫', '☆'], count: 25, speed: 1.5, size: [10, 22] },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SnapchatLensFilters({ 
  videoRef, 
  onFilterChange,
  onMirrorChange,
  onLensChange,
  onBackgroundChange,
  initialMirror = true 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('filters'); // filters, beauty, effects, backgrounds
  
  // State
  const [mirrorEnabled, setMirrorEnabled] = useState(initialMirror);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedBeauty, setSelectedBeauty] = useState('none');
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [selectedBackground, setSelectedBackground] = useState('none');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  
  // Manual adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [smooth, setSmooth] = useState(0);
  const [zoom, setZoom] = useState(100);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const bgImageRef = useRef(null);

  // Get current selections
  const currentFilter = COLOR_FILTERS.find(f => f.id === selectedFilter) || COLOR_FILTERS[0];
  const currentBeauty = BEAUTY_PRESETS.find(b => b.id === selectedBeauty) || BEAUTY_PRESETS[0];
  const currentEffect = FACE_EFFECTS.find(e => e.id === selectedEffect) || FACE_EFFECTS[0];
  const currentBg = selectedBackground === 'custom' && customBgUrl 
    ? { id: 'custom', type: 'image', url: customBgUrl }
    : BACKGROUNDS.find(b => b.id === selectedBackground) || BACKGROUNDS[0];

  // Preload background image
  useEffect(() => {
    if (currentBg.type === 'image' && currentBg.url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = currentBg.url;
      img.onload = () => {
        bgImageRef.current = img;
      };
    } else {
      bgImageRef.current = null;
    }
  }, [currentBg]);

  // Apply CSS filters to video element
  const applyVideoFilters = useCallback(() => {
    if (!videoRef?.current) return;

    const video = videoRef.current;
    let filterStr = '';
    
    // Base filter adjustments
    const adj = currentFilter.adjustments || {};
    
    // Brightness
    const totalBrightness = (brightness / 100) * (adj.brightness || 1);
    filterStr += `brightness(${totalBrightness}) `;
    
    // Contrast
    const totalContrast = (contrast / 100) * (adj.contrast || 1);
    filterStr += `contrast(${totalContrast}) `;
    
    // Saturation
    let totalSat = (saturation / 100) * (adj.saturation || 1);
    if (adj.saturation === 0) totalSat = 0; // B&W
    filterStr += `saturate(${totalSat}) `;
    
    // Sepia (vintage effects)
    if (adj.sepia) {
      filterStr += `sepia(${adj.sepia}) `;
    }
    
    // Hue shift
    const hueShift = (warmth * 0.3) + (adj.hueShift || 0);
    if (hueShift !== 0) {
      filterStr += `hue-rotate(${hueShift}deg) `;
    }
    
    // Beauty smooth (subtle blur)
    const totalSmooth = smooth + (currentBeauty.smooth || 0);
    if (totalSmooth > 0) {
      filterStr += `blur(${totalSmooth * 0.015}px) `;
    }
    
    // Glow effect (brightness boost)
    if (currentBeauty.glow > 0) {
      filterStr += `brightness(${1 + currentBeauty.glow * 0.005}) `;
    }

    video.style.filter = filterStr.trim() || 'none';
    
    // Transform (mirror + zoom)
    const scaleX = mirrorEnabled ? -1 : 1;
    const scale = zoom / 100;
    video.style.transform = `scaleX(${scaleX}) scale(${scale})`;
    video.style.transformOrigin = 'center center';
    
    // Notify parents
    onFilterChange?.({ filter: selectedFilter, brightness, contrast, saturation, warmth, smooth, zoom });
    onMirrorChange?.(mirrorEnabled);
    onLensChange?.(currentEffect);
    onBackgroundChange?.(currentBg);
  }, [selectedFilter, selectedBeauty, mirrorEnabled, brightness, contrast, saturation, warmth, smooth, zoom, currentFilter, currentBeauty, currentEffect, currentBg, videoRef, onFilterChange, onMirrorChange, onLensChange, onBackgroundChange]);

  useEffect(() => {
    applyVideoFilters();
  }, [applyVideoFilters]);

  // Handle background upload
  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      toast.loading('Uploading background...');
      const result = await base44.integrations.Core.UploadFile({ file });
      setCustomBgUrl(result.file_url);
      setSelectedBackground('custom');
      toast.dismiss();
      toast.success('Background uploaded!');
    } catch (error) {
      toast.dismiss();
      toast.error('Upload failed');
    }
  };

  // Reset all
  const resetAll = () => {
    setMirrorEnabled(true);
    setSelectedFilter('none');
    setSelectedBeauty('none');
    setSelectedEffect('none');
    setSelectedBackground('none');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setWarmth(0);
    setSmooth(0);
    setZoom(100);
    toast.success('Reset to defaults');
  };

  const tabs = [
    { id: 'filters', name: 'Filters', icon: Palette, emoji: '🎨' },
    { id: 'beauty', name: 'Beauty', icon: Sparkles, emoji: '✨' },
    { id: 'effects', name: 'Effects', icon: Smile, emoji: '😊' },
    { id: 'backgrounds', name: 'BG', icon: Layers, emoji: '🖼️' },
  ];

  return (
    <>
      {/* Face Effect Overlay */}
      <FaceEffectOverlay effect={currentEffect} />
      
      {/* Particle Effects */}
      {currentEffect.particles && <ParticleRenderer type={currentEffect.particles} />}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <motion.button
            className="relative w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/30"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Wand2 className="w-6 h-6" />
            {(selectedFilter !== 'none' || selectedEffect !== 'none' || selectedBackground !== 'none') && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
            )}
          </motion.button>
        </SheetTrigger>
        
        <SheetContent 
          side="bottom" 
          className="h-[75vh] bg-black/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl p-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold">Studio Effects</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMirrorEnabled(!mirrorEnabled)}
                className={`p-2 rounded-lg transition-colors ${mirrorEnabled ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60'}`}
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              <Button size="sm" variant="ghost" onClick={resetAll} className="text-white/60 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-center transition-colors relative ${
                  activeTab === tab.id ? 'text-white' : 'text-white/50'
                }`}
              >
                <span className="text-lg mr-1">{tab.emoji}</span>
                <span className="text-xs">{tab.name}</span>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(75vh-140px)]">
            <div className="p-4">
              {/* Filters Tab */}
              {activeTab === 'filters' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_FILTERS.map(filter => (
                      <motion.button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${
                          selectedFilter === filter.id 
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-white shadow-lg' 
                            : 'bg-white/10 hover:bg-white/15'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="text-2xl mb-1">{filter.emoji}</span>
                        <span className="text-[10px] text-white/80">{filter.name}</span>
                      </motion.button>
                    ))}
                  </div>
                  
                  {/* Manual Adjustments */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <p className="text-white/50 text-xs font-medium">Fine Tune</p>
                    <SliderControl label="Brightness" value={brightness} onChange={setBrightness} min={50} max={150} icon="☀️" />
                    <SliderControl label="Contrast" value={contrast} onChange={setContrast} min={50} max={150} icon="◐" />
                    <SliderControl label="Saturation" value={saturation} onChange={setSaturation} min={0} max={200} icon="🎨" />
                    <SliderControl label="Warmth" value={warmth} onChange={setWarmth} min={-50} max={50} icon="🌡️" />
                    <SliderControl label="Zoom" value={zoom} onChange={setZoom} min={100} max={200} icon="🔍" />
                  </div>
                </div>
              )}

              {/* Beauty Tab */}
              {activeTab === 'beauty' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {BEAUTY_PRESETS.map(preset => (
                      <motion.button
                        key={preset.id}
                        onClick={() => setSelectedBeauty(preset.id)}
                        className={`p-4 rounded-2xl flex flex-col items-center transition-all ${
                          selectedBeauty === preset.id 
                            ? 'bg-gradient-to-br from-pink-500 to-rose-500 ring-2 ring-white shadow-lg' 
                            : 'bg-white/10 hover:bg-white/15'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="text-3xl mb-2">{preset.emoji}</span>
                        <span className="text-xs text-white/80">{preset.name}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Manual Smooth Control */}
                  <div className="pt-4 border-t border-white/10">
                    <SliderControl label="Skin Smooth" value={smooth} onChange={setSmooth} max={100} icon="✨" />
                  </div>
                </div>
              )}

              {/* Effects Tab */}
              {activeTab === 'effects' && (
                <div className="grid grid-cols-4 gap-2">
                  {FACE_EFFECTS.map(effect => (
                    <motion.button
                      key={effect.id}
                      onClick={() => setSelectedEffect(effect.id)}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${
                        selectedEffect === effect.id 
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-500 ring-2 ring-white shadow-lg' 
                          : 'bg-white/10 hover:bg-white/15'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="text-2xl mb-1">{effect.emoji}</span>
                      <span className="text-[10px] text-white/80">{effect.name}</span>
                      {effect.animated && <span className="text-[8px] absolute top-1 right-1">✨</span>}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Backgrounds Tab */}
              {activeTab === 'backgrounds' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-white/50 text-xs">Virtual Backgrounds</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Upload className="w-3 h-3" /> Custom
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {BACKGROUNDS.map(bg => (
                      <motion.button
                        key={bg.id}
                        onClick={() => setSelectedBackground(bg.id)}
                        className={`aspect-square rounded-2xl overflow-hidden relative transition-all ${
                          selectedBackground === bg.id 
                            ? 'ring-2 ring-white shadow-lg' 
                            : 'ring-1 ring-white/10'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        {bg.type === 'image' ? (
                          <img src={bg.url} alt={bg.name} className="absolute inset-0 w-full h-full object-cover" />
                        ) : bg.type === 'gradient' ? (
                          <div 
                            className="absolute inset-0" 
                            style={{ background: `linear-gradient(135deg, ${bg.colors.join(', ')})` }} 
                          />
                        ) : bg.type === 'color' ? (
                          <div className="absolute inset-0" style={{ backgroundColor: bg.value }} />
                        ) : bg.type === 'blur' ? (
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                            <span className="text-white/50 text-lg">🌫️</span>
                          </div>
                        ) : null}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                          <span className="text-xl">{bg.emoji}</span>
                          <span className="text-[8px] text-white/80 mt-1">{bg.name}</span>
                        </div>
                      </motion.button>
                    ))}
                    {customBgUrl && (
                      <motion.button
                        onClick={() => setSelectedBackground('custom')}
                        className={`aspect-square rounded-2xl overflow-hidden relative ${
                          selectedBackground === 'custom' ? 'ring-2 ring-white' : 'ring-1 ring-white/10'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <img src={customBgUrl} alt="Custom" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="text-xl">📷</span>
                        </div>
                      </motion.button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ============================================
// SLIDER CONTROL
// ============================================

function SliderControl({ label, value, onChange, min = 0, max = 100, icon }) {
  const isCenter = min < 0;
  const percentage = isCenter ? ((value - min) / (max - min)) * 100 : (value / max) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/50">{icon} {label}</span>
        <span className="text-white/70">{value}{isCenter && value > 0 ? '+' : ''}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={1}
        className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-pink-500 [&_[role=slider]]:to-purple-500 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white"
      />
    </div>
  );
}

// ============================================
// FACE EFFECT OVERLAY
// ============================================

function FaceEffectOverlay({ effect }) {
  if (!effect || effect.id === 'none') return null;

  const overlayConfig = {
    // Animal ears - positioned at top center
    dog_ears: { emoji: '🐕', top: '8%', size: 90 },
    cat_ears: { emoji: '🐱', top: '8%', size: 85 },
    bunny_ears: { emoji: '🐰', top: '5%', size: 95 },
    fox_ears: { emoji: '🦊', top: '8%', size: 85 },
    bear_ears: { emoji: '🐻', top: '8%', size: 85 },
    deer_antlers: { emoji: '🦌', top: '5%', size: 100 },
    lion_mane: { emoji: '🦁', top: '10%', size: 110 },
    panda_face: { emoji: '🐼', top: '8%', size: 90 },
    koala_ears: { emoji: '🐨', top: '8%', size: 85 },
    // Accessories
    crown: { emoji: '👑', top: '8%', size: 75 },
    halo: { emoji: '😇', top: '5%', size: 80, glow: true },
    devil_horns: { emoji: '😈', top: '8%', size: 75 },
    sunglasses: { emoji: '😎', top: '28%', size: 100 },
    heart_eyes: { emoji: '😍', top: '25%', size: 110, opacity: 0.85 },
    fire_eyes: { emoji: '🔥', top: '28%', size: 45, dual: true },
    tears: { emoji: '😢', top: '35%', size: 120, opacity: 0.8 },
    face_sparkles: { emoji: '✨', top: '25%', size: 130, opacity: 0.7 },
    // Seasonal
    santa_hat: { emoji: '🎅', top: '3%', size: 90 },
    witch_hat: { emoji: '🧙‍♀️', top: '2%', size: 95 },
    party_hat: { emoji: '🥳', top: '5%', size: 85 },
    unicorn_horn: { emoji: '🦄', top: '5%', size: 80 },
  };

  const config = overlayConfig[effect.overlay];
  if (!config) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: config.opacity || 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="absolute left-1/2 -translate-x-1/2"
        style={{ 
          top: config.top,
          fontSize: config.size,
          filter: config.glow ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))' : undefined
        }}
      >
        {config.dual ? (
          <div className="flex gap-12">
            <span>{config.emoji}</span>
            <span>{config.emoji}</span>
          </div>
        ) : (
          <span>{config.emoji}</span>
        )}
      </motion.div>
    </div>
  );
}

// ============================================
// PARTICLE RENDERER
// ============================================

function ParticleRenderer({ type }) {
  const [particles, setParticles] = useState([]);
  const config = PARTICLE_TYPES[type];

  useEffect(() => {
    if (!config) return;

    const createParticle = () => ({
      id: Math.random(),
      emoji: config.emojis[Math.floor(Math.random() * config.emojis.length)],
      x: Math.random() * 100,
      y: -10,
      size: config.size[0] + Math.random() * (config.size[1] - config.size[0]),
      speed: config.speed * (0.5 + Math.random()),
      wobble: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
    });

    setParticles(Array.from({ length: config.count }, createParticle));

    const interval = setInterval(() => {
      setParticles(prev => {
        const updated = prev
          .map(p => ({ 
            ...p, 
            y: p.y + p.speed, 
            x: p.x + p.wobble * 0.3,
            rotation: p.rotation + p.wobble * 2
          }))
          .filter(p => p.y < 110);
        
        while (updated.length < config.count) {
          updated.push(createParticle());
        }
        return updated;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [type, config]);

  if (!config) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute transition-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.size,
            transform: `rotate(${p.rotation}deg)`,
            opacity: 0.9,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}