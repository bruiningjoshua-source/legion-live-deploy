import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Sparkles, 
  Wand2,
  Sun,
  Moon,
  Palette,
  Image as ImageIcon,
  Upload,
  X,
  FlipHorizontal,
  ZoomIn,
  Heart,
  Star,
  Smile,
  Zap,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import AnimatedFilterOverlay, { ANIMATED_EFFECTS, STATIC_OVERLAYS, EDGE_EFFECTS } from './AnimatedFilterOverlay';

// Snapchat/TikTok style beauty filters
const BEAUTY_FILTERS = [
  { id: 'none', name: 'Natural', icon: '👤', smooth: 0, brighten: 0, glow: 0 },
  { id: 'soft', name: 'Soft Glow', icon: '✨', smooth: 15, brighten: 8, glow: 5 },
  { id: 'beauty', name: 'Beauty', icon: '💄', smooth: 25, brighten: 12, glow: 10 },
  { id: 'glam', name: 'Glam', icon: '💎', smooth: 35, brighten: 18, glow: 15 },
  { id: 'flawless', name: 'Flawless', icon: '🌟', smooth: 45, brighten: 22, glow: 20 },
  { id: 'doll', name: 'Doll Face', icon: '🎀', smooth: 55, brighten: 28, glow: 25 },
  { id: 'porcelain', name: 'Porcelain', icon: '🪷', smooth: 60, brighten: 30, glow: 30 },
  { id: 'angel', name: 'Angel Skin', icon: '👼', smooth: 40, brighten: 35, glow: 35 },
];

// Color/mood filters (Instagram/TikTok style) - EXPANDED
const COLOR_FILTERS = [
  { id: 'none', name: 'None', icon: '🚫', css: '' },
  { id: 'warm', name: 'Warm', icon: '☀️', css: 'sepia(0.2) saturate(1.3) hue-rotate(-10deg)' },
  { id: 'cool', name: 'Cool', icon: '❄️', css: 'hue-rotate(20deg) saturate(0.9) brightness(1.05)' },
  { id: 'vintage', name: 'Vintage', icon: '📷', css: 'sepia(0.4) contrast(1.1) brightness(0.95)' },
  { id: 'dramatic', name: 'Drama', icon: '🎭', css: 'contrast(1.3) saturate(1.2) brightness(0.9)' },
  { id: 'golden', name: 'Golden', icon: '🏆', css: 'sepia(0.3) saturate(1.5) hue-rotate(-15deg) brightness(1.05)' },
  { id: 'noir', name: 'B&W', icon: '🖤', css: 'grayscale(1) contrast(1.2)' },
  { id: 'vivid', name: 'Vivid', icon: '🌈', css: 'saturate(1.6) contrast(1.1)' },
  { id: 'rose', name: 'Rose', icon: '🌸', css: 'hue-rotate(-20deg) saturate(1.2) brightness(1.05)' },
  { id: 'ocean', name: 'Ocean', icon: '🌊', css: 'hue-rotate(180deg) saturate(0.8) brightness(1.1)' },
  { id: 'sunset', name: 'Sunset', icon: '🌅', css: 'sepia(0.25) saturate(1.4) hue-rotate(-25deg)' },
  { id: 'neon', name: 'Neon', icon: '💜', css: 'saturate(2) hue-rotate(270deg) brightness(1.1)' },
  { id: 'cyberpunk', name: 'Cyber', icon: '🤖', css: 'saturate(1.8) hue-rotate(300deg) contrast(1.2) brightness(1.05)' },
  { id: 'dreamy', name: 'Dreamy', icon: '💭', css: 'saturate(0.8) brightness(1.15) contrast(0.9)' },
  { id: 'film', name: 'Film', icon: '🎞️', css: 'sepia(0.15) saturate(1.1) contrast(1.05) brightness(0.98)' },
  { id: 'fade', name: 'Fade', icon: '🌫️', css: 'saturate(0.7) brightness(1.1) contrast(0.85)' },
  { id: 'pop', name: 'Pop', icon: '💥', css: 'saturate(1.8) contrast(1.15) brightness(1.02)' },
  { id: 'moody', name: 'Moody', icon: '🌑', css: 'saturate(0.9) contrast(1.25) brightness(0.85)' },
  { id: 'tropical', name: 'Tropical', icon: '🌴', css: 'saturate(1.4) hue-rotate(-5deg) brightness(1.08)' },
  { id: 'retro', name: 'Retro', icon: '📺', css: 'sepia(0.35) saturate(1.2) hue-rotate(5deg) contrast(1.1)' },
];

