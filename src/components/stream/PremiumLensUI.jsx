/**
 * PremiumLensUI - TikTok/Instagram style lens picker interface
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Wand2, 
  Sparkles, 
  Palette, 
  Layers, 
  Smile, 
  Upload,
  FlipHorizontal,
  RefreshCw,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  ZoomIn,
  X,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PREMIUM_FILTERS,
  BEAUTY_MODES,
  AR_EFFECTS,
  VIRTUAL_BACKGROUNDS,
  PARTICLE_EFFECTS
} from './PremiumARProcessor';
import { useMediaPipe, mediaPipeManager } from './MediaPipeProcessor';
import AREffectOverlay from './AREffectOverlay';

// ============================================
// MAIN COMPONENT
// ============================================

export default function PremiumLensUI({ 
  videoRef, 
  canvasRef,
  onFilterChange,
  onBeautyChange,
  onEffectChange,
  onBackgroundChange,
  onMirrorChange,
  onSettingsChange,
  initialMirror = true,
  faceMeshEnabled = true,
  segmentationEnabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('filters');
  
  // Selections
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedBeauty, setSelectedBeauty] = useState('off');
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [selectedBackground, setSelectedBackground] = useState('none');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  const [mirrorEnabled, setMirrorEnabled] = useState(initialMirror);
  
  // Manual adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [smooth, setSmooth] = useState(0);
  const [zoom, setZoom] = useState(100);

  const fileInputRef = useRef(null);

  // Get current selections - memoized to prevent infinite loops (MUST be defined before useMediaPipe)
  const currentFilter = useMemo(() => 
    PREMIUM_FILTERS.find(f => f.id === selectedFilter) || PREMIUM_FILTERS[0], 
    [selectedFilter]
  );
  const currentBeauty = useMemo(() => 
    BEAUTY_MODES.find(b => b.id === selectedBeauty) || BEAUTY_MODES[0], 
    [selectedBeauty]
  );
  const currentEffect = useMemo(() => 
    AR_EFFECTS.find(e => e.id === selectedEffect) || AR_EFFECTS[0], 
    [selectedEffect]
  );
  const currentBackground = useMemo(() => 
    selectedBackground === 'custom' && customBgUrl 
      ? { id: 'custom', type: 'image', url: customBgUrl, name: 'Custom', icon: '📷' }
      : VIRTUAL_BACKGROUNDS.find(b => b.id === selectedBackground) || VIRTUAL_BACKGROUNDS[0],
    [selectedBackground, customBgUrl]
  );

  // MediaPipe integration for face mesh tracking (after currentBackground is defined)
  const { 
    isReady: mediaPipeReady, 
    isProcessing: mediaPipeProcessing,
    faceLandmarks,
    startProcessing: startMediaPipe,
    stopProcessing: stopMediaPipe,
  } = useMediaPipe(videoRef, canvasRef, {
    faceMeshEnabled: faceMeshEnabled && selectedEffect !== 'none',
    segmentationEnabled: segmentationEnabled && selectedBackground !== 'none',
    backgroundType: currentBackground?.type,
    backgroundValue: currentBackground?.type === 'solid' ? currentBackground.color :
                     currentBackground?.type === 'gradient' ? { colors: currentBackground.colors, angle: currentBackground.angle } :
                     currentBackground?.type === 'image' ? currentBackground.url :
                     currentBackground?.type === 'blur' ? currentBackground.intensity : null,
  });

  // Start/stop MediaPipe based on effect selection
  useEffect(() => {
    if (mediaPipeReady && (selectedEffect !== 'none' || (segmentationEnabled && selectedBackground !== 'none'))) {
      startMediaPipe();
    } else {
      stopMediaPipe();
    }
  }, [mediaPipeReady, selectedEffect, selectedBackground, segmentationEnabled, startMediaPipe, stopMediaPipe]);

  // Apply effects to video element - OPTIMIZED for broadcast quality
  const applyEffects = useCallback(() => {
    if (!videoRef?.current) return;

    const video = videoRef.current;
    const filters = [];
    
    // Get filter adjustments
    const adj = currentFilter.adjustments || {};
    
    // Brightness - combine user adjustment with filter preset
    const totalBrightness = (brightness / 100) * (adj.brightness || 1);
    if (totalBrightness !== 1) {
      filters.push(`brightness(${totalBrightness.toFixed(2)})`);
    }
    
    // Contrast
    const totalContrast = (contrast / 100) * (adj.contrast || 1);
    if (totalContrast !== 1) {
      filters.push(`contrast(${totalContrast.toFixed(2)})`);
    }
    
    // Saturation
    let totalSat = (saturation / 100) * (adj.saturation || 1);
    if (totalSat !== 1) {
      filters.push(`saturate(${totalSat.toFixed(2)})`);
    }
    
    // Sepia for vintage effects
    if (adj.sepia && adj.sepia > 0) {
      filters.push(`sepia(${adj.sepia})`);
    }
    
    // Temperature via hue-rotate (subtle effect)
    const tempShift = warmth * 0.25 + (adj.temperature || 0) * 0.2;
    if (Math.abs(tempShift) > 0.5) {
      filters.push(`hue-rotate(${tempShift.toFixed(1)}deg)`);
    }
    
    // Beauty smooth - VERY subtle to avoid blurring broadcast
    // Only apply minimal blur that doesn't degrade video quality
    const totalSmooth = smooth + (currentBeauty.smooth || 0);
    if (totalSmooth > 30) {
      // Max 0.5px blur to maintain sharpness
      const blurAmount = Math.min(0.5, totalSmooth * 0.008);
      filters.push(`blur(${blurAmount.toFixed(2)}px)`);
    }

    // Apply combined filter string
    video.style.filter = filters.length > 0 ? filters.join(' ') : 'none';
    
    // Transform - mirror only, no zoom to prevent cropping issues
    const scaleX = mirrorEnabled ? -1 : 1;
    video.style.transform = `scaleX(${scaleX})`;
    video.style.transformOrigin = 'center center';
    
    // Callbacks - pass processed values
    onFilterChange?.({ 
      filter: currentFilter, 
      brightness, 
      contrast, 
      saturation, 
      warmth, 
      smooth, 
      zoom 
    });
    onBeautyChange?.(currentBeauty);
    onEffectChange?.(currentEffect);
    onBackgroundChange?.(currentBackground);
    onMirrorChange?.(mirrorEnabled);
  }, [selectedFilter, selectedBeauty, selectedEffect, selectedBackground, mirrorEnabled, 
      brightness, contrast, saturation, warmth, smooth, zoom,
      currentFilter, currentBeauty, currentEffect, currentBackground, videoRef,
      onFilterChange, onBeautyChange, onEffectChange, onBackgroundChange, onMirrorChange]);

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

  // Reset all - restore to broadcast-safe defaults
  const resetAll = () => {
    setSelectedFilter('none');
    setSelectedBeauty('off');
    setSelectedEffect('none');
    setSelectedBackground('none');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setWarmth(0);
    setSmooth(0);
    setZoom(100);
    // Don't reset mirror - users typically want to stay mirrored
    
    // Clear video filter immediately
    if (videoRef?.current) {
      videoRef.current.style.filter = 'none';
    }
    toast.success('Reset to defaults');
  };

  const tabs = [
    { id: 'filters', name: 'Filters', icon: '🎨', count: PREMIUM_FILTERS.length },
    { id: 'beauty', name: 'Beauty', icon: '✨', count: BEAUTY_MODES.length },
    { id: 'effects', name: 'Effects', icon: '😊', count: AR_EFFECTS.length },
    { id: 'backgrounds', name: 'BG', icon: '🖼️', count: VIRTUAL_BACKGROUNDS.length },
  ];

  const hasActiveEffects = selectedFilter !== 'none' || 
                           selectedBeauty !== 'off' || 
                           selectedEffect !== 'none' || 
                           selectedBackground !== 'none';

  // Group effects by category
  const effectCategories = {
    animals: AR_EFFECTS.filter(e => e.category === 'animals'),
    accessories: AR_EFFECTS.filter(e => e.category === 'accessories'),
    eyes: AR_EFFECTS.filter(e => e.category === 'eyes'),
    face: AR_EFFECTS.filter(e => e.category === 'face'),
    seasonal: AR_EFFECTS.filter(e => e.category === 'seasonal'),
  };

  // Group backgrounds
  const bgCategories = {
    blur: VIRTUAL_BACKGROUNDS.filter(b => b.type === 'blur'),
    solid: VIRTUAL_BACKGROUNDS.filter(b => b.type === 'solid'),
    gradient: VIRTUAL_BACKGROUNDS.filter(b => b.type === 'gradient'),
    image: VIRTUAL_BACKGROUNDS.filter(b => b.type === 'image'),
  };

  // Get video dimensions for AR overlay
  const videoWidth = videoRef?.current?.videoWidth || 640;
  const videoHeight = videoRef?.current?.videoHeight || 480;

  return (
    <>
      {/* AR Effect Overlay - Now with face mesh tracking */}
      <AREffectOverlay 
        effect={currentEffect}
        faceLandmarks={faceLandmarks}
        videoWidth={videoWidth}
        videoHeight={videoHeight}
        isMirrored={mirrorEnabled}
      />
      
      {/* Background Layer */}
      <BackgroundRenderer background={currentBackground} segmentationEnabled={segmentationEnabled} />

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <motion.button
            className="relative w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/40"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Wand2 className="w-7 h-7" />
            {hasActiveEffects && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black flex items-center justify-center"
              >
                <Check className="w-3 h-3" />
              </motion.span>
            )}
          </motion.button>
        </SheetTrigger>
        
        <SheetContent 
          side="bottom" 
          className="h-[80vh] bg-gradient-to-b from-gray-900 to-black border-t border-white/10 rounded-t-3xl p-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 shadow-lg">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Studio</h3>
                <p className="text-white/40 text-xs">Filters • Beauty • Effects • BG</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setMirrorEnabled(!mirrorEnabled)}
                whileTap={{ scale: 0.9 }}
                className={`p-2.5 rounded-xl transition-all ${
                  mirrorEnabled 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-white/10 text-white/60'
                }`}
              >
                <FlipHorizontal className="w-5 h-5" />
              </motion.button>
              <motion.button 
                onClick={resetAll} 
                whileTap={{ scale: 0.9 }}
                className="p-2.5 rounded-xl bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
              >
                <RefreshCw className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-white/5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 text-center transition-all relative ${
                  activeTab === tab.id ? 'text-white' : 'text-white/40'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[10px] block mt-1 font-medium">{tab.name}</span>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(80vh-160px)]">
            <div className="p-4">
              
              {/* FILTERS TAB */}
              {activeTab === 'filters' && (
                <div className="space-y-6">
                  {/* Filter Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {PREMIUM_FILTERS.map(filter => (
                      <FilterButton
                        key={filter.id}
                        filter={filter}
                        isSelected={selectedFilter === filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                      />
                    ))}
                  </div>
                  
                  {/* Adjustments */}
                  <div className="pt-4 border-t border-white/10 space-y-4">
                    <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Adjustments</h4>
                    
                    <AdjustmentSlider 
                      icon={<Sun className="w-4 h-4" />}
                      label="Brightness"
                      value={brightness}
                      onChange={setBrightness}
                      min={50}
                      max={150}
                    />
                    <AdjustmentSlider 
                      icon={<Contrast className="w-4 h-4" />}
                      label="Contrast"
                      value={contrast}
                      onChange={setContrast}
                      min={50}
                      max={150}
                    />
                    <AdjustmentSlider 
                      icon={<Droplets className="w-4 h-4" />}
                      label="Saturation"
                      value={saturation}
                      onChange={setSaturation}
                      min={0}
                      max={200}
                    />
                    <AdjustmentSlider 
                      icon={<Thermometer className="w-4 h-4" />}
                      label="Warmth"
                      value={warmth}
                      onChange={setWarmth}
                      min={-50}
                      max={50}
                      centered
                    />
                    {/* Zoom removed - causes cropping issues during broadcast */}
                  </div>
                </div>
              )}

              {/* BEAUTY TAB */}
              {activeTab === 'beauty' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {BEAUTY_MODES.map(beauty => (
                      <BeautyButton
                        key={beauty.id}
                        beauty={beauty}
                        isSelected={selectedBeauty === beauty.id}
                        onClick={() => setSelectedBeauty(beauty.id)}
                      />
                    ))}
                  </div>

                  {/* Manual Smooth - with warning */}
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    <AdjustmentSlider 
                      icon={<Sparkles className="w-4 h-4" />}
                      label="Skin Smooth"
                      value={smooth}
                      onChange={setSmooth}
                      min={0}
                      max={100}
                    />
                    {smooth > 50 && (
                      <p className="text-amber-400/70 text-[10px]">
                        ⚠️ High smoothing may reduce video sharpness
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* EFFECTS TAB */}
              {activeTab === 'effects' && (
                <div className="space-y-6">
                  {/* None option */}
                  <EffectButton
                    effect={AR_EFFECTS[0]}
                    isSelected={selectedEffect === 'none'}
                    onClick={() => setSelectedEffect('none')}
                    large
                  />

                  {/* Categories */}
                  {Object.entries(effectCategories).map(([category, effects]) => (
                    effects.length > 0 && (
                      <div key={category}>
                        <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3 capitalize">
                          {category}
                        </h4>
                        <div className="grid grid-cols-4 gap-2">
                          {effects.map(effect => (
                            <EffectButton
                              key={effect.id}
                              effect={effect}
                              isSelected={selectedEffect === effect.id}
                              onClick={() => setSelectedEffect(effect.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* BACKGROUNDS TAB */}
              {activeTab === 'backgrounds' && (
                <div className="space-y-6">
                  {/* Upload custom */}
                  <div className="flex justify-between items-center">
                    <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Virtual Backgrounds</h4>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload
                    </button>
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleBgUpload} 
                    />
                  </div>

                  {/* None */}
                  <BackgroundButton
                    bg={VIRTUAL_BACKGROUNDS[0]}
                    isSelected={selectedBackground === 'none'}
                    onClick={() => setSelectedBackground('none')}
                  />

                  {/* Blur options */}
                  <div>
                    <h4 className="text-white/40 text-xs mb-2">Blur</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {bgCategories.blur.map(bg => (
                        <BackgroundButton
                          key={bg.id}
                          bg={bg}
                          isSelected={selectedBackground === bg.id}
                          onClick={() => setSelectedBackground(bg.id)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Solid colors */}
                  <div>
                    <h4 className="text-white/40 text-xs mb-2">Solid Colors</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {bgCategories.solid.map(bg => (
                        <BackgroundButton
                          key={bg.id}
                          bg={bg}
                          isSelected={selectedBackground === bg.id}
                          onClick={() => setSelectedBackground(bg.id)}
                          small
                        />
                      ))}
                    </div>
                  </div>

                  {/* Gradients */}
                  <div>
                    <h4 className="text-white/40 text-xs mb-2">Gradients</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {bgCategories.gradient.map(bg => (
                        <BackgroundButton
                          key={bg.id}
                          bg={bg}
                          isSelected={selectedBackground === bg.id}
                          onClick={() => setSelectedBackground(bg.id)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Images */}
                  <div>
                    <h4 className="text-white/40 text-xs mb-2">Scenes</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {bgCategories.image.map(bg => (
                        <BackgroundButton
                          key={bg.id}
                          bg={bg}
                          isSelected={selectedBackground === bg.id}
                          onClick={() => setSelectedBackground(bg.id)}
                        />
                      ))}
                      {customBgUrl && (
                        <BackgroundButton
                          bg={{ id: 'custom', type: 'image', url: customBgUrl, name: 'Custom', icon: '📷' }}
                          isSelected={selectedBackground === 'custom'}
                          onClick={() => setSelectedBackground('custom')}
                        />
                      )}
                    </div>
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
// SUB-COMPONENTS
// ============================================

function FilterButton({ filter, isSelected, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${
        isSelected 
          ? 'bg-gradient-to-br from-pink-500 to-purple-600 ring-2 ring-white shadow-xl shadow-purple-500/30' 
          : 'bg-white/10 hover:bg-white/15'
      }`}
    >
      <span className="text-2xl">{filter.icon}</span>
      <span className="text-[9px] text-white/70 mt-1 font-medium">{filter.name}</span>
    </motion.button>
  );
}

function BeautyButton({ beauty, isSelected, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={`p-4 rounded-2xl flex flex-col items-center transition-all ${
        isSelected 
          ? 'bg-gradient-to-br from-pink-500 to-rose-600 ring-2 ring-white shadow-xl shadow-pink-500/30' 
          : 'bg-white/10 hover:bg-white/15'
      }`}
    >
      <span className="text-3xl mb-2">{beauty.icon}</span>
      <span className="text-xs text-white/80 font-medium">{beauty.name}</span>
      {beauty.smooth > 0 && (
        <span className="text-[10px] text-white/50 mt-1">Smooth: {beauty.smooth}%</span>
      )}
    </motion.button>
  );
}

function EffectButton({ effect, isSelected, onClick, large }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className={`${large ? 'w-full py-3' : 'aspect-square'} rounded-2xl flex flex-col items-center justify-center transition-all relative ${
        isSelected 
          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 ring-2 ring-white shadow-xl shadow-cyan-500/30' 
          : 'bg-white/10 hover:bg-white/15'
      }`}
    >
      <span className={large ? 'text-3xl' : 'text-2xl'}>{effect.icon}</span>
      <span className="text-[9px] text-white/70 mt-1 font-medium">{effect.name}</span>
      {effect.elements?.some(e => e.animated) && (
        <span className="absolute top-1 right-1 text-[8px]">✨</span>
      )}
    </motion.button>
  );
}

function BackgroundButton({ bg, isSelected, onClick, small }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className={`${small ? 'aspect-square' : 'aspect-video'} rounded-xl overflow-hidden relative transition-all ${
        isSelected ? 'ring-2 ring-white shadow-xl' : 'ring-1 ring-white/10'
      }`}
    >
      {bg.type === 'image' ? (
        <img src={bg.url} alt={bg.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : bg.type === 'gradient' ? (
        <div 
          className="absolute inset-0" 
          style={{ 
            background: `linear-gradient(${bg.angle || 135}deg, ${bg.colors.join(', ')})` 
          }} 
        />
      ) : bg.type === 'solid' ? (
        <div className="absolute inset-0" style={{ backgroundColor: bg.color }} />
      ) : bg.type === 'blur' ? (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-500/50 to-gray-700/50 flex items-center justify-center">
          <span className="text-white/60 text-xs">🌫️</span>
        </div>
      ) : null}
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${bg.type !== 'solid' ? 'bg-black/30' : ''}`}>
        <span className={small ? 'text-lg' : 'text-xl'}>{bg.icon}</span>
        {!small && <span className="text-[8px] text-white/80 mt-1 font-medium">{bg.name}</span>}
      </div>
      {isSelected && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </motion.button>
  );
}

function AdjustmentSlider({ icon, label, value, onChange, min = 0, max = 100, centered = false }) {
  const displayValue = centered ? (value > 0 ? `+${value}` : value) : value;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/60">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className="text-xs text-white/80 font-mono w-10 text-right">{displayValue}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={1}
        className="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-pink-500 [&_[role=slider]]:to-purple-500 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:shadow-lg"
      />
    </div>
  );
}

// ============================================
// AR EFFECT RENDERER
// ============================================

function AREffectRenderer({ effect }) {
  const [particles, setParticles] = useState([]);
  
  // Get particle config if effect has particles
  const particleConfig = effect?.elements?.find(e => e.type === 'particles');
  const particleType = particleConfig?.effect;
  const particleData = particleType ? PARTICLE_EFFECTS[particleType] : null;

  // Animate particles
  useEffect(() => {
    if (!particleData) {
      setParticles([]);
      return;
    }

    const createParticle = () => ({
      id: Math.random(),
      emoji: particleData.emojis[Math.floor(Math.random() * particleData.emojis.length)],
      x: Math.random() * 100,
      y: particleData.spread === 'rising' ? 110 : -10,
      size: particleData.size.min + Math.random() * (particleData.size.max - particleData.size.min),
      speed: particleData.speed.min + Math.random() * (particleData.speed.max - particleData.speed.min),
      wobble: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      opacity: 0.8 + Math.random() * 0.2,
    });

    setParticles(Array.from({ length: particleData.count }, createParticle));

    const interval = setInterval(() => {
      setParticles(prev => {
        const gravity = particleData.gravity || 1;
        const updated = prev
          .map(p => ({ 
            ...p, 
            y: p.y + (p.speed * gravity),
            x: p.x + (particleData.wobble ? Math.sin(Date.now() / 500 + p.id * 10) * 0.5 : p.wobble * 0.2),
            rotation: particleData.rotation ? p.rotation + p.wobble * 3 : p.rotation
          }))
          .filter(p => gravity > 0 ? p.y < 110 : p.y > -10);
        
        while (updated.length < particleData.count) {
          updated.push(createParticle());
        }
        return updated;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [particleData]);

  if (!effect || effect.id === 'none') return null;

  // Find overlay elements
  const overlayElements = effect.elements?.filter(e => 
    ['ears', 'nose', 'headwear', 'glasses', 'eyes', 'hat', 'horns', 'antlers', 'horn', 'overlay', 'tears', 'makeup'].includes(e.type)
  ) || [];

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {/* Main overlays positioned at face area */}
      {overlayElements.map((element, i) => (
        <AROverlayElement key={i} element={element} effectId={effect.id} />
      ))}

      {/* Particles */}
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute transition-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.size,
            transform: `rotate(${p.rotation}deg)`,
            opacity: p.opacity,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

function AROverlayElement({ element, effectId }) {
  // Position configurations based on element type
  const positions = {
    ears: { top: '8%', size: 100 },
    antlers: { top: '3%', size: 110 },
    headwear: { top: '5%', size: 90 },
    hat: { top: '3%', size: 100 },
    horn: { top: '8%', size: 70 },
    horns: { top: '10%', size: 70 },
    nose: { top: '38%', size: 50 },
    glasses: { top: '28%', size: 90 },
    eyes: { top: '28%', size: 100 },
    tears: { top: '35%', size: 110 },
    overlay: { top: '25%', size: 130 },
    makeup: { top: '35%', size: 100 },
  };

  const config = positions[element.type] || { top: '20%', size: 80 };
  const scale = element.scale || 1;
  const finalSize = config.size * scale;

  // Map effect IDs to emojis for display
  const effectEmojis = {
    puppy: { ears: '🐕', nose: '🐶' },
    cat: { ears: '🐱', nose: '😺', whiskers: '🐱' },
    bunny: { ears: '🐰', nose: '🐇' },
    fox: { ears: '🦊', nose: '🦊' },
    bear: { ears: '🐻', nose: '🐻' },
    deer: { antlers: '🦌', nose: '🦌' },
    koala: { ears: '🐨', nose: '🐨' },
    crown: { headwear: '👑' },
    halo: { headwear: '😇', wings: '👼' },
    devil: { horns: '😈' },
    sunglasses: { glasses: '😎' },
    nerd: { glasses: '🤓' },
    tiara: { headwear: '👸' },
    heart_eyes: { eyes: '😍' },
    star_eyes: { eyes: '🤩' },
    fire_eyes: { eyes: '🔥' },
    laser_eyes: { eyes: '👁️' },
    crying: { tears: '😢' },
    face_sparkle: { overlay: '✨' },
    freckles: { makeup: '🧑' },
    blush: { makeup: '😊' },
    santa: { hat: '🎅', beard: '🧔' },
    witch: { hat: '🧙‍♀️' },
    party: { hat: '🥳' },
    unicorn: { horn: '🦄', ears: '🦄' },
  };

  const emoji = effectEmojis[effectId]?.[element.type] || '✨';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: element.opacity || 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="absolute left-1/2 -translate-x-1/2"
      style={{ 
        top: config.top,
        fontSize: finalSize,
        filter: element.glow ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))' : undefined
      }}
    >
      <span className={element.animated ? 'animate-pulse' : ''}>{emoji}</span>
    </motion.div>
  );
}

// ============================================
// BACKGROUND RENDERER
// ============================================

function BackgroundRenderer({ background, segmentationEnabled }) {
  if (!background || background.type === 'none') {
    return null;
  }

  // If segmentation is enabled, MediaPipe handles the background replacement
  // We just show a status indicator
  if (segmentationEnabled) {
    return (
      <div className="absolute bottom-4 left-4 z-30 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/70 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>{background.icon}</span>
          <span>AI Background Active</span>
        </div>
      </div>
    );
  }

  // Without segmentation, show indicator that it needs to be enabled
  if (background.type === 'blur') {
    return null; // Blur is applied via CSS filter
  }

  return (
    <div className="absolute bottom-4 left-4 z-30 pointer-events-none">
      <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/70 flex items-center gap-2">
        <span>{background.icon}</span>
        <span>Background: {background.name}</span>
        <span className="text-amber-400/80">(enable AI segmentation in settings)</span>
      </div>
    </div>
  );
}