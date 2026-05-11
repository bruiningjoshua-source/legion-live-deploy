/**
 * AdvancedFilterPanel - Professional filter selection UI
 * Snapchat/Instagram-quality filter picker
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Sparkles, 
  Palette, 
  Image as ImageIcon,
  User,
  Wand2,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  CircleDot,
  Layers,
  RefreshCw,
  ChevronRight,
  Crown,
  Glasses,
  Cat,
  Ghost,
  PartyPopper,
  Heart,
  Flame,
  Snowflake,
  Upload,
  X
} from 'lucide-react';
import { FILTER_PRESETS, FACE_ACCESSORIES, BACKGROUNDS } from './ARFilterEngine';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Custom icons for accessories
const accessoryIcons = {
  crown: Crown,
  sunglasses: Glasses,
  catEars: Cat,
  devilHorns: Ghost,
  angelHalo: Sun,
  partyHat: PartyPopper,
  beard: User,
  mask: Ghost,
  butterfly: Sparkles,
  hearts: Heart,
  sparkles: Sparkles,
  fire: Flame,
  ice: Snowflake,
};

export default function AdvancedFilterPanel({ 
  onFilterChange, 
  onAccessoryChange, 
  onBackgroundChange,
  onCustomSettingsChange,
  currentFilter = 'none',
  currentAccessory = 'none',
  currentBackground = 'none',
  isProcessing = false,
  fpsCount = 0,
}) {
  const [activeTab, setActiveTab] = useState('filters');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customSettings, setCustomSettings] = useState({
    brightness: 1,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    tint: 0,
    beauty: 0,
    vignette: 0,
    glow: 0,
  });
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleCustomSettingChange = (key, value) => {
    const newSettings = { ...customSettings, [key]: value };
    setCustomSettings(newSettings);
    onCustomSettingsChange?.(newSettings);
  };

  const resetCustomSettings = () => {
    const defaults = {
      brightness: 1,
      contrast: 1,
      saturation: 1,
      temperature: 0,
      tint: 0,
      beauty: 0,
      vignette: 0,
      glow: 0,
    };
    setCustomSettings(defaults);
    onCustomSettingsChange?.(defaults);
  };

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setCustomBgUrl(result.file_url);
      onBackgroundChange?.({ 
        type: 'image', 
        url: result.file_url,
        name: 'Custom'
      });
      toast.success('Background uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
        >
          <Wand2 className="w-6 h-6 text-white" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-[70vh] bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl"
      >
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Effects Studio
            </SheetTitle>
            {isProcessing && (
              <Badge variant="outline" className="text-green-400 border-green-400/30">
                {fpsCount} FPS
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full bg-white/5 p-1 rounded-xl">
            <TabsTrigger 
              value="filters" 
              className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500"
            >
              <Palette className="w-4 h-4 mr-2" />
              Filters
            </TabsTrigger>
            <TabsTrigger 
              value="accessories"
              className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500"
            >
              <Crown className="w-4 h-4 mr-2" />
              AR Effects
            </TabsTrigger>
            <TabsTrigger 
              value="backgrounds"
              className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Background
            </TabsTrigger>
          </TabsList>

          {/* Filters Tab */}
          <TabsContent value="filters" className="mt-4 space-y-4">
            <ScrollArea className="h-[180px]">
              <div className="grid grid-cols-4 gap-3 pr-4">
                {Object.entries(FILTER_PRESETS).map(([key, preset]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onFilterChange?.(key)}
                    className={`relative p-3 rounded-xl transition-all ${
                      currentFilter === key 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-white' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{preset.icon}</span>
                    <span className="text-xs text-white/80 block truncate">{preset.name}</span>
                    {currentFilter === key && (
                      <motion.div
                        layoutId="filterIndicator"
                        className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </ScrollArea>

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <span className="text-white/80 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Advanced Settings
              </span>
              <ChevronRight className={`w-4 h-4 text-white/60 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-4">
                    {/* Brightness */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60 flex items-center gap-1">
                          <Sun className="w-3 h-3" /> Brightness
                        </span>
                        <span className="text-white/80">{Math.round(customSettings.brightness * 100)}%</span>
                      </div>
                      <Slider
                        value={[customSettings.brightness]}
                        onValueChange={([v]) => handleCustomSettingChange('brightness', v)}
                        min={0.5}
                        max={1.5}
                        step={0.01}
                        className="[&_[role=slider]]:bg-amber-400"
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60 flex items-center gap-1">
                          <Contrast className="w-3 h-3" /> Contrast
                        </span>
                        <span className="text-white/80">{Math.round(customSettings.contrast * 100)}%</span>
                      </div>
                      <Slider
                        value={[customSettings.contrast]}
                        onValueChange={([v]) => handleCustomSettingChange('contrast', v)}
                        min={0.5}
                        max={1.5}
                        step={0.01}
                        className="[&_[role=slider]]:bg-amber-400"
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60 flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> Saturation
                        </span>
                        <span className="text-white/80">{Math.round(customSettings.saturation * 100)}%</span>
                      </div>
                      <Slider
                        value={[customSettings.saturation]}
                        onValueChange={([v]) => handleCustomSettingChange('saturation', v)}
                        min={0}
                        max={2}
                        step={0.01}
                        className="[&_[role=slider]]:bg-amber-400"
                      />
                    </div>

                    {/* Temperature */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60 flex items-center gap-1">
                          <Thermometer className="w-3 h-3" /> Temperature
                        </span>
                        <span className="text-white/80">{customSettings.temperature > 0 ? '+' : ''}{Math.round(customSettings.temperature * 100)}</span>
                      </div>
                      <Slider
                        value={[customSettings.temperature]}
                        onValueChange={([v]) => handleCustomSettingChange('temperature', v)}
                        min={-0.5}
                        max={0.5}
                        step={0.01}
                        className="[&_[role=slider]]:bg-amber-400"
                      />
                    </div>

                    {/* Beauty */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Beauty
                        </span>
                        <span className="text-white/80">{Math.round(customSettings.beauty * 100)}%</span>
                      </div>
                      <Slider
                        value={[customSettings.beauty]}
                        onValueChange={([v]) => handleCustomSettingChange('beauty', v)}
                        min={0}
                        max={1}
                        step={0.01}
                        className="[&_[role=slider]]:bg-pink-400"
                      />
                    </div>

                    {/* Vignette */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60 flex items-center gap-1">
                          <CircleDot className="w-3 h-3" /> Vignette
                        </span>
                        <span className="text-white/80">{Math.round(customSettings.vignette * 100)}%</span>
                      </div>
                      <Slider
                        value={[customSettings.vignette]}
                        onValueChange={([v]) => handleCustomSettingChange('vignette', v)}
                        min={0}
                        max={1}
                        step={0.01}
                        className="[&_[role=slider]]:bg-purple-400"
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetCustomSettings}
                    className="w-full border-white/20 text-white/60 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Accessories Tab */}
          <TabsContent value="accessories" className="mt-4">
            <ScrollArea className="h-[280px]">
              <div className="grid grid-cols-4 gap-3 pr-4">
                {Object.entries(FACE_ACCESSORIES).map(([key, accessory]) => {
                  const IconComponent = accessoryIcons[key] || Sparkles;
                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onAccessoryChange?.(key)}
                      className={`relative p-3 rounded-xl transition-all ${
                        currentAccessory === key 
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 ring-2 ring-white' 
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{accessory.icon}</span>
                      <span className="text-xs text-white/80 block truncate">{accessory.name}</span>
                      {accessory.animated && (
                        <Badge className="absolute -top-1 -left-1 text-[8px] bg-purple-500 px-1">
                          ✨
                        </Badge>
                      )}
                      {currentAccessory === key && (
                        <motion.div
                          layoutId="accessoryIndicator"
                          className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="mt-4 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <p className="text-xs text-purple-300">
                <Sparkles className="w-3 h-3 inline mr-1" />
                AR effects track your face in real-time using AI. Look straight at the camera for best results!
              </p>
            </div>
          </TabsContent>

          {/* Backgrounds Tab */}
          <TabsContent value="backgrounds" className="mt-4 space-y-4">
            {/* Upload Custom Background */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                className="hidden"
                id="bg-upload"
              />
              <label
                htmlFor="bg-upload"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-white/40 transition-colors"
              >
                {isUploading ? (
                  <span className="text-white/60 text-sm flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-white/60" />
                    <span className="text-white/60 text-sm">Upload Custom Background</span>
                  </>
                )}
              </label>

              {customBgUrl && (
                <div className="mt-2 relative">
                  <img 
                    src={customBgUrl} 
                    alt="Custom" 
                    className="w-full h-20 object-cover rounded-lg opacity-60"
                  />
                  <button
                    onClick={() => {
                      setCustomBgUrl('');
                      if (currentBackground === 'custom') {
                        onBackgroundChange?.(BACKGROUNDS.none);
                      }
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}
            </div>

            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-3 gap-3 pr-4">
                {Object.entries(BACKGROUNDS).map(([key, bg]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onBackgroundChange?.(bg)}
                    className={`relative h-24 rounded-xl overflow-hidden transition-all ${
                      currentBackground === key 
                        ? 'ring-2 ring-white' 
                        : 'ring-1 ring-white/10'
                    }`}
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
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-900" />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/30" />

                    {/* Label */}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <span className="text-xs text-white block truncate">{bg.icon} {bg.name}</span>
                    </div>

                    {currentBackground === key && (
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
                Background replacement uses AI to separate you from your background. Works best with good lighting!
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}