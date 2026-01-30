/**
 * CameraFilters - Professional AR filter controls
 * Integrates with MediaPipe for face tracking, background segmentation, and real-time effects
 */

import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Palette,
  Image as ImageIcon,
  Upload,
  X,
  FlipHorizontal,
  ZoomIn,
  Heart,
  Zap,
  Crown,
  Glasses,
  Flame,
  Snowflake,
  RefreshCw,
  Activity,
  Camera
} from 'lucide-react';
import { toast } from 'sonner';
// AR imports removed - using simplified CSS-based filters

// Extended color filter presets with CSS filter values
const COLOR_FILTERS = [
  { id: 'none', name: 'Natural', icon: '🌿', css: '' },
  { id: 'portrait', name: 'Portrait', icon: '👤', css: 'brightness(1.05) contrast(1.05) saturate(0.95)' },
  { id: 'glamour', name: 'Glamour', icon: '✨', css: 'brightness(1.1) contrast(1.1) saturate(1.1) drop-shadow(0 0 8px rgba(255,255,255,0.3))' },
  { id: 'cinematic', name: 'Cinematic', icon: '🎬', css: 'contrast(1.2) saturate(0.9) brightness(0.95) sepia(0.1)' },
  { id: 'warmSunset', name: 'Golden Hour', icon: '🌅', css: 'brightness(1.05) saturate(1.15) sepia(0.25) hue-rotate(-5deg)' },
  { id: 'coolBlue', name: 'Cool Blue', icon: '❄️', css: 'brightness(1.05) saturate(0.95) hue-rotate(15deg) contrast(1.1)' },
  { id: 'retroFilm', name: 'Retro Film', icon: '📽️', css: 'sepia(0.4) contrast(1.15) saturate(0.8) brightness(0.95)' },
  { id: 'neonNight', name: 'Neon Night', icon: '🌃', css: 'saturate(1.5) contrast(1.25) brightness(1.05) hue-rotate(10deg)' },
  { id: 'softDream', name: 'Soft Dream', icon: '☁️', css: 'brightness(1.1) contrast(0.9) saturate(0.85) blur(0.5px)' },
  { id: 'dramatic', name: 'Dramatic', icon: '🎭', css: 'contrast(1.4) saturate(0.7) brightness(0.9)' },
  { id: 'vintage', name: 'Vintage', icon: '📻', css: 'sepia(0.5) contrast(1.1) saturate(0.75) brightness(0.95)' },
  { id: 'popArt', name: 'Pop Art', icon: '🎨', css: 'saturate(1.6) contrast(1.3) brightness(1.05)' },
  { id: 'bw', name: 'B&W', icon: '⚫', css: 'grayscale(1) contrast(1.1)' },
  { id: 'vivid', name: 'Vivid', icon: '🌈', css: 'saturate(1.4) contrast(1.15) brightness(1.05)' },
];

// AR face accessories
const AR_ACCESSORIES = [
  { id: 'none', name: 'None', icon: '🚫' },
  { id: 'crown', name: 'Crown', icon: '👑', type: 'head' },
  { id: 'sunglasses', name: 'Sunglasses', icon: '🕶️', type: 'eyes' },
  { id: 'catEars', name: 'Cat Ears', icon: '🐱', type: 'head' },
  { id: 'devilHorns', name: 'Devil', icon: '😈', type: 'head' },
  { id: 'angelHalo', name: 'Halo', icon: '😇', type: 'head' },
  { id: 'partyHat', name: 'Party', icon: '🎉', type: 'head' },
  { id: 'beard', name: 'Beard', icon: '🧔', type: 'chin' },
  { id: 'mask', name: 'Mask', icon: '🎭', type: 'face' },
  { id: 'butterfly', name: 'Butterfly', icon: '🦋', type: 'face', animated: true },
  { id: 'hearts', name: 'Hearts', icon: '💕', type: 'particle', animated: true },
  { id: 'sparkles', name: 'Sparkles', icon: '✨', type: 'particle', animated: true },
  { id: 'fire', name: 'Fire Aura', icon: '🔥', type: 'aura', animated: true },
  { id: 'ice', name: 'Ice Aura', icon: '🧊', type: 'aura', animated: true },
];

