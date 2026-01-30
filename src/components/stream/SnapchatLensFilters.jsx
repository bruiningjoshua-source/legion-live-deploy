/**
 * SnapchatLensFilters - Full Snapchat-style lens/filter system
 * Features: Face tracking overlays, animated effects, beauty filters, AR accessories
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Sparkles, 
  Wand2,
  Sun,
  Palette,
  Image as ImageIcon,
  Upload,
  X,
  FlipHorizontal,
  ZoomIn,
  Heart,
  Crown,
  Glasses,
  Flame,
  Snowflake,
  RefreshCw,
  Star,
  Camera,
  Smile,
  Ghost,
  Cat,
  Dog,
  Rabbit,
  Bird,
  Fish,
  Bug,
  Flower2,
  Moon,
  CloudRain,
  Zap,
  Music,
  PartyPopper,
  Gift,
  Cake,
  Pizza,
  Coffee,
  Beer,
  Wine,
  Skull,
  Ghost as GhostIcon,
  Baby,
  Laugh,
  Angry,
  Frown,
  Meh,
  Annoyed
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// LENS CATEGORIES - Snapchat Style
// ============================================

const LENS_CATEGORIES = [
  { id: 'trending', name: '🔥 Trending', icon: Flame },
  { id: 'face', name: '😊 Face', icon: Smile },
  { id: 'beauty', name: '✨ Beauty', icon: Sparkles },
  { id: 'funny', name: '😂 Funny', icon: Laugh },
  { id: 'animals', name: '🐱 Animals', icon: Cat },
  { id: 'effects', name: '🌈 Effects', icon: Star },
  { id: 'seasonal', name: '🎉 Seasonal', icon: PartyPopper },
];

// ============================================
// FACE LENSES - AR Overlays that track face
// ============================================

const FACE_LENSES = [
  // Trending
  { id: 'none', name: 'None', emoji: '🚫', category: 'trending', overlay: null },
  { id: 'hearts_around', name: 'Heart Eyes', emoji: '😍', category: 'trending', overlay: 'hearts', faceEffect: 'heart_eyes' },
  { id: 'puppy', name: 'Puppy', emoji: '🐶', category: 'trending', overlay: 'puppy_ears', faceEffect: 'puppy_nose' },
  { id: 'cat', name: 'Cat', emoji: '🐱', category: 'trending', overlay: 'cat_ears', faceEffect: 'cat_nose' },
  { id: 'bunny', name: 'Bunny', emoji: '🐰', category: 'trending', overlay: 'bunny_ears', faceEffect: 'bunny_nose' },
  
  // Face effects
  { id: 'big_eyes', name: 'Big Eyes', emoji: '👀', category: 'face', faceEffect: 'enlarge_eyes' },
  { id: 'small_face', name: 'Small Face', emoji: '🤏', category: 'face', faceEffect: 'shrink_face' },
  { id: 'long_face', name: 'Long Face', emoji: '🫠', category: 'face', faceEffect: 'stretch_vertical' },
  { id: 'wide_face', name: 'Wide Face', emoji: '😬', category: 'face', faceEffect: 'stretch_horizontal' },
  { id: 'old_age', name: 'Old Age', emoji: '👴', category: 'face', faceEffect: 'age_filter' },
  { id: 'baby_face', name: 'Baby Face', emoji: '👶', category: 'face', faceEffect: 'baby_filter' },
  { id: 'gender_swap', name: 'Gender Swap', emoji: '🔄', category: 'face', faceEffect: 'gender_swap' },
  
  // Beauty
  { id: 'smooth_skin', name: 'Smooth Skin', emoji: '✨', category: 'beauty', beautyLevel: 80 },
  { id: 'glamour', name: 'Glamour', emoji: '💎', category: 'beauty', beautyLevel: 60, filter: 'glamour' },
  { id: 'natural_glow', name: 'Natural Glow', emoji: '🌟', category: 'beauty', beautyLevel: 40, filter: 'warm_glow' },
  { id: 'porcelain', name: 'Porcelain', emoji: '🎀', category: 'beauty', beautyLevel: 70, filter: 'soft_light' },
  { id: 'bronze', name: 'Bronze Goddess', emoji: '☀️', category: 'beauty', beautyLevel: 30, filter: 'bronze' },
  
  // Funny
  { id: 'crying', name: 'Crying', emoji: '😭', category: 'funny', overlay: 'tears', animated: true },
  { id: 'fire_eyes', name: 'Fire Eyes', emoji: '🔥', category: 'funny', overlay: 'fire_eyes', animated: true },
  { id: 'laser_eyes', name: 'Laser Eyes', emoji: '👁️‍🗨️', category: 'funny', overlay: 'laser', animated: true },
  { id: 'clown', name: 'Clown', emoji: '🤡', category: 'funny', overlay: 'clown_makeup' },
  { id: 'alien', name: 'Alien', emoji: '👽', category: 'funny', overlay: 'alien', faceEffect: 'green_tint' },
  { id: 'zombie', name: 'Zombie', emoji: '🧟', category: 'funny', overlay: 'zombie', filter: 'desaturate' },
  { id: 'vampire', name: 'Vampire', emoji: '🧛', category: 'funny', overlay: 'vampire_fangs', filter: 'pale' },
  
  // Animals
  { id: 'deer', name: 'Deer', emoji: '🦌', category: 'animals', overlay: 'deer_antlers', faceEffect: 'deer_nose' },
  { id: 'bear', name: 'Bear', emoji: '🐻', category: 'animals', overlay: 'bear_ears', faceEffect: 'bear_nose' },
  { id: 'fox', name: 'Fox', emoji: '🦊', category: 'animals', overlay: 'fox_ears', faceEffect: 'fox_nose' },
  { id: 'koala', name: 'Koala', emoji: '🐨', category: 'animals', overlay: 'koala_ears', faceEffect: 'koala_nose' },
  { id: 'panda', name: 'Panda', emoji: '🐼', category: 'animals', overlay: 'panda', faceEffect: 'panda_eyes' },
  { id: 'lion', name: 'Lion', emoji: '🦁', category: 'animals', overlay: 'lion_mane' },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', category: 'animals', overlay: 'unicorn_horn', particles: 'rainbow_sparkles' },
  
  // Effects
  { id: 'sparkle_rain', name: 'Sparkle Rain', emoji: '✨', category: 'effects', particles: 'sparkles', animated: true },
  { id: 'hearts_falling', name: 'Falling Hearts', emoji: '💕', category: 'effects', particles: 'hearts', animated: true },
  { id: 'snow', name: 'Snow', emoji: '❄️', category: 'effects', particles: 'snowflakes', filter: 'cool' },
  { id: 'butterflies', name: 'Butterflies', emoji: '🦋', category: 'effects', particles: 'butterflies', animated: true },
  { id: 'confetti', name: 'Confetti', emoji: '🎊', category: 'effects', particles: 'confetti', animated: true },
  { id: 'bubbles', name: 'Bubbles', emoji: '🫧', category: 'effects', particles: 'bubbles', animated: true },
  { id: 'fire_aura', name: 'Fire Aura', emoji: '🔥', category: 'effects', aura: 'fire', animated: true },
  { id: 'ice_aura', name: 'Ice Aura', emoji: '🧊', category: 'effects', aura: 'ice', filter: 'cool' },
  { id: 'galaxy', name: 'Galaxy', emoji: '🌌', category: 'effects', background: 'galaxy', particles: 'stars' },
  { id: 'neon', name: 'Neon Glow', emoji: '💜', category: 'effects', filter: 'neon', aura: 'neon' },
  
  // Seasonal
  { id: 'santa', name: 'Santa', emoji: '🎅', category: 'seasonal', overlay: 'santa_hat', particles: 'snowflakes' },
  { id: 'witch', name: 'Witch', emoji: '🧙‍♀️', category: 'seasonal', overlay: 'witch_hat', particles: 'bats' },
  { id: 'devil', name: 'Devil', emoji: '😈', category: 'seasonal', overlay: 'devil_horns', aura: 'fire' },
  { id: 'angel', name: 'Angel', emoji: '😇', category: 'seasonal', overlay: 'halo', particles: 'sparkles', aura: 'glow' },
  { id: 'crown', name: 'Crown', emoji: '👑', category: 'seasonal', overlay: 'crown', particles: 'gold_sparkles' },
  { id: 'birthday', name: 'Birthday', emoji: '🎂', category: 'seasonal', overlay: 'party_hat', particles: 'confetti' },
];

// ============================================
// COLOR FILTERS - Instagram/Snapchat style
// ============================================

const COLOR_FILTERS = [
  { id: 'none', name: 'Normal', emoji: '⚪', css: '' },
  { id: 'vivid', name: 'Vivid', emoji: '🌈', css: 'saturate(1.4) contrast(1.1) brightness(1.05)' },
  { id: 'warm', name: 'Warm', emoji: '🌅', css: 'sepia(0.2) saturate(1.2) brightness(1.05)' },
  { id: 'cool', name: 'Cool', emoji: '❄️', css: 'hue-rotate(10deg) saturate(0.9) brightness(1.05)' },
  { id: 'vintage', name: 'Vintage', emoji: '📷', css: 'sepia(0.4) contrast(1.1) saturate(0.8)' },
  { id: 'bw', name: 'B&W', emoji: '⚫', css: 'grayscale(1) contrast(1.1)' },
  { id: 'dramatic', name: 'Dramatic', emoji: '🎭', css: 'contrast(1.3) saturate(0.8) brightness(0.95)' },
  { id: 'dreamy', name: 'Dreamy', emoji: '☁️', css: 'brightness(1.1) contrast(0.9) saturate(0.9) blur(0.3px)' },
  { id: 'neon', name: 'Neon', emoji: '💜', css: 'saturate(1.5) contrast(1.2) brightness(1.1) hue-rotate(10deg)' },
  { id: 'retro', name: 'Retro', emoji: '📻', css: 'sepia(0.3) contrast(1.15) saturate(0.85) brightness(0.95)' },
  { id: 'cinematic', name: 'Cinema', emoji: '🎬', css: 'contrast(1.2) saturate(0.85) brightness(0.92)' },
  { id: 'soft', name: 'Soft', emoji: '🌸', css: 'brightness(1.08) contrast(0.95) saturate(0.95)' },
];

// ============================================
// BACKGROUND OPTIONS
// ============================================

const BACKGROUNDS = [
  { id: 'none', name: 'None', emoji: '🚫', type: 'none' },
  { id: 'blur_light', name: 'Light Blur', emoji: '💨', type: 'blur', intensity: 8 },
  { id: 'blur', name: 'Blur', emoji: '🌫️', type: 'blur', intensity: 15 },
  { id: 'blur_heavy', name: 'Heavy Blur', emoji: '🌁', type: 'blur', intensity: 25 },
  { id: 'black', name: 'Black', emoji: '⬛', type: 'color', value: '#000000' },
  { id: 'white', name: 'White', emoji: '⬜', type: 'color', value: '#ffffff' },
  { id: 'green', name: 'Green Screen', emoji: '🟩', type: 'color', value: '#00ff00' },
  { id: 'sunset', name: 'Sunset', emoji: '🌅', type: 'gradient', colors: ['#ff7e5f', '#feb47b'] },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', type: 'gradient', colors: ['#2193b0', '#6dd5ed'] },
  { id: 'purple', name: 'Purple', emoji: '💜', type: 'gradient', colors: ['#8e2de2', '#4a00e0'] },
  { id: 'neon_city', name: 'Neon City', emoji: '🌃', type: 'image', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1280&q=80' },
  { id: 'beach', name: 'Beach', emoji: '🏖️', type: 'image', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&q=80' },
  { id: 'space', name: 'Space', emoji: '🚀', type: 'image', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1280&q=80' },
  { id: 'forest', name: 'Forest', emoji: '🌲', type: 'image', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1280&q=80' },
];

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
  const [activeCategory, setActiveCategory] = useState('trending');
  
  // State
  const [mirrorEnabled, setMirrorEnabled] = useState(initialMirror);
  const [selectedLens, setSelectedLens] = useState('none');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedBackground, setSelectedBackground] = useState('none');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  
  // Beauty adjustments
  const [beautySmooth, setBeautySmooth] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [zoom, setZoom] = useState(100);
  
  const [showFilters, setShowFilters] = useState(false);
  const [showBeauty, setShowBeauty] = useState(false);
  const [showBackground, setShowBackground] = useState(false);

  const fileInputRef = useRef(null);

  // Get current lens data
  const currentLens = FACE_LENSES.find(l => l.id === selectedLens) || FACE_LENSES[0];
  const currentFilter = COLOR_FILTERS.find(f => f.id === selectedFilter) || COLOR_FILTERS[0];
  const currentBg = BACKGROUNDS.find(b => b.id === selectedBackground) || BACKGROUNDS[0];

  // Filter lenses by category
  const filteredLenses = FACE_LENSES.filter(lens => 
    activeCategory === 'trending' ? true : lens.category === activeCategory
  );

  // Apply all effects to video
  const applyEffects = useCallback(() => {
    if (!videoRef?.current) return;

    const video = videoRef.current;
    let filterStr = '';
    
    // 1. Apply color filter preset
    if (currentFilter.css) {
      filterStr += currentFilter.css + ' ';
    }
    
    // 2. Apply manual adjustments
    if (brightness !== 100) {
      filterStr += `brightness(${brightness / 100}) `;
    }
    if (contrast !== 100) {
      filterStr += `contrast(${contrast / 100}) `;
    }
    if (saturation !== 100) {
      filterStr += `saturate(${saturation / 100}) `;
    }
    if (warmth !== 0) {
      if (warmth > 0) {
        filterStr += `sepia(${warmth * 0.005}) `;
      } else {
        filterStr += `hue-rotate(${warmth * 0.5}deg) `;
      }
    }
    
    // 3. Beauty smooth (blur)
    if (beautySmooth > 0) {
      filterStr += `blur(${beautySmooth * 0.03}px) `;
    }
    
    // 4. Lens-specific filter
    if (currentLens.filter) {
      switch (currentLens.filter) {
        case 'glamour':
          filterStr += 'brightness(1.1) contrast(1.05) saturate(1.1) ';
          break;
        case 'warm_glow':
          filterStr += 'sepia(0.15) brightness(1.08) ';
          break;
        case 'soft_light':
          filterStr += 'brightness(1.1) contrast(0.95) ';
          break;
        case 'bronze':
          filterStr += 'sepia(0.25) saturate(1.2) brightness(1.05) ';
          break;
        case 'desaturate':
          filterStr += 'saturate(0.5) contrast(1.1) ';
          break;
        case 'pale':
          filterStr += 'brightness(1.15) saturate(0.8) ';
          break;
        case 'cool':
          filterStr += 'hue-rotate(15deg) saturate(0.9) ';
          break;
        case 'neon':
          filterStr += 'saturate(1.5) contrast(1.2) brightness(1.1) ';
          break;
      }
    }

    // 5. Beauty level from lens
    if (currentLens.beautyLevel) {
      const extraSmooth = currentLens.beautyLevel * 0.0003;
      filterStr += `blur(${extraSmooth}px) `;
    }

    video.style.filter = filterStr.trim() || 'none';
    
    // Transform (mirror + zoom)
    const scaleX = mirrorEnabled ? -1 : 1;
    const scale = zoom / 100;
    video.style.transform = `scaleX(${scaleX}) scale(${scale})`;
    
    // Notify parents
    onFilterChange?.({ filter: selectedFilter, brightness, contrast, saturation, warmth, beautySmooth, zoom });
    onMirrorChange?.(mirrorEnabled);
    onLensChange?.(currentLens);
    onBackgroundChange?.(currentBg);
  }, [selectedFilter, selectedLens, selectedBackground, mirrorEnabled, brightness, contrast, saturation, warmth, beautySmooth, zoom, currentFilter, currentLens, currentBg]);

  // Apply effects on any change
  useEffect(() => {
    applyEffects();
  }, [applyEffects]);

  // Handle background upload
  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      toast.loading('Uploading...');
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
    setSelectedLens('none');
    setSelectedFilter('none');
    setSelectedBackground('none');
    setBeautySmooth(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setWarmth(0);
    setZoom(100);
    toast.success('Reset to defaults');
  };

  return (
    <>
      {/* Lens Overlay Renderer */}
      <LensOverlay lens={currentLens} />

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <motion.button
            className="relative w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/30"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-7 h-7" />
            {selectedLens !== 'none' && (
              <span className="absolute -top-1 -right-1 text-lg">{currentLens.emoji}</span>
            )}
          </motion.button>
        </SheetTrigger>
        
        <SheetContent 
          side="bottom" 
          className="h-[80vh] bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl p-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-bold">Lenses & Effects</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={resetAll} className="text-white/60 hover:text-white">
                <RefreshCw className="w-4 h-4 mr-1" /> Reset
              </Button>
            </div>
          </div>

          {/* Quick toggles */}
          <div className="flex items-center gap-2 p-3 border-b border-white/5">
            <button
              onClick={() => setMirrorEnabled(!mirrorEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                mirrorEnabled ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              Mirror
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                showFilters ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Filters
            </button>
            <button
              onClick={() => setShowBeauty(!showBeauty)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                showBeauty ? 'bg-pink-500 text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Beauty
            </button>
            <button
              onClick={() => setShowBackground(!showBackground)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                showBackground ? 'bg-green-500 text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              BG
            </button>
          </div>

          {/* Color Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-white/5 overflow-hidden"
              >
                <div className="p-3">
                  <p className="text-white/50 text-xs mb-2">Color Filters</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {COLOR_FILTERS.map((filter) => (
                      <motion.button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all ${
                          selectedFilter === filter.id 
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-white' 
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="text-xl">{filter.emoji}</span>
                        <span className="text-[9px] text-white/80 mt-1">{filter.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Beauty Panel */}
          <AnimatePresence>
            {showBeauty && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-white/5 overflow-hidden"
              >
                <div className="p-3 space-y-3">
                  <p className="text-white/50 text-xs">Beauty & Adjustments</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <SliderControl label="Smooth" value={beautySmooth} onChange={setBeautySmooth} max={100} icon="✨" />
                    <SliderControl label="Brightness" value={brightness} onChange={setBrightness} min={50} max={150} icon="☀️" />
                    <SliderControl label="Contrast" value={contrast} onChange={setContrast} min={50} max={150} icon="◐" />
                    <SliderControl label="Saturation" value={saturation} onChange={setSaturation} min={0} max={200} icon="🎨" />
                    <SliderControl label="Warmth" value={warmth} onChange={setWarmth} min={-50} max={50} icon="🌡️" />
                    <SliderControl label="Zoom" value={zoom} onChange={setZoom} min={50} max={200} icon="🔍" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Background Panel */}
          <AnimatePresence>
            {showBackground && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-white/5 overflow-hidden"
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/50 text-xs">Background</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-blue-400 flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {BACKGROUNDS.map((bg) => (
                      <motion.button
                        key={bg.id}
                        onClick={() => setSelectedBackground(bg.id)}
                        className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all overflow-hidden relative ${
                          selectedBackground === bg.id 
                            ? 'ring-2 ring-white' 
                            : 'ring-1 ring-white/10'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        {bg.type === 'image' ? (
                          <img src={bg.url} alt={bg.name} className="absolute inset-0 w-full h-full object-cover" />
                        ) : bg.type === 'gradient' ? (
                          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[1]})` }} />
                        ) : bg.type === 'color' ? (
                          <div className="absolute inset-0" style={{ backgroundColor: bg.value }} />
                        ) : (
                          <span className="text-xl">{bg.emoji}</span>
                        )}
                        {bg.type !== 'none' && bg.type !== 'blur' && <div className="absolute inset-0 bg-black/20" />}
                        <span className="relative z-10 text-lg">{bg.emoji}</span>
                      </motion.button>
                    ))}
                    {customBgUrl && (
                      <motion.button
                        onClick={() => setSelectedBackground('custom')}
                        className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden relative ${
                          selectedBackground === 'custom' ? 'ring-2 ring-white' : 'ring-1 ring-white/10'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <img src={customBgUrl} alt="Custom" className="w-full h-full object-cover" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category tabs */}
          <div className="flex gap-1 p-2 border-b border-white/5 overflow-x-auto">
            {LENS_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Lens Grid */}
          <ScrollArea className="flex-1 h-[calc(80vh-280px)]">
            <div className="grid grid-cols-4 gap-2 p-3">
              {filteredLenses.map((lens) => (
                <motion.button
                  key={lens.id}
                  onClick={() => setSelectedLens(lens.id)}
                  className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${
                    selectedLens === lens.id 
                      ? 'bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 ring-2 ring-white shadow-lg shadow-pink-500/30' 
                      : 'bg-white/10 hover:bg-white/15'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-3xl mb-1">{lens.emoji}</span>
                  <span className="text-[10px] text-white/80 px-1 text-center leading-tight">{lens.name}</span>
                  {lens.animated && (
                    <span className="absolute top-1 right-1 text-[8px]">✨</span>
                  )}
                  {selectedLens === lens.id && (
                    <motion.div
                      layoutId="lensIndicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ============================================
// SLIDER CONTROL COMPONENT
// ============================================

function SliderControl({ label, value, onChange, min = 0, max = 100, icon }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/50">{icon} {label}</span>
        <span className="text-white/70">{value}{label === 'Warmth' && value > 0 ? '+' : ''}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={1}
        className="[&_[role=slider]]:bg-pink-500 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
      />
    </div>
  );
}

// ============================================
// LENS OVERLAY COMPONENT - Renders AR effects
// ============================================

function LensOverlay({ lens }) {
  if (!lens || lens.id === 'none') return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Particle effects */}
      {lens.particles && <ParticleEffect type={lens.particles} />}
      
      {/* Aura effects */}
      {lens.aura && <AuraEffect type={lens.aura} />}
      
      {/* Face overlays - positioned relative to expected face location */}
      {lens.overlay && <FaceOverlay type={lens.overlay} />}
    </div>
  );
}

// ============================================
// PARTICLE EFFECT COMPONENT
// ============================================

function ParticleEffect({ type }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const particleConfig = {
      hearts: { emoji: ['❤️', '💕', '💗', '💖', '💝'], count: 15, speed: 3 },
      sparkles: { emoji: ['✨', '⭐', '🌟', '💫'], count: 20, speed: 2 },
      snowflakes: { emoji: ['❄️', '🌨️', '❅', '❆'], count: 25, speed: 1.5 },
      confetti: { emoji: ['🎊', '🎉', '🎀', '🎁', '🎈'], count: 20, speed: 4 },
      butterflies: { emoji: ['🦋', '🦋', '🦋'], count: 8, speed: 2 },
      bubbles: { emoji: ['🫧', '○', '◌'], count: 15, speed: 1 },
      stars: { emoji: ['⭐', '✨', '💫', '🌟'], count: 15, speed: 1 },
      gold_sparkles: { emoji: ['✨', '⭐', '💛', '🌟'], count: 12, speed: 2 },
      rainbow_sparkles: { emoji: ['🌈', '✨', '💖', '💜', '💙'], count: 15, speed: 2 },
      bats: { emoji: ['🦇', '🦇', '🦇'], count: 8, speed: 3 },
    };

    const config = particleConfig[type] || particleConfig.sparkles;
    
    const createParticle = () => ({
      id: Math.random(),
      emoji: config.emoji[Math.floor(Math.random() * config.emoji.length)],
      x: Math.random() * 100,
      y: -10,
      size: 16 + Math.random() * 16,
      speed: config.speed + Math.random() * 2,
      wobble: Math.random() * 2 - 1,
    });

    const initial = Array.from({ length: config.count }, createParticle);
    setParticles(initial);

    const interval = setInterval(() => {
      setParticles(prev => {
        const updated = prev
          .map(p => ({ ...p, y: p.y + p.speed, x: p.x + p.wobble * 0.5 }))
          .filter(p => p.y < 110);
        
        while (updated.length < config.count) {
          updated.push(createParticle());
        }
        return updated;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [type]);

  return (
    <>
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute transition-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.size,
            transform: `rotate(${p.wobble * 30}deg)`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </>
  );
}

// ============================================
// AURA EFFECT COMPONENT
// ============================================

function AuraEffect({ type }) {
  const auraStyles = {
    fire: 'bg-gradient-to-t from-orange-500/30 via-red-500/20 to-transparent animate-pulse',
    ice: 'bg-gradient-to-t from-blue-400/30 via-cyan-300/20 to-transparent',
    glow: 'bg-gradient-radial from-yellow-200/30 via-white/10 to-transparent',
    neon: 'bg-gradient-to-t from-purple-500/40 via-pink-500/20 to-transparent animate-pulse',
  };

  return (
    <div className={`absolute inset-0 ${auraStyles[type] || ''}`} />
  );
}

// ============================================
// FACE OVERLAY COMPONENT
// ============================================

function FaceOverlay({ type }) {
  // These position overlays at typical face positions
  // In a real implementation, you'd use face detection coordinates
  
  const overlays = {
    // Head accessories (top of screen center)
    crown: { emoji: '👑', top: '15%', left: '50%', size: '80px', transform: 'translateX(-50%)' },
    santa_hat: { emoji: '🎅', top: '10%', left: '50%', size: '90px', transform: 'translateX(-50%)' },
    witch_hat: { emoji: '🧙‍♀️', top: '8%', left: '50%', size: '100px', transform: 'translateX(-50%)' },
    party_hat: { emoji: '🎉', top: '12%', left: '50%', size: '70px', transform: 'translateX(-50%)' },
    halo: { emoji: '😇', top: '10%', left: '50%', size: '80px', transform: 'translateX(-50%)', filter: 'drop-shadow(0 0 10px gold)' },
    devil_horns: { emoji: '😈', top: '12%', left: '50%', size: '80px', transform: 'translateX(-50%)' },
    unicorn_horn: { emoji: '🦄', top: '10%', left: '50%', size: '70px', transform: 'translateX(-50%)' },
    
    // Animal ears
    puppy_ears: { emoji: '🐕', top: '12%', left: '50%', size: '100px', transform: 'translateX(-50%)' },
    cat_ears: { emoji: '🐱', top: '12%', left: '50%', size: '90px', transform: 'translateX(-50%)' },
    bunny_ears: { emoji: '🐰', top: '8%', left: '50%', size: '100px', transform: 'translateX(-50%)' },
    bear_ears: { emoji: '🐻', top: '12%', left: '50%', size: '90px', transform: 'translateX(-50%)' },
    fox_ears: { emoji: '🦊', top: '12%', left: '50%', size: '90px', transform: 'translateX(-50%)' },
    deer_antlers: { emoji: '🦌', top: '8%', left: '50%', size: '100px', transform: 'translateX(-50%)' },
    koala_ears: { emoji: '🐨', top: '12%', left: '50%', size: '90px', transform: 'translateX(-50%)' },
    lion_mane: { emoji: '🦁', top: '15%', left: '50%', size: '120px', transform: 'translateX(-50%)' },
    panda: { emoji: '🐼', top: '12%', left: '50%', size: '100px', transform: 'translateX(-50%)' },
    
    // Face effects
    tears: { emoji: '😢', top: '40%', left: '50%', size: '150px', transform: 'translateX(-50%)', opacity: 0.8 },
    clown_makeup: { emoji: '🤡', top: '30%', left: '50%', size: '150px', transform: 'translateX(-50%)', opacity: 0.7 },
    alien: { emoji: '👽', top: '25%', left: '50%', size: '160px', transform: 'translateX(-50%)', opacity: 0.6 },
    zombie: { emoji: '🧟', top: '25%', left: '50%', size: '160px', transform: 'translateX(-50%)', opacity: 0.5 },
    vampire_fangs: { emoji: '🧛', top: '30%', left: '50%', size: '140px', transform: 'translateX(-50%)', opacity: 0.6 },
    
    // Eye effects
    hearts: { emoji: '😍', top: '30%', left: '50%', size: '140px', transform: 'translateX(-50%)', opacity: 0.7 },
    fire_eyes: { emoji: '🔥', top: '32%', left: '35%', size: '40px' },
    laser: { emoji: '👁️‍🗨️', top: '32%', left: '50%', size: '100px', transform: 'translateX(-50%)' },
  };

  const config = overlays[type];
  if (!config) return null;

  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: config.opacity || 1 }}
      className="absolute"
      style={{
        top: config.top,
        left: config.left,
        fontSize: config.size,
        transform: config.transform,
        filter: config.filter,
      }}
    >
      {config.emoji}
    </motion.span>
  );
}