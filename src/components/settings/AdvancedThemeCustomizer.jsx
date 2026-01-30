import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Palette, 
  Sparkles, 
  Zap, 
  Upload, 
  Image as ImageIcon,
  X,
  Save,
  RotateCcw,
  Paintbrush
} from 'lucide-react';
import { toast } from 'sonner';

const THEMES = [
  { id: 'roman', name: 'Roman Gold', colors: ['#d97706', '#f59e0b', '#fbbf24'], icon: '🏛️' },
  { id: 'neon', name: 'Neon Nights', colors: ['#ec4899', '#8b5cf6', '#06b6d4'], icon: '💜' },
  { id: 'ocean', name: 'Ocean Blue', colors: ['#0ea5e9', '#06b6d4', '#22d3ee'], icon: '🌊' },
  { id: 'fire', name: 'Fire Red', colors: ['#ef4444', '#f97316', '#eab308'], icon: '🔥' },
  { id: 'forest', name: 'Forest Green', colors: ['#22c55e', '#10b981', '#14b8a6'], icon: '🌲' },
  { id: 'midnight', name: 'Midnight Purple', colors: ['#6366f1', '#8b5cf6', '#a855f7'], icon: '🌙' },
  { id: 'sunset', name: 'Sunset', colors: ['#f97316', '#ec4899', '#8b5cf6'], icon: '🌅' },
  { id: 'cyber', name: 'Cyberpunk', colors: ['#00ff88', '#00ccff', '#ff00aa'], icon: '🤖' },
  { id: 'rose', name: 'Rose Gold', colors: ['#f472b6', '#fb7185', '#fda4af'], icon: '🌹' },
  { id: 'arctic', name: 'Arctic', colors: ['#67e8f9', '#a5f3fc', '#e0f2fe'], icon: '❄️' },
];

const PARTICLE_MODES = [
  { id: 'off', name: 'Off', icon: '🚫' },
  { id: 'low', name: 'Subtle', icon: '✨' },
  { id: 'medium', name: 'Normal', icon: '🌟' },
  { id: 'high', name: 'Intense', icon: '💫' },
];