// Background options
const BG_OPTIONS = [
  { id: 'none', name: 'None', icon: '🚫', type: 'none' },
  { id: 'blur', name: 'Blur', icon: '🌫️', type: 'blur', intensity: 15 },
  { id: 'blurLight', name: 'Light Blur', icon: '💨', type: 'blur', intensity: 8 },
  { id: 'blurHeavy', name: 'Heavy Blur', icon: '🌁', type: 'blur', intensity: 25 },
  { id: 'black', name: 'Black', icon: '⬛', type: 'color', color: '#000000' },
  { id: 'green', name: 'Green Screen', icon: '🟩', type: 'color', color: '#00ff00' },
  { id: 'sunset', name: 'Sunset', icon: '🌅', type: 'gradient', colors: ['#ff7e5f', '#feb47b'] },
  { id: 'ocean', name: 'Ocean', icon: '🌊', type: 'gradient', colors: ['#2193b0', '#6dd5ed'] },
  { id: 'purple', name: 'Purple', icon: '💜', type: 'gradient', colors: ['#8e2de2', '#4a00e0'] },
  { id: 'romanForum', name: 'Roman Forum', icon: '🏛️', type: 'image', url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1280&q=80' },
  { id: 'neonCity', name: 'Neon City', icon: '🌃', type: 'image', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1280&q=80' },
  { id: 'beach', name: 'Beach', icon: '🏝️', type: 'image', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&q=80' },
  { id: 'space', name: 'Space', icon: '🚀', type: 'image', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1280&q=80' },
  { id: 'studio', name: 'Studio', icon: '🎬', type: 'image', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1280&q=80' },
];

// Screen effects/overlays
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

export default function CameraFilters({ 
  videoRef, 
  canvasRef,
  onFilterChange,
  onMirrorChange,
  onBackgroundChange,
  onOverlayChange,
  onAccessoryChange,
  onARStateChange,
  initialMirror = true 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('filters');
  
  // Filter state
  const [mirrorEnabled, setMirrorEnabled] = useState(initialMirror);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedAccessory, setSelectedAccessory] = useState('none');
  const [selectedBackground, setSelectedBackground] = useState('none');
  const [selectedScreenEffect, setSelectedScreenEffect] = useState('none');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  
  // Custom adjustments
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [temperature, setTemperature] = useState(0);
  const [beautySmooth, setBeautySmooth] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [glow, setGlow] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [effectIntensity, setEffectIntensity] = useState(100);
  
  // AR state
  const [isAREnabled, setIsAREnabled] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [fps, setFps] = useState(0);

  const fileInputRef = useRef(null);

  // Build and apply CSS filters to video
  const applyFilters = () => {
    if (!videoRef?.current) return;

    const video = videoRef.current;
    
    // Get preset CSS filter
    const preset = COLOR_FILTERS.find(f => f.id === selectedFilter);
    let filterStr = preset?.css || '';
    
    // Add manual adjustments on top of preset
    let manualFilters = '';
    
    // Brightness adjustment
    if (brightness !== 1) {
      manualFilters += `brightness(${brightness}) `;
    }
    
    // Contrast adjustment
    if (contrast !== 1) {
      manualFilters += `contrast(${contrast}) `;
    }
    
    // Saturation adjustment
    if (saturation !== 1) {
      manualFilters += `saturate(${saturation}) `;
    }
    
    // Temperature (warm/cool shift)
    if (temperature !== 0) {
      if (temperature > 0) {
        manualFilters += `sepia(${temperature * 0.3}) `;
      } else {
        manualFilters += `hue-rotate(${temperature * 30}deg) `;
      }
    }
    
    // Beauty smoothing (subtle blur)
    if (beautySmooth > 0) {
      manualFilters += `blur(${beautySmooth * 0.03}px) `;
    }
    
    // Glow effect
    if (glow > 0) {
      manualFilters += `drop-shadow(0 0 ${glow * 8}px rgba(255,255,255,0.4)) `;
    }

    // Combine preset and manual filters
    const combinedFilter = (filterStr + ' ' + manualFilters).trim() || 'none';
    video.style.filter = combinedFilter;
    
    // Transform (mirror + zoom)
    const scaleX = mirrorEnabled ? -1 : 1;
    const scale = zoom / 100;
    video.style.transform = `scaleX(${scaleX}) scale(${scale})`;
    
    // Notify parent
    onFilterChange?.({
      filter: selectedFilter,
      brightness,
      contrast,
      saturation,
      temperature,
      beautySmooth,
      vignette,
      glow,
      zoom
    });
    
    onMirrorChange?.(mirrorEnabled);
  };

  // Apply on any change
  useEffect(() => {
    applyFilters();
  }, [selectedFilter, mirrorEnabled, brightness, contrast, saturation, temperature, beautySmooth, vignette, glow, zoom]);

  // Handle accessory change
  useEffect(() => {
    onAccessoryChange?.(selectedAccessory);
    
    // Enable AR when accessory selected
    if (selectedAccessory !== 'none' && !isAREnabled) {
      setIsAREnabled(true);
      onARStateChange?.(true);
    }
  }, [selectedAccessory]);

  // Handle background change
  useEffect(() => {
    if (selectedBackground === 'none') {
      onBackgroundChange?.(null);
    } else if (selectedBackground === 'custom' && customBgUrl) {
      onBackgroundChange?.({ type: 'image', url: customBgUrl });
    } else {
      const bg = BG_OPTIONS.find(b => b.id === selectedBackground);
      if (bg) {
        onBackgroundChange?.(bg);
        
        // Enable AR for background replacement
        if (bg.type !== 'none' && !isAREnabled) {
          setIsAREnabled(true);
          onARStateChange?.(true);
        }
      }
    }
  }, [selectedBackground, customBgUrl]);

  // Handle screen effect change
  useEffect(() => {
    onOverlayChange?.({
      screenEffect: selectedScreenEffect !== 'none' ? selectedScreenEffect : null,
      intensity: effectIntensity / 100
    });
  }, [selectedScreenEffect, effectIntensity]);

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
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

  const resetAll = () => {
    setMirrorEnabled(true);
    setSelectedFilter('none');
    setSelectedAccessory('none');
    setSelectedBackground('none');
    setSelectedScreenEffect('none');
    setBrightness(1);
    setContrast(1);
    setSaturation(1);
    setTemperature(0);
    setBeautySmooth(0);
    setVignette(0);
    setGlow(0);
    setZoom(100);
    setEffectIntensity(100);
    setIsAREnabled(false);
    onARStateChange?.(false);
  };

  return (
    <>
      {/* AR Processing Canvas (hidden) */}
      {isAREnabled && (
        <canvas 
          ref={canvasRef}
          className="hidden"
        />
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <motion.button
            className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Wand2 className="w-6 h-6" />
            {isAREnabled && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black" />
            )}
          </motion.button>
        </SheetTrigger>
        
        <SheetContent 
          side="bottom" 
          className="h-[75vh] bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl"
        >
          <SheetHeader className="pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Effects Studio
              </SheetTitle>
              <div className="flex items-center gap-2">
                {isAREnabled && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${faceDetected ? 'text-green-400 border-green-400/30' : 'text-yellow-400 border-yellow-400/30'}`}
                  >
                    <Activity className="w-3 h-3 mr-1" />
                    {fps} FPS
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetAll}
                  className="text-white/60 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full bg-white/5 p-1 rounded-xl grid grid-cols-4">
              <TabsTrigger 
                value="filters" 
                className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500"
              >
                <Palette className="w-4 h-4 mr-1" />
                Filters
              </TabsTrigger>
              <TabsTrigger 
                value="ar"
                className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500"
              >
                <Crown className="w-4 h-4 mr-1" />
                AR
              </TabsTrigger>
              <TabsTrigger 
                value="background"
                className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500"
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                BG
              </TabsTrigger>
              <TabsTrigger 
                value="adjust"
                className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500"
              >
                <Sun className="w-4 h-4 mr-1" />
                Tune
              </TabsTrigger>
            </TabsList>

            {/* FILTERS TAB */}
            <TabsContent value="filters" className="mt-4 space-y-4">
              {/* Mirror Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <FlipHorizontal className="w-4 h-4 text-white/70" />
                  <span className="text-white text-sm">Mirror Camera</span>
                </div>
                <Switch
                  checked={mirrorEnabled}
                  onCheckedChange={setMirrorEnabled}
                />
              </div>

              {/* Filter Presets */}
              <div>
                <p className="text-white/60 text-xs mb-3">Color Presets</p>
                <ScrollArea className="h-[200px]">
                  <div className="grid grid-cols-4 gap-3 pr-4">
                    {COLOR_FILTERS.map((filter) => (
                      <motion.button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`relative p-3 rounded-xl transition-all ${
                          selectedFilter === filter.id 
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-white' 
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className="text-2xl block mb-1">{filter.icon}</span>
                        <span className="text-[10px] text-white/80 block truncate">{filter.name}</span>
                        {selectedFilter === filter.id && (
                          <motion.div
                            layoutId="filterIndicator"
                            className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Screen Effects */}
              <div>
                <p className="text-white/60 text-xs mb-3">Screen Effects</p>
                <div className="grid grid-cols-4 gap-2">
                  {SCREEN_EFFECTS.map((effect) => (
                    <motion.button
                      key={effect.id}
                      onClick={() => setSelectedScreenEffect(effect.id)}
                      className={`p-2 rounded-xl transition-all ${
                        selectedScreenEffect === effect.id 
                          ? 'bg-blue-600 ring-2 ring-blue-400' 
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="text-lg block">{effect.icon}</span>
                      <span className="text-[8px] text-white/70">{effect.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* AR ACCESSORIES TAB */}
            <TabsContent value="ar" className="mt-4 space-y-4">
              <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 mb-4">
                <p className="text-xs text-purple-300 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Face tracking powered by AI. Look at camera for best results!
                </p>
              </div>

              <ScrollArea className="h-[280px]">
                <div className="grid grid-cols-4 gap-3 pr-4">
                  {AR_ACCESSORIES.map((accessory) => (
                    <motion.button
                      key={accessory.id}
                      onClick={() => setSelectedAccessory(accessory.id)}
                      className={`relative p-3 rounded-xl transition-all ${
                        selectedAccessory === accessory.id 
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 ring-2 ring-white' 
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="text-2xl block mb-1">{accessory.icon}</span>
                      <span className="text-[10px] text-white/80 block truncate">{accessory.name}</span>
                      {accessory.animated && (
                        <Badge className="absolute -top-1 -left-1 text-[8px] bg-purple-500 px-1 py-0">
                          ✨
                        </Badge>
                      )}
                      {selectedAccessory === accessory.id && (
                        <motion.div
                          layoutId="accessoryIndicator"
                          className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
              </ScrollArea>

              {/* Effect Intensity */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">Effect Intensity</span>
                  <span className="text-amber-400">{effectIntensity}%</span>
                </div>
                <Slider
                  value={[effectIntensity]}
                  onValueChange={([v]) => setEffectIntensity(v)}
                  min={25}
                  max={150}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>
            </TabsContent>

            {/* BACKGROUND TAB */}
            <TabsContent value="background" className="mt-4 space-y-4">
              {/* Upload Custom */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-white/40 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBgUpload}
                />
                <Upload className="w-6 h-6 text-white/50 mx-auto mb-2" />
                <p className="text-white/50 text-xs">Upload custom background</p>
              </div>

              {/* Custom uploaded */}
              {customBgUrl && (
                <div className="relative">
                  <motion.button
                    onClick={() => setSelectedBackground('custom')}
                    className={`w-full h-16 rounded-xl overflow-hidden ${
                      selectedBackground === 'custom' ? 'ring-2 ring-amber-400' : ''
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <img src={customBgUrl} alt="Custom" className="w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">Custom Background</span>
                    </div>
                  </motion.button>
                  <button
                    onClick={() => {
                      setCustomBgUrl(null);
                      if (selectedBackground === 'custom') setSelectedBackground('none');
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}

              {/* Preset Backgrounds */}
              <ScrollArea className="h-[200px]">
                <div className="grid grid-cols-3 gap-3 pr-4">
                  {BG_OPTIONS.map((bg) => (
                    <motion.button
                      key={bg.id}
                      onClick={() => setSelectedBackground(bg.id)}
                      className={`relative h-20 rounded-xl overflow-hidden transition-all ${
                        selectedBackground === bg.id ? 'ring-2 ring-white' : 'ring-1 ring-white/10'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Background preview */}
                      {bg.type === 'color' ? (
                        <div className="absolute inset-0" style={{ backgroundColor: bg.color }} />
                      ) : bg.type === 'gradient' ? (
                        <div 
                          className="absolute inset-0"
                          style={{ background: `linear-gradient(to bottom, ${bg.colors[0]}, ${bg.colors[1]})` }}
                        />
                      ) : bg.type === 'image' ? (
                        <img src={bg.url} alt={bg.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : bg.type === 'blur' ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-900" />
                      )}

                      <div className="absolute inset-0 bg-black/30" />

                      <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                        <span className="text-[10px] text-white flex items-center justify-center gap-1">
                          {bg.icon} {bg.name}
                        </span>
                      </div>

                      {selectedBackground === bg.id && (
                        <motion.div
                          layoutId="bgIndicator"
                          className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full"
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-xs text-blue-300">
                  <ImageIcon className="w-3 h-3 inline mr-1" />
                  AI separates you from background. Works best with good lighting!
                </p>
              </div>
            </TabsContent>

            {/* ADJUSTMENTS TAB */}
            <TabsContent value="adjust" className="mt-4 space-y-4">
              <ScrollArea className="h-[320px] pr-4">
                <div className="space-y-4">
                  {/* Brightness */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/70">Brightness</span>
                      <span className="text-amber-400">{Math.round(brightness * 100)}%</span>
                    </div>
                    <Slider
                      value={[brightness]}
                      onValueChange={([v]) => setBrightness(v)}
                      min={0.5}
                      max={1.5}
                      step={0.01}
                      className="[&_[role=slider]]:bg-amber-500"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/70">Contrast</span>
                      <span className="text-amber-400">{Math.round(contrast * 100)}%</span>
                    </div>
                    <Slider
                      value={[contrast]}
                      onValueChange={([v]) => setContrast(v)}
                      min={0.5}
                      max={1.5}
                      step={0.01}
                      className="[&_[role=slider]]:bg-amber-500"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/70">Saturation</span>
                      <span className="text-amber-400">{Math.round(saturation * 100)}%</span>
                    </div>
                    <Slider
                      value={[saturation]}
                      onValueChange={([v]) => setSaturation(v)}
                      min={0}
                      max={2}
                      step={0.01}
                      className="[&_[role=slider]]:bg-amber-500"
                    />
                  </div>

                  {/* Temperature */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/70">Temperature</span>
                      <span className="text-amber-400">{temperature > 0 ? '+' : ''}{Math.round(temperature * 100)}</span>
                    </div>
                    <Slider
                      value={[temperature]}
                      onValueChange={([v]) => setTemperature(v)}
                      min={-0.5}
                      max={0.5}
                      step={0.01}
                      className="[&_[role=slider]]:bg-amber-500"
                    />
                  </div>

                  {/* Beauty Smooth */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/70 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Skin Smooth
                      </span>
                      <span className="text-pink-400">{Math.round(beautySmooth)}%</span>
                    </div>
                    <Slider
                      value={[beautySmooth]}
                      onValueChange={([v]) => setBeautySmooth(v)}
                      min={0}
                      max={100}
                      step={1}
                      className="[&_[role=slider]]:bg-pink-500"
                    />
                  </div>

                  {/* Glow */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/70">Glow</span>
                      <span className="text-pink-400">{Math.round(glow * 100)}%</span>
                    </div>
                    <Slider
                      value={[glow]}
                      onValueChange={([v]) => setGlow(v)}
                      min={0}
                      max={1}
                      step={0.01}
                      className="[&_[role=slider]]:bg-pink-500"
                    />
                  </div>

                  {/* Zoom */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/70 flex items-center gap-1">
                        <ZoomIn className="w-3 h-3" /> Zoom
                      </span>
                      <span className="text-green-400">{zoom}%</span>
                    </div>
                    <Slider
                      value={[zoom]}
                      onValueChange={([v]) => setZoom(v)}
                      min={50}
                      max={200}
                      step={1}
                      className="[&_[role=slider]]:bg-green-500"
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}