// Animated face/screen effects
const ANIMATED_FACE_EFFECTS = [
  { id: 'none', name: 'None', icon: '👤', type: null },
  { id: 'hearts', name: 'Hearts', icon: '💕', type: 'animated' },
  { id: 'stars', name: 'Stars', icon: '⭐', type: 'animated' },
  { id: 'sparkle', name: 'Sparkle', icon: '✨', type: 'animated' },
  { id: 'fire', name: 'Fire', icon: '🔥', type: 'animated' },
  { id: 'butterfly', name: 'Butterfly', icon: '🦋', type: 'animated' },
  { id: 'snow', name: 'Snow', icon: '❄️', type: 'animated' },
  { id: 'confetti', name: 'Confetti', icon: '🎉', type: 'animated' },
  { id: 'bubbles', name: 'Bubbles', icon: '🫧', type: 'animated' },
  { id: 'leaves', name: 'Leaves', icon: '🍃', type: 'animated' },
  { id: 'money', name: 'Money', icon: '💰', type: 'animated' },
  { id: 'magic', name: 'Magic', icon: '🪄', type: 'animated' },
  { id: 'love', name: 'Love', icon: '💘', type: 'animated' },
];

// Static overlay accessories
const STATIC_FACE_OVERLAYS = [
  { id: 'none', name: 'None', icon: '👤' },
  { id: 'crown', name: 'Crown', icon: '👑' },
  { id: 'angel', name: 'Angel', icon: '😇' },
  { id: 'devil', name: 'Devil', icon: '😈' },
  { id: 'glasses', name: 'Glasses', icon: '🕶️' },
  { id: 'cat', name: 'Cat', icon: '😺' },
  { id: 'bunny', name: 'Bunny', icon: '🐰' },
  { id: 'flower', name: 'Flower', icon: '🌸' },
  { id: 'vip', name: 'VIP', icon: '💎' },
];

// Screen edge effects
const SCREEN_EFFECTS = [
  { id: 'none', name: 'None', icon: '🚫' },
  { id: 'vignette', name: 'Vignette', icon: '⚫' },
  { id: 'glow_gold', name: 'Gold Glow', icon: '✨' },
  { id: 'glow_pink', name: 'Pink Glow', icon: '💗' },
  { id: 'glow_blue', name: 'Blue Glow', icon: '💙' },
  { id: 'dreamy', name: 'Dreamy', icon: '💭' },
  { id: 'cinematic', name: 'Cinematic', icon: '🎬' },
  { id: 'spotlight', name: 'Spotlight', icon: '🔦' },
];