const PRESET_BACKGROUNDS = [
  { id: 'none', name: 'None', url: null, icon: '🚫' },
  { id: 'gradient1', name: 'Galaxy', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920', icon: '🌌' },
  { id: 'gradient2', name: 'Neon City', url: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1920', icon: '🌃' },
  { id: 'gradient3', name: 'Abstract', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920', icon: '🎨' },
  { id: 'gradient4', name: 'Mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920', icon: '🏔️' },
  { id: 'gradient5', name: 'Ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920', icon: '🏖️' },
];

const ACCENT_COLORS = [
  '#d97706', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#ffffff', '#94a3b8', '#000000'
];

export default function AdvancedThemeCustomizer({ 
  currentTheme = 'roman',
  onThemeChange,
  particleIntensity = 'medium',
  onParticleChange,
  animatedBg = true,
  onAnimatedBgChange,
  onBackgroundChange,
  user
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [particles, setParticles] = useState(particleIntensity);
  const [animated, setAnimated] = useState(animatedBg);
  const [customBgUrl, setCustomBgUrl] = useState(null);
  const [accentColor, setAccentColor] = useState('#d97706');
  const [bgOpacity, setBgOpacity] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef(null);

  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('legion_theme');
    const savedParticles = localStorage.getItem('legion_particles');
    const savedAnimated = localStorage.getItem('legion_animated_bg');
    const savedBg = localStorage.getItem('legion_custom_bg');
    const savedAccent = localStorage.getItem('legion_accent_color');
    const savedOpacity = localStorage.getItem('legion_bg_opacity');
    
    if (savedTheme) setSelectedTheme(savedTheme);
    if (savedParticles) setParticles(savedParticles);
    if (savedAnimated !== null) setAnimated(savedAnimated === 'true');
    if (savedBg) setCustomBgUrl(savedBg);
    if (savedAccent) setAccentColor(savedAccent);
    if (savedOpacity) setBgOpacity(parseInt(savedOpacity));

    // Load from user settings if available
    if (user?.theme_settings) {
      const ts = user.theme_settings;
      if (ts.color_theme) setSelectedTheme(ts.color_theme);
      if (ts.particle_intensity) setParticles(ts.particle_intensity);
      if (ts.animated_background !== undefined) setAnimated(ts.animated_background);
      if (ts.custom_background_url) setCustomBgUrl(ts.custom_background_url);
      if (ts.accent_color) setAccentColor(ts.accent_color);
    }
  }, [user]);

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
    onThemeChange?.(themeId);
    localStorage.setItem('legion_theme', themeId);
  };

  const handleParticleChange = (mode) => {
    setParticles(mode);
    onParticleChange?.(mode);
    localStorage.setItem('legion_particles', mode);
  };

  const handleAnimatedChange = (enabled) => {
    setAnimated(enabled);
    onAnimatedBgChange?.(enabled);
    localStorage.setItem('legion_animated_bg', enabled.toString());
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setCustomBgUrl(result.file_url);
      localStorage.setItem('legion_custom_bg', result.file_url);
      onBackgroundChange?.(result.file_url);
      toast.success('Background uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const handlePresetBg = (bg) => {
    setCustomBgUrl(bg.url);
    localStorage.setItem('legion_custom_bg', bg.url || '');
    onBackgroundChange?.(bg.url);
  };

  const handleAccentChange = (color) => {
    setAccentColor(color);
    localStorage.setItem('legion_accent_color', color);
    document.documentElement.style.setProperty('--accent-color', color);
  };

  const handleOpacityChange = (value) => {
    setBgOpacity(value);
    localStorage.setItem('legion_bg_opacity', value.toString());
  };

  const saveToAccount = async () => {
    if (!user) {
      toast.error('Please sign in to save settings');
      return;
    }

    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        theme_settings: {
          color_theme: selectedTheme,
          particle_intensity: particles,
          animated_background: animated,
          custom_background_url: customBgUrl,
          accent_color: accentColor
        }
      });
      toast.success('Theme saved to your account!');
    } catch (error) {
      toast.error('Failed to save');
    }
    setIsSaving(false);
  };

  const resetAll = () => {
    setSelectedTheme('roman');
    setParticles('medium');
    setAnimated(true);
    setCustomBgUrl(null);
    setAccentColor('#d97706');
    setBgOpacity(30);
    
    localStorage.removeItem('legion_theme');
    localStorage.removeItem('legion_particles');
    localStorage.removeItem('legion_animated_bg');
    localStorage.removeItem('legion_custom_bg');
    localStorage.removeItem('legion_accent_color');
    localStorage.removeItem('legion_bg_opacity');
    
    onThemeChange?.('roman');
    onParticleChange?.('medium');
    onAnimatedBgChange?.(true);
    onBackgroundChange?.(null);
    
    toast.success('Reset to defaults');
  };

  const currentThemeColors = THEMES.find(t => t.id === selectedTheme)?.colors || THEMES[0].colors;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors shadow-lg"
        >
          <Palette className="w-5 h-5" />
        </motion.button>
      </SheetTrigger>
      
      <SheetContent className="bg-stone-950/95 backdrop-blur-xl border-white/10 w-[380px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Theme Studio
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="theme" className="mt-4">
          <TabsList className="w-full bg-white/5 p-1 grid grid-cols-3">
            <TabsTrigger value="theme" className="text-xs data-[state=active]:bg-amber-600">
              <Palette className="w-3 h-3 mr-1" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="background" className="text-xs data-[state=active]:bg-purple-600">
              <ImageIcon className="w-3 h-3 mr-1" />
              Background
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs data-[state=active]:bg-blue-600">
              <Zap className="w-3 h-3 mr-1" />
              Effects
            </TabsTrigger>
          </TabsList>

          {/* COLORS TAB */}
          <TabsContent value="theme" className="space-y-5 mt-4">
            {/* Theme Selection */}
            <div>
              <p className="text-white/60 text-sm mb-3">Color Theme</p>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((theme) => (
                  <motion.button
                    key={theme.id}
                    onClick={() => handleThemeSelect(theme.id)}
                    className={`relative p-3 rounded-xl border transition-all ${
                      selectedTheme === theme.id
                        ? 'border-white/50 ring-2 ring-white/20'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex gap-1 mb-1.5">
                      {theme.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{theme.icon}</span>
                      <span className="text-white text-xs">{theme.name}</span>
                    </div>
                    
                    {selectedTheme === theme.id && (
                      <motion.div
                        layoutId="theme-check"
                        className="absolute top-1.5 right-1.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <span className="text-white text-[10px]">✓</span>
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <p className="text-white/60 text-sm mb-3">Accent Color</p>
              <div className="grid grid-cols-10 gap-1.5">
                {ACCENT_COLORS.map((color) => (
                  <motion.button
                    key={color}
                    onClick={() => handleAccentChange(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      accentColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-white/50 text-xs">Custom:</span>
                <Input
                  type="color"
                  value={accentColor}
                  onChange={(e) => handleAccentChange(e.target.value)}
                  className="w-10 h-8 p-0 border-0 bg-transparent cursor-pointer"
                />
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => handleAccentChange(e.target.value)}
                  className="flex-1 h-8 bg-white/10 border-white/20 text-white text-xs"
                  placeholder="#hex"
                />
              </div>
            </div>
          </TabsContent>

          {/* BACKGROUND TAB */}
          <TabsContent value="background" className="space-y-5 mt-4">
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
              <p className="text-white/50 text-sm">Upload your own background</p>
              <p className="text-white/30 text-xs mt-1">PNG, JPG up to 5MB</p>
            </div>

            {/* Custom Preview */}
            {customBgUrl && (
              <div className="relative rounded-xl overflow-hidden">
                <img src={customBgUrl} alt="Custom BG" className="w-full h-24 object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setCustomBgUrl(null);
                      localStorage.removeItem('legion_custom_bg');
                      onBackgroundChange?.(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            )}

            {/* Preset Backgrounds */}
            <div>
              <p className="text-white/60 text-sm mb-3">Preset Backgrounds</p>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_BACKGROUNDS.map((bg) => (
                  <motion.button
                    key={bg.id}
                    onClick={() => handlePresetBg(bg)}
                    className={`aspect-video rounded-lg overflow-hidden relative border-2 transition-all ${
                      customBgUrl === bg.url ? 'border-amber-500' : 'border-transparent'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {bg.url ? (
                      <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-stone-800 flex items-center justify-center text-xl">
                        {bg.icon}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center">
                      <span className="text-[9px] text-white">{bg.name}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Background Opacity */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">Background Overlay</span>
                <span className="text-amber-400">{bgOpacity}%</span>
              </div>
              <Slider
                value={[bgOpacity]}
                onValueChange={([v]) => handleOpacityChange(v)}
                min={0}
                max={80}
                className="[&_[role=slider]]:bg-amber-500"
              />
            </div>
          </TabsContent>

          {/* EFFECTS TAB */}
          <TabsContent value="effects" className="space-y-5 mt-4">
            {/* Particle Effects */}
            <div>
              <p className="text-white/60 text-sm mb-3">Particle Effects</p>
              <div className="grid grid-cols-4 gap-2">
                {PARTICLE_MODES.map((mode) => (
                  <motion.button
                    key={mode.id}
                    onClick={() => handleParticleChange(mode.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      particles === mode.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-lg block mb-1">{mode.icon}</span>
                    <span className="text-[10px]">{mode.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Animated Background Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-white text-sm">Animated Background</p>
                  <p className="text-white/50 text-xs">Floating gradient orbs</p>
                </div>
              </div>
              <Switch
                checked={animated}
                onCheckedChange={handleAnimatedChange}
              />
            </div>

            {/* Preview */}
            <div className="relative h-28 rounded-xl overflow-hidden">
              {customBgUrl ? (
                <img src={customBgUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${currentThemeColors[0]}20, ${currentThemeColors[1]}20, ${currentThemeColors[2]}20)`
                  }}
                />
              )}
              <div 
                className="absolute inset-0 bg-black" 
                style={{ opacity: bgOpacity / 100 }}
              />
              {animated && (
                <>
                  <motion.div
                    className="absolute w-16 h-16 rounded-full blur-xl opacity-40"
                    style={{ background: currentThemeColors[0], left: 10, top: 10 }}
                    animate={{ x: [0, 60, 0], y: [0, 30, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute w-12 h-12 rounded-full blur-xl opacity-30"
                    style={{ background: currentThemeColors[1], right: 10, bottom: 10 }}
                    animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                  />
                </>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white/70 text-sm bg-black/30 px-3 py-1 rounded-full">Preview</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <Button
            onClick={resetAll}
            variant="outline"
            className="flex-1 border-white/20 text-white/70 hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
          <Button
            onClick={saveToAccount}
            disabled={isSaving || !user}
            className="flex-1 bg-amber-600 hover:bg-amber-700"
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}