// Virtual backgrounds
const BACKGROUNDS = [
  { id: 'none', name: 'None', preview: '🚫', url: null },
  { id: 'blur', name: 'Blur', preview: '🌫️', type: 'blur' },
  { id: 'roman', name: 'Roman Temple', preview: '🏛️', url: 'https://images.unsplash.com/photo-1555992336-fb0d29498b13?w=800' },
  { id: 'neon', name: 'Neon City', preview: '🌃', url: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800' },
  { id: 'beach', name: 'Beach', preview: '🏖️', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800' },
  { id: 'space', name: 'Space', preview: '🚀', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800' },
  { id: 'forest', name: 'Forest', preview: '🌲', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800' },
  { id: 'studio', name: 'Studio', preview: '🎬', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800' },
  { id: 'mansion', name: 'Mansion', preview: '🏰', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800' },
  { id: 'gaming', name: 'Gaming', preview: '🎮', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800' },
];

export default function CameraFilters({ 
  videoRef, 
  onFilterChange,
  onMirrorChange,
  onBackgroundChange,
  initialMirror = true 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mirrorEnabled, setMirrorEnabled] = useState(initialMirror);
  const [beautyFilter, setBeautyFilter] = useState('none');
  const [colorFilter, setColorFilter] = useState('none');
  const [faceEffect, setFaceEffect] = useState('none');
  const [background, setBackground] = useState('none');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  
  // Manual adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [zoom, setZoom] = useState(100);
  
  // Beauty adjustments
  const [smoothSkin, setSmoothSkin] = useState(0);
  const [eyeEnhance, setEyeEnhance] = useState(0);
  const [faceSlim, setFaceSlim] = useState(0);

  const fileInputRef = useRef(null);

  // Apply all filters to video element
  const applyFilters = () => {
    if (!videoRef?.current) return;

    const video = videoRef.current;
    let filterStr = '';
    
    // Color filter preset
    const colorPreset = COLOR_FILTERS.find(f => f.id === colorFilter);
    if (colorPreset?.css) {
      filterStr += colorPreset.css + ' ';
    }
    
    // Manual adjustments
    filterStr += `brightness(${brightness}%) `;
    filterStr += `contrast(${contrast}%) `;
    filterStr += `saturate(${saturation}%) `;
    
    // Warmth (hue-rotate)
    if (warmth !== 0) {
      filterStr += `hue-rotate(${warmth}deg) `;
    }
    
    // Beauty filter - blur for skin smoothing effect
    const beautyPreset = BEAUTY_FILTERS.find(f => f.id === beautyFilter);
    if (beautyPreset && beautyPreset.smooth > 0) {
      // Simulate smooth skin with slight blur
      filterStr += `blur(${beautyPreset.smooth * 0.01}px) `;
      filterStr += `brightness(${100 + beautyPreset.brighten}%) `;
    }
    
    // Additional manual beauty adjustments
    if (smoothSkin > 0) {
      filterStr += `blur(${smoothSkin * 0.02}px) `;
    }

    video.style.filter = filterStr.trim();
    
    // Transform (mirror + zoom)
    const scaleX = mirrorEnabled ? -1 : 1;
    const scale = zoom / 100;
    video.style.transform = `scaleX(${scaleX}) scale(${scale})`;
    
    // Notify parent components
    onFilterChange?.({
      beauty: beautyFilter,
      color: colorFilter,
      faceEffect,
      brightness,
      contrast,
      saturation,
      warmth,
      smoothSkin,
      zoom
    });
    
    onMirrorChange?.(mirrorEnabled);
  };

  // Apply on any change
  React.useEffect(() => {
    applyFilters();
  }, [mirrorEnabled, beautyFilter, colorFilter, brightness, contrast, saturation, warmth, smoothSkin, zoom]);

  // Handle background change
  React.useEffect(() => {
    if (background === 'none') {
      onBackgroundChange?.(null);
    } else if (background === 'custom' && customBgUrl) {
      onBackgroundChange?.(customBgUrl);
    } else {
      const bg = BACKGROUNDS.find(b => b.id === background);
      if (bg?.url) {
        onBackgroundChange?.(bg.url);
      } else if (bg?.type === 'blur') {
        onBackgroundChange?.('blur');
      }
    }
  }, [background, customBgUrl]);

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setCustomBgUrl(result.file_url);
      setBackground('custom');
      toast.success('Background uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const resetAll = () => {
    setMirrorEnabled(true);
    setBeautyFilter('none');
    setColorFilter('none');
    setFaceEffect('none');
    setBackground('none');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setWarmth(0);
    setSmoothSkin(0);
    setZoom(100);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.button
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Wand2 className="w-5 h-5" />
        </motion.button>
      </SheetTrigger>
      
      <SheetContent className="bg-stone-950/95 backdrop-blur-xl border-white/10 overflow-y-auto w-[340px]">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Camera Effects
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="filters" className="mt-4">
          <TabsList className="w-full bg-white/5 p-1">
            <TabsTrigger value="filters" className="flex-1 text-xs data-[state=active]:bg-amber-600">
              <Palette className="w-3 h-3 mr-1" />
              Filters
            </TabsTrigger>
            <TabsTrigger value="beauty" className="flex-1 text-xs data-[state=active]:bg-pink-600">
              <Heart className="w-3 h-3 mr-1" />
              Beauty
            </TabsTrigger>
            <TabsTrigger value="bg" className="flex-1 text-xs data-[state=active]:bg-purple-600">
              <ImageIcon className="w-3 h-3 mr-1" />
              BG
            </TabsTrigger>
          </TabsList>

          {/* FILTERS TAB */}
          <TabsContent value="filters" className="space-y-4 mt-4">
            {/* Mirror Toggle */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2">
                <FlipHorizontal className="w-4 h-4 text-white/70" />
                <span className="text-white text-sm">Mirror</span>
              </div>
              <Switch
                checked={mirrorEnabled}
                onCheckedChange={setMirrorEnabled}
              />
            </div>

            {/* Color Filters Grid */}
            <div>
              <p className="text-white/60 text-xs mb-2">Color Filters</p>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_FILTERS.map((filter) => (
                  <motion.button
                    key={filter.id}
                    onClick={() => setColorFilter(filter.id)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                      colorFilter === filter.id
                        ? 'bg-amber-600 ring-2 ring-amber-400'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-lg">{filter.icon}</span>
                    <span className="text-[10px] text-white/80">{filter.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Manual Adjustments */}
            <div className="space-y-3">
              <p className="text-white/60 text-xs">Adjustments</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">Brightness</span>
                  <span className="text-amber-400">{brightness}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  onValueChange={([v]) => setBrightness(v)}
                  min={50}
                  max={150}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">Contrast</span>
                  <span className="text-amber-400">{contrast}%</span>
                </div>
                <Slider
                  value={[contrast]}
                  onValueChange={([v]) => setContrast(v)}
                  min={50}
                  max={150}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">Saturation</span>
                  <span className="text-amber-400">{saturation}%</span>
                </div>
                <Slider
                  value={[saturation]}
                  onValueChange={([v]) => setSaturation(v)}
                  min={0}
                  max={200}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">Warmth</span>
                  <span className="text-amber-400">{warmth > 0 ? `+${warmth}` : warmth}°</span>
                </div>
                <Slider
                  value={[warmth]}
                  onValueChange={([v]) => setWarmth(v)}
                  min={-30}
                  max={30}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">Zoom</span>
                  <span className="text-amber-400">{zoom}%</span>
                </div>
                <Slider
                  value={[zoom]}
                  onValueChange={([v]) => setZoom(v)}
                  min={50}
                  max={200}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>
            </div>
          </TabsContent>

          {/* BEAUTY TAB */}
          <TabsContent value="beauty" className="space-y-4 mt-4">
            {/* Beauty Presets */}
            <div>
              <p className="text-white/60 text-xs mb-2">Beauty Presets</p>
              <div className="grid grid-cols-3 gap-2">
                {BEAUTY_FILTERS.map((filter) => (
                  <motion.button
                    key={filter.id}
                    onClick={() => setBeautyFilter(filter.id)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      beautyFilter === filter.id
                        ? 'bg-pink-600 ring-2 ring-pink-400'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-2xl">{filter.icon}</span>
                    <span className="text-[10px] text-white/80">{filter.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Face Effects */}
            <div>
              <p className="text-white/60 text-xs mb-2">Face Effects</p>
              <div className="grid grid-cols-4 gap-2">
                {FACE_EFFECTS.map((effect) => (
                  <motion.button
                    key={effect.id}
                    onClick={() => setFaceEffect(effect.id)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                      faceEffect === effect.id
                        ? 'bg-purple-600 ring-2 ring-purple-400'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-lg">{effect.icon}</span>
                    <span className="text-[9px] text-white/80">{effect.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Manual Beauty */}
            <div className="space-y-3">
              <p className="text-white/60 text-xs">Fine Tune</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">Smooth Skin</span>
                  <span className="text-pink-400">{smoothSkin}%</span>
                </div>
                <Slider
                  value={[smoothSkin]}
                  onValueChange={([v]) => setSmoothSkin(v)}
                  min={0}
                  max={100}
                  className="[&_[role=slider]]:bg-pink-500"
                />
              </div>
            </div>
          </TabsContent>

          {/* BACKGROUND TAB */}
          <TabsContent value="bg" className="space-y-4 mt-4">
            {/* Upload Custom */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-white/40 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBgUpload}
              />
              <Upload className="w-8 h-8 text-white/50 mx-auto mb-2" />
              <p className="text-white/50 text-xs">Upload custom background</p>
            </div>

            {/* Custom uploaded */}
            {customBgUrl && (
              <div className="relative">
                <motion.button
                  onClick={() => setBackground('custom')}
                  className={`w-full h-20 rounded-xl overflow-hidden ${
                    background === 'custom' ? 'ring-2 ring-amber-400' : ''
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <img src={customBgUrl} alt="Custom" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Custom</span>
                  </div>
                </motion.button>
                <button
                  onClick={() => {
                    setCustomBgUrl(null);
                    if (background === 'custom') setBackground('none');
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            )}

            {/* Preset Backgrounds */}
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUNDS.map((bg) => (
                <motion.button
                  key={bg.id}
                  onClick={() => setBackground(bg.id)}
                  className={`aspect-video rounded-xl overflow-hidden relative transition-all ${
                    background === bg.id ? 'ring-2 ring-amber-400' : ''
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {bg.url ? (
                    <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center text-2xl">
                      {bg.preview}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 py-1">
                    <span className="text-[9px] text-white">{bg.name}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Reset Button */}
        <Button
          onClick={resetAll}
          variant="outline"
          className="w-full mt-6 border-white/20 text-white/70 hover:bg-white/10"
        >
          Reset All
        </Button>
      </SheetContent>
    </Sheet>
  );
}